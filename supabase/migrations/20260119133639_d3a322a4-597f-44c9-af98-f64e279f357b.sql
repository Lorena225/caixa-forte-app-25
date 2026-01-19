-- =============================================================================
-- FIX CRÍTICO: Políticas RLS completas para tabela profiles
-- Garante isolamento total de dados de perfil por empresa
-- =============================================================================

-- Dropar políticas existentes para recriar com segurança
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem inserir próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem deletar próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_company_colleagues" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- Garantir RLS ativo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Usuário pode ver seu próprio perfil
CREATE POLICY "profiles_select_own" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (id = auth.uid());

-- 2. SELECT: Usuários da mesma empresa podem ver perfis uns dos outros
CREATE POLICY "profiles_select_company_colleagues" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.company_users cu1
    JOIN public.company_users cu2 ON cu1.company_id = cu2.company_id
    WHERE cu1.user_id = auth.uid()
      AND cu2.user_id = profiles.id
  )
);

-- 3. INSERT: Usuário só pode criar seu próprio perfil
CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (id = auth.uid());

-- 4. UPDATE: Usuário só pode atualizar seu próprio perfil
CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 5. DELETE: Usuário só pode deletar seu próprio perfil
CREATE POLICY "profiles_delete_own" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (id = auth.uid());

-- Documentação da segurança aplicada
COMMENT ON TABLE public.profiles IS 
'Tabela de perfis de usuário com RLS restritivo: 
- SELECT: próprio perfil OU colegas da mesma empresa via company_users
- INSERT/UPDATE/DELETE: apenas próprio perfil (id = auth.uid())
- Isolamento total por empresa garantido via join em company_users';