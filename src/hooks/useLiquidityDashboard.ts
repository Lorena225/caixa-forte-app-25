import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LiquidityData {
  company_id: string;
  total_balance: number;
  checking_balance: number;
  savings_balance: number;
  cash_balance: number;
  investment_balance: number;
  receivables_30d: number;
  payables_30d: number;
}

export interface CashFlowProjection {
  company_id: string;
  due_date: string;
  direction: 'entrada' | 'saida';
  transaction_count: number;
  total_receivable: number;
  total_payable: number;
  net_flow: number;
}

/**
 * Hook for fetching liquidity dashboard data optimized for high-volume queries.
 */
export function useLiquidityDashboard() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['liquidity-dashboard', currentCompany?.id],
    queryFn: async (): Promise<LiquidityData | null> => {
      if (!currentCompany?.id) return null;

      const { data, error } = await supabase
        .from('v_liquidity_dashboard')
        .select('*')
        .eq('company_id', currentCompany.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data ? {
        company_id: data.company_id,
        total_balance: Number(data.total_balance) || 0,
        checking_balance: Number(data.checking_balance) || 0,
        savings_balance: Number(data.savings_balance) || 0,
        cash_balance: Number(data.cash_balance) || 0,
        investment_balance: Number(data.investment_balance) || 0,
        receivables_30d: Number(data.receivables_30d) || 0,
        payables_30d: Number(data.payables_30d) || 0,
      } : null;
    },
    enabled: !!currentCompany?.id,
    staleTime: 30000, // 30 seconds cache for performance
  });
}

/**
 * Hook for fetching cash flow projections for the next 90 days.
 */
export function useCashFlowProjection() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['cash-flow-projection', currentCompany?.id],
    queryFn: async (): Promise<CashFlowProjection[]> => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from('v_cash_flow_projection')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(row => ({
        company_id: row.company_id,
        due_date: row.due_date,
        direction: row.direction as 'entrada' | 'saida',
        transaction_count: Number(row.transaction_count) || 0,
        total_receivable: Number(row.total_receivable) || 0,
        total_payable: Number(row.total_payable) || 0,
        net_flow: Number(row.net_flow) || 0,
      }));
    },
    enabled: !!currentCompany?.id,
    staleTime: 60000, // 1 minute cache
  });
}

/**
 * Hook for generating rolling forecast with running balance.
 */
export function useRollingForecast(days: number = 30) {
  const { currentCompany } = useAuth();
  const { data: liquidity } = useLiquidityDashboard();
  const { data: projections } = useCashFlowProjection();

  return useQuery({
    queryKey: ['rolling-forecast', currentCompany?.id, days, liquidity?.total_balance],
    queryFn: async () => {
      if (!liquidity || !projections) return [];

      let runningBalance = liquidity.total_balance;
      const today = new Date();
      const forecastData: Array<{
        date: string;
        inflow: number;
        outflow: number;
        netFlow: number;
        projectedBalance: number;
      }> = [];

      // Group projections by date
      const byDate = new Map<string, { inflow: number; outflow: number }>();
      
      for (const proj of projections) {
        const key = proj.due_date;
        const existing = byDate.get(key) || { inflow: 0, outflow: 0 };
        if (proj.direction === 'entrada') {
          existing.inflow += proj.total_receivable;
        } else {
          existing.outflow += proj.total_payable;
        }
        byDate.set(key, existing);
      }

      // Generate daily forecast
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayData = byDate.get(dateStr) || { inflow: 0, outflow: 0 };
        const netFlow = dayData.inflow - dayData.outflow;
        runningBalance += netFlow;

        forecastData.push({
          date: dateStr,
          inflow: dayData.inflow,
          outflow: dayData.outflow,
          netFlow,
          projectedBalance: runningBalance,
        });
      }

      return forecastData;
    },
    enabled: !!currentCompany?.id && !!liquidity && !!projections,
  });
}
