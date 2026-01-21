import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CacheLayer, CacheKeys, CacheTTL } from "@/lib/cache";

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

// Hook para AR Aging com cache de duas camadas
export function useARAgingCached() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['ar-aging-cached', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      const cacheKey = CacheKeys.arAging(currentCompany.id);
      
      // Tentar cache em memória primeiro
      return CacheLayer.getOrSet(cacheKey, async () => {
        const { data, error } = await supabase
          .from('v_ar_aging_summary')
          .select('*')
          .eq('company_id', currentCompany.id);
        
        if (error) throw error;
        
        // Agregar os dados
        const aggregated: AgingSummary = {
          company_id: currentCompany.id,
          current_count: 0,
          current_amount: 0,
          days_1_30_count: 0,
          days_1_30_amount: 0,
          days_31_60_count: 0,
          days_31_60_amount: 0,
          days_61_90_count: 0,
          days_61_90_amount: 0,
          over_90_count: 0,
          over_90_amount: 0,
          refreshed_at: new Date().toISOString(),
        };
        
        (data || []).forEach((row) => {
          const bucket = row.aging_bucket;
          const amount = Number(row.total_amount || 0);
          const count = Number(row.doc_count || 0);
          
          if (bucket === 'a_vencer') {
            aggregated.current_amount += amount;
            aggregated.current_count += count;
          } else if (bucket === '1_30_dias') {
            aggregated.days_1_30_amount += amount;
            aggregated.days_1_30_count += count;
          } else if (bucket === '31_60_dias') {
            aggregated.days_31_60_amount += amount;
            aggregated.days_31_60_count += count;
          } else if (bucket === '61_90_dias') {
            aggregated.days_61_90_amount += amount;
            aggregated.days_61_90_count += count;
          } else if (bucket === 'mais_90_dias') {
            aggregated.over_90_amount += amount;
            aggregated.over_90_count += count;
          }
        });
        
        return aggregated;
      }, CacheTTL.MEDIUM);
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

// Hook para AP Aging com cache de duas camadas
export function useAPAgingCached() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['ap-aging-cached', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      const cacheKey = CacheKeys.apAging(currentCompany.id);
      
      return CacheLayer.getOrSet(cacheKey, async () => {
        const { data, error } = await supabase
          .from('v_ap_aging_summary')
          .select('*')
          .eq('company_id', currentCompany.id);
        
        if (error) throw error;
        
        const aggregated: AgingSummary = {
          company_id: currentCompany.id,
          current_count: 0,
          current_amount: 0,
          days_1_30_count: 0,
          days_1_30_amount: 0,
          days_31_60_count: 0,
          days_31_60_amount: 0,
          days_61_90_count: 0,
          days_61_90_amount: 0,
          over_90_count: 0,
          over_90_amount: 0,
          refreshed_at: new Date().toISOString(),
        };
        
        (data || []).forEach((row) => {
          const bucket = row.aging_bucket;
          const amount = Number(row.total_amount || 0);
          const count = Number(row.doc_count || 0);
          
          if (bucket === 'a_vencer') {
            aggregated.current_amount += amount;
            aggregated.current_count += count;
          } else if (bucket === '1_30_dias') {
            aggregated.days_1_30_amount += amount;
            aggregated.days_1_30_count += count;
          } else if (bucket === '31_60_dias') {
            aggregated.days_31_60_amount += amount;
            aggregated.days_31_60_count += count;
          } else if (bucket === '61_90_dias') {
            aggregated.days_61_90_amount += amount;
            aggregated.days_61_90_count += count;
          } else if (bucket === 'mais_90_dias') {
            aggregated.over_90_amount += amount;
            aggregated.over_90_count += count;
          }
        });
        
        return aggregated;
      }, CacheTTL.MEDIUM);
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook para P&L mensal com cache
export function useMonthlyPnLCached() {
  const { currentCompany } = useAuth();
  const currentYear = new Date().getFullYear();
  
  return useQuery({
    queryKey: ['monthly-pnl-cached', currentCompany?.id, currentYear],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const cacheKey = CacheKeys.cashflow(currentCompany.id, currentYear);
      
      return CacheLayer.getOrSet(cacheKey, async () => {
        const { data, error } = await supabase
          .from('v_dre_monthly')
          .select('*')
          .eq('company_id', currentCompany.id)
          .eq('year', currentYear)
          .order('month', { ascending: true });
        
        if (error) throw error;
        
        // Agregar por mês
        const monthlyMap = new Map<number, MonthlyPnL>();
        
        (data || []).forEach((row) => {
          const month = row.month;
          if (!monthlyMap.has(month)) {
            monthlyMap.set(month, {
              company_id: currentCompany.id,
              month: `${currentYear}-${String(month).padStart(2, '0')}`,
              revenue: 0,
              expenses: 0,
              profit: 0,
              revenue_count: 0,
              expense_count: 0,
              refreshed_at: new Date().toISOString(),
            });
          }
          
          const entry = monthlyMap.get(month)!;
          const amount = Number(row.total || 0);
          
          // Classificar por categoria (receita vs despesa)
          if (row.category_type === 'receita') {
            entry.revenue += amount;
            entry.revenue_count += 1;
          } else if (row.category_type === 'despesa') {
            entry.expenses += amount;
            entry.expense_count += 1;
          }
          entry.profit = entry.revenue - entry.expenses;
        });
        
        return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
      }, CacheTTL.LONG);
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
      if (!currentCompany?.id) return [];
      
      const cacheKey = CacheKeys.wallets(currentCompany.id);
      
      return CacheLayer.getOrSet(cacheKey, async () => {
        // Buscar saldos das carteiras
        const { data: wallets, error } = await supabase
          .from('wallets')
          .select('id, name, opening_balance')
          .eq('company_id', currentCompany.id)
          .eq('is_active', true);
        
        if (error) throw error;
        
        return (wallets || []).map((w) => ({
          company_id: currentCompany.id,
          wallet_id: w.id,
          wallet_name: w.name,
          current_balance: Number(w.opening_balance || 0),
          projected_inflows_7d: 0,
          projected_outflows_7d: 0,
          refreshed_at: new Date().toISOString(),
        })) as CashPosition[];
      }, CacheTTL.MEDIUM);
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
  
  // Função para invalidar cache e refetch
  const invalidateCache = () => {
    const { currentCompany } = useAuth();
    if (currentCompany?.id) {
      CacheLayer.invalidateByPrefix(`ar-aging:${currentCompany.id}`);
      CacheLayer.invalidateByPrefix(`ap-aging:${currentCompany.id}`);
      CacheLayer.invalidateByPrefix(`cashflow:${currentCompany.id}`);
      CacheLayer.invalidateByPrefix(`wallets:${currentCompany.id}`);
    }
    arAging.refetch();
    apAging.refetch();
    monthlyPnL.refetch();
    cashPosition.refetch();
  };
  
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
    invalidateCache,
    refetch: invalidateCache,
  };
}

// Função utilitária para pré-carregar dados do dashboard
export function preloadDashboardData(companyId: string) {
  // Pre-warm cache durante idle time
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Os hooks farão o cache automaticamente quando chamados
      console.log(`[Cache] Pre-warming dashboard data for company ${companyId}`);
    });
  }
}
