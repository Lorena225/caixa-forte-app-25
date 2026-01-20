import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface BudgetMaster {
  id: string;
  company_id: string;
  name: string;
  year: number;
  period_type: 'mensal' | 'trimestral' | 'anual';
  scenario_type: 'original' | 'otimista' | 'realista' | 'pessimista';
  version: number;
  parent_budget_id: string | null;
  status: 'rascunho' | 'pendente_aprovacao' | 'aprovado' | 'ativo' | 'fechado' | 'arquivado';
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetLine {
  id: string;
  budget_id: string;
  account_id: string | null;
  cost_center_id: string | null;
  month: number;
  planned_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetRevision {
  id: string;
  budget_id: string;
  revision_number: number;
  revision_name: string | null;
  reason: string | null;
  snapshot_data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface BudgetForecast {
  id: string;
  company_id: string;
  budget_id: string | null;
  year: number;
  cutoff_month: number;
  account_id: string | null;
  cost_center_id: string | null;
  month: number;
  forecast_amount: number;
  is_actual: boolean;
  notes: string | null;
  created_at: string;
}

export interface BudgetSimulation {
  id: string;
  company_id: string;
  budget_id: string | null;
  name: string;
  description: string | null;
  parameters: {
    revenue_adjustment_pct?: number;
    expense_adjustment_pct?: number;
    specific_accounts?: { account_id: string; adjustment_pct: number }[];
  };
  results: {
    original_revenue?: number;
    adjusted_revenue?: number;
    original_expense?: number;
    adjusted_expense?: number;
    original_profit?: number;
    adjusted_profit?: number;
    monthly_breakdown?: Array<{
      month: number;
      revenue: number;
      expense: number;
      profit: number;
    }>;
  };
  created_by: string | null;
  created_at: string;
}

export interface BudgetMasterAnalysis extends BudgetMaster {
  total_revenue_planned: number;
  total_expense_planned: number;
  total_profit_planned: number;
  accounts_count: number;
  cost_centers_count: number;
  revisions_count: number;
}

// =============================================
// BUDGET MASTER HOOKS
// =============================================

export function useBudgetMasters(year?: number, scenarioType?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['budget-masters', currentCompany?.id, year, scenarioType],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from('budget_master')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('year', { ascending: false })
        .order('version', { ascending: false });

      if (year) query = query.eq('year', year);
      if (scenarioType) query = query.eq('scenario_type', scenarioType);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BudgetMaster[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useBudgetMasterAnalysis(year?: number) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['budget-master-analysis', currentCompany?.id, year],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from('v_budget_master_analysis')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('year', { ascending: false })
        .order('version', { ascending: false });

      if (year) query = query.eq('year', year);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BudgetMasterAnalysis[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useBudgetMasterById(budgetId?: string) {
  return useQuery({
    queryKey: ['budget-master', budgetId],
    queryFn: async () => {
      if (!budgetId) return null;
      const { data, error } = await supabase
        .from('budget_master')
        .select('*')
        .eq('id', budgetId)
        .single();
      if (error) throw error;
      return data as BudgetMaster;
    },
    enabled: !!budgetId,
  });
}

export function useCreateBudgetMaster() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      year: number;
      period_type: string;
      scenario_type?: string;
      parent_budget_id?: string;
      notes?: string;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');

      // Calculate next version for this year/scenario
      const { data: existing } = await supabase
        .from('budget_master')
        .select('version')
        .eq('company_id', currentCompany.id)
        .eq('year', data.year)
        .eq('scenario_type', data.scenario_type || 'original')
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = (existing?.[0]?.version || 0) + 1;

      const { data: created, error } = await supabase
        .from('budget_master')
        .insert({
          company_id: currentCompany.id,
          name: data.name,
          year: data.year,
          period_type: data.period_type,
          scenario_type: data.scenario_type || 'original',
          parent_budget_id: data.parent_budget_id || null,
          version: nextVersion,
          created_by: user?.id || null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return created as BudgetMaster;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-masters'] });
      queryClient.invalidateQueries({ queryKey: ['budget-master-analysis'] });
      toast.success('Orçamento criado com sucesso');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

export function useUpdateBudgetMaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<BudgetMaster> & { id: string }) => {
      const { error } = await supabase
        .from('budget_master')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-masters'] });
      queryClient.invalidateQueries({ queryKey: ['budget-master-analysis'] });
      toast.success('Orçamento atualizado');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

export function useApproveBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (budgetId: string) => {
      const { error } = await supabase
        .from('budget_master')
        .update({
          status: 'aprovado',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', budgetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-masters'] });
      queryClient.invalidateQueries({ queryKey: ['budget-master-analysis'] });
      toast.success('Orçamento aprovado');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

export function useActivateBudget() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async ({ budgetId, year }: { budgetId: string; year: number }) => {
      // Deactivate all other budgets for this year
      await supabase
        .from('budget_master')
        .update({ is_active: false })
        .eq('company_id', currentCompany?.id)
        .eq('year', year);

      // Activate this budget
      const { error } = await supabase
        .from('budget_master')
        .update({ is_active: true, status: 'ativo' })
        .eq('id', budgetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-masters'] });
      queryClient.invalidateQueries({ queryKey: ['budget-master-analysis'] });
      toast.success('Orçamento ativado');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

// =============================================
// BUDGET LINES HOOKS
// =============================================

export function useBudgetLines(budgetId?: string) {
  return useQuery({
    queryKey: ['budget-lines', budgetId],
    queryFn: async () => {
      if (!budgetId) return [];
      const { data, error } = await supabase
        .from('budget_lines')
        .select(`
          *,
          account:account_id(id, code, account_code, account_name, category_type),
          cost_center:cost_center_id(id, code, name)
        `)
        .eq('budget_id', budgetId)
        .order('month');
      if (error) throw error;
      return data || [];
    },
    enabled: !!budgetId,
  });
}

export function useUpsertBudgetLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      budget_id: string;
      account_id?: string;
      cost_center_id?: string;
      month: number;
      planned_amount: number;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('budget_lines')
        .upsert(
          {
            budget_id: data.budget_id,
            account_id: data.account_id || null,
            cost_center_id: data.cost_center_id || null,
            month: data.month,
            planned_amount: data.planned_amount,
            notes: data.notes || null,
          },
          { onConflict: 'budget_id,account_id,cost_center_id,month' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-lines'] });
      queryClient.invalidateQueries({ queryKey: ['budget-master-analysis'] });
      toast.success('Linha de orçamento salva');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

export function useBulkUpsertBudgetLines() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lines: Array<{
      budget_id: string;
      account_id?: string;
      cost_center_id?: string;
      month: number;
      planned_amount: number;
      notes?: string;
    }>) => {
      const { error } = await supabase
        .from('budget_lines')
        .upsert(
          lines.map(l => ({
            budget_id: l.budget_id,
            account_id: l.account_id || null,
            cost_center_id: l.cost_center_id || null,
            month: l.month,
            planned_amount: l.planned_amount,
            notes: l.notes || null,
          })),
          { onConflict: 'budget_id,account_id,cost_center_id,month' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-lines'] });
      queryClient.invalidateQueries({ queryKey: ['budget-master-analysis'] });
      toast.success('Linhas de orçamento salvas');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

// =============================================
// BUDGET REVISIONS HOOKS
// =============================================

export function useBudgetRevisions(budgetId?: string) {
  return useQuery({
    queryKey: ['budget-revisions', budgetId],
    queryFn: async () => {
      if (!budgetId) return [];
      const { data, error } = await supabase
        .from('budget_revisions')
        .select('*')
        .eq('budget_id', budgetId)
        .order('revision_number', { ascending: false });
      if (error) throw error;
      return (data || []) as BudgetRevision[];
    },
    enabled: !!budgetId,
  });
}

export function useCreateBudgetRevision() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      budgetId,
      revisionName,
      reason,
    }: {
      budgetId: string;
      revisionName?: string;
      reason?: string;
    }) => {
      // Get current lines as snapshot
      const { data: lines, error: linesError } = await supabase
        .from('budget_lines')
        .select('*')
        .eq('budget_id', budgetId);
      if (linesError) throw linesError;

      // Get next revision number
      const { data: existingRevisions } = await supabase
        .from('budget_revisions')
        .select('revision_number')
        .eq('budget_id', budgetId)
        .order('revision_number', { ascending: false })
        .limit(1);

      const nextRevision = (existingRevisions?.[0]?.revision_number || 0) + 1;

      const { data, error } = await supabase
        .from('budget_revisions')
        .insert({
          budget_id: budgetId,
          revision_number: nextRevision,
          revision_name: revisionName || `Revisão ${nextRevision}`,
          reason,
          snapshot_data: { lines },
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BudgetRevision;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-revisions'] });
      queryClient.invalidateQueries({ queryKey: ['budget-master-analysis'] });
      toast.success('Revisão criada com sucesso');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

export function useDuplicateBudget() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      sourceBudgetId,
      newName,
      scenarioType,
    }: {
      sourceBudgetId: string;
      newName: string;
      scenarioType?: string;
    }) => {
      // Get source budget
      const { data: source, error: sourceError } = await supabase
        .from('budget_master')
        .select('*')
        .eq('id', sourceBudgetId)
        .single();
      if (sourceError) throw sourceError;

      // Get source lines
      const { data: sourceLines, error: linesError } = await supabase
        .from('budget_lines')
        .select('*')
        .eq('budget_id', sourceBudgetId);
      if (linesError) throw linesError;

      // Calculate next version
      const { data: existing } = await supabase
        .from('budget_master')
        .select('version')
        .eq('company_id', currentCompany?.id)
        .eq('year', source.year)
        .eq('scenario_type', scenarioType || source.scenario_type)
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = (existing?.[0]?.version || 0) + 1;

      // Create new budget
      const { data: newBudget, error: newError } = await supabase
        .from('budget_master')
        .insert({
          company_id: currentCompany?.id,
          name: newName,
          year: source.year,
          period_type: source.period_type,
          scenario_type: scenarioType || source.scenario_type,
          version: nextVersion,
          parent_budget_id: sourceBudgetId,
          created_by: user?.id,
        })
        .select()
        .single();
      if (newError) throw newError;

      // Copy lines to new budget
      if (sourceLines && sourceLines.length > 0) {
        const newLines = sourceLines.map((line) => ({
          budget_id: newBudget.id,
          account_id: line.account_id,
          cost_center_id: line.cost_center_id,
          month: line.month,
          planned_amount: line.planned_amount,
          notes: line.notes,
        }));

        const { error: insertError } = await supabase
          .from('budget_lines')
          .insert(newLines);
        if (insertError) throw insertError;
      }

      return newBudget as BudgetMaster;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-masters'] });
      queryClient.invalidateQueries({ queryKey: ['budget-master-analysis'] });
      toast.success('Orçamento duplicado com sucesso');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

// =============================================
// ROLLING FORECAST HOOKS
// =============================================

export function useBudgetForecasts(year: number, cutoffMonth?: number) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['budget-forecasts', currentCompany?.id, year, cutoffMonth],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from('budget_forecasts')
        .select(`
          *,
          account:account_id(id, code, account_code, account_name, category_type),
          cost_center:cost_center_id(id, code, name)
        `)
        .eq('company_id', currentCompany.id)
        .eq('year', year)
        .order('month');

      if (cutoffMonth) query = query.eq('cutoff_month', cutoffMonth);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useGenerateRollingForecast() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      budgetId,
      year,
      cutoffMonth,
    }: {
      budgetId: string;
      year: number;
      cutoffMonth: number;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');

      // Get budget lines for future months
      const { data: budgetLines, error: blError } = await supabase
        .from('budget_lines')
        .select('*')
        .eq('budget_id', budgetId)
        .gt('month', cutoffMonth);
      if (blError) throw blError;

      // Get actual data from transactions for past months
      const { data: actuals, error: actError } = await supabase
        .from('transactions')
        .select('account_id, cost_center_id, direction, total_amount')
        .eq('company_id', currentCompany.id)
        .eq('status', 'pago')
        .gte('due_date', `${year}-01-01`)
        .lte('due_date', `${year}-${String(cutoffMonth).padStart(2, '0')}-31`);
      if (actError) throw actError;

      // Delete existing forecasts for this cutoff
      await supabase
        .from('budget_forecasts')
        .delete()
        .eq('company_id', currentCompany.id)
        .eq('year', year)
        .eq('cutoff_month', cutoffMonth);

      const forecastEntries: Array<{
        company_id: string;
        budget_id: string;
        year: number;
        cutoff_month: number;
        account_id: string | null;
        cost_center_id: string | null;
        month: number;
        forecast_amount: number;
        is_actual: boolean;
        created_by: string | null;
      }> = [];

      // Add actual data for months <= cutoff
      const actualsByMonth = new Map<string, number>();
      (actuals || []).forEach((t) => {
        const key = `${t.account_id}-${t.cost_center_id || 'null'}`;
        const amount = Number(t.total_amount) * (t.direction === 'saida' ? -1 : 1);
        actualsByMonth.set(key, (actualsByMonth.get(key) || 0) + amount);
      });

      // Add forecast entries for future months from budget
      (budgetLines || []).forEach((line) => {
        forecastEntries.push({
          company_id: currentCompany.id,
          budget_id: budgetId,
          year,
          cutoff_month: cutoffMonth,
          account_id: line.account_id,
          cost_center_id: line.cost_center_id,
          month: line.month,
          forecast_amount: line.planned_amount,
          is_actual: false,
          created_by: user?.id || null,
        });
      });

      if (forecastEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('budget_forecasts')
          .insert(forecastEntries);
        if (insertError) throw insertError;
      }

      return forecastEntries.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['budget-forecasts'] });
      toast.success(`Rolling Forecast gerado: ${count} linhas`);
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

// =============================================
// SIMULATIONS HOOKS
// =============================================

export function useBudgetSimulations(budgetId?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['budget-simulations', currentCompany?.id, budgetId],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from('budget_simulations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (budgetId) query = query.eq('budget_id', budgetId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BudgetSimulation[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateSimulation() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      budgetId,
      name,
      description,
      parameters,
    }: {
      budgetId: string;
      name: string;
      description?: string;
      parameters: BudgetSimulation['parameters'];
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');

      // Get budget lines to calculate results
      const { data: lines, error: linesError } = await supabase
        .from('budget_lines')
        .select(`
          *,
          account:account_id(category_type)
        `)
        .eq('budget_id', budgetId);
      if (linesError) throw linesError;

      // Calculate original totals
      let originalRevenue = 0;
      let originalExpense = 0;

      (lines || []).forEach((line) => {
        const amount = Number(line.planned_amount);
        const categoryType = (line.account as { category_type?: string })?.category_type;
        if (categoryType === 'receita') originalRevenue += amount;
        else if (categoryType === 'despesa' || categoryType === 'custo') originalExpense += amount;
      });

      // Apply adjustments
      const revenueAdj = 1 + (parameters.revenue_adjustment_pct || 0) / 100;
      const expenseAdj = 1 + (parameters.expense_adjustment_pct || 0) / 100;

      const adjustedRevenue = originalRevenue * revenueAdj;
      const adjustedExpense = originalExpense * expenseAdj;

      const results: BudgetSimulation['results'] = {
        original_revenue: originalRevenue,
        adjusted_revenue: adjustedRevenue,
        original_expense: originalExpense,
        adjusted_expense: adjustedExpense,
        original_profit: originalRevenue - originalExpense,
        adjusted_profit: adjustedRevenue - adjustedExpense,
      };

      const { data, error } = await supabase
        .from('budget_simulations')
        .insert({
          company_id: currentCompany.id,
          budget_id: budgetId,
          name,
          description,
          parameters,
          results,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BudgetSimulation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-simulations'] });
      toast.success('Simulação criada');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

export function useDeleteSimulation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (simulationId: string) => {
      const { error } = await supabase
        .from('budget_simulations')
        .delete()
        .eq('id', simulationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-simulations'] });
      toast.success('Simulação excluída');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

// =============================================
// BUDGET VS ACTUAL COMPARISON
// =============================================

export function useBudgetVsActualAdvanced(budgetId?: string, year?: number) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['budget-vs-actual-advanced', currentCompany?.id, budgetId, year],
    queryFn: async () => {
      if (!currentCompany?.id || !year) return null;

      // Get budget lines
      let budgetLines: Array<Record<string, unknown>> = [];
      if (budgetId) {
        const { data, error } = await supabase
          .from('budget_lines')
          .select(`
            *,
            account:account_id(id, code, account_code, account_name, category_type)
          `)
          .eq('budget_id', budgetId);
        if (error) throw error;
        budgetLines = data || [];
      }

      // Get actual transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('account_id, direction, total_amount, due_date, status')
        .eq('company_id', currentCompany.id)
        .eq('status', 'pago')
        .gte('due_date', `${year}-01-01`)
        .lte('due_date', `${year}-12-31`);
      if (txError) throw txError;

      // Aggregate actuals by account and month
      const actualsByAccountMonth = new Map<string, number>();
      (transactions || []).forEach((tx) => {
        const month = new Date(tx.due_date).getMonth() + 1;
        const key = `${tx.account_id}-${month}`;
        const amount = Number(tx.total_amount) * (tx.direction === 'saida' ? 1 : 1);
        actualsByAccountMonth.set(key, (actualsByAccountMonth.get(key) || 0) + amount);
      });

      // Build comparison data
      const comparisonData = budgetLines.map((line) => {
        const key = `${line.account_id}-${line.month}`;
        const actualAmount = actualsByAccountMonth.get(key) || 0;
        const plannedAmount = Number(line.planned_amount);
        const variance = actualAmount - plannedAmount;
        const variancePercent = plannedAmount !== 0 ? (variance / plannedAmount) * 100 : 0;
        const account = line.account as { category_type?: string } | undefined;

        return {
          id: line.id,
          budget_id: line.budget_id,
          account_id: line.account_id,
          cost_center_id: line.cost_center_id,
          month: line.month,
          planned_amount: plannedAmount,
          notes: line.notes,
          account,
          actual_amount: actualAmount,
          variance,
          variance_percent: variancePercent,
        };
      });

      // Calculate totals
      const totals = comparisonData.reduce(
        (acc, item) => {
          const categoryType = item.account?.category_type;
          if (categoryType === 'receita') {
            acc.planned_revenue += item.planned_amount;
            acc.actual_revenue += item.actual_amount;
          } else if (categoryType === 'despesa' || categoryType === 'custo') {
            acc.planned_expense += item.planned_amount;
            acc.actual_expense += item.actual_amount;
          }
          return acc;
        },
        { planned_revenue: 0, actual_revenue: 0, planned_expense: 0, actual_expense: 0 }
      );

      return {
        lines: comparisonData,
        totals: {
          ...totals,
          planned_profit: totals.planned_revenue - totals.planned_expense,
          actual_profit: totals.actual_revenue - totals.actual_expense,
          revenue_variance: totals.actual_revenue - totals.planned_revenue,
          expense_variance: totals.actual_expense - totals.planned_expense,
        },
      };
    },
    enabled: !!currentCompany?.id && !!year,
  });
}
