-- Materialized View for Dashboard Metrics (fast reads)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_metrics AS
SELECT 
  c.id as company_id,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.direction = 'saida'), 0) as total_payables,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.direction = 'entrada'), 0) as total_receivables,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status != 'pago' AND t.status != 'cancelado'), 0) as overdue_count,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.direction = 'saida' AND t.status != 'pago' AND t.status != 'cancelado'), 0) as total_payable_amount,
  COALESCE(SUM(t.total_amount) FILTER (WHERE t.direction = 'entrada' AND t.status != 'pago' AND t.status != 'cancelado'), 0) as total_receivable_amount,
  NOW() as refreshed_at
FROM public.companies c
LEFT JOIN public.transactions t ON c.id = t.company_id 
  AND t.transaction_date >= NOW() - INTERVAL '90 days'
GROUP BY c.id;

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_metrics_company 
ON mv_dashboard_metrics(company_id);

-- Function to refresh the dashboard cache
CREATE OR REPLACE FUNCTION refresh_dashboard_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_metrics;
END;
$$;

-- Grant access
GRANT SELECT ON mv_dashboard_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_dashboard_cache() TO service_role;