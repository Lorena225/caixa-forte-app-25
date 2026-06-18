import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardInsight {
  severity: 'alta' | 'media' | 'positiva';
  icon: string;
  title: string;
  description: string;
  action: string | null;
  scope: string;
}

export interface DashboardInsightsResult {
  has_data: boolean;
  insights: DashboardInsight[];
}

// Insights determinísticos em tempo real (fase 1, sem custo de API).
// A RPC retorna has_data:false quando não há dados — a UI mostra o estado-guia,
// nunca insight fabricado sobre banco vazio.
export function useDashboardInsights(scope: string = 'executive') {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['dashboard-insights', currentCompany?.id, scope],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ai_dashboard_insights', {
        p_company_id: currentCompany!.id, p_scope: scope,
      });
      if (error) throw error;
      return data as DashboardInsightsResult;
    },
    enabled: !!currentCompany?.id,
    refetchInterval: 60000, // "tempo real": reavalia a cada minuto
  });
}
