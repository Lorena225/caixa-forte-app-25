import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Meta {
  id: string;
  company_id: string;
  codigo?: string;
  nome: string;
  descricao?: string;
  tipo: string;
  perspectiva?: string;
  ciclo?: string;
  data_inicio?: string;
  data_fim?: string;
  area?: string;
  responsavel_id?: string;
  meta_pai_id?: string;
  peso: number;
  prioridade: string;
  status: string;
  indicador_nome?: string;
  unidade_medida?: string;
  baseline?: number;
  meta_alvo: number;
  meta_minima?: number;
  meta_ideal?: number;
  valor_atual: number;
  frequencia_apuracao: string;
  faixa_verde_min?: number;
  faixa_amarela_min?: number;
  created_at: string;
  updated_at: string;
}

export interface Apuracao {
  id: string;
  meta_id: string;
  company_id: string;
  periodo: string;
  valor_realizado: number;
  comentario?: string;
  registrado_por?: string;
  created_at: string;
}

export interface PlanoAcao {
  id: string;
  meta_id: string;
  company_id: string;
  titulo: string;
  descricao?: string;
  tipo: string;
  responsavel_id?: string;
  data_inicio?: string;
  data_fim?: string;
  prioridade: string;
  status: string;
  impacto_esperado?: string;
  custo_previsto?: number;
  custo_realizado?: number;
  created_at: string;
}

export function calcularSemaforo(meta: Meta): 'verde' | 'amarelo' | 'vermelho' | 'cinza' {
  if (meta.meta_alvo === 0) return 'cinza';
  const pct = (meta.valor_atual / meta.meta_alvo) * 100;
  const verde = meta.faixa_verde_min ?? 90;
  const amarelo = meta.faixa_amarela_min ?? 70;
  if (pct >= verde) return 'verde';
  if (pct >= amarelo) return 'amarelo';
  return 'vermelho';
}

export function useMetas(filtros?: { tipo?: string; status?: string; area?: string }) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['metas', currentCompany?.id, filtros],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let q = supabase.from('metas_estrategicas').select('*').eq('company_id', currentCompany.id).order('created_at', { ascending: false });
      if (filtros?.tipo) q = q.eq('tipo', filtros.tipo);
      if (filtros?.status) q = q.eq('status', filtros.status);
      if (filtros?.area) q = q.ilike('area', `%${filtros.area}%`);
      const { data } = await q;
      return (data || []) as Meta[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useMeta(id?: string) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['meta', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from('metas_estrategicas').select('*').eq('id', id).single();
      return data as Meta;
    },
    enabled: !!id,
  });
}

export function useMetasStats() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['metas-stats', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return { total: 0, ativas: 0, risco: 0, concluidas: 0 };
      const { data } = await supabase.from('metas_estrategicas').select('*').eq('company_id', currentCompany.id);
      const metas = (data || []) as Meta[];
      return {
        total: metas.length,
        ativas: metas.filter(m => m.status === 'ativa').length,
        risco: metas.filter(m => m.status === 'ativa' && ['vermelho', 'amarelo'].includes(calcularSemaforo(m))).length,
        concluidas: metas.filter(m => m.status === 'concluida').length,
      };
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateMeta() {
  const qc = useQueryClient();
  const { currentCompany } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: Partial<Meta>) => {
      const { error, data: result } = await supabase.from('metas_estrategicas')
        .insert({ ...data, company_id: currentCompany!.id }).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metas'] }); qc.invalidateQueries({ queryKey: ['metas-stats'] }); toast({ title: 'Meta criada!' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateMeta() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Meta> & { id: string }) => {
      const { error } = await supabase.from('metas_estrategicas').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['metas'] }); qc.invalidateQueries({ queryKey: ['meta', v.id] }); qc.invalidateQueries({ queryKey: ['metas-stats'] }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteMeta() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('metas_estrategicas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metas'] }); toast({ title: 'Meta removida.' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useApuracoes(metaId?: string) {
  return useQuery({
    queryKey: ['apuracoes', metaId],
    queryFn: async () => {
      if (!metaId) return [];
      const { data } = await supabase.from('meta_apuracoes').select('*').eq('meta_id', metaId).order('periodo', { ascending: false });
      return (data || []) as Apuracao[];
    },
    enabled: !!metaId,
  });
}

export function useCreateApuracao() {
  const qc = useQueryClient();
  const { currentCompany, user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { meta_id: string; periodo: string; valor_realizado: number; comentario?: string }) => {
      const { error } = await supabase.from('meta_apuracoes').insert({ ...data, company_id: currentCompany!.id, registrado_por: user!.id });
      if (error) throw error;
      // update valor_atual on meta
      await supabase.from('metas_estrategicas').update({ valor_atual: data.valor_realizado, updated_at: new Date().toISOString() }).eq('id', data.meta_id);
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['apuracoes', v.meta_id] }); qc.invalidateQueries({ queryKey: ['metas'] }); toast({ title: 'Apuração registrada!' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function usePlanosAcao(metaId?: string) {
  return useQuery({
    queryKey: ['planos-acao', metaId],
    queryFn: async () => {
      if (!metaId) return [];
      const { data } = await supabase.from('meta_planos_acao').select('*').eq('meta_id', metaId).order('created_at', { ascending: false });
      return (data || []) as PlanoAcao[];
    },
    enabled: !!metaId,
  });
}

export function useCreatePlanoAcao() {
  const qc = useQueryClient();
  const { currentCompany } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: Partial<PlanoAcao>) => {
      const { error } = await supabase.from('meta_planos_acao').insert({ ...data, company_id: currentCompany!.id });
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['planos-acao', v.meta_id] }); toast({ title: 'Ação criada!' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdatePlanoAcao() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, meta_id, ...data }: Partial<PlanoAcao> & { id: string }) => {
      const { error } = await supabase.from('meta_planos_acao').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      return { meta_id };
    },
    onSuccess: (result) => { qc.invalidateQueries({ queryKey: ['planos-acao', result?.meta_id] }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
