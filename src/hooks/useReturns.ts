import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface Return {
  id: string;
  company_id: string;
  return_number: string;
  tipo: 'produto' | 'fiscal';
  origem: 'venda' | 'compra';
  documento_origem_id: string | null;
  counterparty_id: string | null;
  data_solicitacao: string;
  data_conclusao: string | null;
  motivo: string;
  status: 'aberto' | 'em_analise' | 'aprovado' | 'rejeitado' | 'concluido';
  valor_total: number | null;
  dados_json: Json;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  counterparty?: {
    name: string;
  };
}

export interface ReturnItem {
  id: string;
  return_id: string;
  product_id: string | null;
  quantidade: number;
  valor_unitario: number | null;
  valor_total: number | null;
  motivo_item: string | null;
}

export function useReturns(filters?: { tipo?: string; status?: string; origem?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['returns', currentCompany?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('returns')
        .select(`
          *,
          counterparty:counterparties(name)
        `)
        .eq('company_id', currentCompany!.id)
        .order('data_solicitacao', { ascending: false });

      if (filters?.tipo) query = query.eq('tipo', filters.tipo);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.origem) query = query.eq('origem', filters.origem);

      const { data, error } = await query;
      if (error) throw error;
      return data as Return[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useReturn(id: string | null) {
  return useQuery({
    queryKey: ['return', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          counterparty:counterparties(name)
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Return;
    },
    enabled: !!id,
  });
}

export function useReturnItems(returnId: string | null) {
  return useQuery({
    queryKey: ['return-items', returnId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('return_items')
        .select(`
          *,
          product:products(name, sku)
        `)
        .eq('return_id', returnId!);
      if (error) throw error;
      return data;
    },
    enabled: !!returnId,
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<Return, 'id' | 'company_id' | 'return_number' | 'created_at' | 'updated_at' | 'counterparty'>) => {
      // Generate return number
      const { data: lastReturn } = await supabase
        .from('returns')
        .select('return_number')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastReturn?.return_number) {
        const match = lastReturn.return_number.match(/\d+/);
        if (match) nextNumber = parseInt(match[0]) + 1;
      }

      const return_number = `DEV-${String(nextNumber).padStart(6, '0')}`;

      const { data, error } = await supabase
        .from('returns')
        .insert([{ 
          ...input, 
          company_id: currentCompany!.id,
          return_number 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      toast.success('Devolução registrada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Return> & { id: string }) => {
      const { error } = await supabase
        .from('returns')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      toast.success('Devolução atualizada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useReturnsStats() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['returns-stats', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('returns')
        .select('status, valor_total, tipo')
        .eq('company_id', currentCompany!.id);

      if (error) throw error;

      const total = data.length;
      const abertas = data.filter(r => r.status === 'aberto').length;
      const emAnalise = data.filter(r => r.status === 'em_analise').length;
      const valorTotal = data.reduce((sum, r) => sum + (Number(r.valor_total) || 0), 0);

      return { total, abertas, emAnalise, valorTotal };
    },
    enabled: !!currentCompany?.id,
  });
}
