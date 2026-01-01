-- =============================================
-- VIEWS PARA RELATÓRIOS ERP
-- =============================================

-- View: Balancete de Verificação
CREATE OR REPLACE VIEW public.v_trial_balance 
WITH (security_invoker = true) AS
SELECT 
  a.company_id,
  a.id as account_id,
  a.code as account_code,
  a.name as account_name,
  a.category_type,
  COALESCE(SUM(jl.debit_amount), 0) as total_debit,
  COALESCE(SUM(jl.credit_amount), 0) as total_credit,
  COALESCE(SUM(jl.debit_amount), 0) - COALESCE(SUM(jl.credit_amount), 0) as balance
FROM public.accounts a
LEFT JOIN public.journal_lines jl ON jl.account_id = a.id
LEFT JOIN public.journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted'
WHERE a.is_active = true
GROUP BY a.company_id, a.id, a.code, a.name, a.category_type;

-- View: Aging de AP (Contas a Pagar)
CREATE OR REPLACE VIEW public.v_ap_aging
WITH (security_invoker = true) AS
SELECT 
  vb.company_id,
  vb.id,
  vb.document_number,
  vb.due_date,
  vb.net_amount,
  vb.status,
  c.name as counterparty_name,
  CURRENT_DATE - vb.due_date as days_overdue,
  CASE 
    WHEN CURRENT_DATE - vb.due_date <= 0 THEN 'a_vencer'
    WHEN CURRENT_DATE - vb.due_date BETWEEN 1 AND 30 THEN '1_30'
    WHEN CURRENT_DATE - vb.due_date BETWEEN 31 AND 60 THEN '31_60'
    WHEN CURRENT_DATE - vb.due_date BETWEEN 61 AND 90 THEN '61_90'
    ELSE '90_plus'
  END as aging_bucket
FROM public.vendor_bills vb
JOIN public.counterparties c ON c.id = vb.counterparty_id
WHERE vb.status IN ('pending', 'approved', 'partial');

-- View: Aging de AR (Contas a Receber)
CREATE OR REPLACE VIEW public.v_ar_aging_detail
WITH (security_invoker = true) AS
SELECT 
  ci.company_id,
  ci.id,
  ci.document_number,
  ci.due_date,
  ci.net_amount,
  ci.status,
  c.name as counterparty_name,
  CURRENT_DATE - ci.due_date as days_overdue,
  CASE 
    WHEN CURRENT_DATE - ci.due_date <= 0 THEN 'a_vencer'
    WHEN CURRENT_DATE - ci.due_date BETWEEN 1 AND 30 THEN '1_30'
    WHEN CURRENT_DATE - ci.due_date BETWEEN 31 AND 60 THEN '31_60'
    WHEN CURRENT_DATE - ci.due_date BETWEEN 61 AND 90 THEN '61_90'
    ELSE '90_plus'
  END as aging_bucket
FROM public.customer_invoices ci
JOIN public.counterparties c ON c.id = ci.counterparty_id
WHERE ci.status IN ('pending', 'partial', 'overdue');

-- View: Posição de Caixa Diária
CREATE OR REPLACE VIEW public.v_cash_position_daily
WITH (security_invoker = true) AS
SELECT 
  w.company_id,
  w.id as wallet_id,
  w.name as wallet_name,
  COALESCE(w.opening_balance, 0) as opening_balance,
  COALESCE(SUM(CASE WHEN t.direction = 'entrada' AND t.status = 'pago' THEN t.total_amount ELSE 0 END), 0) as total_inflows,
  COALESCE(SUM(CASE WHEN t.direction = 'saida' AND t.status = 'pago' THEN t.total_amount ELSE 0 END), 0) as total_outflows,
  COALESCE(w.opening_balance, 0) + 
    COALESCE(SUM(CASE WHEN t.direction = 'entrada' AND t.status = 'pago' THEN t.total_amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN t.direction = 'saida' AND t.status = 'pago' THEN t.total_amount ELSE 0 END), 0) as current_balance
FROM public.wallets w
LEFT JOIN public.transactions t ON t.wallet_id = w.id
WHERE w.is_active = true
GROUP BY w.company_id, w.id, w.name, w.opening_balance;

-- View: Resumo de Retenções por Período
CREATE OR REPLACE VIEW public.v_withholding_summary
WITH (security_invoker = true) AS
SELECT 
  tc.company_id,
  p.year,
  p.month,
  tc.tax_type,
  SUM(tc.base_amount) as total_base,
  SUM(tc.amount) as total_withheld
FROM public.tax_calculations tc
JOIN public.periods p ON p.id = tc.period_id
WHERE tc.is_withholding = true
GROUP BY tc.company_id, p.year, p.month, tc.tax_type;

-- View: Status de Conciliação Bancária
CREATE OR REPLACE VIEW public.v_bank_reconciliation_status
WITH (security_invoker = true) AS
SELECT 
  bs.company_id,
  bs.wallet_id,
  w.name as wallet_name,
  bs.statement_date,
  COUNT(bsl.id) as total_lines,
  COUNT(CASE WHEN bsl.is_reconciled THEN 1 END) as reconciled_lines,
  ROUND(COUNT(CASE WHEN bsl.is_reconciled THEN 1 END)::numeric / NULLIF(COUNT(bsl.id), 0) * 100, 2) as reconciled_percent,
  SUM(CASE WHEN NOT bsl.is_reconciled THEN bsl.amount ELSE 0 END) as pending_amount
FROM public.bank_statements bs
JOIN public.wallets w ON w.id = bs.wallet_id
LEFT JOIN public.bank_statement_lines bsl ON bsl.statement_id = bs.id
GROUP BY bs.company_id, bs.wallet_id, w.name, bs.statement_date;

-- View: Documentos Pendentes de Aprovação
CREATE OR REPLACE VIEW public.v_pending_approvals
WITH (security_invoker = true) AS
SELECT 
  ar.company_id,
  ar.id as request_id,
  ar.entity_type,
  ar.entity_id,
  ar.current_step,
  ar.status,
  ar.requested_at,
  CASE ar.entity_type
    WHEN 'vendor_bill' THEN (SELECT document_number FROM public.vendor_bills WHERE id = ar.entity_id)
    WHEN 'payment_run' THEN (SELECT run_number FROM public.payment_runs WHERE id = ar.entity_id)
    ELSE NULL
  END as document_reference,
  CASE ar.entity_type
    WHEN 'vendor_bill' THEN (SELECT net_amount FROM public.vendor_bills WHERE id = ar.entity_id)
    WHEN 'payment_run' THEN (SELECT total_amount FROM public.payment_runs WHERE id = ar.entity_id)
    ELSE NULL
  END as amount
FROM public.approval_requests ar
WHERE ar.status = 'pending';

-- View: Livro Razão
CREATE OR REPLACE VIEW public.v_ledger
WITH (security_invoker = true) AS
SELECT 
  je.company_id,
  jl.account_id,
  a.code as account_code,
  a.name as account_name,
  je.entry_number,
  je.entry_date,
  je.description as entry_description,
  jl.description as line_description,
  jl.debit_amount,
  jl.credit_amount,
  jl.document_number,
  c.name as counterparty_name,
  je.source_type
FROM public.journal_lines jl
JOIN public.journal_entries je ON je.id = jl.journal_entry_id
JOIN public.accounts a ON a.id = jl.account_id
LEFT JOIN public.counterparties c ON c.id = jl.counterparty_id
WHERE je.status = 'posted';