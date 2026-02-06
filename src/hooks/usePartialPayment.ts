import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PartialPaymentParams {
  transaction_id: string;
  payment_amount: number;
  payment_date?: string;
  wallet_id?: string;
  notes?: string;
}

interface PartialPaymentResult {
  success: boolean;
  new_balance?: number;
  paid_amount?: number;
  new_status?: string;
  error?: string;
}

/**
 * Hook for registering partial payments on transactions.
 * Supports incremental payments with automatic status updates.
 */
export function usePartialPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PartialPaymentParams): Promise<PartialPaymentResult> => {
      const { data, error } = await supabase.rpc('register_partial_payment', {
        p_transaction_id: params.transaction_id,
        p_payment_amount: params.payment_amount,
        p_payment_date: params.payment_date || new Date().toISOString().split('T')[0],
        p_wallet_id: params.wallet_id || null,
        p_notes: params.notes || null,
      });

      if (error) throw error;
      
      const result = data as unknown as PartialPaymentResult;
      if (!result.success) {
        throw new Error(result.error || 'Erro ao registrar pagamento');
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-projection'] });
      queryClient.invalidateQueries({ queryKey: ['liquidity-dashboard'] });
      
      if (result.new_status === 'pago') {
        toast.success('Pagamento completo registrado');
      } else {
        toast.success(`Pagamento parcial de R$ ${result.paid_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrado. Saldo: R$ ${result.new_balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

interface BulkSettleParams {
  transaction_ids: string[];
  wallet_id: string;
  payment_date?: string;
}

interface BulkSettleResult {
  success: boolean;
  settled_count?: number;
  total_amount?: number;
}

/**
 * Hook for bulk settling multiple transactions at once.
 */
export function useBulkSettle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: BulkSettleParams): Promise<BulkSettleResult> => {
      const { data, error } = await supabase.rpc('bulk_settle_transactions', {
        p_transaction_ids: params.transaction_ids,
        p_wallet_id: params.wallet_id,
        p_payment_date: params.payment_date || new Date().toISOString().split('T')[0],
      });

      if (error) throw error;
      
      const result = data as unknown as BulkSettleResult;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-projection'] });
      queryClient.invalidateQueries({ queryKey: ['liquidity-dashboard'] });
      
      toast.success(`${result.settled_count} transações baixadas. Total: R$ ${result.total_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    },
    onError: (error: Error) => {
      toast.error(`Erro na baixa em massa: ${error.message}`);
    },
  });
}
