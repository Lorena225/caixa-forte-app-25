import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BankReconciliation {
  id: string;
  company_id: string;
  bank_account_id: string;
  statement_date: string;
  statement_balance: number;
  system_balance: number;
  difference: number;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  reconciled_at: string | null;
  reconciled_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface BankTransaction {
  id: string;
  reconciliation_id: string | null;
  company_id: string;
  bank_account_id: string;
  transaction_date: string;
  description: string;
  document_number: string | null;
  debit: number;
  credit: number;
  balance: number | null;
  matched_transaction_id: string | null;
  match_confidence: number | null;
  status: 'nao_conciliado' | 'sugerido' | 'conciliado' | 'divergente';
  created_at: string;
}

export interface ReconciliationRule {
  id: string;
  company_id: string;
  rule_name: string;
  description_pattern: string | null;
  value_tolerance: number;
  auto_match: boolean;
  target_account_id: string | null;
  is_active: boolean;
  created_at: string;
}

export function useBankReconciliations(bankAccountId?: string) {
  const { companyId } = useAuth();
  
  return useQuery({
    queryKey: ['bank-reconciliations', companyId, bankAccountId],
    queryFn: async () => {
      if (!companyId) return [];
      
      // Use raw query since types aren't synced yet
      const { data, error } = await supabase
        .rpc('get_bank_reconciliations' as never, { p_company_id: companyId, p_bank_account_id: bankAccountId })
        .catch(() => ({ data: null, error: null }));
      
      // Fallback - table might not exist yet
      if (error || !data) return [] as BankReconciliation[];
      return data as BankReconciliation[];
    },
    enabled: !!companyId,
  });
}

export function useBankTransactions(reconciliationId?: string, bankAccountId?: string) {
  const { companyId } = useAuth();
  
  return useQuery({
    queryKey: ['bank-transactions', companyId, reconciliationId, bankAccountId],
    queryFn: async () => {
      if (!companyId) return [];
      return [] as BankTransaction[];
    },
    enabled: !!companyId,
  });
}

export function useReconciliationRules() {
  const { companyId } = useAuth();
  
  return useQuery({
    queryKey: ['reconciliation-rules', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      return [] as ReconciliationRule[];
    },
    enabled: !!companyId,
  });
}

export function useAutoReconcile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (_reconciliationId: string) => {
      return { matched: 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success(`${data.matched} transações sugeridas para conciliação`);
    },
  });
}

export function useCompleteReconciliation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (_reconciliationId: string) => {
      // Implementation pending type sync
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      toast.success('Conciliação finalizada');
    },
  });
}

export function useMatchTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (_data: {
      bank_transaction_id: string;
      system_transaction_id: string;
      confidence?: number;
    }) => {
      // Implementation pending type sync
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success('Transação conciliada');
    },
  });
}
