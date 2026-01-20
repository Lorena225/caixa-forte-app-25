-- =====================================================
-- PARTE 1: CRIAR TABELAS FALTANTES
-- =====================================================

-- 1. Adicionar colunas à tabela permissions existente
ALTER TABLE public.permissions 
  ADD COLUMN IF NOT EXISTS resource TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Criar tabela user_profiles (perfis estendidos)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  access_expires_at TIMESTAMPTZ,
  last_access_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- 3. Criar tabela user_permissions_custom (permissões personalizadas)
CREATE TABLE IF NOT EXISTS public.user_permissions_custom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_profile_id, permission_id)
);

-- 4. Criar tabela user_audit_log (trilha de auditoria)
CREATE TABLE IF NOT EXISTS public.user_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON public.user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_custom_profile ON public.user_permissions_custom(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_company ON public.user_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_user ON public.user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_created ON public.user_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON public.permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON public.permissions(resource);

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions_custom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_log ENABLE ROW LEVEL SECURITY;

-- User Profiles
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
CREATE POLICY "user_profiles_select_policy" ON public.user_profiles FOR SELECT
  USING (public.user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_policy" ON public.user_profiles FOR INSERT
  WITH CHECK (public.user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;
CREATE POLICY "user_profiles_update_policy" ON public.user_profiles FOR UPDATE
  USING (public.user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.user_profiles;
CREATE POLICY "user_profiles_delete_policy" ON public.user_profiles FOR DELETE
  USING (public.user_belongs_to_company(company_id));

-- User Permissions Custom
DROP POLICY IF EXISTS "user_permissions_custom_select_policy" ON public.user_permissions_custom;
CREATE POLICY "user_permissions_custom_select_policy" ON public.user_permissions_custom FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_profile_id AND public.user_belongs_to_company(up.company_id)
  ));

DROP POLICY IF EXISTS "user_permissions_custom_insert_policy" ON public.user_permissions_custom;
CREATE POLICY "user_permissions_custom_insert_policy" ON public.user_permissions_custom FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_profile_id AND public.user_belongs_to_company(up.company_id)
  ));

DROP POLICY IF EXISTS "user_permissions_custom_update_policy" ON public.user_permissions_custom;
CREATE POLICY "user_permissions_custom_update_policy" ON public.user_permissions_custom FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_profile_id AND public.user_belongs_to_company(up.company_id)
  ));

DROP POLICY IF EXISTS "user_permissions_custom_delete_policy" ON public.user_permissions_custom;
CREATE POLICY "user_permissions_custom_delete_policy" ON public.user_permissions_custom FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_profile_id AND public.user_belongs_to_company(up.company_id)
  ));

-- User Audit Log
DROP POLICY IF EXISTS "user_audit_log_select_policy" ON public.user_audit_log;
CREATE POLICY "user_audit_log_select_policy" ON public.user_audit_log FOR SELECT
  USING (public.user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "user_audit_log_insert_policy" ON public.user_audit_log;
CREATE POLICY "user_audit_log_insert_policy" ON public.user_audit_log FOR INSERT
  WITH CHECK (public.user_belongs_to_company(company_id));