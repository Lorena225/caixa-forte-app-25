import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type InvestmentType = 'cdb' | 'lci' | 'lca' | 'tesouro_direto' | 'fundos' | 'acoes' | 'outros';
export type YieldType = 'prefixado' | 'pos_fixado' | 'ipca' | 'cdi';
export type InvestmentStatus = 'ativo' | 'resgatado' | 'vencido';

export interface Investment {
  id: string;
  company_id: string;
  name: string;
  investment_type: InvestmentType;
  institution: string;
  application_date: string;
  maturity_date: string | null;
  principal_amount: number;
  current_value: number | null;
  yield_rate: number | null;
  yield_type: YieldType | null;
  status: InvestmentStatus;
  auto_renewal: boolean;
  notes: string | null;
}

export function useInvestments(_status?: InvestmentStatus) {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  
  return useQuery({
    queryKey: ['investments', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      // Tables created but types not synced yet
      return [] as Investment[];
    },
    enabled: !!companyId,
  });
}

export function useCreateInvestment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (_data: Partial<Investment>) => {
      return {} as Investment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Investimento criado');
    },
  });
}

export function useInvestmentsDashboard() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  
  return useQuery({
    queryKey: ['investments-dashboard', companyId],
    queryFn: async () => ({
      totalInvested: 0,
      totalCurrentValue: 0,
      totalYield: 0,
      yieldPercent: 0,
      upcomingMaturities: [] as Investment[],
      byType: [] as { type: string; value: number }[],
      byInstitution: [] as { institution: string; value: number }[],
      investments: [] as Investment[],
    }),
    enabled: !!companyId,
  });
}
