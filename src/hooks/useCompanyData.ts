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

// Hook para Dashboard KPIs
export function useDashboardKPIs() {
  const { currentCompany } = useAuth();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  return useQuery({
    queryKey: ['dashboard_kpis', currentCompany?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      // Get current month transactions
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
      const prevEndDate = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0];
      
      // Current month
      const { data: currentTransactions } = await supabase
        .from('transactions')
        .select('direction, total_amount, status')
        .eq('company_id', currentCompany.id)
        .neq('status', 'cancelado')
        .gte('due_date', startDate)
        .lte('due_date', endDate);
      
      // Previous month
      const { data: prevTransactions } = await supabase
        .from('transactions')
        .select('direction, total_amount, status')
        .eq('company_id', currentCompany.id)
        .neq('status', 'cancelado')
        .gte('due_date', prevStartDate)
        .lte('due_date', prevEndDate);
      
      // Wallets balance
      const { data: wallets } = await supabase
        .from('wallets')
        .select('opening_balance')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true);
      
      // Open receivables (AR)
      const { data: openAR } = await supabase
        .from('transactions')
        .select('total_amount')
        .eq('company_id', currentCompany.id)
        .eq('direction', 'entrada')
        .neq('status', 'pago')
        .neq('status', 'cancelado');
      
      // Open payables (AP)
      const { data: openAP } = await supabase
        .from('transactions')
        .select('total_amount')
        .eq('company_id', currentCompany.id)
        .eq('direction', 'saida')
        .neq('status', 'pago')
        .neq('status', 'cancelado');
      
      // Overdue count
      const today = new Date().toISOString().split('T')[0];
      const { data: overdue } = await supabase
        .from('transactions')
        .select('id')
        .eq('company_id', currentCompany.id)
        .neq('status', 'pago')
        .neq('status', 'cancelado')
        .lt('due_date', today);
      
      // Calculate KPIs
      const currentReceipts = (currentTransactions || [])
        .filter(t => t.direction === 'entrada')
        .reduce((sum, t) => sum + Number(t.total_amount), 0);
      
      const currentExpenses = (currentTransactions || [])
        .filter(t => t.direction === 'saida')
        .reduce((sum, t) => sum + Number(t.total_amount), 0);
      
      const prevReceipts = (prevTransactions || [])
        .filter(t => t.direction === 'entrada')
        .reduce((sum, t) => sum + Number(t.total_amount), 0);
      
      const prevExpenses = (prevTransactions || [])
        .filter(t => t.direction === 'saida')
        .reduce((sum, t) => sum + Number(t.total_amount), 0);
      
      const paidTransactions = (currentTransactions || []).filter(t => t.status === 'pago');
      const paidReceipts = paidTransactions
        .filter(t => t.direction === 'entrada')
        .reduce((sum, t) => sum + Number(t.total_amount), 0);
      const paidExpenses = paidTransactions
        .filter(t => t.direction === 'saida')
        .reduce((sum, t) => sum + Number(t.total_amount), 0);
      
      const walletBalance = (wallets || []).reduce((sum, w) => sum + Number(w.opening_balance || 0), 0) 
        + paidReceipts - paidExpenses;
      
      const arTotal = (openAR || []).reduce((sum, t) => sum + Number(t.total_amount), 0);
      const apTotal = (openAP || []).reduce((sum, t) => sum + Number(t.total_amount), 0);
      const overdueCount = (overdue || []).length;
      
      const receiptChange = prevReceipts > 0 
        ? ((currentReceipts - prevReceipts) / prevReceipts * 100).toFixed(1) 
        : '0';
      const expenseChange = prevExpenses > 0 
        ? ((currentExpenses - prevExpenses) / prevExpenses * 100).toFixed(1) 
        : '0';
      
      return {
        receipts: currentReceipts,
        expenses: currentExpenses,
        balance: walletBalance,
        profit: currentReceipts - currentExpenses,
        receiptChange,
        expenseChange,
        arTotal,
        apTotal,
        overdueCount,
      };
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para Dimensions
export function useDimensions() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['dimensions', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('dimensions')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('code');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para Dimension Values
export function useDimensionValues(dimensionId?: string) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['dimension_values', currentCompany?.id, dimensionId],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from('dimension_values')
        .select('*, dimension:dimension_id(id, name, code)')
        .eq('company_id', currentCompany.id)
        .order('code');
      
      if (dimensionId) {
        query = query.eq('dimension_id', dimensionId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para Trial Balance (Balancete)
export function useTrialBalance() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['trial_balance', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('v_trial_balance')
        .select('*')
        .eq('company_id', currentCompany.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para Journal Entries
export function useJournalEntries(filters?: { month?: number; year?: number }) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['journal_entries', currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('journal_entries')
        .select(`
          *,
          lines:journal_entry_lines(
            *,
            account:account_id(id, code, name)
          )
        `)
        .eq('company_id', currentCompany.id)
        .order('entry_date', { ascending: false });
      
      if (filters?.year && filters?.month) {
        const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
        const endDate = new Date(filters.year, filters.month, 0).toISOString().split('T')[0];
        query = query.gte('entry_date', startDate).lte('entry_date', endDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para AP Aging
export function useAPAging() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['ap_aging', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          counterparty:counterparty_id(id, name),
          account:account_id(id, code, name)
        `)
        .eq('company_id', currentCompany.id)
        .eq('direction', 'saida')
        .neq('status', 'pago')
        .neq('status', 'cancelado')
        .order('due_date');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para AR Aging
export function useARAging() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['ar_aging', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          counterparty:counterparty_id(id, name),
          account:account_id(id, code, name)
        `)
        .eq('company_id', currentCompany.id)
        .eq('direction', 'entrada')
        .neq('status', 'pago')
        .neq('status', 'cancelado')
        .order('due_date');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para Cash Position
export function useCashPosition() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['cash_position', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('v_cash_position_daily')
        .select('*')
        .eq('company_id', currentCompany.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para Document Types
export function useDocumentTypes() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['document_types', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .or(`company_id.is.null,company_id.eq.${currentCompany?.id}`)
        .eq('is_active', true)
        .order('doc_group')
        .order('doc_name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para Chart of Accounts Settings
export function useChartOfAccountsSettings() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['chart_of_accounts_settings', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const { data, error } = await supabase
        .from('chart_of_accounts_settings')
        .select('*')
        .eq('company_id', currentCompany.id)
        .maybeSingle();
      if (error) throw error;
      return data || {
        company_id: currentCompany.id,
        posting_policy: 'leaf_or_flag',
        max_code_length: 30,
      };
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para buscar contas com campos estendidos
export function useAccountsExtended() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['accounts_extended', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          category:category_id(id, code, name, category_type),
          parent:parent_id(id, code, name),
          contra_target:contra_target_account_id(id, code, name)
        `)
        .eq('company_id', currentCompany.id)
        .order('account_code');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}
