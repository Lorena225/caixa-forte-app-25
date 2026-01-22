import { useMemo } from 'react';

interface FinancialData {
  indices?: {
    liquidity?: { corrente?: number };
    solvency?: { endividamento?: number };
    profitability?: { marginLiquida?: number };
  };
  passivoVariation?: { percentVariation?: number };
  caixaLevel?: number;
  diasAtrasados?: number;
}

interface Insight {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  icon: string;
  action?: { label: string; target: string };
}

interface MetricStatus {
  value: number;
  status: 'normal' | 'warning' | 'critical';
  threshold: number;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  suggestedActions: string[];
  dueDate: string;
}

export const useRealTimeInsights = (financialData: FinancialData | null) => {
  return useMemo(() => ({
    generateInsights: (): Insight[] => {
      const insights: Insight[] = [];
      
      if (financialData?.indices?.liquidity?.corrente && financialData.indices.liquidity.corrente > 1.2) {
        insights.push({ 
          id: 'insight_001', 
          title: 'Balanço equilibrado com boa liquidez', 
          description: `Seu índice de liquidez corrente está em ${(financialData.indices.liquidity.corrente).toFixed(2)}x, indicando saúde financeira.`, 
          severity: 'info', 
          icon: 'TrendingUp' 
        });
      }
      
      if (financialData?.passivoVariation?.percentVariation && financialData.passivoVariation.percentVariation > 20) {
        insights.push({ 
          id: 'insight_002', 
          title: `Passivo Circulante aumentou ${Math.round(financialData.passivoVariation.percentVariation)}%`, 
          description: 'Crescimento acelerado de contas a pagar detectado.', 
          severity: 'warning', 
          icon: 'AlertCircle', 
          action: { label: 'Ver detalhes', target: '/controladoria-balanco' } 
        });
      }
      
      if (financialData?.caixaLevel !== undefined && financialData.caixaLevel < 250000) {
        insights.push({ 
          id: 'insight_003', 
          title: '⚠️ Caixa em nível crítico', 
          description: 'Recomendação: Aumentar reservas de caixa nos próximos 30 dias.', 
          severity: 'critical', 
          icon: 'AlertTriangle', 
          action: { label: 'Planejar', target: '/dashboard' } 
        });
      }
      
      if (financialData?.indices?.solvency?.endividamento && financialData.indices.solvency.endividamento > 0.6) {
        insights.push({ 
          id: 'insight_004', 
          title: 'Endividamento em nível elevado', 
          description: 'Seu índice de endividamento atingiu 65%. Considere reduzir passivo.', 
          severity: 'warning', 
          icon: 'TrendingDown' 
        });
      }
      
      if (financialData?.indices?.profitability?.marginLiquida && financialData.indices.profitability.marginLiquida > 0.15) {
        insights.push({ 
          id: 'insight_005', 
          title: '✨ Margem líquida excelente', 
          description: 'Sua margem líquida de 18% está acima da média de mercado (12%).', 
          severity: 'info', 
          icon: 'Award' 
        });
      }
      
      return insights;
    },

    monitorCriticalMetrics: (): Record<string, MetricStatus> => ({ 
      cashLevel: { 
        value: financialData?.caixaLevel || 0, 
        status: (financialData?.caixaLevel ?? 0) < 250000 ? 'critical' : 'normal', 
        threshold: 500000 
      }, 
      debtRatio: { 
        value: financialData?.indices?.solvency?.endividamento || 0, 
        status: (financialData?.indices?.solvency?.endividamento || 0) > 0.6 ? 'warning' : 'normal', 
        threshold: 0.6 
      }, 
      receivableDaysOverdue: { 
        value: financialData?.diasAtrasados || 0, 
        status: (financialData?.diasAtrasados ?? 0) > 30 ? 'warning' : 'normal', 
        threshold: 30 
      } 
    }),

    generateAlerts: (): Alert[] => {
      const alerts: Alert[] = [];
      
      if ((financialData?.caixaLevel ?? 0) < 250000) {
        alerts.push({ 
          id: 'alert_001', 
          type: 'cash_critical', 
          message: 'Caixa abaixo do limite de segurança', 
          priority: 'high', 
          suggestedActions: ['Acelerar recebimentos', 'Renegociar prazos'], 
          dueDate: '2026-02-15' 
        });
      }
      
      if ((financialData?.indices?.solvency?.endividamento || 0) > 0.65) {
        alerts.push({ 
          id: 'alert_002', 
          type: 'high_debt', 
          message: 'Endividamento em nível crítico', 
          priority: 'high', 
          suggestedActions: ['Reduzir passivo circulante', 'Refinanciar dívidas'], 
          dueDate: '2026-02-28' 
        });
      }
      
      return alerts;
    }
  }), [financialData]);
};
