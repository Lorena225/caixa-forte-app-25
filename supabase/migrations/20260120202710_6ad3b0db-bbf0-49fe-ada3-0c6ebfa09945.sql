
-- Corrigir função set_updated_at com search_path
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- RLS para mv_security_dashboard (restringir acesso via função)
CREATE OR REPLACE FUNCTION get_security_dashboard(p_company_id uuid)
RETURNS TABLE (
  company_id uuid, company_name text, active_sessions bigint,
  security_events_24h bigint, critical_unresolved bigint,
  audit_events_24h bigint, api_errors_24h bigint, rate_limits_24h bigint, refreshed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar acesso
  IF NOT user_belongs_to_company(p_company_id) OR NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT * FROM mv_security_dashboard WHERE mv_security_dashboard.company_id = p_company_id;
END;
$$;
