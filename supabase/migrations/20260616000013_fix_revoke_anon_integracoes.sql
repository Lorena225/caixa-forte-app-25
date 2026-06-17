-- Segurança: revoga anon E PUBLIC das funções de integração (cobre as duas
-- fontes do default privilege do Supabase de uma vez).
REVOKE EXECUTE ON FUNCTION public.ai_crm_win_to_client(UUID,TEXT,TEXT,TEXT,NUMERIC) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ai_integrations_overview(UUID) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_crm_win_to_client(UUID,TEXT,TEXT,TEXT,NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_integrations_overview(UUID) TO authenticated, service_role;
