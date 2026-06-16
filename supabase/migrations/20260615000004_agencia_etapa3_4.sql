-- AGÊNCIA Etapa 3+4: rentabilidade da conta + agente de IA
-- ai_agency_account_economics: receita (fee) vs custo (horas aprovadas do projeto
--   via cost_rate_snapshot + gasto de mídia), margem, LTV estimado
-- ai_run_agency_agent: gera recomendações na Caixa de Decisões (atraso de
--   entregas, aprovações fora de SLA, margem baixa)

-- Segurança: as funções de agência recebem grant DIRETO a anon (anon=X),
-- não via PUBLIC. Revoga de anon diretamente.
DO $$
DECLARE fn TEXT;
BEGIN
  FOR fn IN SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')'
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN
      ('ai_agency_account_economics','ai_run_agency_agent','ai_provision_agency_account',
       'ai_agency_overview','ai_agency_account_health')
  LOOP EXECUTE 'REVOKE EXECUTE ON FUNCTION '||fn||' FROM anon'; END LOOP;
END $$;
