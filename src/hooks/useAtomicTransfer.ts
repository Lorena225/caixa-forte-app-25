import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AtomicTransferParams {
  origin_account_id: string;
  destination_account_id: string;
  amount: number;
  transfer_date: string;
  description?: string;
  reference_number?: string;
}

interface AtomicTransferResult {
  success: boolean;
  transfer_id?: string;
  amount?: number;
  error?: string;
}

/**
 * Hook for executing atomic bank transfers using the database RPC function.
 * Ensures ACID compliance - both debit and credit happen in the same transaction.
 */
export function useAtomicTransfer() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (params: AtomicTransferParams): Promise<AtomicTransferResult> => {
      if (!currentCompany?.id) {
        throw new Error("Empresa não selecionada");
      }

      const { data, error } = await supabase.rpc('execute_bank_transfer', {
        p_company_id: currentCompany.id,
        p_origin_account_id: params.origin_account_id,
        p_destination_account_id: params.destination_account_id,
        p_amount: params.amount,
        p_transfer_date: params.transfer_date,
        p_description: params.description || null,
        p_reference_number: params.reference_number || null,
      });

      if (error) throw error;
      
      const result = data as unknown as AtomicTransferResult;
      if (!result.success) {
        throw new Error(result.error || 'Erro ao executar transferência');
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-positions'] });
      queryClient.invalidateQueries({ queryKey: ['liquidity-dashboard'] });
      toast.success(`Transferência de R$ ${result.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} executada com sucesso`);
    },
    onError: (error: Error) => {
      toast.error(`Erro na transferência: ${error.message}`);
    },
  });
}
