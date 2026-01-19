
-- =============================================
-- FIX: SECURITY LINTER ISSUES
-- 1. api_rate_limits - RLS enabled but no policies
-- 2. webhook_ingress - INSERT with true
-- 3. rate_limit_events - INSERT with true
-- =============================================

-- =============================================
-- 1. api_rate_limits - Add proper policies
-- =============================================
DROP POLICY IF EXISTS "api_rate_limits_select" ON public.api_rate_limits;
DROP POLICY IF EXISTS "api_rate_limits_insert" ON public.api_rate_limits;
DROP POLICY IF EXISTS "api_rate_limits_update" ON public.api_rate_limits;
DROP POLICY IF EXISTS "api_rate_limits_delete" ON public.api_rate_limits;

-- Allow access based on api_key ownership (join to api_keys which has company_id)
CREATE POLICY "api_rate_limits_select"
ON public.api_rate_limits FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.api_keys ak
    WHERE ak.id = api_rate_limits.api_key_id
    AND public.user_belongs_to_company(ak.company_id)
  )
);

CREATE POLICY "api_rate_limits_insert"
ON public.api_rate_limits FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.api_keys ak
    WHERE ak.id = api_rate_limits.api_key_id
    AND public.user_belongs_to_company(ak.company_id)
  )
);

CREATE POLICY "api_rate_limits_update"
ON public.api_rate_limits FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.api_keys ak
    WHERE ak.id = api_rate_limits.api_key_id
    AND public.user_belongs_to_company(ak.company_id)
  )
);

CREATE POLICY "api_rate_limits_delete"
ON public.api_rate_limits FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.api_keys ak
    WHERE ak.id = api_rate_limits.api_key_id
    AND public.user_belongs_to_company(ak.company_id)
  )
);

-- =============================================
-- 2. webhook_ingress - Fix INSERT policy
-- =============================================
DROP POLICY IF EXISTS "Service role can insert webhooks" ON public.webhook_ingress;

-- Webhooks are system-generated, restrict to service role only (not authenticated)
-- Since service_role bypasses RLS, we create a restrictive policy
CREATE POLICY "webhook_ingress_insert_service"
ON public.webhook_ingress FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "webhook_ingress_select_company"
ON public.webhook_ingress FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =============================================
-- 3. rate_limit_events - Fix INSERT policy
-- =============================================
DROP POLICY IF EXISTS "Service role can insert rate limits" ON public.rate_limit_events;

-- Rate limit events are system-generated
CREATE POLICY "rate_limit_events_insert_service"
ON public.rate_limit_events FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "rate_limit_events_select_company"
ON public.rate_limit_events FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- Add documentation
COMMENT ON TABLE public.api_rate_limits IS 'Rate limiting data for API keys - restricted by key ownership';
COMMENT ON TABLE public.webhook_ingress IS 'Incoming webhook data - service role insert, company-based read';
COMMENT ON TABLE public.rate_limit_events IS 'Rate limit event logs - service role insert, company-based read';
