import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';

export interface Tarefa {
  id: string;
  company_id: string;
  titulo: string;
  descricao?: string;
  tipo: string;
  prioridade: string;
  status: string;
  responsavel_id?: string;
  criado_por?: string;
  data_vencimento?: string;
  data_conclusao?: string;
  origem_tipo?: string;
  created_at: string;
}

export interface Comunicado {
  id: string;
  company_id: string;
  titulo: string;
  conteudo: string;
  tipo: string;
  criado_por?: string;
  data_expiracao?: string;
  created_at: string;
  lido?: boolean;
}

export function useTarefas(filtro?: 'hoje' | 'vencidas' | 'pendentes' | 'todas') {
  const { currentCompany, user } = useAuth();
  return useQuery({
    queryKey: ['tarefas', currentCompany?.id, user?.id, filtro],
    queryFn: async () => {
      if (!currentCompany?.id || !user?.id) return [];
      let q = supabase
        .from('tarefas')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('responsavel_id', user.id)
        .neq('status', 'cancelada')
        .order('data_vencimento', { ascending: true });

      const { data } = await q;
      if (!data) return [];

      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      if (filtro === 'vencidas') {
        return data.filter(t => t.data_vencimento && isBefore(new Date(t.data_vencimento), todayStart) && t.status !== 'concluida');
      }
      if (filtro === 'hoje') {
        return data.filter(t => t.data_vencimento && new Date(t.data_vencimento) >= todayStart && new Date(t.data_vencimento) <= todayEnd);
      }
      if (filtro === 'pendentes') {
        return data.filter(t => t.status === 'pendente' || t.status === 'em_andamento');
      }
      return data;
    },
    enabled: !!currentCompany?.id && !!user?.id,
  });
}

export function useTarefasStats() {
  const { currentCompany, user } = useAuth();
  return useQuery({
    queryKey: ['tarefas-stats', currentCompany?.id, user?.id],
    queryFn: async () => {
      if (!currentCompany?.id || !user?.id) return { vencidas: 0, hoje: 0, pendentes: 0, concluidas: 0 };
      const { data } = await supabase
        .from('tarefas')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('responsavel_id', user.id);

      if (!data) return { vencidas: 0, hoje: 0, pendentes: 0, concluidas: 0 };
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      return {
        vencidas: data.filter(t => t.data_vencimento && isBefore(new Date(t.data_vencimento), todayStart) && t.status !== 'concluida' && t.status !== 'cancelada').length,
        hoje: data.filter(t => t.data_vencimento && new Date(t.data_vencimento) >= todayStart && new Date(t.data_vencimento) <= todayEnd).length,
        pendentes: data.filter(t => t.status === 'pendente' || t.status === 'em_andamento').length,
        concluidas: data.filter(t => t.status === 'concluida' && t.data_conclusao && isAfter(new Date(t.data_conclusao), weekAgo)).length,
      };
    },
    enabled: !!currentCompany?.id && !!user?.id,
  });
}

export function useCreateTarefa() {
  const qc = useQueryClient();
  const { currentCompany, user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: Partial<Tarefa>) => {
      const { error, data: result } = await supabase.from('tarefas').insert({
        ...data,
        company_id: currentCompany!.id,
        criado_por: user!.id,
        responsavel_id: data.responsavel_id || user!.id,
      }).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarefas'] });
      qc.invalidateQueries({ queryKey: ['tarefas-stats'] });
      toast({ title: 'Tarefa criada!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateTarefa() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Tarefa> & { id: string }) => {
      const updates: any = { ...data, updated_at: new Date().toISOString() };
      if (data.status === 'concluida') updates.data_conclusao = new Date().toISOString();
      const { error } = await supabase.from('tarefas').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarefas'] });
      qc.invalidateQueries({ queryKey: ['tarefas-stats'] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useComunicados() {
  const { currentCompany, user } = useAuth();
  return useQuery({
    queryKey: ['comunicados', currentCompany?.id, user?.id],
    queryFn: async () => {
      if (!currentCompany?.id || !user?.id) return [];
      const { data: comunicados } = await supabase
        .from('comunicados')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      const { data: leituras } = await supabase
        .from('comunicado_leituras')
        .select('comunicado_id')
        .eq('user_id', user.id);

      const lidosSet = new Set((leituras || []).map((l: any) => l.comunicado_id));
      return (comunicados || []).map((c: any) => ({ ...c, lido: lidosSet.has(c.id) }));
    },
    enabled: !!currentCompany?.id && !!user?.id,
  });
}

export function useMarcarLido() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (comunicadoId: string) => {
      const { error } = await supabase.from('comunicado_leituras').insert({
        comunicado_id: comunicadoId,
        user_id: user!.id,
      });
      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comunicados'] }),
  });
}

export function useCreateComunicado() {
  const qc = useQueryClient();
  const { currentCompany, user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: Partial<Comunicado>) => {
      const { error } = await supabase.from('comunicados').insert({
        ...data,
        company_id: currentCompany!.id,
        criado_por: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comunicados'] });
      toast({ title: 'Comunicado criado!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
