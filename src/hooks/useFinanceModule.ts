import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============ Títulos (para selecionar em rateio/renegociação) ============
export function useTransactions(direction?: 'entrada' | 'saida', statusFilter?: string) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['fin-transactions', currentCompany?.id, direction, statusFilter],
    queryFn: async () => {
      let q = supabase.from('transactions')
        .select('*, counterparty:counterparties(name)')
        .eq('company_id', currentCompany!.id)
        .order('due_date', { ascending: false });
      if (direction) q = q.eq('direction', direction);
      if (statusFilter && statusFilter !== 'todos') q = q.eq('status', statusFilter);
      const { data } = await q.limit(200);
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

// ============ Rateios ============
export function useTransactionAllocations(transactionId: string | null) {
  return useQuery({
    queryKey: ['tx-allocations', transactionId],
    queryFn: async () => {
      if (!transactionId) return [];
      const { data } = await supabase.from('transaction_allocations')
        .select('*, cost_center:cost_centers(name), project:projects(name)')
        .eq('transaction_id', transactionId);
      return data ?? [];
    },
    enabled: !!transactionId,
  });
}

export function useSetAllocations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ transactionId, allocations }: {
      transactionId: string;
      allocations: Array<{ cost_center_id?: string; project_id?: string; percentage: number }>;
    }) => {
      const { data, error } = await supabase.rpc('ai_set_transaction_allocations', {
        p_transaction_id: transactionId,
        p_allocations: allocations,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tx-allocations'] });
      qc.invalidateQueries({ queryKey: ['project-economics'] });
      qc.invalidateQueries({ queryKey: ['portfolio-economics'] });
      toast.success('Rateio salvo — custos distribuídos');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao salvar rateio'),
  });
}

// ============ Trilha de auditoria ============
export function useAuditTrail(entityType: string, entityId: string | null) {
  return useQuery({
    queryKey: ['audit-trail', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      const { data } = await supabase.from('finance_audit_log')
        .select('*').eq('entity_type', entityType).eq('entity_id', entityId)
        .order('created_at', { ascending: false }).limit(50);
      return data ?? [];
    },
    enabled: !!entityId,
  });
}

export function useCompanyAuditTrail() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['company-audit', currentCompany?.id],
    queryFn: async () => {
      const { data } = await supabase.from('finance_audit_log')
        .select('*').eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false }).limit(100);
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

// ============ Fechamento mensal ============
export function useFinancialPeriods() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['fin-periods', currentCompany?.id],
    queryFn: async () => {
      const { data } = await supabase.from('financial_periods')
        .select('*').eq('company_id', currentCompany!.id)
        .order('period_month', { ascending: false });
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useOpenPeriod() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (periodMonth: string) => {
      const { data, error } = await supabase.rpc('ai_open_financial_period', {
        p_company_id: currentCompany!.id, p_period_month: periodMonth,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-periods'] });
      qc.invalidateQueries({ queryKey: ['closing-checklist'] });
      toast.success('Período aberto');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao abrir período'),
  });
}

export function useClosingChecklist(periodId: string | null) {
  return useQuery({
    queryKey: ['closing-checklist', periodId],
    queryFn: async () => {
      if (!periodId) return null;
      const { data, error } = await supabase.rpc('ai_closing_checklist', { p_period_id: periodId });
      if (error) throw error;
      return data;
    },
    enabled: !!periodId,
  });
}

export function useClosePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: string) => {
      const { data, error } = await supabase.rpc('ai_close_financial_period', { p_period_id: periodId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-periods'] });
      qc.invalidateQueries({ queryKey: ['closing-checklist'] });
      toast.success('Período fechado — competência travada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao fechar período'),
  });
}

export function useReopenPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodId, reason }: { periodId: string; reason: string }) => {
      const { error } = await supabase.rpc('ai_reopen_financial_period', { p_period_id: periodId, p_reason: reason });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-periods'] });
      toast.success('Período reaberto');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao reabrir'),
  });
}

// ============ Regras de conciliação ============
export function useReconciliationRules() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['recon-rules', currentCompany?.id],
    queryFn: async () => {
      const { data } = await supabase.from('reconciliation_rules')
        .select('*').eq('company_id', currentCompany!.id)
        .order('priority', { ascending: true });
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateReconRule() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: {
      name: string; description?: string; priority: number;
      match_criteria: any; action: any;
    }) => {
      const { error } = await supabase.from('reconciliation_rules').insert({
        company_id: currentCompany!.id, ...rule, is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recon-rules'] });
      toast.success('Regra de conciliação criada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao criar regra'),
  });
}

export function useToggleReconRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('reconciliation_rules')
        .update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recon-rules'] }),
  });
}

// ============ Renegociação ============
export function useRenegotiate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      transactionId: string; entryAmount: number; installments: number;
      firstDueDate: string; interestPct: number;
    }) => {
      const { data, error } = await supabase.rpc('ai_renegotiate_title', {
        p_transaction_id: payload.transactionId,
        p_entry_amount: payload.entryAmount,
        p_installments: payload.installments,
        p_first_due_date: payload.firstDueDate,
        p_interest_pct: payload.interestPct,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['fin-transactions'] });
      toast.success(`Renegociado em ${n} parcela(s)`);
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao renegociar'),
  });
}

// ============ Aging (cobrança/inadimplência) ============
export function useAgingReport(direction: 'entrada' | 'saida') {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['aging', currentCompany?.id, direction],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ai_aging_report', {
        p_company_id: currentCompany!.id, p_direction: direction,
      });
      if (error) throw error;
      return data as { current: number; d30: number; d60: number; d90: number; d90plus: number };
    },
    enabled: !!currentCompany?.id,
  });
}

// ============ FASE 2: Inadimplência, Cashflow projetado, Adiantamentos, Contábil ============
export function useDelinquencyForecast() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['delinquency', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ai_delinquency_forecast', { p_company_id: currentCompany!.id });
      if (error) throw error;
      return (data ?? []) as Array<{ counterparty_id: string; client_name: string; open_amount: number;
        avg_delay_days: number; paid_late_ratio: number; risk_score: number; risk_level: string }>;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useRunDelinquencyAgent() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('ai_run_delinquency_agent', { p_company_id: currentCompany!.id });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['delinquency-alerts'] });
      toast.success(n > 0 ? `${n} alerta(s) de risco gerado(s)` : 'Nenhum cliente de alto risco com saldo em aberto');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao rodar agente'),
  });
}

export function useCashflowSummary(days = 90) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['cashflow-summary', currentCompany?.id, days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ai_cashflow_summary', { p_company_id: currentCompany!.id, p_days: days });
      if (error) throw error;
      return (data ?? []) as Array<{ ref_date: string; day_inflow: number; day_outflow: number; day_net: number }>;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useAdvances() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['advances', currentCompany?.id],
    queryFn: async () => {
      const { data } = await supabase.from('advance_payments')
        .select('*, counterparty:counterparties(name), employee:employees_profiles(full_name)')
        .eq('company_id', currentCompany!.id).order('advance_date', { ascending: false });
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateAdvance() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { kind: string; description: string; amount: number; counterparty_id?: string; employee_id?: string; advance_date: string }) => {
      const { error } = await supabase.from('advance_payments').insert({
        company_id: currentCompany!.id, ...a, balance: a.amount, status: 'aberto',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advances'] });
      toast.success('Adiantamento registrado');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao registrar adiantamento'),
  });
}

export function useCompensateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ advanceId, amount }: { advanceId: string; amount: number }) => {
      const { data, error } = await supabase.rpc('ai_compensate_advance', { p_advance_id: advanceId, p_amount: amount });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advances'] });
      toast.success('Adiantamento compensado');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao compensar'),
  });
}

export function useDelinquencyAlerts() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['delinquency-alerts', currentCompany?.id],
    queryFn: async () => {
      const { data } = await supabase.from('agent_action_log')
        .select('*').eq('company_id', currentCompany!.id).eq('action_key', 'risco_inadimplencia')
        .order('created_at', { ascending: false }).limit(20);
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function usePostAccountingEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transactionId: string) => {
      const { data, error } = await supabase.rpc('ai_post_accounting_entry', { p_transaction_id: transactionId });
      if (error) throw error;
      return data;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['audit-trail'] });
      toast.success(id ? 'Lançamento contábil gerado' : 'Sem de-para contábil para a categoria (registrado no log)');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao gerar lançamento'),
  });
}

// ============ FISCAL/CONTÁBIL: apuração, conciliação contábil, provisões ============
export function useTaxParameters() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['tax-params', currentCompany?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tax_parameters')
        .select('*').eq('company_id', currentCompany!.id).order('tax_type');
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useSeedTaxParameters() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('ai_seed_tax_parameters', { p_company_id: currentCompany!.id });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['tax-params'] });
      toast.success(n > 0 ? `${n} parâmetros padrão criados (Lucro Presumido)` : 'Parâmetros já existem');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao criar parâmetros'),
  });
}

export function useUpdateTaxParameter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rate }: { id: string; rate: number }) => {
      const { error } = await supabase.from('tax_parameters').update({ rate, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tax-params'] }); toast.success('Alíquota atualizada'); },
  });
}

export function useAssessment(year: number, month: number) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['assessment', currentCompany?.id, year, month],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ai_get_assessment', { p_company_id: currentCompany!.id, p_year: year, p_month: month });
      if (error) throw error;
      return (data ?? []) as Array<{ tipo_imposto: string; debitos: number; saldo_apurado: number; status: string }>;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useRunAssessment() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }) => {
      const { data, error } = await supabase.rpc('ai_run_tax_assessment', { p_company_id: currentCompany!.id, p_year: year, p_month: month });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment'] });
      toast.success('Apuração calculada sobre a receita do período');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro na apuração'),
  });
}

export function useAccountingClosingCheck(year: number, month: number) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['acct-closing', currentCompany?.id, year, month],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ai_accounting_closing_check', { p_company_id: currentCompany!.id, p_year: year, p_month: month });
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useProvisions() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['provisions', currentCompany?.id],
    queryFn: async () => {
      const { data } = await supabase.from('accounting_provisions')
        .select('*').eq('company_id', currentCompany!.id).order('competence', { ascending: false });
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateProvision() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { kind: string; description: string; amount: number; competence: string }) => {
      const { error } = await supabase.from('accounting_provisions').insert({
        company_id: currentCompany!.id, ...p, status: 'provisionado',
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['provisions'] }); toast.success('Provisão lançada'); },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao lançar provisão'),
  });
}

// ============ Dashboard executivo: Pulso ============
export function useDashboardPulse() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['dashboard-pulse', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ai_dashboard_pulse', { p_company_id: currentCompany!.id });
      if (error) throw error;
      return data as {
        cash: number; receivable: number; receivable_overdue: number;
        payable: number; payable_7d: number; revenue_month: number;
        cost_month: number; margin_pct: number; has_data: boolean;
      };
    },
    enabled: !!currentCompany?.id,
  });
}

// ============ Onboarding ============
export function useOnboardingStatus() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['onboarding-status', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ai_onboarding_status', { p_company_id: currentCompany!.id });
      if (error) throw error;
      return data as {
        company: boolean; chartOfAccounts: boolean; costCenters: boolean;
        accounts: boolean; partners: boolean; taxParams: boolean; firstProject: boolean;
      };
    },
    enabled: !!currentCompany?.id,
  });
}
