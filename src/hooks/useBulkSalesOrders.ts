import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBulkCancelSalesOrders() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('sales_orders')
        .update({ status: 'cancelado' })
        .in('id', ids);
      
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast.success(`${count} pedido(s) cancelado(s)!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cancelar pedidos: ${error.message}`);
    },
  });
}

export function useBulkConfirmSalesOrders() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('sales_orders')
        .update({ status: 'confirmado' })
        .in('id', ids)
        .eq('status', 'rascunho');
      
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast.success(`${count} pedido(s) confirmado(s)!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao confirmar pedidos: ${error.message}`);
    },
  });
}
