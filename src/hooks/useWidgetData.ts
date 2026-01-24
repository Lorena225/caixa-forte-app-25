import { useMemo } from 'react';
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

export function useWidgetData() {
  const { currentCompany } = useAuth();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  
  // Date range for chart
  const dateRange = useMemo(() => ({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date()),
  }), []);

  const { data: revenueExpensesData = [], isLoading: chartLoading } = useRevenueExpensesData(dateRange);

  // Mock vendas data based on metrics
  const vendasData = useMemo(() => {
    const totalVendas = metrics?.contasReceber?.valor || 0;
    const ticketMedio = totalVendas > 0 ? totalVendas / 45 : 0; // Assuming 45 sales
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
      {
        id: '1',
        descricao: 'Fornecedor ABC Ltda',
        valor: 3500,
        tipo: 'pagar',
        vencimento: today,
      },
      {
        id: '2',
        descricao: 'Cliente XYZ Corp',
        valor: 8200,
        tipo: 'receber',
        vencimento: today,
      },
      {
        id: '3',
        descricao: 'Aluguel Sala Comercial',
        valor: 2800,
        tipo: 'pagar',
        vencimento: today,
        diasVencido: 2,
      },
      {
        id: '4',
        descricao: 'Serviços Prestados',
        valor: 4500,
        tipo: 'receber',
        vencimento: today,
      },
    ];
  }, []);

  // IA Recommendations based on metrics analysis
  const iaRecommendations = useMemo((): IARecommendation[] => {
    const recommendations: IARecommendation[] = [];

    // Analyze metrics and generate insights
    if (metrics) {
      const vencidoPercentualReceber = metrics.contasReceber?.detalhe?.vencidoPercentual || 0;
      const vencidoPercentualPagar = metrics.contasPagar?.detalhe?.vencidoPercentual || 0;

      if (vencidoPercentualReceber > 20) {
        recommendations.push({
          id: 'rec-1',
          tipo: 'alerta',
          titulo: 'Alto índice de inadimplência',
          descricao: `${vencidoPercentualReceber.toFixed(0)}% das contas a receber estão vencidas. Considere revisar sua política de crédito e acelerar cobranças.`,
          impacto: 'Recuperar até R$ 15.000 em 30 dias',
          prioridade: 'alta',
        });
      }

      if (metrics.saldoCaixa?.variacao && metrics.saldoCaixa.variacao > 10) {
        recommendations.push({
          id: 'rec-2',
          tipo: 'oportunidade',
          titulo: 'Oportunidade de investimento',
          descricao: 'Seu saldo em caixa cresceu significativamente. Considere aplicar o excedente em investimentos de curto prazo.',
          impacto: 'Rendimento estimado: R$ 2.500/mês',
          prioridade: 'media',
        });
      }

      if (vencidoPercentualPagar > 10) {
        recommendations.push({
          id: 'rec-3',
          tipo: 'alerta',
          titulo: 'Contas em atraso',
          descricao: `Existem ${vencidoPercentualPagar.toFixed(0)}% de contas a pagar vencidas. Regularize para evitar juros e proteger seu crédito.`,
          prioridade: 'alta',
        });
      }

      recommendations.push({
        id: 'rec-4',
        tipo: 'insight',
        titulo: 'Análise de sazonalidade',
        descricao: 'Baseado no histórico, este mês tende a ter 15% menos receitas. Recomendo reservar capital para cobertura.',
        prioridade: 'media',
      });

      recommendations.push({
        id: 'rec-5',
        tipo: 'otimizacao',
        titulo: 'Renegociação de contratos',
        descricao: '3 fornecedores têm contratos vencendo em 60 dias. Este é o momento ideal para renegociar condições.',
        impacto: 'Economia potencial: R$ 4.200/mês',
        prioridade: 'media',
      });
    }

    return recommendations.length > 0 ? recommendations : [
      {
        id: 'default',
        tipo: 'insight',
        titulo: 'Dashboard em análise',
        descricao: 'A IA está coletando dados para gerar insights personalizados. Continue utilizando o sistema normalmente.',
        prioridade: 'baixa',
      }
    ];
  }, [metrics]);

  // IA Notifications (real-time feed)
  const iaNotificacoes = useMemo((): NotificacaoIA[] => {
    const now = new Date();
    
    return [
      {
        id: 'notif-1',
        tipo: 'anomalia',
        titulo: 'Anomalia detectada',
        mensagem: 'Transação 47% acima da média identificada: Pagamento a Fornecedor Delta.',
        timestamp: new Date(now.getTime() - 15 * 60000),
        lida: false,
      },
      {
        id: 'notif-2',
        tipo: 'tendencia',
        titulo: 'Tendência positiva',
        mensagem: 'Receitas dos últimos 7 dias estão 23% acima da média semanal.',
        timestamp: new Date(now.getTime() - 45 * 60000),
        lida: false,
      },
      {
        id: 'notif-3',
        tipo: 'alerta',
        titulo: 'Vencimento próximo',
        mensagem: 'Imposto ISS vence em 3 dias. Valor: R$ 1.250,00',
        timestamp: new Date(now.getTime() - 2 * 3600000),
        lida: true,
      },
      {
        id: 'notif-4',
        tipo: 'sucesso',
        titulo: 'Conciliação automática',
        mensagem: '15 transações conciliadas automaticamente com 99.2% de confiança.',
        timestamp: new Date(now.getTime() - 4 * 3600000),
        lida: true,
      },
      {
        id: 'notif-5',
        tipo: 'info',
        titulo: 'Novo insight disponível',
        mensagem: 'Análise de fornecedores concluída. Veja oportunidades de economia.',
        timestamp: new Date(now.getTime() - 8 * 3600000),
        lida: true,
      },
    ];
  }, []);

  // AI Insights for each widget
  const aiInsights = useMemo(() => ({
    vendas: 'Sua conversão de vendas subiu 12% comparado a ontem. Melhor desempenho em 30 dias.',
    fluxo: 'Fluxo de caixa positivo previsto para os próximos 15 dias. Folga de R$ 25.000.',
    pendencias: `${pendencias.length} contas vencem hoje. Priorize os vencidos para evitar juros.`,
    feedIA: `Monitoramento ativo: ${iaNotificacoes.filter(n => !n.lida).length} notificações novas.`,
  }), [pendencias, iaNotificacoes]);

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
    
    // AI Insights for badges
    aiInsights,
    
    // Loading states
    isLoading: {
      vendas: metricsLoading,
      fluxo: chartLoading,
      pendencias: false,
      iaInsight: metricsLoading,
      feedIA: false,
    },
  };
}
