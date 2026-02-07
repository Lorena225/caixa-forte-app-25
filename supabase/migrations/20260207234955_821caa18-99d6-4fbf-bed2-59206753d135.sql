-- =====================================================
-- MÓDULO DE CONFIGURAÇÕES & GOVERNANÇA - MIGRAÇÃO
-- =====================================================

-- 1. TABELA DE CERTIFICADOS DIGITAIS
CREATE TABLE IF NOT EXISTS public.digital_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL DEFAULT 'A1' CHECK (certificate_type IN ('A1', 'A3')),
  certificate_name TEXT NOT NULL,
  serial_number TEXT,
  issuer TEXT,
  subject TEXT,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ NOT NULL,
  encrypted_pfx_data TEXT, -- Encrypted using pgcrypto
  pfx_password_encrypted TEXT, -- Encrypted password
  thumbprint TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for digital_certificates
ALTER TABLE public.digital_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "digital_certificates_company_isolation" ON public.digital_certificates
  FOR ALL USING (public.user_belongs_to_company(company_id));

-- 2. TABELA DE SMTP CUSTOMIZADO
CREATE TABLE IF NOT EXISTS public.company_smtp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT NOT NULL,
  smtp_password_encrypted TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  use_tls BOOLEAN DEFAULT true,
  use_ssl BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.company_smtp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "smtp_settings_company_isolation" ON public.company_smtp_settings
  FOR ALL USING (public.user_belongs_to_company(company_id));

-- 3. TABELA DE HEALTH CHECK DE INTEGRAÇÕES
CREATE TABLE IF NOT EXISTS public.integration_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'auth_error', 'timeout', 'unknown')),
  response_time_ms INTEGER,
  error_message TEXT,
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  checked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.integration_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_checks_company_isolation" ON public.integration_health_checks
  FOR ALL USING (public.user_belongs_to_company(company_id));

-- Índice para consultas recentes
CREATE INDEX IF NOT EXISTS idx_health_checks_recent 
  ON public.integration_health_checks(company_id, integration_key, last_checked_at DESC);

-- 4. ADICIONAR CAMPOS DE SOFT DELETE NAS TABELAS PRINCIPAIS
-- Função para verificar vínculos antes de exclusão
CREATE OR REPLACE FUNCTION public.check_record_dependencies(
  p_table_name TEXT,
  p_record_id UUID,
  p_company_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '{"has_dependencies": false, "dependencies": []}'::JSONB;
  v_count INTEGER;
  v_dependencies JSONB := '[]'::JSONB;
BEGIN
  -- Check for cost_centers
  IF p_table_name = 'cost_centers' THEN
    SELECT COUNT(*) INTO v_count FROM transactions WHERE cost_center_id = p_record_id;
    IF v_count > 0 THEN
      v_dependencies := v_dependencies || jsonb_build_object('table', 'transactions', 'count', v_count);
    END IF;
    
    SELECT COUNT(*) INTO v_count FROM projects WHERE cost_center_id = p_record_id;
    IF v_count > 0 THEN
      v_dependencies := v_dependencies || jsonb_build_object('table', 'projects', 'count', v_count);
    END IF;
  END IF;

  -- Check for accounts (chart of accounts)
  IF p_table_name = 'accounts' THEN
    SELECT COUNT(*) INTO v_count FROM transactions WHERE debit_account_id = p_record_id OR credit_account_id = p_record_id;
    IF v_count > 0 THEN
      v_dependencies := v_dependencies || jsonb_build_object('table', 'transactions', 'count', v_count);
    END IF;
    
    SELECT COUNT(*) INTO v_count FROM journal_entries WHERE debit_account_id = p_record_id OR credit_account_id = p_record_id;
    IF v_count > 0 THEN
      v_dependencies := v_dependencies || jsonb_build_object('table', 'journal_entries', 'count', v_count);
    END IF;
  END IF;

  -- Check for bank_accounts
  IF p_table_name = 'bank_accounts' THEN
    SELECT COUNT(*) INTO v_count FROM bank_transactions WHERE bank_account_id = p_record_id;
    IF v_count > 0 THEN
      v_dependencies := v_dependencies || jsonb_build_object('table', 'bank_transactions', 'count', v_count);
    END IF;
  END IF;

  -- Check for product_categories
  IF p_table_name = 'product_categories' THEN
    SELECT COUNT(*) INTO v_count FROM products WHERE category_id = p_record_id;
    IF v_count > 0 THEN
      v_dependencies := v_dependencies || jsonb_build_object('table', 'products', 'count', v_count);
    END IF;
  END IF;

  IF jsonb_array_length(v_dependencies) > 0 THEN
    v_result := jsonb_build_object(
      'has_dependencies', true,
      'dependencies', v_dependencies,
      'can_delete', false,
      'can_archive', true
    );
  END IF;

  RETURN v_result;
END;
$$;

-- 5. ADICIONAR CAMPO archived_at ONDE NÃO EXISTE
DO $$
BEGIN
  -- cost_centers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cost_centers' AND column_name = 'archived_at') THEN
    ALTER TABLE public.cost_centers ADD COLUMN archived_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cost_centers' AND column_name = 'archived_by') THEN
    ALTER TABLE public.cost_centers ADD COLUMN archived_by UUID REFERENCES auth.users(id);
  END IF;

  -- accounts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'archived_at') THEN
    ALTER TABLE public.accounts ADD COLUMN archived_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'archived_by') THEN
    ALTER TABLE public.accounts ADD COLUMN archived_by UUID REFERENCES auth.users(id);
  END IF;

  -- bank_accounts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'archived_at') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN archived_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'archived_by') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN archived_by UUID REFERENCES auth.users(id);
  END IF;
END
$$;

-- 6. TRIGGER AUTOMÁTICO DE AUDIT LOG
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_company_id UUID;
  v_user_id UUID;
  v_action TEXT;
BEGIN
  -- Get user from session
  v_user_id := auth.uid();
  
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
    v_new_data := to_jsonb(NEW);
    v_old_data := NULL;
    v_company_id := COALESCE(NEW.company_id, (v_new_data->>'company_id')::UUID);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_company_id := COALESCE(NEW.company_id, OLD.company_id);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    v_company_id := OLD.company_id;
  END IF;

  -- Skip if no company_id
  IF v_company_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    company_id,
    user_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    operation_type,
    created_at
  ) VALUES (
    v_company_id,
    v_user_id,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_old_data,
    v_new_data,
    TG_OP,
    now()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the main operation if audit fails
    RAISE WARNING 'Audit log failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to critical tables
DO $$
DECLARE
  tables_to_audit TEXT[] := ARRAY[
    'accounts', 'cost_centers', 'bank_accounts', 'transactions', 
    'counterparties', 'products', 'roles', 'user_roles', 'permissions',
    'integration_credentials', 'digital_certificates'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables_to_audit
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON public.%I', tbl);
    EXECUTE format('
      CREATE TRIGGER audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function()
    ', tbl);
  END LOOP;
END
$$;

-- 7. ADICIONAR CAMPOS DE CONTROLE DE ACESSO AOS USER PROFILES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_login_at') THEN
    ALTER TABLE public.user_profiles ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_login_ip') THEN
    ALTER TABLE public.user_profiles ADD COLUMN last_login_ip INET;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'mfa_enabled') THEN
    ALTER TABLE public.user_profiles ADD COLUMN mfa_enabled BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'mfa_secret_encrypted') THEN
    ALTER TABLE public.user_profiles ADD COLUMN mfa_secret_encrypted TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'login_count') THEN
    ALTER TABLE public.user_profiles ADD COLUMN login_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'password_changed_at') THEN
    ALTER TABLE public.user_profiles ADD COLUMN password_changed_at TIMESTAMPTZ;
  END IF;
END
$$;

-- 8. FUNÇÃO PARA TESTAR SAÚDE DE INTEGRAÇÃO
CREATE OR REPLACE FUNCTION public.log_integration_health_check(
  p_company_id UUID,
  p_integration_key TEXT,
  p_status TEXT,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.integration_health_checks (
    company_id,
    integration_key,
    status,
    response_time_ms,
    error_message,
    checked_by,
    last_checked_at
  ) VALUES (
    p_company_id,
    p_integration_key,
    p_status,
    p_response_time_ms,
    p_error_message,
    auth.uid(),
    now()
  ) RETURNING id INTO v_id;
  
  -- Update integration_credentials last_used_at
  UPDATE public.integration_credentials
  SET last_used_at = now()
  WHERE company_id = p_company_id AND integration_key = p_integration_key;
  
  RETURN v_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_record_dependencies(TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_integration_health_check(UUID, TEXT, TEXT, INTEGER, TEXT) TO authenticated;