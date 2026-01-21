import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { creditScoringService, CreditProfile, CollectionAction, CreditLimitRequest, PortfolioSummary, LossProvision } from '@/services/CreditScoringService';
import { toast } from 'sonner';

// Hook to get all credit profiles
export function useCreditProfiles(filters?: {
  riskLevel?: string;
  rating?: string;
  collectionStatus?: string;
  search?: string;
}) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['credit-profiles', currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      return creditScoringService.getCreditProfiles(currentCompany.id, filters);
    },
    enabled: !!currentCompany?.id
  });
}

// Hook to get a single credit profile
export function useCreditProfile(profileId: string | null) {
  return useQuery({
    queryKey: ['credit-profile', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      return creditScoringService.getCreditProfile(profileId);
    },
    enabled: !!profileId
  });
}

// Hook to get score history
export function useScoreHistory(profileId: string | null) {
  return useQuery({
    queryKey: ['score-history', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      return creditScoringService.getScoreHistory(profileId);
    },
    enabled: !!profileId
  });
}

// Hook to get portfolio summary
export function usePortfolioSummary() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['portfolio-summary', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      return creditScoringService.getPortfolioSummary(currentCompany.id);
    },
    enabled: !!currentCompany?.id
  });
}

// Hook to get pending limit requests
export function usePendingLimitRequests() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['pending-limit-requests', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      return creditScoringService.getPendingLimitRequests(currentCompany.id);
    },
    enabled: !!currentCompany?.id
  });
}

// Hook to get collection actions
export function useCollectionActions(profileId: string | null, status?: string) {
  return useQuery({
    queryKey: ['collection-actions', profileId, status],
    queryFn: async () => {
      if (!profileId) return [];
      return creditScoringService.getCollectionActions(profileId, status);
    },
    enabled: !!profileId
  });
}

// Hook to get loss provisions
export function useLossProvisions() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['loss-provisions', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      return creditScoringService.getLossProvisions(currentCompany.id);
    },
    enabled: !!currentCompany?.id
  });
}

// Mutation to update credit limit
export function useUpdateCreditLimit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ profileId, newLimit, reason }: { profileId: string; newLimit: number; reason?: string }) => {
      return creditScoringService.updateCreditLimit(profileId, newLimit, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['credit-profile'] });
      toast.success('Limite de crédito atualizado com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar limite: ${error.message}`);
    }
  });
}

// Mutation to request limit change
export function useRequestLimitChange() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async ({ profileId, currentLimit, requestedLimit, reason }: {
      profileId: string;
      currentLimit: number;
      requestedLimit: number;
      reason: string;
    }) => {
      if (!currentCompany?.id) throw new Error('Company not found');
      return creditScoringService.requestLimitChange(profileId, currentCompany.id, currentLimit, requestedLimit, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-limit-requests'] });
      toast.success('Solicitação de alteração de limite enviada');
    },
    onError: (error) => {
      toast.error(`Erro ao solicitar alteração: ${error.message}`);
    }
  });
}

// Mutation to review limit request
export function useReviewLimitRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ requestId, approved, reviewNotes }: {
      requestId: string;
      approved: boolean;
      reviewNotes?: string;
    }) => {
      return creditScoringService.reviewLimitRequest(requestId, approved, reviewNotes);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-limit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['credit-profiles'] });
      toast.success(variables.approved ? 'Solicitação aprovada' : 'Solicitação rejeitada');
    },
    onError: (error) => {
      toast.error(`Erro ao revisar solicitação: ${error.message}`);
    }
  });
}

// Mutation to update collection status
export function useUpdateCollectionStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ profileId, status }: { profileId: string; status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'CLOSED' }) => {
      return creditScoringService.updateCollectionStatus(profileId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['credit-profile'] });
      toast.success('Status de cobrança atualizado');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    }
  });
}

// Mutation to recalculate score
export function useRecalculateScore() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (counterpartyId: string) => {
      if (!currentCompany?.id) throw new Error('Company not found');
      return creditScoringService.updateCreditProfile(counterpartyId, currentCompany.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['credit-profile'] });
      queryClient.invalidateQueries({ queryKey: ['score-history'] });
      toast.success('Score recalculado com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao recalcular score: ${error.message}`);
    }
  });
}

// Mutation to calculate loss provision
export function useCalculateLossProvision() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async ({ periodStart, periodEnd }: { periodStart: Date; periodEnd: Date }) => {
      if (!currentCompany?.id) throw new Error('Company not found');
      return creditScoringService.calculateLossProvision(currentCompany.id, periodStart, periodEnd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loss-provisions'] });
      toast.success('Provisão calculada com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao calcular provisão: ${error.message}`);
    }
  });
}

// Mutation to batch update scores
export function useBatchUpdateScores() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id) throw new Error('Company not found');
      return creditScoringService.batchUpdateScores(currentCompany.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['credit-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      toast.success(`Scores atualizados: ${result.updated} sucesso, ${result.errors} erros`);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar scores: ${error.message}`);
    }
  });
}

// Mutation to execute collection action
export function useExecuteCollectionAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ actionId, result }: {
      actionId: string;
      result: { success: boolean; data?: Record<string, unknown>; error?: string };
    }) => {
      return creditScoringService.executeCollectionAction(actionId, result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-actions'] });
      toast.success('Ação de cobrança registrada');
    },
    onError: (error) => {
      toast.error(`Erro ao registrar ação: ${error.message}`);
    }
  });
}

// Utility functions
export function getRatingColor(rating: string): string {
  return creditScoringService.getRatingColor(rating);
}

export function getRiskColor(riskLevel: string): string {
  return creditScoringService.getRiskColor(riskLevel);
}
