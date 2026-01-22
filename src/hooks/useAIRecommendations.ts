import { useMemo } from 'react';

interface Recommendation {
  id: string;
  category: 'cash_management' | 'cost_reduction' | 'receivables' | 'investment' | 'optimization';
  title: string;
  description: string;
  impact: {
    value: number;
    unit: 'monthly' | 'weekly' | 'yearly' | 'one_time';
  };
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}

interface ActionImpact {
  financialImpact: number;
  cashFlowImpact: number;
  timeToImplement: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export const useAIRecommendations = (data: any) => {
  return useMemo(() => ({
    generateRecommendations: (): Recommendation[] => [
      { 
        id: 'rec_001', 
        category: 'cash_management', 
        title: 'Otimizar aplicações de curto prazo', 
        description: 'Você tem R$ 250.000 em caixa. Aplicar em CDB renderá ~R$ 1.250/mês.', 
        impact: { value: 1250, unit: 'monthly' }, 
        effort: 'low', 
        priority: 'high', 
        estimatedImpact: 'R$ 15.000/ano' 
      },
      { 
        id: 'rec_002', 
        category: 'cost_reduction', 
        title: 'Renegociar contrato de fornecedor X', 
        description: 'Redução potencial de 15% (R$ 7.500/mês).', 
        impact: { value: 7500, unit: 'monthly' }, 
        effort: 'medium', 
        priority: 'high', 
        estimatedImpact: 'R$ 90.000/ano' 
      },
      { 
        id: 'rec_003', 
        category: 'receivables', 
        title: 'Aumentar cobrança de contas vencidas', 
        description: 'R$ 25.000 em contas vencidas. Cobranças aumentariam fluxo em R$ 2.500/semana.', 
        impact: { value: 2500, unit: 'weekly' }, 
        effort: 'low', 
        priority: 'medium', 
        estimatedImpact: 'Acelerar recebimentos em 2 semanas' 
      }
    ],

    calculateActionImpact: (action: any): ActionImpact => ({ 
      financialImpact: 15000, 
      cashFlowImpact: 1250, 
      timeToImplement: '1-2 semanas', 
      riskLevel: 'low' 
    })
  }), [data]);
};
