-- Corrigir views para usar SECURITY INVOKER (padrão seguro)
-- Drop e recriar as views com segurança apropriada

DROP VIEW IF EXISTS public.v_rc_flow_by_account;
DROP VIEW IF EXISTS public.v_rc_indicators_monthly;
DROP VIEW IF EXISTS public.v_dre_monthly;
DROP VIEW IF EXISTS public.v_ap_open;
DROP VIEW IF EXISTS public.v_ar_open;
DROP VIEW IF EXISTS public.v_cashflow_monthly;

-- =====================================================
-- VIEW: Fluxo de Caixa Mensal (SECURITY INVOKER)
-- =====================================================
CREATE VIEW public.v_cashflow_monthly 
WITH (security_invoker = on)
AS
SELECT 
  t.company_id,
  EXTRACT(YEAR FROM COALESCE(t.paid_date, t.due_date))::INTEGER as year,
  EXTRACT(MONTH FROM COALESCE(t.paid_date, t.due_date))::INTEGER as month,
  SUM(CASE WHEN t.direction = 'entrada' AND t.status = 'pago' THEN t.total_amount ELSE 0 END) as entradas_pagas,
  SUM(CASE WHEN t.direction = 'saida' AND t.status = 'pago' THEN t.total_amount ELSE 0 END) as saidas_pagas,
  SUM(CASE WHEN t.direction = 'entrada' AND t.status = 'pago' THEN t.total_amount ELSE 0 END) -
  SUM(CASE WHEN t.direction = 'saida' AND t.status = 'pago' THEN t.total_amount ELSE 0 END) as resultado,
  SUM(CASE WHEN t.direction = 'entrada' AND t.status != 'pago' AND t.status != 'cancelado' THEN t.total_amount ELSE 0 END) as entradas_previstas,
  SUM(CASE WHEN t.direction = 'saida' AND t.status != 'pago' AND t.status != 'cancelado' THEN t.total_amount ELSE 0 END) as saidas_previstas
FROM public.transactions t
WHERE t.status != 'cancelado'
GROUP BY t.company_id, year, month;

-- =====================================================
-- VIEW: Contas a Receber em Aberto (SECURITY INVOKER)
-- =====================================================
CREATE VIEW public.v_ar_open 
WITH (security_invoker = on)
AS
SELECT 
  t.*,
  a.name as account_name,
  a.code as account_code,
  w.name as wallet_name,
  c.name as counterparty_name,
  cc.name as cost_center_name,
  CASE 
    WHEN t.due_date < CURRENT_DATE AND t.status != 'pago' THEN true 
    ELSE false 
  END as is_overdue,
  CASE 
    WHEN t.due_date < CURRENT_DATE AND t.status != 'pago' 
    THEN CURRENT_DATE - t.due_date 
    ELSE 0 
  END as days_late
FROM public.transactions t
LEFT JOIN public.accounts a ON t.account_id = a.id
LEFT JOIN public.wallets w ON t.wallet_id = w.id
LEFT JOIN public.counterparties c ON t.counterparty_id = c.id
LEFT JOIN public.cost_centers cc ON t.cost_center_id = cc.id
WHERE t.direction = 'entrada' 
  AND t.status IN ('lancado', 'rascunho');

-- =====================================================
-- VIEW: Contas a Pagar em Aberto (SECURITY INVOKER)
-- =====================================================
CREATE VIEW public.v_ap_open 
WITH (security_invoker = on)
AS
SELECT 
  t.*,
  a.name as account_name,
  a.code as account_code,
  w.name as wallet_name,
  c.name as counterparty_name,
  cc.name as cost_center_name,
  CASE 
    WHEN t.due_date < CURRENT_DATE AND t.status != 'pago' THEN true 
    ELSE false 
  END as is_overdue,
  CASE 
    WHEN t.due_date < CURRENT_DATE AND t.status != 'pago' 
    THEN CURRENT_DATE - t.due_date 
    ELSE 0 
  END as days_late
FROM public.transactions t
LEFT JOIN public.accounts a ON t.account_id = a.id
LEFT JOIN public.wallets w ON t.wallet_id = w.id
LEFT JOIN public.counterparties c ON t.counterparty_id = c.id
LEFT JOIN public.cost_centers cc ON t.cost_center_id = cc.id
WHERE t.direction = 'saida' 
  AND t.status IN ('lancado', 'rascunho');

-- =====================================================
-- VIEW: DRE Mensal (SECURITY INVOKER)
-- =====================================================
CREATE VIEW public.v_dre_monthly 
WITH (security_invoker = on)
AS
SELECT 
  t.company_id,
  EXTRACT(YEAR FROM COALESCE(t.paid_date, t.due_date))::INTEGER as year,
  EXTRACT(MONTH FROM COALESCE(t.paid_date, t.due_date))::INTEGER as month,
  a.category_type,
  a.code as account_code,
  a.name as account_name,
  SUM(t.total_amount) as total
FROM public.transactions t
JOIN public.accounts a ON t.account_id = a.id
WHERE t.status = 'pago'
GROUP BY t.company_id, year, month, a.category_type, a.code, a.name;

-- =====================================================
-- VIEW: Indicadores RC Mensal (SECURITY INVOKER)
-- =====================================================
CREATE VIEW public.v_rc_indicators_monthly 
WITH (security_invoker = on)
AS
SELECT 
  company_id,
  year,
  month,
  entradas_pagas as receita_realizada,
  saidas_pagas as despesa_realizada,
  resultado as lucro_prejuizo,
  CASE 
    WHEN entradas_pagas > 0 
    THEN ROUND((resultado / entradas_pagas * 100)::numeric, 2)
    ELSE 0 
  END as lucratividade,
  entradas_previstas as receita_prevista,
  saidas_previstas as despesa_prevista
FROM public.v_cashflow_monthly;

-- =====================================================
-- VIEW: RC_FLUXO por Conta (SECURITY INVOKER)
-- =====================================================
CREATE VIEW public.v_rc_flow_by_account 
WITH (security_invoker = on)
AS
SELECT 
  t.company_id,
  EXTRACT(YEAR FROM COALESCE(t.paid_date, t.due_date))::INTEGER as year,
  EXTRACT(MONTH FROM COALESCE(t.paid_date, t.due_date))::INTEGER as month,
  a.id as account_id,
  a.code as account_code,
  a.name as account_name,
  a.category_type,
  t.direction,
  SUM(CASE WHEN t.status = 'pago' THEN t.total_amount ELSE 0 END) as valor_pago,
  SUM(CASE WHEN t.status != 'pago' AND t.status != 'cancelado' THEN t.total_amount ELSE 0 END) as valor_previsto
FROM public.transactions t
JOIN public.accounts a ON t.account_id = a.id
WHERE t.status != 'cancelado'
GROUP BY t.company_id, year, month, a.id, a.code, a.name, a.category_type, t.direction;

-- Corrigir função update_updated_at com search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;