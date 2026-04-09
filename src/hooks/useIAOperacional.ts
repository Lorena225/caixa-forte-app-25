import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface IARegra {
  id: string;
  company_id: string;
  nome: string;
  descricao?: string;
  tipo_analise: string;
  modulo_monitorado: string;
  frequencia_execucao: string;
  criterio_disparo?: string;
  limiar?: number;
  severidade_padrao: string;
  canal_notificacao: string;
  abre_tarefa_auto: boolean;
  abre_falha_auto: boolean;
  escala_automaticamente: boolean;
  apenas_sugere: boolean;
  status: string;
  created_at: string;
}

export interface IAAlerta {
  id: string;
  company_id: string;
  regra_id?: string;
  tipo: string;
  categoria?: string;
  titulo: string;
  resumo: string;
  causa_provavel?: string;
  severidade: string;
  confianca: number;
  area_impactada?: string;
  status: string;
  acao_recomendada?: string;
  prazo_sugerido?: string;
  escalonado: boolean;
  feedback?: string;
  fonte_dados?: string;
  created_at: string;
}

export interface IAInsight {
  id: string;
  company_id: string;
  titulo: string;
  descricao: string;
  contexto?: string;
  periodo_analisado?: string;
  tendencia?: string;
  causa_provavel?: string;
  impacto_estimado?: string;
  urgencia: string;
  proxima_acao?: string;
  status: string;
  created_at: string;
}

export function useIARegras() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['ia-regras', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data } = await supabase.from('ia_regras').select('*').eq('company_id', currentCompany.id).order('created_at', { ascending: false });
      return (data || []) as IARegra[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useIAAlertas(filtros?: { status?: string; severidade?: string }) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['ia-alertas', currentCompany?.id, filtros],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let q = supabase.from('ia_alertas_gerados').select('*').eq('company_id', currentCompany.id).order('created_at', { ascending: false });
      if (filtros?.status) q = q.eq('status', filtros.status);
      if (filtros?.severidade) q = q.eq('severidade', filtros.severidade);
      const { data } = await q;
      return (data || []) as IAAlerta[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useIAInsights() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['ia-insights', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data } = await supabase.from('ia_insights').select('*').eq('company_id', currentCompany.id).order('created_at', { ascending: false });
      return (data || []) as IAInsight[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useIAStats() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['ia-stats', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return { alertas_ativos: 0, criticos: 0, tratados_hoje: 0, taxa_aceitacao: 0 };
      const { data } = await supabase.from('ia_alertas_gerados').select('*').eq('company_id', currentCompany.id);
      const list = (data || []) as IAAlerta[];
      const today = new Date().toDateString();
      const tratadosHoje = list.filter(a => a.status === 'tratado' && new Date(a.created_at).toDateString() === today).length;
      const comFeedback = list.filter(a => a.feedback && a.feedback !== 'nao_util' && a.feedback !== 'falso_positivo').length;
      const total = list.filter(a => a.feedback).length;
      return {
        alertas_ativos: list.filter(a => a.status === 'ativo').length,
        criticos: list.filter(a => a.severidade === 'critica' && a.status === 'ativo').length,
        tratados_hoje: tratadosHoje,
        taxa_aceitacao: total > 0 ? Math.round((comFeedback / total) * 100) : 0,
      };
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateIARegra() {
  const qc = useQueryClient();
  const { currentCompany } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: Partial<IARegra>) => {
      const { error } = await supabase.from('ia_regras').insert({ ...data, company_id: currentCompany!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-regras'] }); toast({ title: 'Regra criada!' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateIARegra() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<IARegra> & { id: string }) => {
      const { error } = await supabase.from('ia_regras').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ia-regras'] }),
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteIARegra() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ia_regras').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ia-regras'] }),
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateIAAlerta() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<IAAlerta> & { id: string }) => {
      const { error } = await supabase.from('ia_alertas_gerados').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-alertas'] }); qc.invalidateQueries({ queryKey: ['ia-stats'] }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useCreateIAInsight() {
  const qc = useQueryClient();
  const { currentCompany } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: Partial<IAInsight>) => {
      const { error } = await supabase.from('ia_insights').insert({ ...data, company_id: currentCompany!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-insights'] }); toast({ title: 'Insight registrado!' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useGerarAlertasDemo() {
  const qc = useQueryClient();
  const { currentCompany } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const demos = [
        { titulo: 'Meta de receita em risco', resumo: 'Atingimento de 64% com 80% do período decorrido. Tendência indica não atingimento.', tipo: 'meta_risco', categoria: 'metas', severidade: 'alta', area_impactada: 'Financeiro', acao_recomendada: 'Acionar plano de ação corretivo imediatamente.', confianca: 0.87, fonte_dados: 'metas_estrategicas' },
        { titulo: 'Tarefa crítica vencida sem responsável', resumo: '3 tarefas com prioridade crítica estão vencidas há mais de 24h.', tipo: 'tarefa_vencida', categoria: 'operacional', severidade: 'critica', area_impactada: 'Operações', acao_recomendada: 'Designar responsável e reagendar imediatamente.', confianca: 0.95, fonte_dados: 'tarefas' },
        { titulo: 'Processo sem instâncias há 30 dias', resumo: 'O processo "Onboarding de Clientes" não foi executado nos últimos 30 dias.', tipo: 'processo_parado', categoria: 'processos', severidade: 'media', area_impactada: 'Vendas', acao_recomendada: 'Verificar se o processo ainda é necessário ou se foi substituído.', confianca: 0.72, fonte_dados: 'processos' },
      ];
      for (const d of demos) {
        await supabase.from('ia_alertas_gerados').insert({ ...d, company_id: currentCompany!.id, status: 'ativo', escalonado: false });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-alertas'] }); qc.invalidateQueries({ queryKey: ['ia-stats'] }); toast({ title: 'Alertas de demonstração gerados!' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
