import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AgingSummary {
  company_id: string;
  current_count: number;
  current_amount: number;
  days_1_30_count: number;
  days_1_30_amount: number;
  days_31_60_count: number;
  days_31_60_amount: number;
  days_61_90_count: number;
  days_61_90_amount: number;
  over_90_count: number;
  over_90_amount: number;
  refreshed_at: string;
}

interface MonthlyPnL {
  company_id: string;
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  revenue_count: number;
  expense_count: number;
  refreshed_at: string;
}

interface CashPosition {
  company_id: string;
  wallet_id: string;
  wallet_name: string;
  current_balance: number;
  projected_inflows_7d: number;
  projected_outflows_7d: number;
  refreshed_at: string;
}

// Hook para AR Aging com cache
export function useARAgingCached() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['ar-aging-cached', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_ar_aging_cached')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .single();
      
      if (error) throw error;
      return data as unknown as AgingSummary;
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

// Hook para AP Aging com cache
export function useAPAgingCached() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['ap-aging-cached', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_ap_aging_cached')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .single();
      
      if (error) throw error;
      return data as unknown as AgingSummary;
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook para P&L mensal com cache
export function useMonthlyPnLCached() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['monthly-pnl-cached', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_monthly_pnl_cached')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .order('month', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as MonthlyPnL[];
    },
    enabled: !!currentCompany?.id,
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 30 * 60 * 1000,
  });
}

// Hook para posição de caixa com cache
export function useCashPositionCached() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['cash-position-cached', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_cash_position_cached')
        .select('*')
        .eq('company_id', currentCompany?.id);
      
      if (error) throw error;
      return (data || []) as unknown as CashPosition[];
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook combinado para dashboard executivo
export function useExecutiveDashboardCached() {
  const arAging = useARAgingCached();
  const apAging = useAPAgingCached();
  const monthlyPnL = useMonthlyPnLCached();
  const cashPosition = useCashPositionCached();
  
  const isLoading = arAging.isLoading || apAging.isLoading || 
                    monthlyPnL.isLoading || cashPosition.isLoading;
  
  const error = arAging.error || apAging.error || 
                monthlyPnL.error || cashPosition.error;
  
  // Calcular totais de caixa
  const totalCash = cashPosition.data?.reduce((sum, w) => sum + (w.current_balance || 0), 0) || 0;
  const totalInflows7d = cashPosition.data?.reduce((sum, w) => sum + (w.projected_inflows_7d || 0), 0) || 0;
  const totalOutflows7d = cashPosition.data?.reduce((sum, w) => sum + (w.projected_outflows_7d || 0), 0) || 0;
  
  // Totais AR/AP
  const totalAR = arAging.data ? (
    (arAging.data.current_amount || 0) + 
    (arAging.data.days_1_30_amount || 0) + 
    (arAging.data.days_31_60_amount || 0) + 
    (arAging.data.days_61_90_amount || 0) + 
    (arAging.data.over_90_amount || 0)
  ) : 0;
  
  const overdueAR = arAging.data ? (
    (arAging.data.days_1_30_amount || 0) + 
    (arAging.data.days_31_60_amount || 0) + 
    (arAging.data.days_61_90_amount || 0) + 
    (arAging.data.over_90_amount || 0)
  ) : 0;
  
  const totalAP = apAging.data ? (
    (apAging.data.current_amount || 0) + 
    (apAging.data.days_1_30_amount || 0) + 
    (apAging.data.days_31_60_amount || 0) + 
    (apAging.data.days_61_90_amount || 0) + 
    (apAging.data.over_90_amount || 0)
  ) : 0;
  
  const overdueAP = apAging.data ? (
    (apAging.data.days_1_30_amount || 0) + 
    (apAging.data.days_31_60_amount || 0) + 
    (apAging.data.days_61_90_amount || 0) + 
    (apAging.data.over_90_amount || 0)
  ) : 0;
  
  // P&L do último mês
  const latestPnL = monthlyPnL.data?.[monthlyPnL.data.length - 1];
  
  return {
    isLoading,
    error,
    data: {
      arAging: arAging.data,
      apAging: apAging.data,
      monthlyPnL: monthlyPnL.data,
      cashPositions: cashPosition.data,
      kpis: {
        totalCash,
        totalInflows7d,
        totalOutflows7d,
        projectedCash: totalCash + totalInflows7d - totalOutflows7d,
        totalAR,
        overdueAR,
        totalAP,
        overdueAP,
        revenue: latestPnL?.revenue || 0,
        expenses: latestPnL?.expenses || 0,
        profit: latestPnL?.profit || 0,
        margin: latestPnL?.revenue ? ((latestPnL.profit / latestPnL.revenue) * 100) : 0,
      }
    },
    refreshedAt: arAging.data?.refreshed_at || null,
  };
}
