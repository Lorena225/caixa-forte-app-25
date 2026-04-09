import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Processo {
  id: string;
  company_id: string;
  codigo?: string;
  nome: string;
  nome_curto?: string;
  area?: string;
  subarea?: string;
  tipo: string;
  objetivo?: string;
  descricao?: string;
  frequencia: string;
  criticidade: string;
  dono_id?: string;
  status: string;
  versao: number;
  versao_publicada: number;
  sla_global_horas?: number;
  exige_aprovacao_final: boolean;
  exige_evidencia_final: boolean;
  permite_reabertura: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProcessoEtapa {
  id: string;
  processo_id: string;
  company_id: string;
  codigo?: string;
  nome: string;
  descricao?: string;
  tipo: string;
  ordem: number;
  responsavel_papel?: string;
  sla_horas?: number;
  exige_checklist: boolean;
  exige_aprovacao: boolean;
  exige_anexo: boolean;
  exige_comentario: boolean;
  cor: string;
  created_at: string;
}

export interface ProcessoInstancia {
  id: string;
  processo_id: string;
  company_id: string;
  numero?: string;
  solicitante_id?: string;
  responsavel_atual_id?: string;
  etapa_atual_id?: string;
  status: string;
  prioridade: string;
  data_abertura: string;
  previsao_conclusao?: string;
  data_conclusao?: string;
  atrasado: boolean;
  observacoes?: string;
  created_at: string;
}

export function useProcessos(filtros?: { status?: string; tipo?: string; area?: string }) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['processos', currentCompany?.id, filtros],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let q = supabase.from('processos').select('*').eq('company_id', currentCompany.id).order('created_at', { ascending: false });
      if (filtros?.status) q = q.eq('status', filtros.status);
      if (filtros?.tipo) q = q.eq('tipo', filtros.tipo);
      if (filtros?.area) q = q.ilike('area', `%${filtros.area}%`);
      const { data } = await q;
      return (data || []) as Processo[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useProcessosStats() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['processos-stats', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return { total: 0, ativos: 0, em_revisao: 0, instancias_abertas: 0, instancias_atrasadas: 0 };
      const [{ data: p }, { data: i }] = await Promise.all([
        supabase.from('processos').select('status').eq('company_id', currentCompany.id),
        supabase.from('processo_instancias').select('status,atrasado').eq('company_id', currentCompany.id),
      ]);
      const processos = p || [];
      const instancias = i || [];
      return {
        total: processos.length,
        ativos: processos.filter((x: any) => x.status === 'ativo').length,
        em_revisao: processos.filter((x: any) => x.status === 'em_revisao').length,
        instancias_abertas: instancias.filter((x: any) => x.status === 'aberta' || x.status === 'em_andamento').length,
        instancias_atrasadas: instancias.filter((x: any) => x.atrasado && x.status !== 'concluida').length,
      };
    },
    enabled: !!currentCompany?.id,
  });
}

export function useEtapas(processoId?: string) {
  return useQuery({
    queryKey: ['processo-etapas', processoId],
    queryFn: async () => {
      if (!processoId) return [];
      const { data } = await supabase.from('processo_etapas').select('*').eq('processo_id', processoId).order('ordem');
      return (data || []) as ProcessoEtapa[];
    },
    enabled: !!processoId,
  });
}

export function useInstancias(processoId?: string) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['processo-instancias', processoId, currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let q = supabase.from('processo_instancias').select('*').eq('company_id', currentCompany.id).order('data_abertura', { ascending: false });
      if (processoId) q = q.eq('processo_id', processoId);
      const { data } = await q;
      return (data || []) as ProcessoInstancia[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateProcesso() {
  const qc = useQueryClient();
  const { currentCompany } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: Partial<Processo>) => {
      const { error, data: result } = await supabase.from('processos')
        .insert({ ...data, company_id: currentCompany!.id }).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['processos'] }); qc.invalidateQueries({ queryKey: ['processos-stats'] }); toast({ title: 'Processo criado!' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateProcesso() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Processo> & { id: string }) => {
      const { error } = await supabase.from('processos').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['processos'] }); qc.invalidateQueries({ queryKey: ['processos-stats'] }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteProcesso() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('processos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['processos'] }); toast({ title: 'Processo removido.' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useCreateEtapa() {
  const qc = useQueryClient();
  const { currentCompany } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: Partial<ProcessoEtapa>) => {
      const { error } = await supabase.from('processo_etapas').insert({ ...data, company_id: currentCompany!.id });
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['processo-etapas', v.processo_id] }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteEtapa() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, processo_id }: { id: string; processo_id: string }) => {
      const { error } = await supabase.from('processo_etapas').delete().eq('id', id);
      if (error) throw error;
      return { processo_id };
    },
    onSuccess: (result) => { qc.invalidateQueries({ queryKey: ['processo-etapas', result?.processo_id] }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useCreateInstancia() {
  const qc = useQueryClient();
  const { currentCompany, user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: Partial<ProcessoInstancia>) => {
      const num = `INS-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase.from('processo_instancias').insert({
        ...data, company_id: currentCompany!.id, solicitante_id: user!.id, numero: num,
      });
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['processo-instancias', v.processo_id] }); qc.invalidateQueries({ queryKey: ['processos-stats'] }); toast({ title: 'Instância criada!' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateInstancia() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, processo_id, ...data }: Partial<ProcessoInstancia> & { id: string }) => {
      const { error } = await supabase.from('processo_instancias').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      return { processo_id };
    },
    onSuccess: (result) => { qc.invalidateQueries({ queryKey: ['processo-instancias', result?.processo_id] }); qc.invalidateQueries({ queryKey: ['processos-stats'] }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
