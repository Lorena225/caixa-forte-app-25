-- Segurança: revoga EXECUTE de anon nas RPCs criadas nas sessões de desenvolvimento.
-- O default privilege do Supabase concede EXECUTE a anon para toda função nova;
-- este revoke em massa endereça o aviso security_definer/anon dos advisors.
-- Todas as funções exigem usuário autenticado e filtram por company_id.
DO $$
DECLARE fn TEXT; nossas TEXT[] := ARRAY[
  'ai_run_tax_assessment','ai_dashboard_pulse','ai_approve_action','ai_reject_action',
  'ai_revert_action','ai_inbox_summary','ai_run_all_agents','ai_delinquency_forecast',
  'ai_cashflow_summary','ai_cashflow_projection','ai_compensate_advance','ai_post_accounting_entry',
  'ai_accounting_reconciliation','ai_accounting_closing_check','ai_onboarding_status',
  'ai_seed_tax_parameters','ai_get_assessment','ai_run_project_agent','ai_run_delinquency_agent'];
BEGIN
  FOR fn IN SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')'
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname=ANY(nossas)
  LOOP EXECUTE 'REVOKE EXECUTE ON FUNCTION '||fn||' FROM anon'; END LOOP;
END $$;
