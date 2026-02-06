import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface PurchaseEntry {
  id: string;
  company_id: string;
  purchase_order_id?: string;
  supplier_id?: string;
  entry_date: string;
  invoice_number?: string;
  invoice_series?: string;
  total_amount: number;
  status: 'rascunho' | 'confirmada' | 'cancelada';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseEntryItem {
  id: string;
  entry_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
}

export interface CreateEntryInput {
  supplier_id?: string;
  purchase_order_id?: string;
  entry_date: string;
  invoice_number?: string;
  invoice_series?: string;
  total_amount: number;
  notes?: string;
  items: {
    product_id: string;
    quantity: number;
    unit_cost: number;
  }[];
}

export function usePurchaseEntries() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['purchase-entries', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_entries')
        .select(`
          *,
          supplier:supplier_id(id, name),
          items:purchase_entry_items(*)
        `)
        .eq('company_id', currentCompany!.id)
        .order('entry_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreatePurchaseEntry() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (input: CreateEntryInput) => {
      // 1. Create the entry
      const { data: entry, error: entryError } = await supabase
        .from('purchase_entries')
        .insert({
          company_id: currentCompany!.id,
          supplier_id: input.supplier_id,
          purchase_order_id: input.purchase_order_id,
          entry_date: input.entry_date,
          invoice_number: input.invoice_number,
          invoice_series: input.invoice_series,
          total_amount: input.total_amount,
          notes: input.notes,
          status: 'rascunho',
        })
        .select()
        .single();
      
      if (entryError) throw entryError;
      
      // 2. Insert items
      if (input.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('purchase_entry_items')
          .insert(
            input.items.map(item => ({
              entry_id: entry.id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
            }))
          );
        
        if (itemsError) throw itemsError;
      }
      
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-entries'] });
      toast.success('Entrada criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar entrada: ${error.message}`);
    },
  });
}

export function useProcessPurchaseEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await supabase
        .rpc('process_purchase_entry', { p_entry_id: entryId });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string; processed_items?: number };
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao processar entrada');
      }
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-entries'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`Entrada confirmada! ${result.processed_items} item(s) processado(s).`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao confirmar entrada: ${error.message}`);
    },
  });
}

export function useCancelPurchaseEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('purchase_entries')
        .update({ status: 'cancelada' })
        .eq('id', entryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-entries'] });
      toast.success('Entrada cancelada.');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cancelar entrada: ${error.message}`);
    },
  });
}
