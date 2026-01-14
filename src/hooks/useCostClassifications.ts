import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CostClassification {
  id: string;
  company_id: string;
  account_id: string;
  classification_type: 'fixo' | 'variavel' | 'semi_variavel';
  variable_percentage: number;
  notes: string | null;
  created_at: string;
  account?: {
    id: string;
    code: string;
    account_name: string;
    category_type: string;
  };
}

export function useCostClassifications() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  
  return useQuery({
    queryKey: ['cost-classifications', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      // Tables created but types not synced yet
      return [] as CostClassification[];
    },
    enabled: !!companyId,
  });
}

export function useUpsertCostClassification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (_data: {
      account_id: string;
      classification_type: 'fixo' | 'variavel' | 'semi_variavel';
      variable_percentage?: number;
      notes?: string;
    }) => {
      // Implementation pending type sync
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-classifications'] });
      toast.success('Classificação salva');
    },
  });
}

export function useCostAnalysis() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  
  return useQuery({
    queryKey: ['cost-analysis', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      return {
        totalFixed: 0,
        totalVariable: 0,
        totalSemiVariable: 0,
        total: 0,
        fixedPercent: 0,
        variablePercent: 0,
        classifications: [] as CostClassification[],
        accountTotals: {} as Record<string, number>,
      };
    },
    enabled: !!companyId,
  });
}
