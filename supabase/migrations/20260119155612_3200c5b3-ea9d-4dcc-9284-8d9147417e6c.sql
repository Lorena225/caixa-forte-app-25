
-- =============================================
-- SECURITY HARDENING: Restrict sensitive tables to appropriate roles
-- =============================================

-- =============================================
-- 1. API_KEYS - Restrict to admin only (has company_id)
-- =============================================
DROP POLICY IF EXISTS "api_keys_select_admin" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_insert_admin" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_update_admin" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_delete_admin" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_select" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_insert" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_update" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_delete" ON public.api_keys;

CREATE POLICY "api_keys_select_admin"
ON public.api_keys FOR SELECT TO authenticated
USING (
  public.user_belongs_to_company(company_id) 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "api_keys_insert_admin"
ON public.api_keys FOR INSERT TO authenticated
WITH CHECK (
  public.user_belongs_to_company(company_id) 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "api_keys_update_admin"
ON public.api_keys FOR UPDATE TO authenticated
USING (
  public.user_belongs_to_company(company_id) 
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.user_belongs_to_company(company_id) 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "api_keys_delete_admin"
ON public.api_keys FOR DELETE TO authenticated
USING (
  public.user_belongs_to_company(company_id) 
  AND public.has_role(auth.uid(), 'admin')
);

-- =============================================
-- 2. INTEGRATION_CREDENTIALS - Restrict to admin only (has company_id)
-- =============================================
DROP POLICY IF EXISTS "integration_credentials_select" ON public.integration_credentials;
DROP POLICY IF EXISTS "integration_credentials_insert" ON public.integration_credentials;
DROP POLICY IF EXISTS "integration_credentials_update" ON public.integration_credentials;
DROP POLICY IF EXISTS "integration_credentials_delete" ON public.integration_credentials;

CREATE POLICY "integration_credentials_select_admin"
ON public.integration_credentials FOR SELECT TO authenticated
USING (
  public.user_belongs_to_company(company_id) 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "integration_credentials_insert_admin"
ON public.integration_credentials FOR INSERT TO authenticated
WITH CHECK (
  public.user_belongs_to_company(company_id) 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "integration_credentials_update_admin"
ON public.integration_credentials FOR UPDATE TO authenticated
USING (
  public.user_belongs_to_company(company_id) 
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.user_belongs_to_company(company_id) 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "integration_credentials_delete_admin"
ON public.integration_credentials FOR DELETE TO authenticated
USING (
  public.user_belongs_to_company(company_id) 
  AND public.has_role(auth.uid(), 'admin')
);

-- =============================================
-- 3. CERTIFICADOS_DIGITAIS - Restrict to admin/fiscal (uses empresa_id)
-- =============================================
DROP POLICY IF EXISTS "certificados_digitais_select" ON public.certificados_digitais;
DROP POLICY IF EXISTS "certificados_digitais_insert" ON public.certificados_digitais;
DROP POLICY IF EXISTS "certificados_digitais_update" ON public.certificados_digitais;
DROP POLICY IF EXISTS "certificados_digitais_delete" ON public.certificados_digitais;

CREATE POLICY "certificados_digitais_select"
ON public.certificados_digitais FOR SELECT TO authenticated
USING (
  public.user_belongs_to_company(empresa_id) 
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'fiscal'))
);

CREATE POLICY "certificados_digitais_insert"
ON public.certificados_digitais FOR INSERT TO authenticated
WITH CHECK (
  public.user_belongs_to_company(empresa_id) 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "certificados_digitais_update"
ON public.certificados_digitais FOR UPDATE TO authenticated
USING (
  public.user_belongs_to_company(empresa_id) 
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.user_belongs_to_company(empresa_id) 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "certificados_digitais_delete"
ON public.certificados_digitais FOR DELETE TO authenticated
USING (
  public.user_belongs_to_company(empresa_id) 
  AND public.has_role(auth.uid(), 'admin')
);

-- Add documentation
COMMENT ON TABLE public.api_keys IS 'API keys - restricted to admin role only';
COMMENT ON TABLE public.integration_credentials IS 'Integration credentials - restricted to admin role only';
COMMENT ON TABLE public.certificados_digitais IS 'Digital certificates - restricted to admin/fiscal roles';
