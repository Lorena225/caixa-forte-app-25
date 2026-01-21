import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// =====================================================
// TYPES
// =====================================================

export interface BudgetScenario {
  id: string;
  company_id: string;
  budget_id: string | null;
  name: string;
  scenario_type: 'pessimista' | 'realista' | 'otimista' | 'custom';
  description: string | null;
  probability: number;
  adjustment_rules: AdjustmentRule[];
  is_template: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdjustmentRule {
  target: 'revenue' | 'expense' | 'account' | 'cost_center';
  target_id?: string;
  adjustment_type: 'percentage' | 'fixed';
  adjustment_value: number;
  months?: number[];
}

export interface BudgetScenarioLine {
  id: string;
  scenario_id: string;
  source_line_id: string | null;
  account_id: string | null;
  cost_center_id: string | null;
  month: number;
  original_amount: number;
  adjusted_amount: number;
  adjustment_reason: string | null;
}

export interface BudgetApprovalLevel {
  id: string;
  company_id: string;
  level_order: number;
  level_name: string;
  min_amount: number;
  max_amount: number | null;
  is_active: boolean;
  created_at: string;
}

export interface BudgetApprovalRequest {
  id: string;
  budget_id: string;
  requested_by: string | null;
  requested_at: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'cancelled';
  current_level: number;
  total_levels: number;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface BudgetApprovalStep {
  id: string;
  request_id: string;
  level_id: string | null;
  level_order: number;
  approver_id: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  decision_at: string | null;
  comments: string | null;
  created_at: string;
}

export interface BudgetReclassification {
  id: string;
  budget_id: string;
  from_line_id: string | null;
  to_line_id: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  amount: number;
  month: number | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface BudgetVarianceAlert {
  id: string;
  company_id: string;
  budget_id: string | null;
  account_id: string | null;
  cost_center_id: string | null;
  year: number;
  month: number | null;
  alert_type: 'over_budget' | 'under_budget' | 'critical' | 'warning' | 'info';
  severity: 'critical' | 'warning' | 'info';
  budget_amount: number;
  actual_amount: number;
  variance_amount: number;
  variance_percent: number;
  message: string;
  is_acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface VarianceAnalysisRow {
  budget_id: string;
  company_id: string;
  year: number;
  budget_name: string;
  scenario_type: string;
  version: number;
  is_active: boolean;
  account_id: string | null;
  account_code: string | null;
  account_name: string | null;
  category_type: string | null;
  cost_center_id: string | null;
  cost_center_name: string | null;
  month: number;
  budget_amount: number;
  actual_amount: number;
  variance_amount: number;
  variance_percent: number;
  variance_status: 'favorable' | 'unfavorable';
}

export interface VersionComparison {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  version_a_id: string;
  version_b_id: string;
  comparison_data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

// =====================================================
// SCENARIOS HOOKS
// =====================================================

export function useBudgetScenarios(budgetId?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['budget-scenarios', currentCompany?.id, budgetId],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from('budget_scenarios')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });
      
      if (budgetId) {
        query = query.eq('budget_id', budgetId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        adjustment_rules: (d.adjustment_rules as unknown as AdjustmentRule[]) || [],
      })) as BudgetScenario[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useScenarioTemplates() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['scenario-templates', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('budget_scenarios')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_template', true)
        .eq('is_active', true);

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        adjustment_rules: (d.adjustment_rules as unknown as AdjustmentRule[]) || [],
      })) as BudgetScenario[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateBudgetScenario() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      budget_id?: string;
      name: string;
      scenario_type: BudgetScenario['scenario_type'];
      description?: string;
      probability?: number;
      adjustment_rules: AdjustmentRule[];
      is_template?: boolean;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');

      const insertData = {
        company_id: currentCompany.id,
        budget_id: data.budget_id || null,
        name: data.name,
        scenario_type: data.scenario_type,
        description: data.description || null,
        probability: data.probability || 0.5,
        adjustment_rules: JSON.parse(JSON.stringify(data.adjustment_rules)) as Json,
        is_template: data.is_template || false,
        created_by: user?.id || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: created, error } = await (supabase
        .from('budget_scenarios') as any)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['scenario-templates'] });
      toast.success('Cenário criado com sucesso');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

export function useApplyScenarioToBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scenarioId,
      budgetId,
    }: {
      scenarioId: string;
      budgetId: string;
    }) => {
      // Get scenario
      const { data: scenario, error: scenarioError } = await supabase
        .from('budget_scenarios')
        .select('*')
        .eq('id', scenarioId)
        .single();

      if (scenarioError) throw scenarioError;

      // Get budget lines
      const { data: lines, error: linesError } = await supabase
        .from('budget_lines')
        .select('*, account:account_id(category_type)')
        .eq('budget_id', budgetId);

      if (linesError) throw linesError;

      const rules = (scenario.adjustment_rules as unknown as AdjustmentRule[]) || [];
      const scenarioLines: Omit<BudgetScenarioLine, 'id' | 'created_at'>[] = [];

      for (const line of lines || []) {
        let adjustedAmount = line.planned_amount;

        for (const rule of rules) {
          let applies = false;

          switch (rule.target) {
            case 'revenue':
              applies = line.account?.category_type === 'receita';
              break;
            case 'expense':
              applies = line.account?.category_type === 'despesa';
              break;
            case 'account':
              applies = rule.target_id === line.account_id;
              break;
            case 'cost_center':
              applies = rule.target_id === line.cost_center_id;
              break;
          }

          if (applies && (!rule.months || rule.months.includes(line.month))) {
            if (rule.adjustment_type === 'percentage') {
              adjustedAmount *= (1 + rule.adjustment_value / 100);
            } else {
              adjustedAmount += rule.adjustment_value;
            }
          }
        }

        scenarioLines.push({
          scenario_id: scenarioId,
          source_line_id: line.id,
          account_id: line.account_id,
          cost_center_id: line.cost_center_id,
          month: line.month,
          original_amount: line.planned_amount,
          adjusted_amount: adjustedAmount,
          adjustment_reason: null,
        });
      }

      // Insert scenario lines
      const { error: insertError } = await supabase
        .from('budget_scenario_lines')
        .insert(scenarioLines);

      if (insertError) throw insertError;

      return { scenarioId, linesCount: scenarioLines.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-scenario-lines'] });
      toast.success(`Cenário aplicado com ${data.linesCount} linhas`);
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

export function useBudgetScenarioLines(scenarioId?: string) {
  return useQuery({
    queryKey: ['budget-scenario-lines', scenarioId],
    queryFn: async () => {
      if (!scenarioId) return [];
      const { data, error } = await supabase
        .from('budget_scenario_lines')
        .select(`
          *,
          account:account_id(id, code, account_code, account_name, category_type),
          cost_center:cost_center_id(id, code, name)
        `)
        .eq('scenario_id', scenarioId)
        .order('month');

      if (error) throw error;
      return data || [];
    },
    enabled: !!scenarioId,
  });
}

// =====================================================
// APPROVAL WORKFLOW HOOKS
// =====================================================

export function useBudgetApprovalLevels() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['budget-approval-levels', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('budget_approval_levels')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('level_order');

      if (error) throw error;
      return (data || []) as BudgetApprovalLevel[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateApprovalLevel() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      level_order: number;
      level_name: string;
      min_amount?: number;
      max_amount?: number;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');

      const { data: created, error } = await supabase
        .from('budget_approval_levels')
        .insert({
          company_id: currentCompany.id,
          level_order: data.level_order,
          level_name: data.level_name,
          min_amount: data.min_amount || 0,
          max_amount: data.max_amount || null,
        })
        .select()
        .single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-approval-levels'] });
      toast.success('Nível de aprovação criado');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

export function usePendingApprovals() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['pending-budget-approvals', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('v_pending_budget_approvals')
        .select('*')
        .eq('company_id', currentCompany.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useSubmitForApproval() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      budgetId,
      notes,
    }: {
      budgetId: string;
      notes?: string;
    }) => {
      // Get approval levels for this company
      const { data: budget } = await supabase
        .from('budget_master')
        .select('company_id')
        .eq('id', budgetId)
        .single();

      if (!budget) throw new Error('Orçamento não encontrado');

      const { data: levels } = await supabase
        .from('budget_approval_levels')
        .select('*')
        .eq('company_id', budget.company_id)
        .eq('is_active', true)
        .order('level_order');

      const totalLevels = levels?.length || 1;

      // Create approval request
      const { data: request, error: requestError } = await supabase
        .from('budget_approval_requests')
        .insert({
          budget_id: budgetId,
          requested_by: user?.id,
          notes,
          total_levels: totalLevels,
          current_level: 1,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create approval steps for each level
      const steps = (levels || []).map((level, index) => ({
        request_id: request.id,
        level_id: level.id,
        level_order: index + 1,
      }));

      if (steps.length > 0) {
        const { error: stepsError } = await supabase
          .from('budget_approval_steps')
          .insert(steps);

        if (stepsError) throw stepsError;
      }

      // Update budget status
      await supabase
        .from('budget_master')
        .update({ status: 'pendente_aprovacao' })
        .eq('id', budgetId);

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-masters'] });
      queryClient.invalidateQueries({ queryKey: ['budget-master-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['pending-budget-approvals'] });
      toast.success('Orçamento submetido para aprovação');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

export function useApproveStep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      stepId,
      requestId,
      comments,
      approved,
    }: {
      stepId: string;
      requestId: string;
      comments?: string;
      approved: boolean;
    }) => {
      // Update step
      const { error: stepError } = await supabase
        .from('budget_approval_steps')
        .update({
          status: approved ? 'approved' : 'rejected',
          approver_id: user?.id,
          decision_at: new Date().toISOString(),
          comments,
        })
        .eq('id', stepId);

      if (stepError) throw stepError;

      // Get request info
      const { data: request } = await supabase
        .from('budget_approval_requests')
        .select('*, budget_master!inner(id)')
        .eq('id', requestId)
        .single();

      if (!request) throw new Error('Solicitação não encontrada');

      if (approved) {
        // Check if this was the last level
        if (request.current_level >= request.total_levels) {
          // All approved - mark as complete
          await supabase
            .from('budget_approval_requests')
            .update({
              status: 'approved',
              completed_at: new Date().toISOString(),
            })
            .eq('id', requestId);

          // Update budget status
          await supabase
            .from('budget_master')
            .update({
              status: 'aprovado',
              approved_by: user?.id,
              approved_at: new Date().toISOString(),
            })
            .eq('id', request.budget_id);
        } else {
          // Move to next level
          await supabase
            .from('budget_approval_requests')
            .update({
              current_level: request.current_level + 1,
              status: 'in_review',
            })
            .eq('id', requestId);
        }
      } else {
        // Rejected - update request and budget
        await supabase
          .from('budget_approval_requests')
          .update({
            status: 'rejected',
            completed_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        await supabase
          .from('budget_master')
          .update({ status: 'rascunho' })
          .eq('id', request.budget_id);
      }

      return { approved, requestId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-masters'] });
      queryClient.invalidateQueries({ queryKey: ['budget-master-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['pending-budget-approvals'] });
      toast.success(data.approved ? 'Aprovado com sucesso' : 'Rejeitado');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

// =====================================================
// VARIANCE ANALYSIS HOOKS
// =====================================================

export function useBudgetVarianceAnalysis(year: number, budgetId?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['budget-variance-analysis', currentCompany?.id, year, budgetId],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from('v_budget_variance_analysis')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('year', year);

      if (budgetId) {
        query = query.eq('budget_id', budgetId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as VarianceAnalysisRow[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useBudgetVarianceAlerts(year?: number) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['budget-variance-alerts', currentCompany?.id, year],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from('budget_variance_alerts')
        .select(`
          *,
          account:account_id(id, account_code, account_name),
          cost_center:cost_center_id(id, name)
        `)
        .eq('company_id', currentCompany.id)
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false });

      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as (BudgetVarianceAlert & { account?: Record<string, unknown>; cost_center?: Record<string, unknown> })[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('budget_variance_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-variance-alerts'] });
      toast.success('Alerta reconhecido');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

// =====================================================
// RECLASSIFICATION HOOKS
// =====================================================

export function useBudgetReclassifications(budgetId?: string) {
  return useQuery({
    queryKey: ['budget-reclassifications', budgetId],
    queryFn: async () => {
      if (!budgetId) return [];
      const { data, error } = await supabase
        .from('budget_reclassifications')
        .select(`
          *,
          from_account:accounts!budget_reclassifications_from_account_id_fkey(id, account_code, account_name),
          to_account:accounts!budget_reclassifications_to_account_id_fkey(id, account_code, account_name)
        `)
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as (BudgetReclassification & { from_account?: Record<string, unknown>; to_account?: Record<string, unknown> })[];
    },
    enabled: !!budgetId,
  });
}

export function useCreateReclassification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      budget_id: string;
      from_account_id: string;
      to_account_id: string;
      amount: number;
      month?: number;
      reason: string;
    }) => {
      const { data: created, error } = await supabase
        .from('budget_reclassifications')
        .insert({
          budget_id: data.budget_id,
          from_account_id: data.from_account_id,
          to_account_id: data.to_account_id,
          amount: data.amount,
          month: data.month || null,
          reason: data.reason,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-reclassifications'] });
      toast.success('Reclassificação solicitada');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

export function useApproveReclassification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      reclassificationId,
      approved,
    }: {
      reclassificationId: string;
      approved: boolean;
    }) => {
      const newStatus = approved ? 'approved' : 'rejected';

      const { error } = await supabase
        .from('budget_reclassifications')
        .update({
          status: newStatus,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', reclassificationId);

      if (error) throw error;

      // If approved, apply the reclassification to budget lines
      if (approved) {
        const { data: reclass } = await supabase
          .from('budget_reclassifications')
          .select('*')
          .eq('id', reclassificationId)
          .single();

        if (reclass) {
          // Decrease from source
          const { data: fromLines } = await supabase
            .from('budget_lines')
            .select('*')
            .eq('budget_id', reclass.budget_id)
            .eq('account_id', reclass.from_account_id);

          for (const line of fromLines || []) {
            if (!reclass.month || line.month === reclass.month) {
              await supabase
                .from('budget_lines')
                .update({ planned_amount: line.planned_amount - reclass.amount })
                .eq('id', line.id);
            }
          }

          // Increase to destination (or create new lines)
          const { data: toLines } = await supabase
            .from('budget_lines')
            .select('*')
            .eq('budget_id', reclass.budget_id)
            .eq('account_id', reclass.to_account_id);

          if (toLines && toLines.length > 0) {
            for (const line of toLines) {
              if (!reclass.month || line.month === reclass.month) {
                await supabase
                  .from('budget_lines')
                  .update({ planned_amount: line.planned_amount + reclass.amount })
                  .eq('id', line.id);
              }
            }
          }

          // Mark as applied
          await supabase
            .from('budget_reclassifications')
            .update({ status: 'applied' })
            .eq('id', reclassificationId);
        }
      }

      return { approved };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-reclassifications'] });
      queryClient.invalidateQueries({ queryKey: ['budget-lines'] });
      queryClient.invalidateQueries({ queryKey: ['budget-master-analysis'] });
      toast.success(data.approved ? 'Reclassificação aplicada' : 'Reclassificação rejeitada');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

// =====================================================
// VERSION COMPARISON HOOKS
// =====================================================

export function useCompareVersions(versionAId?: string, versionBId?: string) {
  return useQuery({
    queryKey: ['version-comparison', versionAId, versionBId],
    queryFn: async () => {
      if (!versionAId || !versionBId) return null;

      const [versionA, versionB] = await Promise.all([
        supabase
          .from('budget_revisions')
          .select('*')
          .eq('id', versionAId)
          .single(),
        supabase
          .from('budget_revisions')
          .select('*')
          .eq('id', versionBId)
          .single(),
      ]);

      if (versionA.error || versionB.error) {
        throw new Error('Erro ao carregar versões');
      }

      const linesA = ((versionA.data.snapshot_data as Record<string, unknown>)?.lines as Record<string, unknown>[]) || [];
      const linesB = ((versionB.data.snapshot_data as Record<string, unknown>)?.lines as Record<string, unknown>[]) || [];

      // Build comparison
      const comparison: {
        added: Record<string, unknown>[];
        removed: Record<string, unknown>[];
        changed: { before: Record<string, unknown>; after: Record<string, unknown>; diff: number }[];
        unchanged: Record<string, unknown>[];
      } = {
        added: [],
        removed: [],
        changed: [],
        unchanged: [],
      };

      const bMap = new Map(linesB.map(l => [`${l.account_id}-${l.cost_center_id}-${l.month}`, l]));

      for (const lineA of linesA) {
        const key = `${lineA.account_id}-${lineA.cost_center_id}-${lineA.month}`;
        const lineB = bMap.get(key);

        if (!lineB) {
          comparison.removed.push(lineA);
        } else if ((lineA.planned_amount as number) !== (lineB.planned_amount as number)) {
          comparison.changed.push({
            before: lineA,
            after: lineB,
            diff: (lineB.planned_amount as number) - (lineA.planned_amount as number),
          });
          bMap.delete(key);
        } else {
          comparison.unchanged.push(lineA);
          bMap.delete(key);
        }
      }

      // Remaining in B are added
      for (const lineB of bMap.values()) {
        comparison.added.push(lineB);
      }

      return {
        versionA: versionA.data,
        versionB: versionB.data,
        comparison,
        summary: {
          addedCount: comparison.added.length,
          removedCount: comparison.removed.length,
          changedCount: comparison.changed.length,
          unchangedCount: comparison.unchanged.length,
          totalDiff: comparison.changed.reduce((sum, c) => sum + c.diff, 0),
        },
      };
    },
    enabled: !!versionAId && !!versionBId,
  });
}

export function useSaveVersionComparison() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      version_a_id: string;
      version_b_id: string;
      comparison_data: Record<string, unknown>;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');

      const insertData = {
        company_id: currentCompany.id,
        name: data.name,
        description: data.description || null,
        version_a_id: data.version_a_id,
        version_b_id: data.version_b_id,
        comparison_data: JSON.parse(JSON.stringify(data.comparison_data)) as Json,
        created_by: user?.id,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: created, error } = await (supabase
        .from('budget_version_comparisons') as any)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['version-comparisons'] });
      toast.success('Comparação salva');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}
