-- =====================================================
-- ÍNDICES DE PERFORMANCE PARA QUERIES FREQUENTES
-- =====================================================

-- Transactions: queries por data e status são as mais frequentes
CREATE INDEX IF NOT EXISTS idx_transactions_company_due_date 
ON public.transactions(company_id, due_date DESC) 
WHERE status IN ('lancado', 'rascunho');

CREATE INDEX IF NOT EXISTS idx_transactions_company_direction_status 
ON public.transactions(company_id, direction, status);

CREATE INDEX IF NOT EXISTS idx_transactions_company_paid 
ON public.transactions(company_id, paid_date DESC) 
WHERE status = 'pago';

CREATE INDEX IF NOT EXISTS idx_transactions_counterparty 
ON public.transactions(counterparty_id, company_id);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet 
ON public.transactions(wallet_id, company_id);

-- Journal Entries: queries contábeis por período
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date 
ON public.journal_entries(company_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_journal_entries_posted 
ON public.journal_entries(company_id, posting_date DESC) 
WHERE status = 'posted';

-- Journal Lines: rollups por conta
CREATE INDEX IF NOT EXISTS idx_journal_lines_account 
ON public.journal_lines(account_id);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry 
ON public.journal_lines(journal_entry_id);

CREATE INDEX IF NOT EXISTS idx_journal_lines_cost_center 
ON public.journal_lines(cost_center_id) 
WHERE cost_center_id IS NOT NULL;

-- Bank Statement Lines: conciliação
CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_unreconciled 
ON public.bank_statement_lines(statement_id, posted_date) 
WHERE is_reconciled = false;

-- Card Receivables: agenda de recebíveis
CREATE INDEX IF NOT EXISTS idx_card_receivables_expected 
ON public.card_receivables(company_id, expected_date) 
WHERE status = 'pending';

-- Boletos: vencimentos
CREATE INDEX IF NOT EXISTS idx_boletos_due_date 
ON public.boletos(company_id, due_date) 
WHERE status IN ('pending', 'registered');

-- Cash Positions: posição por data
CREATE INDEX IF NOT EXISTS idx_cash_positions_wallet_date 
ON public.cash_positions(wallet_id, position_date DESC);

-- =====================================================
-- MATERIALIZED VIEWS PARA DASHBOARDS
-- =====================================================

-- View materializada: Resumo de aging AR (Contas a Receber)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ar_aging_summary AS
SELECT 
  t.company_id,
  COUNT(*) FILTER (WHERE t.due_date >= CURRENT_DATE) as current_count,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.due_date >= CURRENT_DATE), 0) as current_amount,
  COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE AND t.due_date >= CURRENT_DATE - 30) as days_1_30_count,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.due_date < CURRENT_DATE AND t.due_date >= CURRENT_DATE - 30), 0) as days_1_30_amount,
  COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE - 30 AND t.due_date >= CURRENT_DATE - 60) as days_31_60_count,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.due_date < CURRENT_DATE - 30 AND t.due_date >= CURRENT_DATE - 60), 0) as days_31_60_amount,
  COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE - 60 AND t.due_date >= CURRENT_DATE - 90) as days_61_90_count,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.due_date < CURRENT_DATE - 60 AND t.due_date >= CURRENT_DATE - 90), 0) as days_61_90_amount,
  COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE - 90) as over_90_count,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.due_date < CURRENT_DATE - 90), 0) as over_90_amount,
  now() as refreshed_at
FROM public.transactions t
WHERE t.direction = 'entrada' 
  AND t.status IN ('lancado', 'rascunho')
GROUP BY t.company_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ar_aging_company 
ON mv_ar_aging_summary(company_id);

-- View materializada: Resumo de aging AP (Contas a Pagar)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ap_aging_summary AS
SELECT 
  t.company_id,
  COUNT(*) FILTER (WHERE t.due_date >= CURRENT_DATE) as current_count,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.due_date >= CURRENT_DATE), 0) as current_amount,
  COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE AND t.due_date >= CURRENT_DATE - 30) as days_1_30_count,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.due_date < CURRENT_DATE AND t.due_date >= CURRENT_DATE - 30), 0) as days_1_30_amount,
  COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE - 30 AND t.due_date >= CURRENT_DATE - 60) as days_31_60_count,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.due_date < CURRENT_DATE - 30 AND t.due_date >= CURRENT_DATE - 60), 0) as days_31_60_amount,
  COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE - 60 AND t.due_date >= CURRENT_DATE - 90) as days_61_90_count,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.due_date < CURRENT_DATE - 60 AND t.due_date >= CURRENT_DATE - 90), 0) as days_61_90_amount,
  COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE - 90) as over_90_count,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.due_date < CURRENT_DATE - 90), 0) as over_90_amount,
  now() as refreshed_at
FROM public.transactions t
WHERE t.direction = 'saida' 
  AND t.status IN ('lancado', 'rascunho')
GROUP BY t.company_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ap_aging_company 
ON mv_ap_aging_summary(company_id);

-- View materializada: KPIs mensais de DRE
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_pnl AS
SELECT 
  t.company_id,
  DATE_TRUNC('month', COALESCE(t.paid_date, t.due_date))::date as month,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.direction = 'entrada' AND t.status = 'pago'), 0) as revenue,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.direction = 'saida' AND t.status = 'pago'), 0) as expenses,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.direction = 'entrada' AND t.status = 'pago'), 0) - 
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.direction = 'saida' AND t.status = 'pago'), 0) as profit,
  COUNT(*) FILTER (WHERE t.direction = 'entrada' AND t.status = 'pago') as revenue_count,
  COUNT(*) FILTER (WHERE t.direction = 'saida' AND t.status = 'pago') as expense_count,
  now() as refreshed_at
FROM public.transactions t
WHERE t.status = 'pago'
  AND COALESCE(t.paid_date, t.due_date) >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year'
GROUP BY t.company_id, DATE_TRUNC('month', COALESCE(t.paid_date, t.due_date));

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_pnl_company_month 
ON mv_monthly_pnl(company_id, month);

-- View materializada: Posição de caixa consolidada
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cash_position_current AS
SELECT 
  w.company_id,
  w.id as wallet_id,
  w.name as wallet_name,
  COALESCE(cp.closing_balance, w.opening_balance) as current_balance,
  COALESCE(
    (SELECT SUM(t.total_amount) FROM transactions t 
     WHERE t.wallet_id = w.id AND t.direction = 'entrada' 
     AND t.status = 'lancado' AND t.due_date <= CURRENT_DATE + 7), 0
  ) as projected_inflows_7d,
  COALESCE(
    (SELECT SUM(t.total_amount) FROM transactions t 
     WHERE t.wallet_id = w.id AND t.direction = 'saida' 
     AND t.status = 'lancado' AND t.due_date <= CURRENT_DATE + 7), 0
  ) as projected_outflows_7d,
  now() as refreshed_at
FROM public.wallets w
LEFT JOIN LATERAL (
  SELECT closing_balance 
  FROM cash_positions 
  WHERE wallet_id = w.id 
  ORDER BY position_date DESC 
  LIMIT 1
) cp ON true
WHERE w.is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cash_position_wallet 
ON mv_cash_position_current(wallet_id);

-- =====================================================
-- FUNÇÃO PARA REFRESH DAS MATERIALIZED VIEWS
-- =====================================================

CREATE OR REPLACE FUNCTION public.refresh_dashboard_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ar_aging_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ap_aging_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_pnl;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cash_position_current;
END;
$$;