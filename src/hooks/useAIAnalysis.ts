import { useMemo } from 'react';

export const useAIAnalysis = (data: any[]) => {
  return useMemo(() => ({
    detectAnomalies: (threshold = 2) => {
      if (!data || data.length === 0) return { critical: [], warning: [], info: [] };
      const values = data.map(d => d.value || d.amount || 0);
      if (values.length === 0) return { critical: [], warning: [], info: [] };
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const anomalies = data.map((d, idx) => ({ 
        ...d, 
        zScore: stdDev > 0 ? Math.abs(((d.value || d.amount || 0) - mean) / stdDev) : 0, 
        idx 
      }));
      return { 
        critical: anomalies.filter(a => a.zScore > 3), 
        warning: anomalies.filter(a => a.zScore > 2 && a.zScore <= 3), 
        info: anomalies.filter(a => a.zScore > 1 && a.zScore <= 2) 
      };
    },

    calculateTrends: (periods = 12) => {
      if (!data || data.length < 2) return { 
        trend: 'estável', 
        slope: 0, 
        seasonality: 0, 
        nextPrediction: data?.[0]?.value || 0 
      };
      const values = data.slice(-periods).map(d => d.value || 0);
      const n = values.length;
      const indices = Array.from({ length: n }, (_, i) => i);
      const sumX = indices.reduce((a, b) => a + b, 0);
      const sumY = values.reduce((a, b) => a + b, 0);
      const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
      const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
      const denominator = n * sumX2 - sumX * sumX;
      const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
      const lastValue = values[values.length - 1];
      return { 
        trend: slope > 0.01 ? 'crescente' : slope < -0.01 ? 'decrescente' : 'estável', 
        slope, 
        seasonality: 0.2, 
        nextPrediction: Math.max(0, lastValue + slope) 
      };
    },

    calculateIndices: (
      ativo = 1500000, 
      passivoCirc = 330000, 
      passivoLC = 420000, 
      receitas = 500000, 
      custos = 200000, 
      despesas = 100000
    ) => {
      const ativoCirculante = ativo * 0.55;
      const patrimonioLiquido = ativo - passivoCirc - passivoLC;
      return { 
        liquidity: { 
          corrente: passivoCirc > 0 ? ativoCirculante / passivoCirc : 1, 
          immediata: passivoCirc > 0 ? (ativo * 0.25) / passivoCirc : 1, 
          geral: (ativo) / (passivoCirc + passivoLC) || 1 
        }, 
        solvency: { 
          endividamento: ativo > 0 ? (passivoCirc + passivoLC) / ativo : 0, 
          capitalStructure: passivoCirc + passivoLC > 0 ? (passivoCirc + passivoLC) / patrimonioLiquido : 0, 
          interestCoverage: despesas > 0 ? receitas / despesas : 8 
        }, 
        profitability: { 
          roe: patrimonioLiquido > 0 ? (receitas - custos - despesas) / patrimonioLiquido : 0, 
          roa: ativo > 0 ? (receitas - custos - despesas) / ativo : 0, 
          marginBruta: receitas > 0 ? (receitas - custos) / receitas : 0, 
          marginOperacional: receitas > 0 ? (receitas - custos - despesas * 0.8) / receitas : 0, 
          marginLiquida: receitas > 0 ? (receitas - custos - despesas) / receitas : 0 
        }, 
        efficiency: { 
          assetTurnover: ativo > 0 ? receitas / ativo : 0, 
          receivablesTurnover: receitas > 0 ? 365 / (receitas * 0.3) : 0, 
          payablesTurnover: custos > 0 ? 365 / custos : 0 
        } 
      };
    },

    compareWithPrevious: (current: number, previous: number) => {
      const absoluteVariation = current - previous;
      const percentVariation = previous !== 0 ? (absoluteVariation / previous) * 100 : 0;
      return { 
        absoluteVariation, 
        percentVariation, 
        trend: current > previous ? 'up' : current < previous ? 'down' : 'stable', 
        severity: Math.abs(percentVariation) > 20 ? 'warning' : 'normal' 
      };
    }
  }), [data]);
};
