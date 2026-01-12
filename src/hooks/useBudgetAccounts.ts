import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useBudgetAccounts(year: number) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['budget-accounts', currentCompany?.id, year],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('budget_accounts')
        .select('*, account:accounts(account_code, account_name, category_type)')
        .eq('company_id', currentCompany.id)
        .eq('year', year)
        .order('month');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useBudgetByAccountView(year: number, month?: number) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['budget-by-account-view', currentCompany?.id, year, month],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from('v_budget_by_account')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('year', year);
      if (month) query = query.eq('month', month);
      const { data, error } = await query.order('account_code');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useBudgetAccountSummary(year: number) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['budget-account-summary', currentCompany?.id, year],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const { data, error } = await supabase
        .from('v_budget_by_account')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('year', year);
      if (error) throw error;

      const summary = {
        totalTarget: 0,
        totalActual: 0,
        totalVariance: 0,
        byCategory: {} as Record<string, { target: number; actual: number; variance: number }>,
        byMonth: {} as Record<number, { target: number; actual: number; variance: number }>,
        accountsOverBudget: 0,
        accountsUnderBudget: 0,
      };

      (data || []).forEach((item: Record<string, unknown>) => {
        const targetAmount = Number(item.target_amount || 0);
        const actualAmount = Number(item.actual_amount || 0);
        const variance = Number(item.variance || 0);
        const categoryType = item.category_type as string;
        const month = item.month as number;

        summary.totalTarget += targetAmount;
        summary.totalActual += actualAmount;
        summary.totalVariance += variance;

        if (!summary.byCategory[categoryType]) {
          summary.byCategory[categoryType] = { target: 0, actual: 0, variance: 0 };
        }
        summary.byCategory[categoryType].target += targetAmount;
        summary.byCategory[categoryType].actual += actualAmount;
        summary.byCategory[categoryType].variance += variance;

        if (!summary.byMonth[month]) {
          summary.byMonth[month] = { target: 0, actual: 0, variance: 0 };
        }
        summary.byMonth[month].target += targetAmount;
        summary.byMonth[month].actual += actualAmount;
        summary.byMonth[month].variance += variance;

        if (variance < 0) summary.accountsOverBudget++;
        else if (variance > 0) summary.accountsUnderBudget++;
      });

      return summary;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useUpsertBudgetAccount() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: { account_id: string; year: number; month: number; target_amount: number }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { error } = await supabase
        .from('budget_accounts')
        .upsert({ ...data, company_id: currentCompany.id }, { onConflict: 'company_id,account_id,year,month' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budget-by-account-view'] });
      toast.success('Meta salva');
    },
  });
}
