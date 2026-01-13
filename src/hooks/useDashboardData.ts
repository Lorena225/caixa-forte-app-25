import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardFilters } from '@/components/dashboard/FilterBar';
import { format } from 'date-fns';

// Branches hook
export function useBranches() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['branches', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Executive Dashboard KPIs
export function useExecutiveKPIs(filters: DashboardFilters) {
  const { currentCompany } = useAuth();
  const fromDate = format(filters.fromDate, 'yyyy-MM-dd');
  const toDate = format(filters.toDate, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['executive_kpis', currentCompany?.id, fromDate, toDate, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return null;

      // Parallel queries for performance
      const [transactionsRes, walletsRes, arAgingRes, apAgingRes] = await Promise.all([
        // Transactions in period
        supabase
          .from('transactions')
          .select('direction, total_amount, status, due_date, paid_date')
          .eq('company_id', currentCompany.id)
          .neq('status', 'cancelado')
          .gte('due_date', fromDate)
          .lte('due_date', toDate),
        
        // Current wallet balances
        supabase
          .from('wallets')
          .select('id, name, opening_balance')
          .eq('company_id', currentCompany.id)
          .eq('is_active', true),

        // AR Aging Summary
        supabase
          .from('v_ar_aging_summary')
          .select('*')
          .eq('company_id', currentCompany.id),

        // AP Aging Summary
        supabase
          .from('v_ap_aging_summary')
          .select('*')
          .eq('company_id', currentCompany.id),
      ]);

      const transactions = transactionsRes.data || [];
      const wallets = walletsRes.data || [];
      const arAging = arAgingRes.data || [];
      const apAging = apAgingRes.data || [];

      // Calculate revenue and expenses
      const revenue = transactions
        .filter(t => t.direction === 'entrada')
        .reduce((sum, t) => sum + Number(t.total_amount), 0);
      
      const expenses = transactions
        .filter(t => t.direction === 'saida')
        .reduce((sum, t) => sum + Number(t.total_amount), 0);

      const paidRevenue = transactions
        .filter(t => t.direction === 'entrada' && t.status === 'pago')
        .reduce((sum, t) => sum + Number(t.total_amount), 0);

      const paidExpenses = transactions
        .filter(t => t.direction === 'saida' && t.status === 'pago')
        .reduce((sum, t) => sum + Number(t.total_amount), 0);

      // Cash balance (simplified - could use v_cash_position_daily)
      const walletBalance = wallets.reduce((sum, w) => sum + Number(w.opening_balance || 0), 0);
      const cashBalance = walletBalance + paidRevenue - paidExpenses;

      // AR/AP totals
      const arTotal = arAging.reduce((sum, a) => sum + Number(a.total_amount || 0), 0);
      const arOverdue = arAging
        .filter(a => a.aging_bucket !== 'a_vencer')
        .reduce((sum, a) => sum + Number(a.total_amount || 0), 0);
      
      const apTotal = apAging.reduce((sum, a) => sum + Number(a.total_amount || 0), 0);
      const apOverdue = apAging
        .filter(a => a.aging_bucket !== 'a_vencer')
        .reduce((sum, a) => sum + Number(a.total_amount || 0), 0);

      // Profit and margin
      const profit = revenue - expenses;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        revenue,
        expenses,
        profit,
        margin,
        cashBalance,
        arTotal,
        arOverdue,
        arOverduePercent: arTotal > 0 ? (arOverdue / arTotal) * 100 : 0,
        apTotal,
        apOverdue,
        apNext7Days: apAging
          .filter(a => a.aging_bucket === 'a_vencer')
          .reduce((sum, a) => sum + Number(a.total_amount || 0), 0),
        wallets: wallets.map(w => ({
          id: w.id,
          name: w.name,
          balance: Number(w.opening_balance || 0)
        })),
      };
    },
    enabled: !!currentCompany?.id,
    staleTime: 30000, // 30 seconds
  });
}

// Budget vs Actual
export function useBudgetVsActual(year: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['budget_vs_actual', currentCompany?.id, year],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('v_budget_vs_actual_monthly')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('year', year)
        .order('month');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// AR Aging with buckets
export function useARAgingSummary() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['ar_aging_summary', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('v_ar_aging_summary')
        .select('*')
        .eq('company_id', currentCompany.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// AP Aging with buckets
export function useAPAgingSummary() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['ap_aging_summary', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('v_ap_aging_summary')
        .select('*')
        .eq('company_id', currentCompany.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Top Debtors
export function useTopDebtors(limit = 10) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['top_debtors', currentCompany?.id, limit],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('v_top_debtors')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('total_open', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Top Creditors
export function useTopCreditors(limit = 10) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['top_creditors', currentCompany?.id, limit],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('v_top_creditors')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('total_open', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Cash Flow Daily (realized)
export function useCashFlowDaily(filters: DashboardFilters) {
  const { currentCompany } = useAuth();
  const fromDate = format(filters.fromDate, 'yyyy-MM-dd');
  const toDate = format(filters.toDate, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['cashflow_daily', currentCompany?.id, fromDate, toDate],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('v_cash_daily_balance')
        .select('*')
        .eq('company_id', currentCompany.id)
        .gte('movement_date', fromDate)
        .lte('movement_date', toDate)
        .order('movement_date')
        .limit(400);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Cash Flow Weekly Projection (13 weeks)
export function useCashFlowProjection() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['cashflow_projection', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('v_cashflow_weekly_projection')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('week_start')
        .limit(52);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// DSO (Days Sales Outstanding / PMR)
export function useDSOMonthly(year: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['dso_monthly', currentCompany?.id, year],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('v_dso_monthly')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('year', year)
        .order('month');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// DPO (Days Payable Outstanding / PMP)
export function useDPOMonthly(year: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['dpo_monthly', currentCompany?.id, year],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('v_dpo_monthly')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('year', year)
        .order('month');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Upcoming Transactions (next 14 days AP/AR)
export function useUpcomingTransactions(days = 14) {
  const { currentCompany } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const futureDate = format(new Date(Date.now() + days * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['upcoming_transactions', currentCompany?.id, days],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, description, direction, total_amount, due_date, status,
          counterparty:counterparty_id(id, name),
          account:account_id(id, code, name)
        `)
        .eq('company_id', currentCompany.id)
        .neq('status', 'pago')
        .neq('status', 'cancelado')
        .gte('due_date', today)
        .lte('due_date', futureDate)
        .order('due_date')
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// DRE by Month with YoY comparison
export function useDREComparison(year: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['dre_comparison', currentCompany?.id, year],
    queryFn: async () => {
      if (!currentCompany?.id) return { current: [], previous: [] };
      
      const [currentYearRes, previousYearRes] = await Promise.all([
        supabase
          .from('v_dre_monthly')
          .select('*')
          .eq('company_id', currentCompany.id)
          .eq('year', year)
          .order('month')
          .order('account_code'),
        supabase
          .from('v_dre_monthly')
          .select('*')
          .eq('company_id', currentCompany.id)
          .eq('year', year - 1)
          .order('month')
          .order('account_code'),
      ]);

      return {
        current: currentYearRes.data || [],
        previous: previousYearRes.data || [],
      };
    },
    enabled: !!currentCompany?.id,
  });
}

// Drill-down transactions
export function useDrilldownTransactions(
  filters: DashboardFilters & {
    source?: string;
    direction?: 'entrada' | 'saida';
    statusFilter?: string;
  }
) {
  const { currentCompany } = useAuth();
  const fromDate = format(filters.fromDate, 'yyyy-MM-dd');
  const toDate = format(filters.toDate, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['drilldown_transactions', currentCompany?.id, fromDate, toDate, filters.direction, filters.statusFilter],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, description, direction, total_amount, due_date, paid_date, status, document_number,
          counterparty:counterparty_id(id, name),
          account:account_id(id, code, name),
          wallet:wallet_id(id, name),
          cost_center:cost_center_id(id, code, name)
        `)
        .eq('company_id', currentCompany.id)
        .neq('status', 'cancelado')
        .gte('due_date', fromDate)
        .lte('due_date', toDate)
        .order('due_date', { ascending: false })
        .limit(500);

      if (error) throw error;
      
      let result = data || [];
      
      if (filters.direction) {
        result = result.filter(t => t.direction === filters.direction);
      }

      if (filters.statusFilter === 'overdue') {
        const today = format(new Date(), 'yyyy-MM-dd');
        result = result.filter(t => t.status !== 'pago' && t.due_date < today);
      } else if (filters.statusFilter === 'paid') {
        result = result.filter(t => t.status === 'pago');
      } else if (filters.statusFilter === 'open') {
        result = result.filter(t => t.status !== 'pago');
      }

      return result;
    },
    enabled: !!currentCompany?.id,
  });
}
