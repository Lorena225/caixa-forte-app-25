import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Inventory {
  id: string;
  company_id: string;
  inventory_code: string;
  inventory_date: string;
  status: 'em_andamento' | 'concluido' | 'cancelado';
  responsible_user_id: string | null;
  total_items: number;
  discrepancy_count: number;
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  inventory_id: string;
  product_id: string | null;
  expected_qty: number;
  counted_qty: number | null;
  difference: number;
  adjusted: boolean;
  notes: string | null;
  counted_by: string | null;
  counted_at: string | null;
  products?: {
    id: string;
    name: string;
    code: string;
    current_stock: number;
  };
}

export function useInventories() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const { data: inventories = [], isLoading } = useQuery({
    queryKey: ['inventories', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('inventories')
        .select('*')
        .eq('company_id', companyId)
        .order('inventory_date', { ascending: false });

      if (error) throw error;
      return data as Inventory[];
    },
    enabled: !!companyId,
  });

  const createInventory = useMutation({
    mutationFn: async (inventory: Partial<Inventory>) => {
      if (!companyId) throw new Error('Company ID required');

      // Generate code
      const inventoryCode = `INV-${new Date().getFullYear()}-${String(inventories.length + 1).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('inventories')
        .insert({
          company_id: companyId,
          inventory_code: inventoryCode,
          status: 'em_andamento',
          ...inventory,
        })
        .select()
        .single();

      if (error) throw error;

      // Create inventory items from products
      const { data: products } = await supabase
        .from('products')
        .select('id, current_stock')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (products && products.length > 0) {
        const items = products.map(p => ({
          inventory_id: data.id,
          product_id: p.id,
          expected_qty: p.current_stock || 0,
        }));

        await supabase.from('inventory_items').insert(items);

        // Update total items
        await supabase
          .from('inventories')
          .update({ total_items: products.length })
          .eq('id', data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventories'] });
      toast.success('Inventário criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating inventory:', error);
      toast.error('Erro ao criar inventário');
    },
  });

  const updateInventory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Inventory> & { id: string }) => {
      const { data, error } = await supabase
        .from('inventories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventories'] });
      toast.success('Inventário atualizado!');
    },
    onError: (error) => {
      console.error('Error updating inventory:', error);
      toast.error('Erro ao atualizar inventário');
    },
  });

  return {
    inventories,
    isLoading,
    createInventory,
    updateInventory,
  };
}

export function useInventoryItems(inventoryId: string | null) {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory_items', inventoryId],
    queryFn: async () => {
      if (!inventoryId) return [];
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          products (id, name, code, current_stock)
        `)
        .eq('inventory_id', inventoryId);

      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!inventoryId,
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, counted_qty }: { id: string; counted_qty: number }) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({
          counted_qty,
          counted_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
    },
  });

  return {
    items,
    isLoading,
    updateItem,
  };
}
