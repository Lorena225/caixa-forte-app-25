-- Correções de segurança a partir dos advisors do Supabase.

-- 1) Policy de INSERT irrestrita no agent_action_log → restrita por empresa.
DROP POLICY IF EXISTS aal_insert_service ON public.agent_action_log;
CREATE POLICY aal_insert_company ON public.agent_action_log
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- 2) Tabela com RLS sem policy → policy multiempresa.
DROP POLICY IF EXISTS loan_mtm_all ON public.loan_mark_to_market;
CREATE POLICY loan_mtm_all ON public.loan_mark_to_market
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- 3) Causa raiz dos avisos anon: EXECUTE concedido a PUBLIC em funções SECURITY
-- DEFINER. Revoga de PUBLIC garantindo grant explícito a authenticated/service_role.
DO $$
DECLARE fn TEXT;
BEGIN
  FOR fn IN
    SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    BEGIN
      EXECUTE 'GRANT EXECUTE ON FUNCTION '||fn||' TO authenticated';
      EXECUTE 'GRANT EXECUTE ON FUNCTION '||fn||' TO service_role';
      EXECUTE 'REVOKE EXECUTE ON FUNCTION '||fn||' FROM PUBLIC';
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END $$;
