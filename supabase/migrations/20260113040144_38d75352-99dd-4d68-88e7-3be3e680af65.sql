-- Corrigir política de companies para não permitir qualquer um criar empresa
DROP POLICY IF EXISTS "Admins podem criar empresas" ON companies;

-- Apenas service role ou admin de outra empresa pode criar (onboarding especial)
-- Na prática, criação de empresa é feita via edge function create-user
CREATE POLICY "Companies são criadas via sistema" ON companies
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Permite se o usuário já é admin de alguma empresa
    EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid() AND cu.role = 'admin'
    )
    OR
    -- Ou se é o primeiro registro (onboarding)
    NOT EXISTS (
      SELECT 1 FROM company_users WHERE user_id = auth.uid()
    )
  );

-- Melhorar política de audit_logs - apenas admins podem ver
DROP POLICY IF EXISTS "Audit logs SELECT for company users" ON audit_logs;

-- Manter apenas a política de admins para leitura
-- A política "Admins podem ver logs" já existe e é correta

-- Restringir navigation_items e navigation_profiles para usuários com empresa
DROP POLICY IF EXISTS "Navigation items are viewable by authenticated users" ON navigation_items;
DROP POLICY IF EXISTS "Navigation profiles are viewable by authenticated users" ON navigation_profiles;

CREATE POLICY "Navigation items for company users" ON navigation_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Navigation profiles for company users" ON navigation_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid())
  );

-- Restringir permissions para usuários com empresa
DROP POLICY IF EXISTS "Todos podem ver permissões" ON permissions;

CREATE POLICY "Permissions for company users" ON permissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid())
  );

-- Restringir company_module_templates para admins
DROP POLICY IF EXISTS "Authenticated users can view templates" ON company_module_templates;

CREATE POLICY "Module templates for admins" ON company_module_templates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Adicionar políticas de DELETE para cleanup de webhook_ingress (apenas admin)
CREATE POLICY "Admins can delete old webhooks" ON webhook_ingress
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
      AND company_id = webhook_ingress.company_id
    )
  );

-- Adicionar políticas de DELETE para rate_limit_events (apenas admin)
CREATE POLICY "Admins can delete rate limit events" ON rate_limit_events
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Corrigir login_attempts - permitir leitura para admins
DROP POLICY IF EXISTS "Block all access to login_attempts" ON login_attempts;

CREATE POLICY "Admins can view login attempts" ON login_attempts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );