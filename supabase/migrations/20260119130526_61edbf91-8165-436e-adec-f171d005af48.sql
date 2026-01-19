-- =============================================================================
-- SECURITY FIX COMPLETO: Mascaramento de dados e view segura
-- =============================================================================

-- 1. Função para mascarar dados sensíveis (SECURITY INVOKER - seguro)
CREATE OR REPLACE FUNCTION public.mask_sensitive_audit_data(data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  sensitive_keys TEXT[] := ARRAY[
    'credentials_encrypted', 'credentials_meta', 'key_hash', 'api_key',
    'password', 'senha', 'secret', 'token', 'access_token', 'refresh_token',
    'private_key', 'encryption_key', 'openai_key', 'ai_key',
    'account_number', 'numero_conta', 'bank_account', 'conta_bancaria',
    'pix_key', 'chave_pix', 'pix_chave',
    'cpf', 'cnpj', 'rg', 'cnh', 'pis', 'nis',
    'credit_card', 'cartao_credito', 'card_number', 'cvv', 'cvc'
  ];
  key_name TEXT;
  result JSONB := data;
BEGIN
  IF data IS NULL THEN
    RETURN NULL;
  END IF;
  
  FOREACH key_name IN ARRAY sensitive_keys LOOP
    IF result ? key_name THEN
      result := jsonb_set(result, ARRAY[key_name], '"[MASKED]"'::jsonb);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.mask_sensitive_audit_data(jsonb) IS 
'SECURITY INVOKER: Função segura de mascaramento que não requer privilégios elevados. Mascara campos sensíveis (senhas, chaves API, dados bancários, documentos pessoais) em payloads JSONB.';

-- 2. View segura para audit logs (SECURITY INVOKER)
DROP VIEW IF EXISTS public.audit_logs_safe;
CREATE VIEW public.audit_logs_safe
WITH (security_invoker = on)
AS
SELECT 
  id,
  company_id,
  table_name,
  record_id,
  action,
  CASE 
    WHEN sensitivity_level = 'high' AND NOT public.has_role(auth.uid(), 'admin')
    THEN '{"masked": "Access restricted to administrators"}'::jsonb
    ELSE old_data
  END as old_data,
  CASE 
    WHEN sensitivity_level = 'high' AND NOT public.has_role(auth.uid(), 'admin')
    THEN '{"masked": "Access restricted to administrators"}'::jsonb
    ELSE new_data
  END as new_data,
  user_id,
  sensitivity_level,
  created_at
FROM public.audit_logs;

COMMENT ON VIEW public.audit_logs_safe IS 
'View segura para consulta de audit logs. Usa SECURITY INVOKER para respeitar RLS e mascara dados de alta sensibilidade para usuários não-admin.';

-- 3. Documentar funções SECURITY DEFINER
COMMENT ON FUNCTION public.user_belongs_to_company(uuid) IS 
'SECURITY DEFINER required: Esta função precisa acessar company_users sem RLS para validar associação usuário-empresa em políticas RLS de outras tabelas, evitando recursão infinita.';

COMMENT ON FUNCTION public.has_role(uuid, text) IS 
'SECURITY DEFINER required: Esta função precisa acessar user_roles e roles sem RLS para validar papéis em políticas RLS, evitando recursão infinita de políticas.';

COMMENT ON FUNCTION public.audit_sensitive_changes() IS 
'SECURITY DEFINER required: Trigger de auditoria precisa inserir em audit_logs independentemente das políticas RLS do usuário, garantindo rastreabilidade completa de todas as operações.';