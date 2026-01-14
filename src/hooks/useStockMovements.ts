import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface StockMovement {
  id: string;
  company_id: string;
  movement_date: string;
  movement_type: 'entrada' | 'saida' | 'ajuste' | 'transferencia';
  product_id: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  source_destination: string | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  user_id: string | null;
  created_at: string;
  products?: {
    id: string;
    name: string;
    code: string;
  };
}

export function useStockMovements() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['stock_movements', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          products (id, name, code)
        `)
        .eq('company_id', companyId)
        .order('movement_date', { ascending: false });

      if (error) throw error;
      return data as StockMovement[];
    },
    enabled: !!companyId,
  });

  const createMovement = useMutation({
    mutationFn: async (movement: {
      company_id: string;
      movement_type: 'entrada' | 'saida' | 'ajuste' | 'transferencia';
      product_id: string | null;
      quantity: number;
      unit_cost?: number;
      total_cost?: number;
      source_destination?: string;
      reference_type?: string;
      reference_id?: string;
      notes?: string;
      user_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('stock_movements')
        .insert(movement)
        .select()
        .single();

      if (error) throw error;

      // Update product stock directly
      if (movement.product_id && movement.quantity) {
        const stockChange = movement.movement_type === 'entrada' ? movement.quantity :
          movement.movement_type === 'saida' ? -movement.quantity :
            movement.movement_type === 'ajuste' ? movement.quantity : 0;

        if (stockChange !== 0) {
          const { data: product } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', movement.product_id)
            .single();

          if (product) {
            await supabase
              .from('products')
              .update({ current_stock: (product.current_stock || 0) + stockChange })
              .eq('id', movement.product_id);
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Movimentação registrada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating movement:', error);
      toast.error('Erro ao registrar movimentação');
    },
  });

  return {
    movements,
    isLoading,
    createMovement,
  };
}
