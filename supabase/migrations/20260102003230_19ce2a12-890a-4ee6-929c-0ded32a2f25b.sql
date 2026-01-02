-- =====================================================
-- FASE 2B: RBAC - TABELAS RESTANTES
-- =====================================================

-- 1. Criar enum para roles da aplicação (se não existir)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'operador', 'visualizador', 'auditor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela de Papéis customizáveis por empresa
CREATE TABLE public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  base_role public.app_role,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, name)
);

-- 3. Adicionar coluna granted a role_permissions
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS granted BOOLEAN DEFAULT true;

-- 4. Atualizar role_permissions para referenciar custom_roles
-- Primeiro dropar a constraint existente se houver
ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.custom_roles(id) ON DELETE CASCADE;

-- 5. Papéis atribuídos aos usuários (por empresa)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id, role_id)
);

-- 6. Acesso por filial
CREATE TABLE public.user_branch_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  access_level TEXT DEFAULT 'full' CHECK (access_level IN ('full', 'read', 'none')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, branch_id)
);

-- 7. Limites por usuário
CREATE TABLE public.user_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approve_limit_amount NUMERIC(15,2) DEFAULT 0,
  execute_limit_amount NUMERIC(15,2) DEFAULT 0,
  daily_limit_amount NUMERIC(15,2),
  limit_by_branch_json JSONB DEFAULT '{}',
  limit_by_category_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- 8. Políticas de visibilidade de campos
CREATE TABLE public.field_visibility_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  mask_documents BOOLEAN DEFAULT true,
  mask_bank_accounts BOOLEAN DEFAULT true,
  mask_in_exports BOOLEAN DEFAULT true,
  visible_roles_json JSONB DEFAULT '["admin"]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

-- 9. Políticas SoD
CREATE TABLE public.sod_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  policy_key TEXT NOT NULL,
  description TEXT,
  conflicts_json JSONB NOT NULL DEFAULT '[]',
  enforcement TEXT DEFAULT 'block' CHECK (enforcement IN ('block', 'warn', 'require_exception')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, policy_key)
);

-- 10. Exceções SoD
CREATE TABLE public.sod_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.sod_policies(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branch_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_visibility_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sod_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sod_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view roles for their company" ON public.custom_roles FOR SELECT USING (public.user_has_company_access(company_id));
CREATE POLICY "Admins can manage roles" ON public.custom_roles FOR ALL USING (public.user_can_write(company_id));

CREATE POLICY "Users can view user roles" ON public.user_roles FOR SELECT USING (public.user_has_company_access(company_id));
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL USING (public.user_can_write(company_id));

CREATE POLICY "Users can view branch access" ON public.user_branch_access FOR SELECT USING (public.user_has_company_access(company_id));
CREATE POLICY "Admins can manage branch access" ON public.user_branch_access FOR ALL USING (public.user_can_write(company_id));

CREATE POLICY "Users can view limits" ON public.user_limits FOR SELECT USING (public.user_has_company_access(company_id));
CREATE POLICY "Admins can manage limits" ON public.user_limits FOR ALL USING (public.user_can_write(company_id));

CREATE POLICY "Users can view field policies" ON public.field_visibility_policies FOR SELECT USING (public.user_has_company_access(company_id));
CREATE POLICY "Admins can manage field policies" ON public.field_visibility_policies FOR ALL USING (public.user_can_write(company_id));

CREATE POLICY "Users can view sod policies" ON public.sod_policies FOR SELECT USING (public.user_has_company_access(company_id));
CREATE POLICY "Admins can manage sod policies" ON public.sod_policies FOR ALL USING (public.user_can_write(company_id));

CREATE POLICY "Users can view sod exceptions" ON public.sod_exceptions FOR SELECT USING (public.user_has_company_access(company_id));
CREATE POLICY "Admins can manage sod exceptions" ON public.sod_exceptions FOR ALL USING (public.user_can_write(company_id));

-- Triggers
CREATE TRIGGER update_custom_roles_updated_at BEFORE UPDATE ON public.custom_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_branch_access_updated_at BEFORE UPDATE ON public.user_branch_access FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_limits_updated_at BEFORE UPDATE ON public.user_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_field_visibility_policies_updated_at BEFORE UPDATE ON public.field_visibility_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sod_policies_updated_at BEFORE UPDATE ON public.sod_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função helper para verificar permissão do usuário
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id UUID, p_company_id UUID, p_permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id
    AND ur.company_id = p_company_id
    AND ur.is_active = true
    AND COALESCE(rp.granted, true) = true
    AND p.code = p_permission_code
  )
$$;