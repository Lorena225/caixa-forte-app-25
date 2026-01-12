-- Mover materialized views para schema analytics (fora da API pública)
CREATE SCHEMA IF NOT EXISTS analytics;

-- Mover as views
ALTER MATERIALIZED VIEW mv_ar_aging_summary SET SCHEMA analytics;
ALTER MATERIALIZED VIEW mv_ap_aging_summary SET SCHEMA analytics;
ALTER MATERIALIZED VIEW mv_monthly_pnl SET SCHEMA analytics;
ALTER MATERIALIZED VIEW mv_cash_position_current SET SCHEMA analytics;

-- Atualizar função de refresh para usar o schema correto
CREATE OR REPLACE FUNCTION public.refresh_dashboard_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'analytics'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_ar_aging_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_ap_aging_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_monthly_pnl;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_cash_position_current;
END;
$$;

-- Criar views seguras no public que herdam RLS das tabelas base
CREATE OR REPLACE VIEW public.v_ar_aging_cached 
WITH (security_invoker = true)
AS 
SELECT a.* 
FROM analytics.mv_ar_aging_summary a
WHERE EXISTS (
  SELECT 1 FROM companies c
  JOIN company_users cu ON cu.company_id = c.id
  WHERE cu.user_id = auth.uid() AND c.id = a.company_id
);

CREATE OR REPLACE VIEW public.v_ap_aging_cached 
WITH (security_invoker = true)
AS 
SELECT a.* 
FROM analytics.mv_ap_aging_summary a
WHERE EXISTS (
  SELECT 1 FROM companies c
  JOIN company_users cu ON cu.company_id = c.id
  WHERE cu.user_id = auth.uid() AND c.id = a.company_id
);

CREATE OR REPLACE VIEW public.v_monthly_pnl_cached 
WITH (security_invoker = true)
AS 
SELECT a.* 
FROM analytics.mv_monthly_pnl a
WHERE EXISTS (
  SELECT 1 FROM companies c
  JOIN company_users cu ON cu.company_id = c.id
  WHERE cu.user_id = auth.uid() AND c.id = a.company_id
);

CREATE OR REPLACE VIEW public.v_cash_position_cached 
WITH (security_invoker = true)
AS 
SELECT a.* 
FROM analytics.mv_cash_position_current a
WHERE EXISTS (
  SELECT 1 FROM companies c
  JOIN company_users cu ON cu.company_id = c.id
  WHERE cu.user_id = auth.uid() AND c.id = a.company_id
);