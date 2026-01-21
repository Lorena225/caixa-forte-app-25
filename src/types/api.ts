// ============================================================
// API Types for Public REST API v1
// ============================================================

// ==================== API KEY ====================
export interface APIKey {
  id: string;
  company_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scopes: string[];
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  created_by: string | null;
}

export interface APIKeyCreate {
  name: string;
  scopes: string[];
  rate_limit_per_minute?: number;
  rate_limit_per_day?: number;
  expires_at?: string;
}

// ==================== API LOG ====================
export interface APILog {
  id: string;
  company_id: string;
  api_key_id: string | null;
  method: string;
  endpoint: string;
  status_code: number;
  latency_ms: number | null;
  error_message: string | null;
  request_body: Record<string, unknown> | null;
  response_body: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ==================== WEBHOOK ====================
export interface Webhook {
  id: string;
  company_id: string;
  name: string;
  endpoint_url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  failure_count: number;
  last_triggered_at: string | null;
  last_success_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookCreate {
  name: string;
  endpoint_url: string;
  events: string[];
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  company_id: string;
  data: Record<string, unknown>;
  webhook_id: string;
}

// ==================== RATE LIMITING ====================
export interface RateLimitInfo {
  limit_per_minute: number;
  limit_per_day: number;
  remaining_minute: number;
  remaining_day: number;
  reset_at: string;
}

// ==================== API RESPONSE ====================
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: APIPaginationMeta;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface APIPaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// ==================== ENDPOINT DEFINITIONS ====================
export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  description: string;
  scope: string;
  parameters?: APIParameter[];
  requestBody?: APIRequestBody;
  responses?: APIResponseDefinition[];
}

export interface APIParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  type: string;
  required: boolean;
  description: string;
}

export interface APIRequestBody {
  type: string;
  required: string[];
  properties: Record<string, { type: string; description: string }>;
}

export interface APIResponseDefinition {
  status: number;
  description: string;
  schema?: string;
}

// ==================== SCOPES ====================
export const API_SCOPES = {
  // Financeiro
  'financeiro:read': { label: 'Financeiro (leitura)', description: 'Ler transações, contas, fluxo de caixa' },
  'financeiro:write': { label: 'Financeiro (escrita)', description: 'Criar e atualizar transações' },
  'financeiro:delete': { label: 'Financeiro (exclusão)', description: 'Remover transações' },
  
  // CRM
  'crm:read': { label: 'CRM (leitura)', description: 'Ler leads, oportunidades, vendedores' },
  'crm:write': { label: 'CRM (escrita)', description: 'Criar e atualizar leads e oportunidades' },
  'crm:delete': { label: 'CRM (exclusão)', description: 'Remover registros de CRM' },
  
  // Fiscal
  'fiscal:read': { label: 'Fiscal (leitura)', description: 'Ler notas fiscais e apurações' },
  'fiscal:write': { label: 'Fiscal (escrita)', description: 'Emitir notas fiscais' },
  'fiscal:cancel': { label: 'Fiscal (cancelamento)', description: 'Cancelar notas fiscais' },
  
  // Compras
  'compras:read': { label: 'Compras (leitura)', description: 'Ler pedidos e cotações' },
  'compras:write': { label: 'Compras (escrita)', description: 'Criar pedidos de compra' },
  
  // Estoque
  'estoque:read': { label: 'Estoque (leitura)', description: 'Ler produtos e movimentações' },
  'estoque:write': { label: 'Estoque (escrita)', description: 'Registrar movimentações' },
  
  // Cadastros
  'cadastros:read': { label: 'Cadastros (leitura)', description: 'Ler clientes, fornecedores, produtos' },
  'cadastros:write': { label: 'Cadastros (escrita)', description: 'Criar e atualizar cadastros' },
  
  // Dashboard/Reports
  'dashboard:read': { label: 'Dashboard (leitura)', description: 'Acessar métricas e KPIs' },
  'relatorios:read': { label: 'Relatórios (leitura)', description: 'Gerar relatórios' },
  
  // Automações
  'automacoes:read': { label: 'Automações (leitura)', description: 'Ler regras de automação' },
  'automacoes:write': { label: 'Automações (escrita)', description: 'Criar e gerenciar automações' },
  
  // Admin (restrito)
  'admin:read': { label: 'Admin (leitura)', description: 'Acesso administrativo de leitura' },
  'admin:write': { label: 'Admin (escrita)', description: 'Acesso administrativo completo' },
} as const;

export type APIScope = keyof typeof API_SCOPES;

// ==================== WEBHOOK EVENTS ====================
export const WEBHOOK_EVENTS = {
  // CRM
  'lead.created': { label: 'Lead criado', category: 'CRM' },
  'lead.updated': { label: 'Lead atualizado', category: 'CRM' },
  'lead.converted': { label: 'Lead convertido', category: 'CRM' },
  'opportunity.created': { label: 'Oportunidade criada', category: 'CRM' },
  'opportunity.won': { label: 'Oportunidade ganha', category: 'CRM' },
  'opportunity.lost': { label: 'Oportunidade perdida', category: 'CRM' },
  
  // Vendas
  'sale.created': { label: 'Venda criada', category: 'Vendas' },
  'sale.invoiced': { label: 'Venda faturada', category: 'Vendas' },
  'sale.cancelled': { label: 'Venda cancelada', category: 'Vendas' },
  
  // Financeiro
  'payment.received': { label: 'Pagamento recebido', category: 'Financeiro' },
  'payment.made': { label: 'Pagamento efetuado', category: 'Financeiro' },
  'payment.overdue': { label: 'Pagamento em atraso', category: 'Financeiro' },
  'boleto.created': { label: 'Boleto emitido', category: 'Financeiro' },
  'boleto.paid': { label: 'Boleto pago', category: 'Financeiro' },
  'pix.received': { label: 'PIX recebido', category: 'Financeiro' },
  
  // Fiscal
  'nfe.authorized': { label: 'NF-e autorizada', category: 'Fiscal' },
  'nfe.cancelled': { label: 'NF-e cancelada', category: 'Fiscal' },
  'nfse.authorized': { label: 'NFS-e autorizada', category: 'Fiscal' },
  
  // Estoque
  'stock.low': { label: 'Estoque mínimo', category: 'Estoque' },
  'stock.in': { label: 'Entrada de estoque', category: 'Estoque' },
  'stock.out': { label: 'Saída de estoque', category: 'Estoque' },
  
  // Compras
  'purchase_order.created': { label: 'Pedido de compra criado', category: 'Compras' },
  'purchase_order.approved': { label: 'Pedido de compra aprovado', category: 'Compras' },
  'purchase_order.received': { label: 'Pedido de compra recebido', category: 'Compras' },
} as const;

export type WebhookEvent = keyof typeof WEBHOOK_EVENTS;

// ==================== API ROUTES ====================
export const API_ROUTES = {
  // Financeiro - Contas a Pagar
  'GET /api/v1/financeiro/contas-pagar': {
    description: 'Listar contas a pagar',
    scope: 'financeiro:read',
    parameters: ['periodo', 'status', 'page', 'limit'],
  },
  'GET /api/v1/financeiro/contas-pagar/:id': {
    description: 'Detalhes de uma conta a pagar',
    scope: 'financeiro:read',
  },
  'POST /api/v1/financeiro/contas-pagar': {
    description: 'Criar nova conta a pagar',
    scope: 'financeiro:write',
  },
  'PATCH /api/v1/financeiro/contas-pagar/:id': {
    description: 'Atualizar conta a pagar',
    scope: 'financeiro:write',
  },
  'DELETE /api/v1/financeiro/contas-pagar/:id': {
    description: 'Excluir conta a pagar',
    scope: 'financeiro:delete',
  },
  
  // Financeiro - Contas a Receber
  'GET /api/v1/financeiro/contas-receber': {
    description: 'Listar contas a receber',
    scope: 'financeiro:read',
  },
  'POST /api/v1/financeiro/contas-receber': {
    description: 'Criar nova conta a receber',
    scope: 'financeiro:write',
  },
  
  // Dashboard
  'GET /api/v1/dashboard/metricas': {
    description: 'KPIs principais (saldo, contas, execução orçamento)',
    scope: 'dashboard:read',
  },
  
  // Relatórios
  'GET /api/v1/relatorios/dre': {
    description: 'Gerar DRE sob demanda',
    scope: 'relatorios:read',
    parameters: ['periodo'],
  },
  'GET /api/v1/relatorios/fluxo-caixa': {
    description: 'Fluxo de caixa projetado',
    scope: 'relatorios:read',
  },
  
  // Automações
  'GET /api/v1/automacoes': {
    description: 'Listar automações',
    scope: 'automacoes:read',
  },
  'POST /api/v1/automacoes': {
    description: 'Criar automação via API',
    scope: 'automacoes:write',
  },
  
  // CRM
  'GET /api/v1/crm/leads': {
    description: 'Listar leads',
    scope: 'crm:read',
  },
  'POST /api/v1/crm/leads': {
    description: 'Criar lead',
    scope: 'crm:write',
  },
  'GET /api/v1/crm/clientes': {
    description: 'Listar clientes',
    scope: 'crm:read',
  },
  
  // Fiscal
  'GET /api/v1/fiscal/nfe': {
    description: 'Listar NF-e',
    scope: 'fiscal:read',
  },
  'POST /api/v1/fiscal/nfe': {
    description: 'Emitir NF-e',
    scope: 'fiscal:write',
  },
  'POST /api/v1/fiscal/nfe/:id/cancelar': {
    description: 'Cancelar NF-e',
    scope: 'fiscal:cancel',
  },
  'GET /api/v1/fiscal/impostos/calcular': {
    description: 'Calcular impostos',
    scope: 'fiscal:read',
  },
} as const;

// ==================== ERROR CODES ====================
export const API_ERROR_CODES = {
  // Autenticação
  MISSING_API_KEY: 'API Key não fornecida',
  INVALID_API_KEY: 'API Key inválida ou expirada',
  INSUFFICIENT_SCOPE: 'Escopo insuficiente para esta operação',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Limite de requisições excedido',
  DAILY_LIMIT_EXCEEDED: 'Limite diário excedido',
  
  // Validação
  VALIDATION_ERROR: 'Erro de validação nos dados enviados',
  MISSING_REQUIRED_FIELD: 'Campo obrigatório não fornecido',
  INVALID_FORMAT: 'Formato de dados inválido',
  
  // Recursos
  RESOURCE_NOT_FOUND: 'Recurso não encontrado',
  RESOURCE_ALREADY_EXISTS: 'Recurso já existe',
  RESOURCE_LOCKED: 'Recurso bloqueado para alterações',
  
  // Servidor
  INTERNAL_ERROR: 'Erro interno do servidor',
  SERVICE_UNAVAILABLE: 'Serviço temporariamente indisponível',
} as const;

export type APIErrorCode = keyof typeof API_ERROR_CODES;
