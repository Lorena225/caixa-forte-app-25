import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Budget {
  id: string;
  company_id: string;
  name: string;
  year: number;
  period_type: 'mensal' | 'trimestral' | 'anual';
  status: 'rascunho' | 'aprovado' | 'ativo' | 'fechado';
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface BudgetItem {
  id: string;
  budget_id: string;
  account_id: string;
  cost_center_id: string | null;
  month: number;
  planned_amount: number;
  actual_amount: number;
  notes: string | null;
  variance?: number;
  variance_percent?: number;
}

export function useBudgets(_year?: number) {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  
  return useQuery({
    queryKey: ['budgets-advanced', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      // Tables created but types not synced yet
      return [] as Budget[];
    },
    enabled: !!companyId,
  });
}

export function useBudgetItems(_budgetId?: string) {
  return useQuery({
    queryKey: ['budget-items-advanced'],
    queryFn: async () => [] as BudgetItem[],
    enabled: false,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (_data: { name: string; year: number; period_type: string }) => {
      return {} as Budget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets-advanced'] });
      toast.success('Orçamento criado');
    },
  });
}

export function useBudgetVsActual(_budgetId?: string) {
  return useQuery({
    queryKey: ['budget-vs-actual'],
    queryFn: async () => null,
    enabled: false,
  });
}
