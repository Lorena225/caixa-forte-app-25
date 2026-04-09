import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Ocorrencia {
  id: string;
  company_id: string;
  numero: number;
  data_ocorrencia: string;
  area?: string;
  setor?: string;
  tipo_falha: string;
  categoria?: string;
  gravidade: string;
  impacto: string;
  descricao: string;
  detectado_por?: string;
  origem_deteccao: string;
  responsavel_id?: string;
  status: string;
  prazo_tratamento?: string;
  cliente_afetado?: string;
  custo_estimado?: number;
  created_at: string;
  updated_at: string;
}

export interface FalhaCausa {
  id: string;
  ocorrencia_id: string;
  metodo: string;
  problema_definido?: string;
  causa_imediata?: string;
  causa_raiz: string;
  categoria_causa?: string;
  evidencia?: string;
  investigador_id?: string;
  necessita_revisao_processo: boolean;
  necessita_treinamento: boolean;
  created_at: string;
}

export interface FalhaAcao {
  id: string;
  ocorrencia_id: string;
  company_id: string;
  tipo: string;
  descricao: string;
  responsavel_id?: string;
  data_inicio?: string;
  prazo_final: string;
  prioridade: string;
  status: string;
  evidencia_conclusao?: string;
  validador_id?: string;
  data_validacao?: string;
  custo_previsto?: number;
  created_at: string;
}

export function useOcorrencias(filtros?: { status?: string; gravidade?: string; tipo?: string }) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['ocorrencias', currentCompany?.id, filtros],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let q = supabase.from('ocorrencias_falha').select('*').eq('company_id', currentCompany.id).order('created_at', { ascending: false });
      if (filtros?.status) q = q.eq('status', filtros.status);
      if (filtros?.gravidade) q = q.eq('gravidade', filtros.gravidade);
      if (filtros?.tipo) q = q.eq('tipo_falha', filtros.tipo);
      const { data } = await q;
      return (data || []) as Ocorrencia[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useOcorrenciasStats() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['ocorrencias-stats', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return { total: 0, abertas: 0, em_investigacao: 0, criticas: 0 };
      const { data } = await supabase.from('ocorrencias_falha').select('*').eq('company_id', currentCompany.id);
      const list = (data || []) as Ocorrencia[];
      return {
        total: list.length,
        abertas: list.filter(o => o.status === 'aberta').length,
        em_investigacao: list.filter(o => o.status === 'em_investigacao').length,
        criticas: list.filter(o => o.gravidade === 'critica' && o.status !== 'encerrada').length,
      };
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCausas(ocorrenciaId?: string) {
  return useQuery({
    queryKey: ['falha-causas', ocorrenciaId],
    queryFn: async () => {
      if (!ocorrenciaId) return [];
      const { data } = await supabase.from('falha_causas').select('*').eq('ocorrencia_id', ocorrenciaId);
      return (data || []) as FalhaCausa[];
    },
    enabled: !!ocorrenciaId,
  });
}

export function useAcoes(ocorrenciaId?: string) {
  return useQuery({
    queryKey: ['falha-acoes', ocorrenciaId],
    queryFn: async () => {
      if (!ocorrenciaId) return [];
      const { data } = await supabase.from('falha_acoes').select('*').eq('ocorrencia_id', ocorrenciaId).order('created_at', { ascending: false });
      return (data || []) as FalhaAcao[];
    },
    enabled: !!ocorrenciaId,
  });
}

export function useCreateOcorrencia() {
  const qc = useQueryClient();
  const { currentCompany, user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: Partial<Ocorrencia>) => {
      const { error, data: result } = await supabase.from('ocorrencias_falha')
        .insert({ ...data, company_id: currentCompany!.id, detectado_por: user!.id }).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ocorrencias'] }); qc.invalidateQueries({ queryKey: ['ocorrencias-stats'] }); toast({ title: 'Ocorrência registrada!' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateOcorrencia() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Ocorrencia> & { id: string }) => {
      const { error } = await supabase.from('ocorrencias_falha').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ocorrencias'] }); qc.invalidateQueries({ queryKey: ['ocorrencias-stats'] }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useCreateCausa() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: Partial<FalhaCausa>) => {
      const { error } = await supabase.from('falha_causas').insert({ ...data, investigador_id: user!.id });
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['falha-causas', v.ocorrencia_id] }); toast({ title: 'Causa raiz registrada!' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useCreateAcao() {
  const qc = useQueryClient();
  const { currentCompany } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: Partial<FalhaAcao>) => {
      const { error } = await supabase.from('falha_acoes').insert({ ...data, company_id: currentCompany!.id });
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['falha-acoes', v.ocorrencia_id] }); toast({ title: 'Ação registrada!' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateAcao() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ocorrencia_id, ...data }: Partial<FalhaAcao> & { id: string }) => {
      const { error } = await supabase.from('falha_acoes').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      return { ocorrencia_id };
    },
    onSuccess: (result) => { qc.invalidateQueries({ queryKey: ['falha-acoes', result?.ocorrencia_id] }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
