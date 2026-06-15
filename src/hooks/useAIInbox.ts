import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AIAction {
  id: string;
  agent_type: string;
  autonomy_level: string;
  action_key: string;
  action_label: string;
  entity_type: string | null;
  entity_id: string | null;
  amount: number | null;
  reason: string | null;
  confidence_pct: number | null;
  status: string;
  created_at: string;
}

export function useInboxSummary() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['ai-inbox-summary', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ai_inbox_summary', { p_company_id: currentCompany!.id });
      if (error) throw error;
      return data as { pending: number; today: number; pending_amount: number; by_agent: Array<{ agent_type: string; n: number }> };
    },
    enabled: !!currentCompany?.id,
    refetchInterval: 30000,
  });
}

export function useInboxActions(statusFilter = 'pending_approval', agentFilter?: string) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['ai-inbox-actions', currentCompany?.id, statusFilter, agentFilter],
    queryFn: async () => {
      let q = supabase.from('agent_action_log')
        .select('*').eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false }).limit(100);
      if (statusFilter !== 'todos') q = q.eq('status', statusFilter);
      if (agentFilter && agentFilter !== 'todos') q = q.eq('agent_type', agentFilter);
      const { data } = await q;
      return (data ?? []) as AIAction[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useApproveAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { error } = await supabase.rpc('ai_approve_action', { p_action_id: id, p_note: note ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-inbox-actions'] });
      qc.invalidateQueries({ queryKey: ['ai-inbox-summary'] });
      toast.success('Ação aprovada e executada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao aprovar'),
  });
}

export function useRejectAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.rpc('ai_reject_action', { p_action_id: id, p_reason: reason });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-inbox-actions'] });
      qc.invalidateQueries({ queryKey: ['ai-inbox-summary'] });
      toast.success('Ação rejeitada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao rejeitar'),
  });
}

export function useRevertAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.rpc('ai_revert_action', { p_action_id: id, p_reason: reason });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-inbox-actions'] });
      toast.success('Ação revertida');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao reverter'),
  });
}

export function useRunAllAgents() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('ai_run_all_agents', { p_company_id: currentCompany!.id });
      if (error) throw error;
      return data as { projetos: number; inadimplencia: number; total: number };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['ai-inbox-actions'] });
      qc.invalidateQueries({ queryKey: ['ai-inbox-summary'] });
      toast.success(r.total > 0 ? `${r.total} nova(s) recomendação(ões) geradas` : 'Agentes executados — nada novo a decidir');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao rodar agentes'),
  });
}
