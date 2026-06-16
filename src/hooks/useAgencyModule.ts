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

// ===== Rentabilidade da conta (Etapa 3) =====
export function useAccountEconomics(accountId: string | undefined) {
  return useQuery({
    queryKey: ['agency-economics', accountId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ai_agency_account_economics', { p_account_id: accountId! });
      if (error) throw error;
      return data as {
        revenue: number; cost: number; hour_cost: number; media_spend: number;
        hours: number; margin: number; margin_pct: number; ltv_estimate: number;
      };
    },
    enabled: !!accountId,
  });
}

export function useRunAgencyAgent() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('ai_run_agency_agent', { p_company_id: currentCompany!.id });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['agency-overview'] });
      toast.success(n > 0 ? `${n} recomendação(ões) gerada(s) na Caixa de Decisões` : 'Agentes executados — nada novo a sinalizar');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao rodar agente'),
  });
}

// ===== Calendário editorial =====
export function useCalendarPosts(accountId: string | undefined) {
  return useQuery({
    queryKey: ['agency-calendar', accountId],
    queryFn: async () => {
      const { data } = await supabase.from('agency_calendar_posts')
        .select('*').eq('account_id', accountId!).order('scheduled_for', { nullsFirst: false });
      return data ?? [];
    },
    enabled: !!accountId,
  });
}

export function useCreateCalendarPost() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { account_id: string; title: string; channel: string; scheduled_for: string }) => {
      const { error } = await supabase.from('agency_calendar_posts').insert({
        company_id: currentCompany!.id, ...p, status: 'planejado',
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agency-calendar'] }); toast.success('Post adicionado ao calendário'); },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao adicionar post'),
  });
}

// ===== Mídia paga =====
export function useMediaCampaigns(accountId: string | undefined) {
  return useQuery({
    queryKey: ['agency-media', accountId],
    queryFn: async () => {
      const { data } = await supabase.from('agency_media_campaigns')
        .select('*').eq('account_id', accountId!).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!accountId,
  });
}

export function useCreateCampaign() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { account_id: string; platform: string; campaign_name: string; budget_month: number; objective?: string }) => {
      const { error } = await supabase.from('agency_media_campaigns').insert({
        company_id: currentCompany!.id, ...p, status: 'ativa',
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agency-media'] }); toast.success('Campanha criada'); },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao criar campanha'),
  });
}

// ===== Aprovações =====
export function useApprovals(accountId: string | undefined) {
  return useQuery({
    queryKey: ['agency-approvals', accountId],
    queryFn: async () => {
      const { data } = await supabase.from('agency_approvals')
        .select('*, deliverable:agency_deliverables(title)')
        .eq('account_id', accountId!).order('requested_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!accountId,
  });
}

export function useRespondApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, feedback }: { id: string; status: string; feedback?: string }) => {
      const { error } = await supabase.from('agency_approvals')
        .update({ status, feedback: feedback ?? null, responded_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agency-approvals'] }); toast.success('Aprovação atualizada'); },
    onError: (e: any) => toast.error(e.message ?? 'Erro'),
  });
}

// ===== Reuniões =====
export function useMeetings(accountId: string | undefined) {
  return useQuery({
    queryKey: ['agency-meetings', accountId],
    queryFn: async () => {
      const { data } = await supabase.from('agency_meetings')
        .select('*').eq('account_id', accountId!).order('scheduled_for', { nullsFirst: false });
      return data ?? [];
    },
    enabled: !!accountId,
  });
}

export function useCreateMeeting() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { account_id: string; kind: string; title: string; scheduled_for?: string }) => {
      const { error } = await supabase.from('agency_meetings').insert({
        company_id: currentCompany!.id, ...p, status: 'agendada',
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agency-meetings'] }); toast.success('Reunião agendada'); },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao agendar'),
  });
}

export function useSaveMeetingMinutes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, minutes }: { id: string; minutes: string }) => {
      const { error } = await supabase.from('agency_meetings')
        .update({ minutes, status: 'realizada' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agency-meetings'] }); toast.success('Ata salva'); },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao salvar ata'),
  });
}
