-- Move materialized views to private schema to hide from API
-- Note: We already revoked SELECT, but they still appear in API schema
-- The safest approach is to move them to a non-public schema

-- Create private schema for internal materialized views
CREATE SCHEMA IF NOT EXISTS internal;

-- Grant usage to postgres roles that need it
GRANT USAGE ON SCHEMA internal TO postgres, service_role;

-- Move mv_dashboard_metrics to internal schema
ALTER MATERIALIZED VIEW public.mv_dashboard_metrics SET SCHEMA internal;

-- Move mv_security_dashboard to internal schema  
ALTER MATERIALIZED VIEW public.mv_security_dashboard SET SCHEMA internal;

-- Move other MVs that might be exposed
ALTER MATERIALIZED VIEW public.mv_performance_summary SET SCHEMA internal;
ALTER MATERIALIZED VIEW public.mv_query_analytics SET SCHEMA internal;

-- Update the secure accessor functions to reference the new schema
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_company_id uuid)
RETURNS TABLE (
  company_id uuid,
  total_payables bigint,
  total_receivables bigint,
  overdue_count bigint,
  total_payable_amount numeric,
  total_receivable_amount numeric,
  refreshed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.company_id, m.total_payables, m.total_receivables, m.overdue_count,
         m.total_payable_amount, m.total_receivable_amount, m.refreshed_at
  FROM internal.mv_dashboard_metrics m
  WHERE m.company_id = p_company_id
    AND public.user_belongs_to_company(p_company_id)
$$;

CREATE OR REPLACE FUNCTION public.get_security_dashboard(p_company_id uuid)
RETURNS TABLE (
  company_id uuid,
  company_name text,
  active_sessions bigint,
  security_events_24h bigint,
  critical_unresolved bigint,
  audit_events_24h bigint,
  api_errors_24h bigint,
  rate_limits_24h bigint,
  refreshed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.company_id, s.company_name, s.active_sessions, s.security_events_24h,
         s.critical_unresolved, s.audit_events_24h, s.api_errors_24h, 
         s.rate_limits_24h, s.refreshed_at
  FROM internal.mv_security_dashboard s
  WHERE s.company_id = p_company_id
    AND public.user_belongs_to_company(p_company_id)
$$;