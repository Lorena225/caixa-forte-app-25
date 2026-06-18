import { useMemo, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useRevenueExpensesData } from '@/hooks/useAnalyticsData';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface IARecommendation {
  id: string;
  tipo: 'otimizacao' | 'alerta' | 'oportunidade' | 'insight';
  titulo: string;
  descricao: string;
  impacto?: string;
  prioridade: 'alta' | 'media' | 'baixa';
}

interface Pendencia {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'pagar' | 'receber';
  vencimento: string;
  diasVencido?: number;
}

interface NotificacaoIA {
  id: string;
  tipo: 'anomalia' | 'alerta' | 'sucesso' | 'tendencia' | 'info';
  titulo: string;
  mensagem: string;
  timestamp: Date;
  lida?: boolean;
}

interface ProdutoCritico {
  id: string;
  nome: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  unidade: string;
}

interface AgingData {
  periodo: string;
  valor: number;
  count: number;
}

interface ProdutoRanking {
  id: string;
  nome: string;
  valorTotal: number;
  quantidadeVendida: number;
  margemLucro: number;
  variacao: number;
}

interface ObrigacaoFiscal {
  id: string;
  nome: string;
  vencimento: string;
  status: 'entregue' | 'pendente' | 'atrasado';
  tipo: string;
}

export function useWidgetData() {
  const { currentCompany } = useAuth();
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useDashboardMetrics();
  
  // Date range for chart
  const dateRange = useMemo(() => ({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date()),
  }), []);

  const { data: revenueExpensesData = [], isLoading: chartLoading, refetch: refetchChart } = useRevenueExpensesData(dateRange);

  // Refresh handlers
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    refetchMetrics();
    refetchChart();
  }, [refetchMetrics, refetchChart]);

  // Mock vendas data based on metrics
  const vendasData = useMemo(() => {
    const totalVendas = metrics?.contasReceber?.valor || 0;
    const ticketMedio = totalVendas > 0 ? totalVendas / 45 : 0;
    return {
      totalVendas,
      ticketMedio,
      variacaoVendas: metrics?.contasReceber?.variacao || 0,
      variacaoTicket: 8.5,
    };
  }, [metrics]);

  // Fluxo chart data
  const fluxoData = useMemo(() => {
    return revenueExpensesData.slice(-6).map(d => ({
      mes: d.month,
      receitas: d.receitas,
      despesas: d.despesas,
    }));
  }, [revenueExpensesData]);

  // Pendências — vazias até integração com títulos reais a vencer
  const pendencias = useMemo((): Pendencia[] => {
    return [];
  }, []);

  // IA Recommendations based on metrics analysis
  const iaRecommendations = useMemo((): IARecommendation[] => {
    const recommendations: IARecommendation[] = [];

    if (metrics) {
      const vencidoPercentualReceber = metrics.contasReceber?.detalhe?.vencidoPercentual || 0;
      const vencidoPercentualPagar = metrics.contasPagar?.detalhe?.vencidoPercentual || 0;

      if (vencidoPercentualReceber > 20) {
        recommendations.push({
          id: 'rec-1',
          tipo: 'alerta',
          titulo: 'Alto índice de inadimplência',
          descricao: `${vencidoPercentualReceber.toFixed(0)}% das contas a receber estão vencidas. Considere revisar sua política de crédito.`,
          prioridade: 'alta',
        });
      }

      if (metrics.saldoCaixa?.variacao && metrics.saldoCaixa.variacao > 10) {
        recommendations.push({
          id: 'rec-2',
          tipo: 'oportunidade',
          titulo: 'Saldo em caixa cresceu',
          descricao: 'Seu saldo em caixa cresceu no período. Considere aplicar o excedente.',
          prioridade: 'media',
        });
      }

      if (vencidoPercentualPagar > 10) {
        recommendations.push({
          id: 'rec-3',
          tipo: 'alerta',
          titulo: 'Contas em atraso',
          descricao: `Existem ${vencidoPercentualPagar.toFixed(0)}% de contas a pagar vencidas. Regularize para evitar juros.`,
          prioridade: 'alta',
        });
      }
    }

    return recommendations;
  }, [metrics]);

  // IA Notifications (real-time feed)
  const iaNotificacoes = useMemo((): NotificacaoIA[] => {
    // Feed de IA vazio até haver eventos reais — sem notificações fabricadas
    return [];
  }, []);

  // Simulação data — apenas dados reais, sem fallback fabricado
  const simulacaoData = useMemo(() => ({
    saldoAtual: metrics?.saldoCaixa?.valor ?? 0,
    receitaMensal: vendasData.totalVendas ?? 0,
  }), [metrics, vendasData]);

  // Dados operacionais — vazios até haver dados reais (sem fabricação)
  const estoqueCritico = useMemo((): ProdutoCritico[] => [], []);

  const agingCobranca = useMemo((): AgingData[] => [], []);

  // Ranking e compliance — vazios até haver dados reais
  const rankingVendas = useMemo((): ProdutoRanking[] => [], []);

  const complianceFiscal = useMemo((): ObrigacaoFiscal[] => [], []);

  // AI Insights — derivados de dados reais; vazios quando não há base
  // (evita a contradição "caixa zerado x IA afirmando folga de R$ 25.000")
  const aiInsights = useMemo(() => {
    const temPendencias = pendencias.length > 0;
    const temNotifNovas = iaNotificacoes.filter(n => !n.lida).length > 0;
    return {
      vendas: '',
      fluxo: '',
      pendencias: temPendencias
        ? `${pendencias.length} ${pendencias.length === 1 ? 'conta vence' : 'contas vencem'} hoje. Priorize os vencidos para evitar juros.`
        : '',
      feedIA: temNotifNovas
        ? `Monitoramento ativo: ${iaNotificacoes.filter(n => !n.lida).length} ${iaNotificacoes.filter(n => !n.lida).length === 1 ? 'notificação nova' : 'notificações novas'}.`
        : '',
      simulacao: '',
      estoqueCritico: '',
      agingCobranca: '',
      rankingVendas: '',
      complianceFiscal: '',
    };
  }, [pendencias, iaNotificacoes]);

  return {
    // Vendas Widget
    vendasData,
    
    // Fluxo Widget
    fluxoData,
    
    // Pendencias Widget
    pendencias,
    
    // IA Insight Widget
    iaRecommendations,
    
    // Feed IA Widget
    iaNotificacoes,

    // New widgets data
    simulacaoData,
    estoqueCritico,
    agingCobranca,
    rankingVendas,
    complianceFiscal,
    
    // AI Insights for badges
    aiInsights,

    // Refresh handler
    triggerRefresh,
    
    // Loading states
    isLoading: {
      vendas: metricsLoading,
      fluxo: chartLoading,
      pendencias: false,
      iaInsight: metricsLoading,
      feedIA: false,
      simulacao: metricsLoading,
      estoqueCritico: false,
      agingCobranca: false,
      rankingVendas: false,
      complianceFiscal: false,
    },
  };
}
