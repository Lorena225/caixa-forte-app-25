import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SalesCommission {
  id: string;
  company_id: string;
  seller_id: string;
  invoice_id: string | null;
  sales_order_id: string | null;
  data_venda: string;
  percentual_comissao: number;
  valor_base: number;
  valor_comissao: number;
  status: 'pendente' | 'aprovada' | 'paga' | 'cancelada';
  data_aprovacao: string | null;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSalesCommissions(filters?: { status?: string; sellerId?: string; from?: string; to?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['sales-commissions', currentCompany?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('sales_commissions')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('data_venda', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.sellerId) query = query.eq('seller_id', filters.sellerId);
      if (filters?.from) query = query.gte('data_venda', filters.from);
      if (filters?.to) query = query.lte('data_venda', filters.to);

      const { data, error } = await query;
      if (error) throw error;
      return data as SalesCommission[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useApproveCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales_commissions')
        .update({ 
          status: 'aprovada',
          data_aprovacao: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-commissions'] });
      toast.success('Comissão aprovada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function usePayCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales_commissions')
        .update({ 
          status: 'paga',
          data_pagamento: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-commissions'] });
      toast.success('Comissão marcada como paga!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useCommissionsStats(filters?: { from?: string; to?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['commissions-stats', currentCompany?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('sales_commissions')
        .select('status, valor_comissao')
        .eq('company_id', currentCompany!.id);

      if (filters?.from) query = query.gte('data_venda', filters.from);
      if (filters?.to) query = query.lte('data_venda', filters.to);

      const { data, error } = await query;
      if (error) throw error;

      const total = data.length;
      const pendentes = data.filter(c => c.status === 'pendente').length;
      const aprovadas = data.filter(c => c.status === 'aprovada').length;
      const pagas = data.filter(c => c.status === 'paga').length;
      const valorPendente = data.filter(c => c.status === 'pendente').reduce((sum, c) => sum + Number(c.valor_comissao), 0);
      const valorAprovado = data.filter(c => c.status === 'aprovada').reduce((sum, c) => sum + Number(c.valor_comissao), 0);
      const valorPago = data.filter(c => c.status === 'paga').reduce((sum, c) => sum + Number(c.valor_comissao), 0);

      return { total, pendentes, aprovadas, pagas, valorPendente, valorAprovado, valorPago };
    },
    enabled: !!currentCompany?.id,
  });
}
