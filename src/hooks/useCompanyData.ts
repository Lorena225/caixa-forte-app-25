import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Hook para Account Categories (Categorias/Grupos)
export function useAccountCategories() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['account_categories', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('account_categories')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useAccounts() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['accounts', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          category:category_id(id, code, name, category_type)
        `)
        .eq('company_id', currentCompany.id)
        .order('code');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCostCenters() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['cost_centers', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('code');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCounterparties() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['counterparties', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('counterparties')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useWallets() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['wallets', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function usePaymentMethods() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['payment_methods', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useTransactions(filters?: {
  direction?: 'entrada' | 'saida';
  status?: string;
  month?: number;
  year?: number;
}) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['transactions', currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('transactions')
        .select(`
          *,
          accounts:account_id(id, code, name, category_id),
          wallets:wallet_id(id, name, type),
          cost_centers:cost_center_id(id, code, name),
          counterparties:counterparty_id(id, name, type),
          category:category_id(id, code, name, category_type)
        `)
        .eq('company_id', currentCompany.id)
        .neq('status', 'cancelado' as const)
        .order('due_date', { ascending: true });
      
      if (filters?.direction) {
        query = query.eq('direction', filters.direction);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status as 'rascunho' | 'lancado' | 'pago' | 'cancelado');
      }
      if (filters?.year && filters?.month) {
        const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
        const endDate = new Date(filters.year, filters.month, 0).toISOString().split('T')[0];
        query = query.gte('due_date', startDate).lte('due_date', endDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useBudgets(year?: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['budgets', currentCompany?.id, year],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('budgets')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('year')
        .order('month');
      
      if (year) {
        query = query.eq('year', year);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCashflowMonthly(year?: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['cashflow_monthly', currentCompany?.id, year],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('v_cashflow_monthly')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('year')
        .order('month');
      
      if (year) {
        query = query.eq('year', year);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useDreMonthly(year?: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['dre_monthly', currentCompany?.id, year],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('v_dre_monthly')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('year')
        .order('month')
        .order('account_code');
      
      if (year) {
        query = query.eq('year', year);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useRcIndicators(year?: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['rc_indicators', currentCompany?.id, year],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('v_rc_indicators_monthly')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('year')
        .order('month');
      
      if (year) {
        query = query.eq('year', year);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}
