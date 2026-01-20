-- =====================================================
-- PARTE 2: FUNÇÕES E PERMISSÕES
-- =====================================================

-- Dropar funções existentes para recriar
DROP FUNCTION IF EXISTS public.user_has_permission(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.get_user_permissions(uuid, uuid);
DROP FUNCTION IF EXISTS public.log_user_audit(uuid, uuid, text, text, text, jsonb, boolean);

-- Função para verificar permissão do usuário
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id UUID,
  p_company_id UUID,
  p_permission_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_permission BOOLEAN := false;
  v_custom_granted BOOLEAN;
BEGIN
  -- Buscar permissão do role do usuário
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN role_permissions rp ON rp.role_id = up.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE up.user_id = p_user_id
      AND up.company_id = p_company_id
      AND up.is_active = true
      AND p.code = p_permission_code
      AND (p.is_active IS NULL OR p.is_active = true)
  ) INTO v_has_permission;
  
  -- Verificar permissões customizadas
  SELECT upc.granted INTO v_custom_granted
  FROM user_permissions_custom upc
  JOIN user_profiles up ON up.id = upc.user_profile_id
  JOIN permissions p ON p.id = upc.permission_id
  WHERE up.user_id = p_user_id
    AND up.company_id = p_company_id
    AND p.code = p_permission_code;
  
  IF v_custom_granted IS NOT NULL THEN
    RETURN v_custom_granted;
  END IF;
  
  RETURN v_has_permission;
END;
$$;

-- Função para obter todas as permissões do usuário
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID, p_company_id UUID)
RETURNS TABLE (
  permission_id UUID,
  code TEXT,
  name TEXT,
  module TEXT,
  source TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH role_perms AS (
    SELECT p.id as perm_id, p.code as perm_code, p.name as perm_name, p.module as perm_module, 'role'::TEXT as perm_source
    FROM user_profiles up
    JOIN role_permissions rp ON rp.role_id = up.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE up.user_id = p_user_id
      AND up.company_id = p_company_id
      AND up.is_active = true
      AND (p.is_active IS NULL OR p.is_active = true)
  ),
  custom_add AS (
    SELECT p.id as perm_id, p.code as perm_code, p.name as perm_name, p.module as perm_module, 'custom'::TEXT as perm_source
    FROM user_permissions_custom upc
    JOIN user_profiles up ON up.id = upc.user_profile_id
    JOIN permissions p ON p.id = upc.permission_id
    WHERE up.user_id = p_user_id
      AND up.company_id = p_company_id
      AND upc.granted = true
  ),
  custom_remove AS (
    SELECT p.id as perm_id
    FROM user_permissions_custom upc
    JOIN user_profiles up ON up.id = upc.user_profile_id
    JOIN permissions p ON p.id = upc.permission_id
    WHERE up.user_id = p_user_id
      AND up.company_id = p_company_id
      AND upc.granted = false
  )
  SELECT rp.perm_id, rp.perm_code, rp.perm_name, rp.perm_module, rp.perm_source
  FROM role_perms rp
  WHERE rp.perm_id NOT IN (SELECT cr.perm_id FROM custom_remove cr)
  UNION
  SELECT ca.perm_id, ca.perm_code, ca.perm_name, ca.perm_module, ca.perm_source
  FROM custom_add ca;
END;
$$;

-- Função para registrar auditoria
CREATE OR REPLACE FUNCTION public.log_user_audit(
  p_company_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_resource TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_success BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO user_audit_log (company_id, user_id, action, resource, resource_id, details, success)
  VALUES (p_company_id, p_user_id, p_action, p_resource, p_resource_id, p_details, p_success)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Trigger para updated_at em user_profiles
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- =====================================================
-- INSERIR NOVAS PERMISSÕES
-- =====================================================
INSERT INTO public.permissions (code, name, module, resource, action, description) VALUES
-- Financeiro
('financeiro.contas_pagar.ver', 'Ver Contas a Pagar', 'financeiro', 'contas_pagar', 'ver', 'Visualizar contas a pagar'),
('financeiro.contas_pagar.criar', 'Criar Contas a Pagar', 'financeiro', 'contas_pagar', 'criar', 'Criar contas a pagar'),
('financeiro.contas_pagar.editar', 'Editar Contas a Pagar', 'financeiro', 'contas_pagar', 'editar', 'Editar contas a pagar'),
('financeiro.contas_pagar.deletar', 'Deletar Contas a Pagar', 'financeiro', 'contas_pagar', 'deletar', 'Excluir contas a pagar'),
('financeiro.contas_pagar.aprovar', 'Aprovar Pagamentos', 'financeiro', 'contas_pagar', 'aprovar', 'Aprovar pagamentos'),
('financeiro.contas_receber.ver', 'Ver Contas a Receber', 'financeiro', 'contas_receber', 'ver', 'Visualizar contas a receber'),
('financeiro.contas_receber.criar', 'Criar Contas a Receber', 'financeiro', 'contas_receber', 'criar', 'Criar contas a receber'),
('financeiro.contas_receber.editar', 'Editar Contas a Receber', 'financeiro', 'contas_receber', 'editar', 'Editar contas a receber'),
('financeiro.contas_receber.deletar', 'Deletar Contas a Receber', 'financeiro', 'contas_receber', 'deletar', 'Excluir contas a receber'),
('financeiro.contas_receber.aprovar', 'Aprovar Recebimentos', 'financeiro', 'contas_receber', 'aprovar', 'Aprovar recebimentos'),
('financeiro.tesouraria.ver', 'Ver Tesouraria', 'financeiro', 'tesouraria', 'ver', 'Visualizar tesouraria'),
('financeiro.tesouraria.criar', 'Criar Operações Tesouraria', 'financeiro', 'tesouraria', 'criar', 'Criar operações'),
('financeiro.tesouraria.editar', 'Editar Tesouraria', 'financeiro', 'tesouraria', 'editar', 'Editar operações'),
('financeiro.relatorios.ver', 'Ver Relatórios Financeiros', 'financeiro', 'relatorios', 'ver', 'Visualizar relatórios'),
('financeiro.fluxo_caixa.ver', 'Ver Fluxo de Caixa', 'financeiro', 'fluxo_caixa', 'ver', 'Visualizar fluxo'),
('financeiro.orcamento.ver', 'Ver Orçamentos', 'financeiro', 'orcamento', 'ver', 'Visualizar orçamentos'),
('financeiro.orcamento.criar', 'Criar Orçamentos', 'financeiro', 'orcamento', 'criar', 'Criar orçamentos'),
('financeiro.orcamento.editar', 'Editar Orçamentos', 'financeiro', 'orcamento', 'editar', 'Editar orçamentos'),
('financeiro.orcamento.aprovar', 'Aprovar Orçamentos', 'financeiro', 'orcamento', 'aprovar', 'Aprovar orçamentos'),
-- Vendas
('vendas.cotacoes.ver', 'Ver Cotações', 'vendas', 'cotacoes', 'ver', 'Visualizar cotações'),
('vendas.cotacoes.criar', 'Criar Cotações', 'vendas', 'cotacoes', 'criar', 'Criar cotações'),
('vendas.pedidos.ver', 'Ver Pedidos', 'vendas', 'pedidos', 'ver', 'Visualizar pedidos'),
('vendas.pedidos.criar', 'Criar Pedidos', 'vendas', 'pedidos', 'criar', 'Criar pedidos'),
('vendas.pedidos.aprovar', 'Aprovar Pedidos', 'vendas', 'pedidos', 'aprovar', 'Aprovar pedidos'),
('vendas.clientes.ver', 'Ver Clientes', 'vendas', 'clientes', 'ver', 'Visualizar clientes'),
('vendas.clientes.criar', 'Criar Clientes', 'vendas', 'clientes', 'criar', 'Cadastrar clientes'),
('vendas.comissoes.ver', 'Ver Comissões', 'vendas', 'comissoes', 'ver', 'Visualizar comissões'),
-- Compras
('compras.requisicoes.ver', 'Ver Requisições', 'compras', 'requisicoes', 'ver', 'Visualizar requisições'),
('compras.requisicoes.criar', 'Criar Requisições', 'compras', 'requisicoes', 'criar', 'Criar requisições'),
('compras.requisicoes.aprovar', 'Aprovar Requisições', 'compras', 'requisicoes', 'aprovar', 'Aprovar requisições'),
('compras.pedidos.ver', 'Ver Pedidos Compra', 'compras', 'pedidos', 'ver', 'Visualizar pedidos'),
('compras.pedidos.criar', 'Criar Pedidos Compra', 'compras', 'pedidos', 'criar', 'Criar pedidos'),
('compras.fornecedores.ver', 'Ver Fornecedores', 'compras', 'fornecedores', 'ver', 'Visualizar fornecedores'),
('compras.fornecedores.criar', 'Criar Fornecedores', 'compras', 'fornecedores', 'criar', 'Cadastrar fornecedores'),
-- Estoque
('estoque.produtos.ver', 'Ver Produtos', 'estoque', 'produtos', 'ver', 'Visualizar produtos'),
('estoque.produtos.criar', 'Criar Produtos', 'estoque', 'produtos', 'criar', 'Cadastrar produtos'),
('estoque.movimentacoes.ver', 'Ver Movimentações', 'estoque', 'movimentacoes', 'ver', 'Visualizar movimentações'),
('estoque.movimentacoes.criar', 'Criar Movimentações', 'estoque', 'movimentacoes', 'criar', 'Criar movimentações'),
('estoque.inventario.ver', 'Ver Inventário', 'estoque', 'inventario', 'ver', 'Visualizar inventário'),
-- Fiscal
('fiscal.nfe.ver', 'Ver NF-e', 'fiscal', 'nfe', 'ver', 'Visualizar NF-e'),
('fiscal.nfe.criar', 'Emitir NF-e', 'fiscal', 'nfe', 'criar', 'Emitir NF-e'),
('fiscal.nfse.ver', 'Ver NFS-e', 'fiscal', 'nfse', 'ver', 'Visualizar NFS-e'),
('fiscal.nfse.criar', 'Emitir NFS-e', 'fiscal', 'nfse', 'criar', 'Emitir NFS-e'),
('fiscal.apuracao.ver', 'Ver Apuração', 'fiscal', 'apuracao', 'ver', 'Visualizar apuração'),
('fiscal.sped.ver', 'Ver SPED', 'fiscal', 'sped', 'ver', 'Visualizar SPED'),
('fiscal.sped.criar', 'Gerar SPED', 'fiscal', 'sped', 'criar', 'Gerar arquivos SPED'),
('fiscal.certificados.ver', 'Ver Certificados', 'fiscal', 'certificados', 'ver', 'Visualizar certificados'),
('fiscal.certificados.configurar', 'Configurar Certificados', 'fiscal', 'certificados', 'configurar', 'Configurar certificados'),
-- Contabilidade
('contabilidade.lancamentos.ver', 'Ver Lançamentos', 'contabilidade', 'lancamentos', 'ver', 'Visualizar lançamentos'),
('contabilidade.lancamentos.criar', 'Criar Lançamentos', 'contabilidade', 'lancamentos', 'criar', 'Criar lançamentos'),
('contabilidade.balancete.ver', 'Ver Balancete', 'contabilidade', 'balancete', 'ver', 'Visualizar balancete'),
('contabilidade.dre.ver', 'Ver DRE', 'contabilidade', 'dre', 'ver', 'Visualizar DRE'),
('contabilidade.fechamento.ver', 'Ver Fechamento', 'contabilidade', 'fechamento', 'ver', 'Visualizar fechamento'),
('contabilidade.fechamento.aprovar', 'Aprovar Fechamento', 'contabilidade', 'fechamento', 'aprovar', 'Aprovar fechamento'),
-- RH
('rh.funcionarios.ver', 'Ver Funcionários', 'rh', 'funcionarios', 'ver', 'Visualizar funcionários'),
('rh.funcionarios.criar', 'Criar Funcionários', 'rh', 'funcionarios', 'criar', 'Cadastrar funcionários'),
('rh.folha.ver', 'Ver Folha', 'rh', 'folha', 'ver', 'Visualizar folha'),
('rh.folha.aprovar', 'Aprovar Folha', 'rh', 'folha', 'aprovar', 'Aprovar folha'),
('rh.ferias.ver', 'Ver Férias', 'rh', 'ferias', 'ver', 'Visualizar férias'),
('rh.ferias.aprovar', 'Aprovar Férias', 'rh', 'ferias', 'aprovar', 'Aprovar férias'),
-- Configurações
('config.usuarios.ver', 'Ver Usuários', 'config', 'usuarios', 'ver', 'Visualizar usuários'),
('config.usuarios.criar', 'Criar Usuários', 'config', 'usuarios', 'criar', 'Criar usuários'),
('config.usuarios.editar', 'Editar Usuários', 'config', 'usuarios', 'editar', 'Editar usuários'),
('config.usuarios.deletar', 'Deletar Usuários', 'config', 'usuarios', 'deletar', 'Excluir usuários'),
('config.papeis.ver', 'Ver Papéis', 'config', 'papeis', 'ver', 'Visualizar papéis'),
('config.papeis.criar', 'Criar Papéis', 'config', 'papeis', 'criar', 'Criar papéis'),
('config.papeis.editar', 'Editar Papéis', 'config', 'papeis', 'editar', 'Editar papéis'),
('config.empresa.ver', 'Ver Empresa', 'config', 'empresa', 'ver', 'Visualizar empresa'),
('config.empresa.editar', 'Editar Empresa', 'config', 'empresa', 'editar', 'Editar empresa'),
('config.integracoes.ver', 'Ver Integrações', 'config', 'integracoes', 'ver', 'Visualizar integrações'),
('config.integracoes.configurar', 'Configurar Integrações', 'config', 'integracoes', 'configurar', 'Configurar integrações'),
-- IA
('ia.whatsapp.ver', 'Ver Agente WhatsApp', 'ia', 'whatsapp', 'ver', 'Visualizar agente'),
('ia.whatsapp.configurar', 'Configurar WhatsApp', 'ia', 'whatsapp', 'configurar', 'Configurar agente'),
('ia.monitor.ver', 'Ver Monitor', 'ia', 'monitor', 'ver', 'Visualizar alertas'),
('ia.analista.ver', 'Usar Analista', 'ia', 'analista', 'ver', 'Usar agente analista'),
('ia.cfo.ver', 'Usar CFO Virtual', 'ia', 'cfo', 'ver', 'Usar CFO Virtual'),
-- Compliance
('compliance.auditoria.ver', 'Ver Auditoria', 'compliance', 'auditoria', 'ver', 'Visualizar auditoria'),
('compliance.anomalias.ver', 'Ver Anomalias', 'compliance', 'anomalias', 'ver', 'Visualizar anomalias'),
('compliance.seguranca.ver', 'Ver Segurança', 'compliance', 'seguranca', 'ver', 'Visualizar segurança')
ON CONFLICT (code) DO NOTHING;