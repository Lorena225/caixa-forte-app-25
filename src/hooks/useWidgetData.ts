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

  // Mock pendencias based on real data patterns
  const pendencias = useMemo((): Pendencia[] => {
    const today = new Date().toLocaleDateString('pt-BR');
    
    return [
      { id: '1', descricao: 'Fornecedor ABC Ltda', valor: 3500, tipo: 'pagar', vencimento: today },
      { id: '2', descricao: 'Cliente XYZ Corp', valor: 8200, tipo: 'receber', vencimento: today },
      { id: '3', descricao: 'Aluguel Sala Comercial', valor: 2800, tipo: 'pagar', vencimento: today, diasVencido: 2 },
      { id: '4', descricao: 'Serviços Prestados', valor: 4500, tipo: 'receber', vencimento: today },
    ];
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
          impacto: 'Recuperar até R$ 15.000 em 30 dias',
          prioridade: 'alta',
        });
      }

      if (metrics.saldoCaixa?.variacao && metrics.saldoCaixa.variacao > 10) {
        recommendations.push({
          id: 'rec-2',
          tipo: 'oportunidade',
          titulo: 'Oportunidade de investimento',
          descricao: 'Seu saldo em caixa cresceu significativamente. Considere aplicar o excedente.',
          impacto: 'Rendimento estimado: R$ 2.500/mês',
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

      recommendations.push({
        id: 'rec-4',
        tipo: 'insight',
        titulo: 'Análise de sazonalidade',
        descricao: 'Baseado no histórico, este mês tende a ter 15% menos receitas.',
        prioridade: 'media',
      });

      recommendations.push({
        id: 'rec-5',
        tipo: 'otimizacao',
        titulo: 'Renegociação de contratos',
        descricao: '3 fornecedores têm contratos vencendo em 60 dias. Renegocie condições.',
        impacto: 'Economia potencial: R$ 4.200/mês',
        prioridade: 'media',
      });
    }

    return recommendations.length > 0 ? recommendations : [
      {
        id: 'default',
        tipo: 'insight',
        titulo: 'Dashboard em análise',
        descricao: 'A IA está coletando dados para gerar insights personalizados.',
        prioridade: 'baixa',
      }
    ];
  }, [metrics]);

  // IA Notifications (real-time feed)
  const iaNotificacoes = useMemo((): NotificacaoIA[] => {
    const now = new Date();
    
    return [
      { id: 'notif-1', tipo: 'anomalia', titulo: 'Anomalia detectada', mensagem: 'Transação 47% acima da média identificada.', timestamp: new Date(now.getTime() - 15 * 60000), lida: false },
      { id: 'notif-2', tipo: 'tendencia', titulo: 'Tendência positiva', mensagem: 'Receitas 23% acima da média semanal.', timestamp: new Date(now.getTime() - 45 * 60000), lida: false },
      { id: 'notif-3', tipo: 'alerta', titulo: 'Vencimento próximo', mensagem: 'Imposto ISS vence em 3 dias. Valor: R$ 1.250,00', timestamp: new Date(now.getTime() - 2 * 3600000), lida: true },
      { id: 'notif-4', tipo: 'sucesso', titulo: 'Conciliação automática', mensagem: '15 transações conciliadas com 99.2% de confiança.', timestamp: new Date(now.getTime() - 4 * 3600000), lida: true },
      { id: 'notif-5', tipo: 'info', titulo: 'Novo insight disponível', mensagem: 'Análise de fornecedores concluída.', timestamp: new Date(now.getTime() - 8 * 3600000), lida: true },
    ];
  }, []);

  // Simulação data
  const simulacaoData = useMemo(() => ({
    saldoAtual: metrics?.saldoCaixa?.valor || 125000,
    receitaMensal: vendasData.totalVendas || 85000,
  }), [metrics, vendasData]);

  // Estoque crítico data
  const estoqueCritico = useMemo((): ProdutoCritico[] => [
    { id: '1', nome: 'Papel A4 Resma', estoqueAtual: 15, estoqueMinimo: 50, unidade: 'un' },
    { id: '2', nome: 'Toner HP 85A', estoqueAtual: 2, estoqueMinimo: 10, unidade: 'un' },
    { id: '3', nome: 'Cabo USB-C', estoqueAtual: 8, estoqueMinimo: 25, unidade: 'un' },
    { id: '4', nome: 'Mouse Wireless', estoqueAtual: 3, estoqueMinimo: 15, unidade: 'un' },
  ], []);

  // Aging cobrança data
  const agingCobranca = useMemo((): AgingData[] => [
    { periodo: 'A vencer', valor: 45000, count: 12 },
    { periodo: '1-30 dias', valor: 28000, count: 8 },
    { periodo: '31-60 dias', valor: 15000, count: 5 },
    { periodo: '61-90 dias', valor: 8500, count: 3 },
    { periodo: '+90 dias', valor: 12000, count: 4 },
  ], []);

  // Ranking vendas data
  const rankingVendas = useMemo((): ProdutoRanking[] => [
    { id: '1', nome: 'Consultoria Estratégica', valorTotal: 85000, quantidadeVendida: 12, margemLucro: 65, variacao: 15 },
    { id: '2', nome: 'Licença Software Pro', valorTotal: 62000, quantidadeVendida: 45, margemLucro: 80, variacao: 8 },
    { id: '3', nome: 'Treinamento In-Company', valorTotal: 48000, quantidadeVendida: 8, margemLucro: 55, variacao: -5 },
    { id: '4', nome: 'Suporte Premium', valorTotal: 35000, quantidadeVendida: 120, margemLucro: 70, variacao: 22 },
    { id: '5', nome: 'Implementação ERP', valorTotal: 28000, quantidadeVendida: 3, margemLucro: 45, variacao: 10 },
  ], []);

  // Compliance fiscal data
  const complianceFiscal = useMemo((): ObrigacaoFiscal[] => [
    { id: '1', nome: 'SPED Fiscal', vencimento: '15/02/2025', status: 'entregue', tipo: 'Federal' },
    { id: '2', nome: 'ECD', vencimento: '28/02/2025', status: 'pendente', tipo: 'Federal' },
    { id: '3', nome: 'DCTFWeb', vencimento: '15/02/2025', status: 'entregue', tipo: 'Federal' },
    { id: '4', nome: 'GFIP', vencimento: '07/02/2025', status: 'atrasado', tipo: 'Federal' },
    { id: '5', nome: 'ISS Mensal', vencimento: '10/02/2025', status: 'entregue', tipo: 'Municipal' },
    { id: '6', nome: 'ECF', vencimento: '31/07/2025', status: 'pendente', tipo: 'Federal' },
  ], []);

  // AI Insights for each widget
  const aiInsights = useMemo(() => ({
    vendas: 'Sua conversão de vendas subiu 12% comparado a ontem. Melhor desempenho em 30 dias.',
    fluxo: 'Fluxo de caixa positivo previsto para os próximos 15 dias. Folga de R$ 25.000.',
    pendencias: `${pendencias.length} contas vencem hoje. Priorize os vencidos para evitar juros.`,
    feedIA: `Monitoramento ativo: ${iaNotificacoes.filter(n => !n.lida).length} notificações novas.`,
    simulacao: 'Uma queda de 20% nas vendas reduziria seu fluxo de caixa em R$ 17.000/mês.',
    estoqueCritico: `Você tem ${estoqueCritico.length} produtos com estoque crítico. Pedido urgente recomendado.`,
    agingCobranca: 'R$ 35.500 estão vencidos há mais de 30 dias. Priorize ações de cobrança.',
    rankingVendas: 'Consultoria Estratégica lidera com 65% de margem. Foque na expansão deste serviço.',
    complianceFiscal: 'GFIP está em atraso! Regularize para evitar multas de até 20%.',
  }), [pendencias, iaNotificacoes, estoqueCritico]);

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
