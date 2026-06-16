-- CAMADA DE INTEGRAÇÕES — tabelas de domínio sobre a infra existente
-- (integrations, integration_credentials, integration_logs, webhook_events).
-- Adiciona kommo/meta/google_ads/ga4 ao enum integration_provider.
-- Tabelas: external_entities_map (de-para ID externo↔interno), field_mappings,
-- lead_sources (CRM origem+UTM), payment_events (Pagar.me), ad_metrics (Meta).
-- RPCs: ai_crm_win_to_client (lead ganho → cliente, idempotente),
-- ai_integrations_overview (Hub). Todas RLS multiempresa + revoke anon.
-- NOTA: a conexão real com Kommo/Pagar.me/Meta exige credenciais OAuth e
-- edge functions de webhook — esta migration é a fundação de dados.

-- Segurança: revoga grant direto de anon nas funções (default do Supabase)
REVOKE EXECUTE ON FUNCTION public.ai_crm_win_to_client(UUID,TEXT,TEXT,TEXT,NUMERIC) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ai_integrations_overview(UUID) FROM anon;
