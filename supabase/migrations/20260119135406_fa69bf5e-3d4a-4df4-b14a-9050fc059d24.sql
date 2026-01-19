
-- =============================================================================
-- CORREÇÃO DE SEGURANÇA: RBAC para bank_accounts e funcionarios
-- Usa has_role com TEXT (não enum)
-- =============================================================================

-- =============================================================================
-- BANK_ACCOUNTS: Restringir a admin e finance
-- =============================================================================

-- Dropar políticas existentes
DROP POLICY IF EXISTS "company_access" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_select" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_insert" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_update" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_delete" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_select_rbac" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_insert_rbac" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_update_rbac" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_delete_rbac" ON public.bank_accounts;

-- Garantir RLS ativo
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- SELECT: apenas admin ou finance da empresa
CREATE POLICY "bank_accounts_select_rbac" 
ON public.bank_accounts 
FOR SELECT 
TO authenticated
USING (
  user_belongs_to_company(company_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance')
  )
);

-- INSERT: apenas admin ou finance da empresa
CREATE POLICY "bank_accounts_insert_rbac" 
ON public.bank_accounts 
FOR INSERT 
TO authenticated
WITH CHECK (
  user_belongs_to_company(company_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance')
  )
);

-- UPDATE: apenas admin ou finance da empresa
CREATE POLICY "bank_accounts_update_rbac" 
ON public.bank_accounts 
FOR UPDATE 
TO authenticated
USING (
  user_belongs_to_company(company_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance')
  )
)
WITH CHECK (
  user_belongs_to_company(company_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance')
  )
);

-- DELETE: apenas admin ou finance da empresa
CREATE POLICY "bank_accounts_delete_rbac" 
ON public.bank_accounts 
FOR DELETE 
TO authenticated
USING (
  user_belongs_to_company(company_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance')
  )
);

-- =============================================================================
-- FUNCIONARIOS: Restringir a admin e hr
-- =============================================================================

-- Dropar políticas existentes
DROP POLICY IF EXISTS "funcionarios_company_isolation" ON public.funcionarios;
DROP POLICY IF EXISTS "Company users can view funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Company users can insert funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Company users can update funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Company users can delete funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "funcionarios_select_rbac" ON public.funcionarios;
DROP POLICY IF EXISTS "funcionarios_insert_rbac" ON public.funcionarios;
DROP POLICY IF EXISTS "funcionarios_update_rbac" ON public.funcionarios;
DROP POLICY IF EXISTS "funcionarios_delete_rbac" ON public.funcionarios;

-- Garantir RLS ativo
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

-- SELECT: apenas admin ou hr da empresa
CREATE POLICY "funcionarios_select_rbac" 
ON public.funcionarios 
FOR SELECT 
TO authenticated
USING (
  user_belongs_to_company(company_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
  )
);

-- INSERT: apenas admin ou hr da empresa
CREATE POLICY "funcionarios_insert_rbac" 
ON public.funcionarios 
FOR INSERT 
TO authenticated
WITH CHECK (
  user_belongs_to_company(company_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
  )
);

-- UPDATE: apenas admin ou hr da empresa
CREATE POLICY "funcionarios_update_rbac" 
ON public.funcionarios 
FOR UPDATE 
TO authenticated
USING (
  user_belongs_to_company(company_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
  )
)
WITH CHECK (
  user_belongs_to_company(company_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
  )
);

-- DELETE: apenas admin ou hr da empresa
CREATE POLICY "funcionarios_delete_rbac" 
ON public.funcionarios 
FOR DELETE 
TO authenticated
USING (
  user_belongs_to_company(company_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
  )
);

-- Documentação
COMMENT ON TABLE public.bank_accounts IS 
'Contas bancárias com credenciais criptografadas. 
RLS RBAC: acesso restrito a usuários com role admin ou finance da mesma empresa.';

COMMENT ON TABLE public.funcionarios IS 
'Dados pessoais de funcionários (CPF, RG, dados bancários). 
RLS RBAC: acesso restrito a usuários com role admin ou hr da mesma empresa.';
