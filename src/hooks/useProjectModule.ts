import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============ Tipos ============
export interface ProjectEconomics {
  budget_hours: number;
  budget_cost: number;
  budget_revenue: number;
  hours_logged: number;
  cost_actual: number;
  revenue_billed: number;
  wip: number;
  progress_pct: number;
  margin_plan_pct: number;
  margin_real_pct: number;
  burn_pct: number;
}

// ============ Economia do projeto (RPC project_economics) ============
export function useProjectEconomics(projectId: string | null) {
  return useQuery({
    queryKey: ['project-economics', projectId],
    queryFn: async (): Promise<ProjectEconomics | null> => {
      if (!projectId) return null;
      const { data, error } = await supabase.rpc('project_economics', { p_project_id: projectId });
      if (error) throw error;
      return data as ProjectEconomics;
    },
    enabled: !!projectId,
  });
}

// ============ Portfólio com economia agregada ============
export function usePortfolioEconomics() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['portfolio-economics', currentCompany?.id],
    queryFn: async () => {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status, counterparty:counterparties(name)')
        .eq('company_id', currentCompany!.id)
        .neq('status', 'cancelado')
        .order('created_at', { ascending: false });

      const rows = await Promise.all(
        (projects ?? []).map(async (p: any) => {
          const { data: econ } = await supabase.rpc('project_economics', { p_project_id: p.id });
          return { ...p, econ: econ as ProjectEconomics };
        })
      );
      return rows;
    },
    enabled: !!currentCompany?.id,
  });
}

// ============ Timesheet ============
export function useTimeEntries(projectId: string | null, statusFilter?: string) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['time-entries', currentCompany?.id, projectId, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('project_time_entries')
        .select('*, employee:employees_profiles(full_name), project:projects(name)')
        .eq('company_id', currentCompany!.id)
        .order('entry_date', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      if (statusFilter && statusFilter !== 'todos') q = q.eq('status', statusFilter);
      const { data } = await q.limit(200);
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateTimeEntry() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      project_id: string; employee_id: string; entry_date: string;
      hours: number; billable: boolean; description?: string; task_id?: string;
    }) => {
      const { error } = await supabase.from('project_time_entries').insert({
        company_id: currentCompany!.id,
        ...entry,
        status: 'enviado',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Horas apontadas e enviadas para aprovação');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao apontar horas'),
  });
}

export function useApproveTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.rpc('ai_approve_time_entry', { p_entry_id: entryId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      qc.invalidateQueries({ queryKey: ['project-economics'] });
      qc.invalidateQueries({ queryKey: ['portfolio-economics'] });
      toast.success('Horas aprovadas — custo realizado atualizado');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao aprovar'),
  });
}

export function useRejectTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.from('project_time_entries')
        .update({ status: 'rejeitado', reject_reason: reason }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Apontamento rejeitado');
    },
  });
}

// ============ Alocação ============
export function useAllocations(projectId: string | null) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['allocations', currentCompany?.id, projectId],
    queryFn: async () => {
      let q = supabase
        .from('project_allocations')
        .select('*, employee:employees_profiles(full_name), project:projects(name)')
        .eq('company_id', currentCompany!.id);
      if (projectId) q = q.eq('project_id', projectId);
      const { data } = await q.order('start_date', { ascending: false });
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateAllocation() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: {
      project_id: string; employee_id: string; allocation_pct: number;
      bill_rate: number; start_date: string; end_date?: string;
    }) => {
      const { error } = await supabase.from('project_allocations')
        .insert({ company_id: currentCompany!.id, ...a });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allocations'] });
      toast.success('Pessoa alocada ao projeto');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao alocar'),
  });
}

// ============ Orçamento ============
export function useProjectBudget(projectId: string | null) {
  return useQuery({
    queryKey: ['project-budget', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase.from('project_budgets')
        .select('*').eq('project_id', projectId).eq('is_active', true)
        .order('version', { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });
}

export function useSaveBudget() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: {
      project_id: string; budget_hours: number; budget_cost: number; budget_revenue: number;
    }) => {
      // desativa versões anteriores e cria nova
      await supabase.from('project_budgets')
        .update({ is_active: false }).eq('project_id', b.project_id);
      const { data: prev } = await supabase.from('project_budgets')
        .select('version').eq('project_id', b.project_id)
        .order('version', { ascending: false }).limit(1).maybeSingle();
      const version = (prev?.version ?? 0) + 1;
      const { error } = await supabase.from('project_budgets').insert({
        company_id: currentCompany!.id, ...b, version,
        label: version === 1 ? 'Baseline' : `Revisão ${version}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-budget'] });
      qc.invalidateQueries({ queryKey: ['project-economics'] });
      toast.success('Orçamento salvo');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao salvar orçamento'),
  });
}

// ============ Despesas ============
export function useProjectExpenses(projectId: string | null) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['project-expenses', currentCompany?.id, projectId],
    queryFn: async () => {
      let q = supabase.from('project_expenses')
        .select('*, employee:employees_profiles(full_name), project:projects(name)')
        .eq('company_id', currentCompany!.id);
      if (projectId) q = q.eq('project_id', projectId);
      const { data } = await q.order('expense_date', { ascending: false });
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateExpense() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: {
      project_id: string; description: string; amount: number;
      expense_date: string; reimbursable: boolean; category?: string;
    }) => {
      const { error } = await supabase.from('project_expenses')
        .insert({ company_id: currentCompany!.id, ...e, status: 'pendente' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-expenses'] });
      toast.success('Despesa lançada para aprovação');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao lançar despesa'),
  });
}

export function useApproveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_expenses')
        .update({ status: 'aprovado', approved_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-expenses'] });
      qc.invalidateQueries({ queryKey: ['project-economics'] });
      toast.success('Despesa aprovada — entra no custo do projeto');
    },
  });
}

// ============ Eventos de faturamento ============
export function useBillingEvents(projectId: string | null) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['billing-events', currentCompany?.id, projectId],
    queryFn: async () => {
      let q = supabase.from('project_billing_events')
        .select('*, project:projects(name)')
        .eq('company_id', currentCompany!.id);
      if (projectId) q = q.eq('project_id', projectId);
      const { data } = await q.order('reference_date', { ascending: false });
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateBillingEvent() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: {
      project_id: string; event_type: string; description: string;
      amount: number; reference_date: string; due_date?: string;
    }) => {
      const { error } = await supabase.from('project_billing_events')
        .insert({ company_id: currentCompany!.id, ...e, status: 'previsto' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-events'] });
      toast.success('Evento de faturamento criado');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao criar evento'),
  });
}

export function useApproveBillingEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_billing_events')
        .update({ status: 'aprovado', approved_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-events'] });
      qc.invalidateQueries({ queryKey: ['project-economics'] });
      toast.success('Evento aprovado — pronto para faturar');
    },
  });
}

export function useInvoiceBillingEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase.rpc('ai_invoice_billing_event', { p_event_id: eventId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-events'] });
      qc.invalidateQueries({ queryKey: ['project-economics'] });
      toast.success('Título gerado no Contas a Receber');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao faturar'),
  });
}

// ============ Riscos ============
export function useProjectRisks(projectId: string | null) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['project-risks', currentCompany?.id, projectId],
    queryFn: async () => {
      let q = supabase.from('project_risks')
        .select('*, owner:employees_profiles(full_name)')
        .eq('company_id', currentCompany!.id);
      if (projectId) q = q.eq('project_id', projectId);
      const { data } = await q.order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateRisk() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: {
      project_id: string; title: string; description?: string;
      severity: string; kind: string; due_date?: string;
    }) => {
      const { error } = await supabase.from('project_risks')
        .insert({ company_id: currentCompany!.id, ...r, status: 'aberto' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-risks'] });
      toast.success('Risco registrado');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao registrar risco'),
  });
}

// ============ Custo-hora ============
export function useEmployeesWithRates() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['employees-rates', currentCompany?.id],
    queryFn: async () => {
      const { data: emps } = await supabase.from('employees_profiles')
        .select('id, full_name').eq('company_id', currentCompany!.id).order('full_name');
      const rows = await Promise.all((emps ?? []).map(async (e: any) => {
        const { data: rate } = await supabase.from('employee_cost_rates')
          .select('cost_per_hour, valid_from').eq('employee_id', e.id)
          .order('valid_from', { ascending: false }).limit(1).maybeSingle();
        return { ...e, cost_per_hour: rate?.cost_per_hour ?? null };
      }));
      return rows;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useSaveCostRate() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employee_id, cost_per_hour }: { employee_id: string; cost_per_hour: number }) => {
      const today = new Date().toISOString().slice(0, 10);
      // encerra vigência anterior
      await supabase.from('employee_cost_rates')
        .update({ valid_to: today }).eq('employee_id', employee_id).is('valid_to', null);
      const { error } = await supabase.from('employee_cost_rates')
        .insert({ company_id: currentCompany!.id, employee_id, cost_per_hour, valid_from: today });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees-rates'] });
      toast.success('Custo-hora atualizado');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao salvar custo-hora'),
  });
}
