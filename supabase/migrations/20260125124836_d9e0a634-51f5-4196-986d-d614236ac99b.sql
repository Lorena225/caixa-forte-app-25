-- Update refresh function to use the new internal schema
CREATE OR REPLACE FUNCTION public.refresh_dashboard_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Refresh all materialized views in the internal schema
  REFRESH MATERIALIZED VIEW CONCURRENTLY internal.mv_dashboard_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY internal.mv_security_dashboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY internal.mv_performance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY internal.mv_query_analytics;
END;
$$;