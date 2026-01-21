// ============================================================
// API Routes Definition
// Complete specification of all public API endpoints
// ============================================================

import type { APIEndpoint } from '@/types/api';

export const API_VERSION = 'v1';
export const API_BASE_URL = '/api/v1';

// ==================== FINANCEIRO ====================

export const financeiroRoutes: APIEndpoint[] = [
  // Contas a Pagar
  {
    path: '/financeiro/contas-pagar',
    method: 'GET',
    description: 'Listar contas a pagar da empresa',
    scope: 'financeiro:read',
    parameters: [
      { name: 'page', in: 'query', type: 'integer', required: false, description: 'Página (default: 1)' },
      { name: 'limit', in: 'query', type: 'integer', required: false, description: 'Itens por página (default: 20, max: 100)' },
      { name: 'status', in: 'query', type: 'string', required: false, description: 'Filtrar por status: pendente, pago, vencido, cancelado' },
      { name: 'data_inicio', in: 'query', type: 'date', required: false, description: 'Data de vencimento inicial (YYYY-MM-DD)' },
      { name: 'data_fim', in: 'query', type: 'date', required: false, description: 'Data de vencimento final (YYYY-MM-DD)' },
      { name: 'fornecedor_id', in: 'query', type: 'uuid', required: false, description: 'Filtrar por fornecedor' },
      { name: 'sort_by', in: 'query', type: 'string', required: false, description: 'Campo para ordenação' },
      { name: 'sort_order', in: 'query', type: 'string', required: false, description: 'asc ou desc' },
    ],
    responses: [
      { status: 200, description: 'Lista de contas a pagar', schema: 'ContaPagar[]' },
      { status: 401, description: 'Não autorizado' },
    ],
  },
  {
    path: '/financeiro/contas-pagar/:id',
    method: 'GET',
    description: 'Detalhes de uma conta a pagar',
    scope: 'financeiro:read',
    parameters: [
      { name: 'id', in: 'path', type: 'uuid', required: true, description: 'ID da conta a pagar' },
    ],
    responses: [
      { status: 200, description: 'Detalhes da conta', schema: 'ContaPagar' },
      { status: 404, description: 'Conta não encontrada' },
    ],
  },
  {
    path: '/financeiro/contas-pagar',
    method: 'POST',
    description: 'Criar nova conta a pagar',
    scope: 'financeiro:write',
    requestBody: {
      type: 'object',
      required: ['descricao', 'valor', 'vencimento'],
      properties: {
        descricao: { type: 'string', description: 'Descrição da conta' },
        valor: { type: 'number', description: 'Valor em reais' },
        vencimento: { type: 'date', description: 'Data de vencimento (YYYY-MM-DD)' },
        fornecedor_id: { type: 'uuid', description: 'ID do fornecedor' },
        categoria_id: { type: 'uuid', description: 'ID da categoria' },
        centro_custo_id: { type: 'uuid', description: 'ID do centro de custo' },
        observacoes: { type: 'string', description: 'Observações adicionais' },
        recorrente: { type: 'boolean', description: 'Se é conta recorrente' },
        parcelas: { type: 'integer', description: 'Número de parcelas (se parcelado)' },
      },
    },
    responses: [
      { status: 201, description: 'Conta criada', schema: 'ContaPagar' },
      { status: 400, description: 'Dados inválidos' },
    ],
  },
  {
    path: '/financeiro/contas-pagar/:id',
    method: 'PATCH',
    description: 'Atualizar conta a pagar',
    scope: 'financeiro:write',
    parameters: [
      { name: 'id', in: 'path', type: 'uuid', required: true, description: 'ID da conta a pagar' },
    ],
    requestBody: {
      type: 'object',
      required: [],
      properties: {
        descricao: { type: 'string', description: 'Descrição da conta' },
        valor: { type: 'number', description: 'Valor em reais' },
        vencimento: { type: 'date', description: 'Data de vencimento' },
        status: { type: 'string', description: 'Status: pendente, pago, cancelado' },
      },
    },
    responses: [
      { status: 200, description: 'Conta atualizada', schema: 'ContaPagar' },
      { status: 404, description: 'Conta não encontrada' },
    ],
  },
  {
    path: '/financeiro/contas-pagar/:id',
    method: 'DELETE',
    description: 'Excluir conta a pagar (soft delete)',
    scope: 'financeiro:delete',
    parameters: [
      { name: 'id', in: 'path', type: 'uuid', required: true, description: 'ID da conta a pagar' },
    ],
    responses: [
      { status: 204, description: 'Conta excluída' },
      { status: 404, description: 'Conta não encontrada' },
    ],
  },
  
  // Contas a Receber
  {
    path: '/financeiro/contas-receber',
    method: 'GET',
    description: 'Listar contas a receber',
    scope: 'financeiro:read',
    parameters: [
      { name: 'page', in: 'query', type: 'integer', required: false, description: 'Página' },
      { name: 'limit', in: 'query', type: 'integer', required: false, description: 'Itens por página' },
      { name: 'status', in: 'query', type: 'string', required: false, description: 'Status: pendente, recebido, vencido' },
      { name: 'cliente_id', in: 'query', type: 'uuid', required: false, description: 'Filtrar por cliente' },
    ],
    responses: [
      { status: 200, description: 'Lista de contas a receber', schema: 'ContaReceber[]' },
    ],
  },
  {
    path: '/financeiro/contas-receber',
    method: 'POST',
    description: 'Criar nova conta a receber',
    scope: 'financeiro:write',
    requestBody: {
      type: 'object',
      required: ['descricao', 'valor', 'vencimento'],
      properties: {
        descricao: { type: 'string', description: 'Descrição' },
        valor: { type: 'number', description: 'Valor' },
        vencimento: { type: 'date', description: 'Data de vencimento' },
        cliente_id: { type: 'uuid', description: 'ID do cliente' },
      },
    },
    responses: [
      { status: 201, description: 'Conta criada', schema: 'ContaReceber' },
    ],
  },
  
  // Fluxo de Caixa
  {
    path: '/financeiro/fluxo-caixa',
    method: 'GET',
    description: 'Fluxo de caixa projetado',
    scope: 'financeiro:read',
    parameters: [
      { name: 'data_inicio', in: 'query', type: 'date', required: false, description: 'Data inicial' },
      { name: 'data_fim', in: 'query', type: 'date', required: false, description: 'Data final' },
      { name: 'agrupamento', in: 'query', type: 'string', required: false, description: 'diario, semanal, mensal' },
    ],
    responses: [
      { status: 200, description: 'Projeção de fluxo de caixa' },
    ],
  },
  
  // Baixas
  {
    path: '/financeiro/contas-pagar/:id/baixa',
    method: 'POST',
    description: 'Registrar baixa de conta a pagar',
    scope: 'financeiro:write',
    parameters: [
      { name: 'id', in: 'path', type: 'uuid', required: true, description: 'ID da conta' },
    ],
    requestBody: {
      type: 'object',
      required: ['data_pagamento', 'valor_pago'],
      properties: {
        data_pagamento: { type: 'date', description: 'Data do pagamento' },
        valor_pago: { type: 'number', description: 'Valor pago' },
        conta_bancaria_id: { type: 'uuid', description: 'Conta bancária' },
        observacoes: { type: 'string', description: 'Observações' },
      },
    },
    responses: [
      { status: 200, description: 'Baixa registrada' },
    ],
  },
];

// ==================== DASHBOARD ====================

export const dashboardRoutes: APIEndpoint[] = [
  {
    path: '/dashboard/metricas',
    method: 'GET',
    description: 'KPIs principais (saldo, contas, execução orçamento)',
    scope: 'dashboard:read',
    parameters: [
      { name: 'periodo', in: 'query', type: 'string', required: false, description: 'mes_atual, trimestre, ano' },
    ],
    responses: [
      { status: 200, description: 'Métricas do dashboard' },
    ],
  },
  {
    path: '/dashboard/saldo-contas',
    method: 'GET',
    description: 'Saldo de contas bancárias',
    scope: 'dashboard:read',
    responses: [
      { status: 200, description: 'Saldo de cada conta' },
    ],
  },
  {
    path: '/dashboard/vencimentos',
    method: 'GET',
    description: 'Resumo de vencimentos próximos',
    scope: 'dashboard:read',
    parameters: [
      { name: 'dias', in: 'query', type: 'integer', required: false, description: 'Próximos X dias (default: 7)' },
    ],
    responses: [
      { status: 200, description: 'Vencimentos próximos' },
    ],
  },
];

// ==================== RELATÓRIOS ====================

export const relatoriosRoutes: APIEndpoint[] = [
  {
    path: '/relatorios/dre',
    method: 'GET',
    description: 'Gerar DRE (Demonstração do Resultado)',
    scope: 'relatorios:read',
    parameters: [
      { name: 'periodo_inicio', in: 'query', type: 'date', required: true, description: 'Início do período' },
      { name: 'periodo_fim', in: 'query', type: 'date', required: true, description: 'Fim do período' },
      { name: 'formato', in: 'query', type: 'string', required: false, description: 'json, pdf, xlsx' },
    ],
    responses: [
      { status: 200, description: 'DRE gerado' },
    ],
  },
  {
    path: '/relatorios/balancete',
    method: 'GET',
    description: 'Gerar Balancete',
    scope: 'relatorios:read',
    parameters: [
      { name: 'periodo', in: 'query', type: 'string', required: true, description: 'Período (YYYY-MM)' },
    ],
    responses: [
      { status: 200, description: 'Balancete gerado' },
    ],
  },
  {
    path: '/relatorios/fluxo-caixa',
    method: 'GET',
    description: 'Relatório de fluxo de caixa',
    scope: 'relatorios:read',
    parameters: [
      { name: 'periodo_inicio', in: 'query', type: 'date', required: true, description: 'Início' },
      { name: 'periodo_fim', in: 'query', type: 'date', required: true, description: 'Fim' },
    ],
    responses: [
      { status: 200, description: 'Relatório de fluxo de caixa' },
    ],
  },
];

// ==================== CRM ====================

export const crmRoutes: APIEndpoint[] = [
  {
    path: '/crm/leads',
    method: 'GET',
    description: 'Listar leads',
    scope: 'crm:read',
    parameters: [
      { name: 'status', in: 'query', type: 'string', required: false, description: 'novo, em_contato, qualificado, convertido, perdido' },
      { name: 'origem', in: 'query', type: 'string', required: false, description: 'Origem do lead' },
    ],
    responses: [
      { status: 200, description: 'Lista de leads' },
    ],
  },
  {
    path: '/crm/leads',
    method: 'POST',
    description: 'Criar lead',
    scope: 'crm:write',
    requestBody: {
      type: 'object',
      required: ['nome'],
      properties: {
        nome: { type: 'string', description: 'Nome do lead' },
        email: { type: 'string', description: 'Email' },
        telefone: { type: 'string', description: 'Telefone' },
        empresa: { type: 'string', description: 'Empresa' },
        origem: { type: 'string', description: 'Origem' },
        valor_potencial: { type: 'number', description: 'Valor potencial' },
      },
    },
    responses: [
      { status: 201, description: 'Lead criado' },
    ],
  },
  {
    path: '/crm/clientes',
    method: 'GET',
    description: 'Listar clientes',
    scope: 'crm:read',
    parameters: [
      { name: 'search', in: 'query', type: 'string', required: false, description: 'Busca por nome/documento' },
    ],
    responses: [
      { status: 200, description: 'Lista de clientes' },
    ],
  },
  {
    path: '/crm/clientes',
    method: 'POST',
    description: 'Criar cliente',
    scope: 'crm:write',
    requestBody: {
      type: 'object',
      required: ['nome'],
      properties: {
        nome: { type: 'string', description: 'Nome/Razão social' },
        documento: { type: 'string', description: 'CPF/CNPJ' },
        email: { type: 'string', description: 'Email' },
        telefone: { type: 'string', description: 'Telefone' },
      },
    },
    responses: [
      { status: 201, description: 'Cliente criado' },
    ],
  },
];

// ==================== FISCAL ====================

export const fiscalRoutes: APIEndpoint[] = [
  {
    path: '/fiscal/nfe',
    method: 'GET',
    description: 'Listar NF-e',
    scope: 'fiscal:read',
    parameters: [
      { name: 'status', in: 'query', type: 'string', required: false, description: 'rascunho, autorizada, cancelada' },
      { name: 'data_inicio', in: 'query', type: 'date', required: false, description: 'Data inicial' },
      { name: 'data_fim', in: 'query', type: 'date', required: false, description: 'Data final' },
    ],
    responses: [
      { status: 200, description: 'Lista de NF-e' },
    ],
  },
  {
    path: '/fiscal/nfe',
    method: 'POST',
    description: 'Emitir NF-e',
    scope: 'fiscal:write',
    requestBody: {
      type: 'object',
      required: ['destinatario', 'itens'],
      properties: {
        destinatario: { type: 'object', description: 'Dados do destinatário' },
        itens: { type: 'array', description: 'Itens da nota' },
        natureza_operacao: { type: 'string', description: 'Natureza da operação' },
      },
    },
    responses: [
      { status: 201, description: 'NF-e emitida' },
    ],
  },
  {
    path: '/fiscal/nfe/:id/cancelar',
    method: 'POST',
    description: 'Cancelar NF-e',
    scope: 'fiscal:cancel',
    parameters: [
      { name: 'id', in: 'path', type: 'uuid', required: true, description: 'ID da NF-e' },
    ],
    requestBody: {
      type: 'object',
      required: ['justificativa'],
      properties: {
        justificativa: { type: 'string', description: 'Justificativa do cancelamento (mín. 15 caracteres)' },
      },
    },
    responses: [
      { status: 200, description: 'NF-e cancelada' },
    ],
  },
  {
    path: '/fiscal/impostos/calcular',
    method: 'POST',
    description: 'Calcular impostos',
    scope: 'fiscal:read',
    requestBody: {
      type: 'object',
      required: ['valor', 'ncm', 'cfop'],
      properties: {
        valor: { type: 'number', description: 'Valor base' },
        ncm: { type: 'string', description: 'NCM do produto' },
        cfop: { type: 'string', description: 'CFOP' },
        uf_origem: { type: 'string', description: 'UF origem' },
        uf_destino: { type: 'string', description: 'UF destino' },
      },
    },
    responses: [
      { status: 200, description: 'Impostos calculados' },
    ],
  },
];

// ==================== AUTOMAÇÕES ====================

export const automacoesRoutes: APIEndpoint[] = [
  {
    path: '/automacoes',
    method: 'GET',
    description: 'Listar automações',
    scope: 'automacoes:read',
    responses: [
      { status: 200, description: 'Lista de automações' },
    ],
  },
  {
    path: '/automacoes',
    method: 'POST',
    description: 'Criar automação via API',
    scope: 'automacoes:write',
    requestBody: {
      type: 'object',
      required: ['nome', 'trigger', 'acoes'],
      properties: {
        nome: { type: 'string', description: 'Nome da automação' },
        trigger: { type: 'object', description: 'Gatilho da automação' },
        acoes: { type: 'array', description: 'Ações a executar' },
        ativo: { type: 'boolean', description: 'Se está ativa' },
      },
    },
    responses: [
      { status: 201, description: 'Automação criada' },
    ],
  },
  {
    path: '/automacoes/:id',
    method: 'DELETE',
    description: 'Excluir automação',
    scope: 'automacoes:write',
    parameters: [
      { name: 'id', in: 'path', type: 'uuid', required: true, description: 'ID da automação' },
    ],
    responses: [
      { status: 204, description: 'Automação excluída' },
    ],
  },
];

// ==================== ESTOQUE ====================

export const estoqueRoutes: APIEndpoint[] = [
  {
    path: '/estoque/produtos',
    method: 'GET',
    description: 'Listar produtos',
    scope: 'estoque:read',
    parameters: [
      { name: 'search', in: 'query', type: 'string', required: false, description: 'Busca por nome/SKU' },
      { name: 'categoria_id', in: 'query', type: 'uuid', required: false, description: 'Filtrar por categoria' },
    ],
    responses: [
      { status: 200, description: 'Lista de produtos' },
    ],
  },
  {
    path: '/estoque/movimentacoes',
    method: 'GET',
    description: 'Listar movimentações de estoque',
    scope: 'estoque:read',
    parameters: [
      { name: 'produto_id', in: 'query', type: 'uuid', required: false, description: 'Filtrar por produto' },
      { name: 'tipo', in: 'query', type: 'string', required: false, description: 'entrada, saida, ajuste' },
    ],
    responses: [
      { status: 200, description: 'Lista de movimentações' },
    ],
  },
  {
    path: '/estoque/movimentacoes',
    method: 'POST',
    description: 'Registrar movimentação de estoque',
    scope: 'estoque:write',
    requestBody: {
      type: 'object',
      required: ['produto_id', 'quantidade', 'tipo'],
      properties: {
        produto_id: { type: 'uuid', description: 'ID do produto' },
        quantidade: { type: 'number', description: 'Quantidade' },
        tipo: { type: 'string', description: 'entrada, saida, ajuste' },
        motivo: { type: 'string', description: 'Motivo da movimentação' },
      },
    },
    responses: [
      { status: 201, description: 'Movimentação registrada' },
    ],
  },
];

// ==================== ALL ROUTES ====================

export const allRoutes: APIEndpoint[] = [
  ...financeiroRoutes,
  ...dashboardRoutes,
  ...relatoriosRoutes,
  ...crmRoutes,
  ...fiscalRoutes,
  ...automacoesRoutes,
  ...estoqueRoutes,
];

// Helper to get route by path and method
export function getRouteDefinition(
  method: string,
  path: string
): APIEndpoint | undefined {
  return allRoutes.find(
    r => r.method === method && r.path === path
  );
}

// Get all routes for a specific scope
export function getRoutesByScope(scope: string): APIEndpoint[] {
  return allRoutes.filter(r => r.scope === scope || r.scope.startsWith(scope.split(':')[0]));
}
