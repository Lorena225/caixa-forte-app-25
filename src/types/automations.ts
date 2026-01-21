// =====================================================
// AUTOMATION SYSTEM TYPES
// =====================================================

/**
 * Tipos de gatilhos que podem iniciar uma automação
 */
export type AutomationTriggerType =
  | 'conta_criada'        // Nova conta a pagar/receber criada
  | 'conta_vencida'       // Conta passou da data de vencimento
  | 'conta_paga'          // Conta foi paga/quitada
  | 'orcamento_criado'    // Novo orçamento criado
  | 'orcamento_excedido'  // Orçamento ultrapassou limite
  | 'fluxo_negativo'      // Fluxo de caixa ficou negativo
  | 'data_fixa'           // Data específica (cron-like)
  | 'webhook';            // Chamada externa via webhook

/**
 * Tipos de ações que uma automação pode executar
 */
export type AutomationActionType =
  | 'enviar_email'        // Enviar email via template
  | 'criar_tarefa'        // Criar tarefa no sistema
  | 'atualizar_status'    // Alterar status de um registro
  | 'notificar_usuario'   // Criar notificação no sistema
  | 'webhook_call'        // Chamar webhook externo
  | 'gerar_relatorio';    // Gerar e enviar relatório

/**
 * Condições para filtrar quando o trigger deve disparar
 */
export interface AutomationCondition {
  field: string;           // Campo a avaliar (ex: "valor", "tipo", "categoria_id")
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'not_in';
  value: unknown;          // Valor para comparação
}

/**
 * Definição de um gatilho de automação
 */
export interface AutomationTrigger {
  type: AutomationTriggerType;
  conditions?: AutomationCondition[];  // Condições para filtrar
  schedule?: string;                    // Para data_fixa: expressão cron
}

/**
 * Definição de uma ação de automação
 */
export interface AutomationAction {
  id?: string;                          // ID único da ação (para logs)
  type: AutomationActionType;
  target: string;                       // ID do destinatário ou URL
  template?: string;                    // Template para emails
  subject?: string;                     // Assunto para emails
  params?: Record<string, unknown>;     // Parâmetros adicionais
  delay_minutes?: number;               // Atraso antes de executar
}

/**
 * Log de execução de uma ação específica
 */
export interface AutomationActionLog {
  action_id?: string;
  action_type: AutomationActionType;
  executed_at: string;
  result: 'success' | 'failed' | 'skipped';
  output?: unknown;
  error?: string;
  duration_ms?: number;
}

/**
 * Status de execução de uma automação
 */
export type AutomationLogStatus = 'success' | 'partial' | 'failed' | 'running';

/**
 * Log de execução completo de uma automação
 */
export interface AutomationLog {
  id: string;
  automation_id: string;
  triggered_at: string;
  trigger_type: AutomationTriggerType;
  trigger_data: Record<string, unknown>;
  actions_executed: AutomationActionLog[];
  status: AutomationLogStatus;
  error?: string;
  created_at: string;
}

/**
 * Automação completa
 */
export interface Automation {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
  execution_count?: number;
  last_executed_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joins opcionais
  recent_logs?: AutomationLog[];
  creator?: { full_name: string | null; email?: string };
}

/**
 * Dados para criar uma automação
 */
export interface CreateAutomationData {
  name: string;
  description?: string;
  is_active?: boolean;
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
}

/**
 * Dados para atualizar uma automação
 */
export interface UpdateAutomationData {
  name?: string;
  description?: string;
  is_active?: boolean;
  triggers?: AutomationTrigger[];
  actions?: AutomationAction[];
}

/**
 * Filtros para listagem de automações
 */
export interface AutomationFilters {
  isActive?: boolean;
  triggerType?: AutomationTriggerType;
  search?: string;
}

/**
 * Resultado paginado de logs
 */
export interface AutomationLogsResult {
  logs: AutomationLog[];
  total: number;
  pages: number;
  page: number;
}

/**
 * Resultado de teste de automação
 */
export interface AutomationTestResult {
  success: boolean;
  triggered: boolean;
  actions_results: AutomationActionLog[];
  duration_ms: number;
  error?: string;
}

// =====================================================
// TEMPLATES DE AUTOMAÇÃO PRÉ-DEFINIDOS
// =====================================================

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'financeiro' | 'cobranca' | 'notificacao' | 'integracao';
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'lembrete_vencimento',
    name: 'Lembrete de Vencimento',
    description: 'Envia email 3 dias antes do vencimento de contas a receber',
    category: 'cobranca',
    triggers: [
      {
        type: 'data_fixa',
        schedule: '0 9 * * *', // Todo dia às 9h
        conditions: [
          { field: 'days_to_due', operator: 'eq', value: 3 },
          { field: 'status', operator: 'eq', value: 'pendente' },
        ],
      },
    ],
    actions: [
      {
        type: 'enviar_email',
        target: '{{cliente.email}}',
        template: 'lembrete_vencimento',
        subject: 'Lembrete: Sua fatura vence em 3 dias',
      },
    ],
  },
  {
    id: 'alerta_fluxo_negativo',
    name: 'Alerta de Fluxo Negativo',
    description: 'Notifica gestores quando o fluxo de caixa fica negativo',
    category: 'financeiro',
    triggers: [
      {
        type: 'fluxo_negativo',
        conditions: [],
      },
    ],
    actions: [
      {
        type: 'notificar_usuario',
        target: 'role:admin',
        params: { priority: 'high', title: 'Alerta: Fluxo de Caixa Negativo' },
      },
      {
        type: 'enviar_email',
        target: 'role:financeiro',
        template: 'alerta_fluxo',
        subject: '⚠️ Alerta: Fluxo de Caixa Negativo',
      },
    ],
  },
  {
    id: 'confirmacao_pagamento',
    name: 'Confirmação de Pagamento',
    description: 'Envia confirmação ao cliente quando pagamento é recebido',
    category: 'financeiro',
    triggers: [
      {
        type: 'conta_paga',
        conditions: [
          { field: 'tipo', operator: 'eq', value: 'receber' },
        ],
      },
    ],
    actions: [
      {
        type: 'enviar_email',
        target: '{{cliente.email}}',
        template: 'confirmacao_pagamento',
        subject: 'Pagamento Recebido - Obrigado!',
      },
    ],
  },
  {
    id: 'orcamento_excedido',
    name: 'Alerta de Orçamento Excedido',
    description: 'Notifica quando um centro de custo excede o orçamento',
    category: 'financeiro',
    triggers: [
      {
        type: 'orcamento_excedido',
        conditions: [],
      },
    ],
    actions: [
      {
        type: 'notificar_usuario',
        target: '{{responsavel.id}}',
        params: { priority: 'high' },
      },
      {
        type: 'criar_tarefa',
        target: '{{responsavel.id}}',
        params: {
          title: 'Revisar orçamento excedido',
          due_days: 3,
        },
      },
    ],
  },
];

// =====================================================
// HELPERS
// =====================================================

export const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  conta_criada: 'Conta Criada',
  conta_vencida: 'Conta Vencida',
  conta_paga: 'Conta Paga',
  orcamento_criado: 'Orçamento Criado',
  orcamento_excedido: 'Orçamento Excedido',
  fluxo_negativo: 'Fluxo Negativo',
  data_fixa: 'Data Fixa (Agendado)',
  webhook: 'Webhook Externo',
};

export const ACTION_LABELS: Record<AutomationActionType, string> = {
  enviar_email: 'Enviar Email',
  criar_tarefa: 'Criar Tarefa',
  atualizar_status: 'Atualizar Status',
  notificar_usuario: 'Notificar Usuário',
  webhook_call: 'Chamar Webhook',
  gerar_relatorio: 'Gerar Relatório',
};

export const TRIGGER_ICONS: Record<AutomationTriggerType, string> = {
  conta_criada: '📝',
  conta_vencida: '⏰',
  conta_paga: '✅',
  orcamento_criado: '📊',
  orcamento_excedido: '⚠️',
  fluxo_negativo: '📉',
  data_fixa: '📅',
  webhook: '🔗',
};

export const ACTION_ICONS: Record<AutomationActionType, string> = {
  enviar_email: '📧',
  criar_tarefa: '✏️',
  atualizar_status: '🔄',
  notificar_usuario: '🔔',
  webhook_call: '🌐',
  gerar_relatorio: '📄',
};
