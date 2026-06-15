import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AgencyAccount {
  id: string;
  project_id: string | null;
  counterparty_id: string | null;
  account_name: string;
  service_type: string;
  status: string;
  health: string;
  account_manager_id: string | null;
  monthly_value: number;
  objectives: string | null;
  active_channels: string[];
  sla_days: number;
  churn_risk: number;
  upsell_potential: number;
  created_at: string;
}

const SERVICE_LABELS: Record<string, string> = {
  branding: 'Branding', social_media: 'Social Media', trafego: 'Tráfego',
  conteudo: 'Conteúdo', landing_page: 'Landing Page', consultoria: 'Consultoria',
  full_service: 'Full Service',
};
export const serviceLabel = (s: string) => SERVICE_LABELS[s] ?? s;

// ===== Visão geral do módulo =====
export function useAgencyOverview() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['agency-overview', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ai_agency_overview', { p_company_id: currentCompany!.id });
      if (error) throw error;
      return data as {
        accounts_total: number; accounts_active: number; accounts_at_risk: number;
        mrr: number; deliverables_overdue: number; approvals_pending: number;
      };
    },
    enabled: !!currentCompany?.id,
  });
}

// ===== Contas =====
export function useAgencyAccounts() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['agency-accounts', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_accounts')
        .select('*, counterparty:counterparties(name)')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as (AgencyAccount & { counterparty: { name: string } | null })[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useAgencyAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: ['agency-account', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_accounts')
        .select('*, counterparty:counterparties(name)')
        .eq('id', accountId!)
        .single();
      if (error) throw error;
      return data as AgencyAccount & { counterparty: { name: string } | null };
    },
    enabled: !!accountId,
  });
}

export function useAccountHealth(accountId: string | undefined) {
  return useQuery({
    queryKey: ['agency-account-health', accountId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ai_agency_account_health', { p_account_id: accountId! });
      if (error) throw error;
      return data as {
        deliverables_total: number; deliverables_overdue: number; deliverables_blocked: number;
        approvals_pending: number; onboarding_pending: number; meetings_upcoming: number; health: string;
      };
    },
    enabled: !!accountId,
  });
}

// ===== Provisionar conta (automação central) =====
export function useProvisionAccount() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      counterparty_id: string; account_name: string; service_type: string;
      monthly_value: number; manager_id?: string;
    }) => {
      const { data, error } = await supabase.rpc('ai_provision_agency_account', {
        p_company_id: currentCompany!.id,
        p_counterparty_id: p.counterparty_id,
        p_account_name: p.account_name,
        p_service_type: p.service_type,
        p_monthly_value: p.monthly_value,
        p_manager_id: p.manager_id ?? null,
      });
      if (error) throw error;
      return data as { account_id: string; project_id: string; onboarding_steps: number; deliverables: number };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['agency-accounts'] });
      qc.invalidateQueries({ queryKey: ['agency-overview'] });
      toast.success(`Conta criada: ${r.onboarding_steps} etapas de onboarding e ${r.deliverables} entregas geradas`);
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao criar conta'),
  });
}

// ===== Onboarding =====
export function useOnboardingSteps(accountId: string | undefined) {
  return useQuery({
    queryKey: ['agency-onboarding', accountId],
    queryFn: async () => {
      const { data } = await supabase.from('agency_onboarding_steps')
        .select('*').eq('account_id', accountId!).order('sort_order');
      return data ?? [];
    },
    enabled: !!accountId,
  });
}

export function useToggleOnboardingStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from('agency_onboarding_steps')
        .update({ is_done: done, done_at: done ? new Date().toISOString() : null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['agency-onboarding'] }); },
  });
}

// ===== Entregas =====
export function useDeliverables(accountId: string | undefined) {
  return useQuery({
    queryKey: ['agency-deliverables', accountId],
    queryFn: async () => {
      const { data } = await supabase.from('agency_deliverables')
        .select('*, assignee:user_profiles(full_name)')
        .eq('account_id', accountId!).order('due_date', { nullsFirst: false });
      return data ?? [];
    },
    enabled: !!accountId,
  });
}

export function useUpdateDeliverableStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from('agency_deliverables')
        .update({ stage, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agency-deliverables'] }); toast.success('Etapa atualizada'); },
  });
}
