import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  Automation,
  AutomationLog,
  AutomationLogStatus,
  AutomationActionLog,
  CreateAutomationData,
  UpdateAutomationData,
  AutomationFilters,
  AutomationLogsResult,
  AutomationTestResult,
  AutomationTrigger,
  AutomationAction,
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

// Helper function to parse automation log from DB row
function parseAutomationLog(row: unknown): AutomationLog {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    automation_id: r.automation_id as string,
    triggered_at: r.triggered_at as string,
    trigger_type: r.trigger_type as AutomationLog['trigger_type'],
    trigger_data: (r.trigger_data || {}) as Record<string, unknown>,
    actions_executed: (Array.isArray(r.actions_executed) ? r.actions_executed : []) as AutomationActionLog[],
    status: r.status as AutomationLogStatus,
    error: r.error as string | undefined,
    created_at: r.created_at as string,
  };
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Lista todas as automações da empresa com filtros opcionais
 */
export function useAutomationsList(filters?: AutomationFilters) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['automations', currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from('automations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Parse and filter
      let automations = (data || []).map(parseAutomation);

      if (filters?.triggerType) {
        automations = automations.filter((a) =>
          a.triggers.some((t) => t.type === filters.triggerType)
        );
      }

      return automations;
    },
    enabled: !!currentCompany?.id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Busca uma automação específica com logs recentes
 */
export function useAutomation(automationId: string | null) {
  return useQuery({
    queryKey: ['automation', automationId],
    queryFn: async () => {
      if (!automationId) return null;

      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Fetch recent logs
      const { data: logs } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('automation_id', automationId)
        .order('triggered_at', { ascending: false })
        .limit(10);

      const automation = parseAutomation(data);
      automation.recent_logs = (logs || []).map(parseAutomationLog);

      return automation;
    },
    enabled: !!automationId,
    staleTime: 1000 * 60,
  });
}

/**
 * Busca logs de uma automação com paginação
 */
export function useAutomationLogs(
  automationId: string | null,
  page: number = 1,
  limit: number = 20
) {
  return useQuery({
    queryKey: ['automation_logs', automationId, page, limit],
    queryFn: async (): Promise<AutomationLogsResult> => {
      if (!automationId) {
        return { logs: [], total: 0, pages: 0, page };
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { count } = await supabase
        .from('automation_logs')
        .select('*', { count: 'exact', head: true })
        .eq('automation_id', automationId);

      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('automation_id', automationId)
        .order('triggered_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const total = count || 0;
      const pages = Math.ceil(total / limit);

      return {
        logs: (data || []).map(parseAutomationLog),
        total,
        pages,
        page,
      };
    },
    enabled: !!automationId,
    staleTime: 1000 * 30,
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Cria uma nova automação
 */
export function useCreateAutomation() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateAutomationData) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');

      if (!data.triggers || data.triggers.length === 0) {
        throw new Error('Pelo menos um gatilho é obrigatório');
      }
      if (!data.actions || data.actions.length === 0) {
        throw new Error('Pelo menos uma ação é obrigatória');
      }

      const insertData = {
        company_id: currentCompany.id,
        name: data.name,
        description: data.description || null,
        is_active: data.is_active ?? true,
        triggers: data.triggers as unknown as Record<string, unknown>,
        actions: data.actions as unknown as Record<string, unknown>,
        created_by: user.id,
      };

      const { data: automation, error } = await supabase
        .from('automations')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Já existe uma automação com este nome');
        }
        throw error;
      }

      return parseAutomation(automation);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Atualiza uma automação existente
 */
export function useUpdateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      automationId,
      data,
    }: {
      automationId: string;
      data: UpdateAutomationData;
    }) => {
      const updateData: Record<string, unknown> = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      if (data.triggers !== undefined) {
        updateData.triggers = data.triggers as unknown as Record<string, unknown>;
      }
      if (data.actions !== undefined) {
        updateData.actions = data.actions as unknown as Record<string, unknown>;
      }

      const { data: automation, error } = await supabase
        .from('automations')
        .update(updateData)
        .eq('id', automationId)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Já existe uma automação com este nome');
        }
        throw error;
      }

      return parseAutomation(automation);
    },
    onSuccess: (_, { automationId }) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['automation', automationId] });
      toast.success('Automação atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Deleta uma automação (soft delete - desativa)
 */
export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (automationId: string) => {
      const { error } = await supabase
        .from('automations')
        .update({ is_active: false })
        .eq('id', automationId);

      if (error) throw error;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação desativada');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Deleta permanentemente uma automação
 */
export function useHardDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (automationId: string) => {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', automationId);

      if (error) throw error;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação excluída permanentemente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Ativa/desativa uma automação rapidamente
 */
export function useToggleAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      automationId,
      isActive,
    }: {
      automationId: string;
      isActive: boolean;
    }) => {
      const { data, error } = await supabase
        .from('automations')
        .update({ is_active: isActive })
        .eq('id', automationId)
        .select()
        .single();

      if (error) throw error;

      return parseAutomation(data);
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success(isActive ? 'Automação ativada' : 'Automação desativada');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Testa uma automação com dados simulados
 */
export function useTestAutomation() {
  return useMutation({
    mutationFn: async (automationId: string): Promise<AutomationTestResult> => {
      const startTime = Date.now();

      const { data: automation, error: fetchError } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .single();

      if (fetchError || !automation) {
        throw new Error('Automação não encontrada');
      }

      const parsed = parseAutomation(automation);
      const triggers = parsed.triggers;
      const actions = parsed.actions;

      const triggered = triggers.length > 0;

      const actionsResults: AutomationActionLog[] = actions.map((action) => ({
        action_type: action.type,
        executed_at: new Date().toISOString(),
        result: 'success' as const,
        output: { simulated: true, action },
        duration_ms: Math.floor(Math.random() * 100) + 10,
      }));

      const duration_ms = Date.now() - startTime;

      const logData = {
        automation_id: automationId,
        triggered_at: new Date().toISOString(),
        trigger_type: triggers[0]?.type || 'webhook',
        trigger_data: { test: true, simulated: true },
        actions_executed: actionsResults as unknown as Record<string, unknown>,
        status: 'success' as const,
        duration_ms,
      };

      await supabase.from('automation_logs').insert([logData]);

      return {
        success: true,
        triggered,
        actions_results: actionsResults,
        duration_ms,
      };
    },
    onSuccess: () => {
      toast.success('Teste executado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro no teste: ${error.message}`);
    },
  });
}

/**
 * Duplica uma automação existente
 */
export function useDuplicateAutomation() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      automationId,
      newName,
    }: {
      automationId: string;
      newName: string;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data: original, error: fetchError } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .single();

      if (fetchError || !original) {
        throw new Error('Automação original não encontrada');
      }

      const { data: copy, error } = await supabase
        .from('automations')
        .insert({
          company_id: currentCompany.id,
          name: newName,
          description: original.description,
          is_active: false,
          triggers: original.triggers,
          actions: original.actions,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Já existe uma automação com este nome');
        }
        throw error;
      }

      return parseAutomation(copy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação duplicada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
