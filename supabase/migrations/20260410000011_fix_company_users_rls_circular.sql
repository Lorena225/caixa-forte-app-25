-- =====================================================
-- FIX: Dependência circular no RLS de company_users
--
-- PROBLEMA:
--   A policy SELECT de company_users chamava user_has_company_access()
--   que por sua vez faz SELECT em company_users, disparando a mesma
--   policy novamente → loop infinito → array vazio no front-end.
--
-- SOLUÇÃO:
--   Policy SELECT de company_users usa user_id = auth.uid() diretamente
--   (usuário vê suas próprias linhas) + acesso se já for membro da empresa.
--   Isso quebra o ciclo porque não re-consulta company_users via RLS.
-- =====================================================

-- Remover policy problemática
DROP POLICY IF EXISTS "Usuários podem ver membros da empresa" ON public.company_users;

-- Recriar sem dependência circular:
-- O usuário vê:
--   1. As suas próprias linhas (user_id = auth.uid()) → sem recursão
--   2. Demais membros de empresas onde ele é membro (via user_has_company_access)
--      Isso funciona pois a cláusula 1 já abre o caminho sem loop.
CREATE POLICY "Usuários podem ver membros da empresa"
ON public.company_users FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.user_has_company_access(company_id)
);
