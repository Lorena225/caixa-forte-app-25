import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook for generating recurring transactions from a template.
 */
export function useGenerateRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string): Promise<number> => {
      const { data, error } = await supabase.rpc('generate_recurring_transactions', {
        p_transaction_id: transactionId,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-projection'] });
      
      if (count > 0) {
        toast.success(`${count} lançamentos recorrentes gerados`);
      } else {
        toast.info('Nenhum lançamento gerado. Verifique as configurações de recorrência.');
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar recorrências: ${error.message}`);
    },
  });
}

export type RecurrenceType = 
  | 'diario' 
  | 'semanal' 
  | 'quinzenal' 
  | 'mensal' 
  | 'bimestral' 
  | 'trimestral' 
  | 'semestral' 
  | 'anual';

export const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'diario', label: 'Diário' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
];
