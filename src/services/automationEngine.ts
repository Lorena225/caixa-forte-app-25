import { supabase } from '@/integrations/supabase/client';
import type {
  Automation,
  AutomationTrigger,
  AutomationAction,
  AutomationActionLog,
  AutomationCondition,
  AutomationTriggerType,
} from '@/types/automations';

// Helper function to parse automation from DB row
function parseAutomation(row: unknown): Automation {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    company_id: r.company_id as string,
    name: r.name as string,
    description: r.description as string | null,
    is_active: r.is_active as boolean,
    triggers: (Array.isArray(r.triggers) ? r.triggers : []) as AutomationTrigger[],
    actions: (Array.isArray(r.actions) ? r.actions : []) as AutomationAction[],
    execution_count: r.execution_count as number | undefined,
    last_executed_at: r.last_executed_at as string | null,
    created_by: r.created_by as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

// =====================================================
// AUTOMATION ENGINE
// Motor de execução de automações
// =====================================================

export class AutomationEngine {
  /**
   * Método principal: disparar automações baseado em um evento
   */
  static async triggerAutomation(
    companyId: string,
    triggerType: AutomationTriggerType,
    triggerData: Record<string, unknown>
  ): Promise<{ executed: number; errors: number }> {
    const startTime = Date.now();
    let executed = 0;
    let errors = 0;

    try {
      const { data: automations, error } = await supabase
        .from('automations')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) {
        console.error('[AutomationEngine] Error fetching automations:', error);
        return { executed: 0, errors: 1 };
      }

      if (!automations || automations.length === 0) {
        console.log('[AutomationEngine] No active automations found for company:', companyId);
        return { executed: 0, errors: 0 };
      }

      const matchingAutomations = automations
        .map(parseAutomation)
        .filter((automation) => {
          return automation.triggers.some((trigger) => trigger.type === triggerType);
        });

      console.log(
        `[AutomationEngine] Found ${matchingAutomations.length} automations for trigger: ${triggerType}`
      );

      for (const automation of matchingAutomations) {
        try {
          const result = await this.executeAutomation(
            automation,
            triggerType,
            triggerData
          );

          if (result.success) {
            executed++;
          } else {
            errors++;
          }
        } catch (err) {
          console.error(
            `[AutomationEngine] Error executing automation ${automation.id}:`,
            err
          );
          errors++;

          await this.logExecution(automation.id, triggerType, triggerData, [], 'failed', {
            error: err instanceof Error ? err.message : 'Unknown error',
            duration_ms: Date.now() - startTime,
          });
        }
      }

      return { executed, errors };
    } catch (err) {
      console.error('[AutomationEngine] Critical error:', err);
      return { executed, errors: errors + 1 };
    }
  }

  /**
   * Executa uma automação específica
   */
  private static async executeAutomation(
    automation: Automation,
    triggerType: AutomationTriggerType,
    triggerData: Record<string, unknown>
  ): Promise<{ success: boolean; actionsResults: AutomationActionLog[] }> {
    const startTime = Date.now();
    const actionsResults: AutomationActionLog[] = [];

    try {
      const triggers = automation.triggers || [];
      const actions = automation.actions || [];

      const matchingTrigger = triggers.find((t) => t.type === triggerType);

      if (!matchingTrigger) {
        console.log(`[AutomationEngine] No matching trigger for ${triggerType}`);
        return { success: false, actionsResults: [] };
      }

      if (matchingTrigger.conditions && matchingTrigger.conditions.length > 0) {
        const conditionsMet = this.evaluateConditions(
          matchingTrigger.conditions,
          triggerData
        );

        if (!conditionsMet) {
          console.log(`[AutomationEngine] Conditions not met for automation ${automation.id}`);
          return { success: true, actionsResults: [] };
        }
      }

      for (const action of actions) {
        const actionStartTime = Date.now();

        try {
          const output = await this.executeAction(action, triggerData);

          actionsResults.push({
            action_id: action.id,
            action_type: action.type,
            executed_at: new Date().toISOString(),
            result: 'success',
            output,
            duration_ms: Date.now() - actionStartTime,
          });
        } catch (actionError) {
          console.error(
            `[AutomationEngine] Action ${action.type} failed:`,
            actionError
          );

          actionsResults.push({
            action_id: action.id,
            action_type: action.type,
            executed_at: new Date().toISOString(),
            result: 'failed',
            error: actionError instanceof Error ? actionError.message : 'Unknown error',
            duration_ms: Date.now() - actionStartTime,
          });
        }
      }

      const failedCount = actionsResults.filter((r) => r.result === 'failed').length;
      const status =
        failedCount === 0
          ? 'success'
          : failedCount === actionsResults.length
            ? 'failed'
            : 'partial';

      await this.logExecution(automation.id, triggerType, triggerData, actionsResults, status, {
        duration_ms: Date.now() - startTime,
      });

      return { success: status !== 'failed', actionsResults };
    } catch (err) {
      console.error('[AutomationEngine] Error in executeAutomation:', err);
      throw err;
    }
  }

  /**
   * Avalia condições do trigger
   */
  private static evaluateConditions(
    conditions: AutomationCondition[],
    data: Record<string, unknown>
  ): boolean {
    return conditions.every((condition) => {
      const fieldValue = this.getNestedValue(data, condition.field);

      switch (condition.operator) {
        case 'eq':
          return fieldValue === condition.value;
        case 'neq':
          return fieldValue !== condition.value;
        case 'gt':
          return Number(fieldValue) > Number(condition.value);
        case 'gte':
          return Number(fieldValue) >= Number(condition.value);
        case 'lt':
          return Number(fieldValue) < Number(condition.value);
        case 'lte':
          return Number(fieldValue) <= Number(condition.value);
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
        default:
          return false;
      }
    });
  }

  /**
   * Obtém valor aninhado de um objeto
   */
  private static getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((acc: unknown, part) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }

  /**
   * Executa uma ação específica
   */
  private static async executeAction(
    action: AutomationAction,
    triggerData: Record<string, unknown>
  ): Promise<unknown> {
    const target = this.interpolateTemplate(action.target, triggerData);
    const params = action.params
      ? JSON.parse(this.interpolateTemplate(JSON.stringify(action.params), triggerData))
      : {};

    console.log(`[AutomationEngine] Executing action: ${action.type} -> ${target}`);

    switch (action.type) {
      case 'enviar_email':
        return this.actionSendEmail(target, action.subject, action.template, params, triggerData);

      case 'criar_tarefa':
        return this.actionCreateTask(target, params, triggerData);

      case 'atualizar_status':
        return this.actionUpdateStatus(target, params);

      case 'notificar_usuario':
        return this.actionNotifyUser(target, params, triggerData);

      case 'webhook_call':
        return this.actionCallWebhook(target, params, triggerData);

      case 'gerar_relatorio':
        return this.actionGenerateReport(target, params, triggerData);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Interpola variáveis em templates
   */
  private static interpolateTemplate(
    template: string,
    data: Record<string, unknown>
  ): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const value = this.getNestedValue(data, path.trim());
      return value !== undefined ? String(value) : '';
    });
  }

  // =====================================================
  // ACTION IMPLEMENTATIONS
  // =====================================================

  private static async actionSendEmail(
    target: string,
    subject?: string,
    template?: string,
    params?: Record<string, unknown>,
    triggerData?: Record<string, unknown>
  ): Promise<{ sent: boolean; to: string }> {
    console.log(`[AutomationEngine] SEND EMAIL to: ${target}, subject: ${subject}`);
    return { sent: true, to: target };
  }

  private static async actionCreateTask(
    userId: string,
    params: Record<string, unknown>,
    triggerData: Record<string, unknown>
  ): Promise<{ taskId?: string }> {
    console.log(`[AutomationEngine] CREATE TASK for user: ${userId}`, params);
    return { taskId: `task_${Date.now()}` };
  }

  private static async actionUpdateStatus(
    target: string,
    params: Record<string, unknown>
  ): Promise<{ updated: boolean }> {
    const [table, id] = target.split(':');

    if (!table || !id) {
      throw new Error('Invalid target format. Expected "table:id"');
    }

    console.log(`[AutomationEngine] UPDATE STATUS: ${table} ${id}`, params);
    return { updated: true };
  }

  private static async actionNotifyUser(
    target: string,
    params: Record<string, unknown>,
    triggerData: Record<string, unknown>
  ): Promise<{ notified: boolean }> {
    console.log(`[AutomationEngine] NOTIFY: ${target}`, params);
    return { notified: true };
  }

  private static async actionCallWebhook(
    url: string,
    params: Record<string, unknown>,
    triggerData: Record<string, unknown>
  ): Promise<{ status: number; response?: unknown }> {
    console.log(`[AutomationEngine] WEBHOOK CALL: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          trigger_data: triggerData,
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await response.json().catch(() => null);

      return { status: response.status, response: data };
    } catch (err) {
      console.error('[AutomationEngine] Webhook call failed:', err);
      throw err;
    }
  }

  private static async actionGenerateReport(
    target: string,
    params: Record<string, unknown>,
    triggerData: Record<string, unknown>
  ): Promise<{ reportId?: string }> {
    console.log(`[AutomationEngine] GENERATE REPORT: ${target}`, params);
    return { reportId: `report_${Date.now()}` };
  }

  // =====================================================
  // LOGGING
  // =====================================================

  private static async logExecution(
    automationId: string,
    triggerType: AutomationTriggerType,
    triggerData: Record<string, unknown>,
    actionsExecuted: AutomationActionLog[],
    status: 'success' | 'partial' | 'failed' | 'running',
    extra?: { error?: string; duration_ms?: number }
  ): Promise<void> {
    try {
      const logData = {
        automation_id: automationId,
        triggered_at: new Date().toISOString(),
        trigger_type: triggerType,
        trigger_data: triggerData,
        actions_executed: actionsExecuted as unknown as Record<string, unknown>,
        status,
        error: extra?.error,
        duration_ms: extra?.duration_ms,
      };

      await supabase.from('automation_logs').insert([logData]);
    } catch (err) {
      console.error('[AutomationEngine] Failed to log execution:', err);
    }
  }
}

// =====================================================
// CONVENIENCE FUNCTIONS
// =====================================================

export async function triggerContaCriada(
  companyId: string,
  conta: Record<string, unknown>
) {
  return AutomationEngine.triggerAutomation(companyId, 'conta_criada', conta);
}

export async function triggerContaVencida(
  companyId: string,
  conta: Record<string, unknown>
) {
  return AutomationEngine.triggerAutomation(companyId, 'conta_vencida', conta);
}

export async function triggerContaPaga(
  companyId: string,
  conta: Record<string, unknown>
) {
  return AutomationEngine.triggerAutomation(companyId, 'conta_paga', conta);
}

export async function triggerOrcamentoExcedido(
  companyId: string,
  orcamento: Record<string, unknown>
) {
  return AutomationEngine.triggerAutomation(companyId, 'orcamento_excedido', orcamento);
}

export async function triggerFluxoNegativo(
  companyId: string,
  data: Record<string, unknown>
) {
  return AutomationEngine.triggerAutomation(companyId, 'fluxo_negativo', data);
}

export default AutomationEngine;
