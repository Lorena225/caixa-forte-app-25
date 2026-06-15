import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { format, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { CashFlowProjection } from '@/components/dashboard/CashFlowProjection';
import { DashboardSkeleton } from '@/components/common/DashboardSkeleton';
import { RevenueExpensesAreaChart } from '@/components/dashboard/RevenueExpensesAreaChart';
import { RevenueExpensesPanel } from '@/components/dashboard/RevenueExpensesPanel';
import { ExpensesByCategoryChart } from '@/components/dashboard/ExpensesByCategoryChart';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { ReportExportDialog } from '@/components/dashboard/ReportExportDialog';
import { CFOVirtualHero } from '@/components/dashboard/CFOVirtualHero';
import { PulseKPIs } from '@/components/dashboard/PulseKPIs';
import { DecisionsSummary } from '@/components/dashboard/DecisionsSummary';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { useOnboardingStatus } from '@/hooks/useFinanceModule';
import { BentoGrid, BentoCard } from '@/components/dashboard/BentoGrid';
import { ModernKPICard } from '@/components/dashboard/ModernKPICard';
import { FloatingQuickActions } from '@/components/dashboard/FloatingQuickActions';
import { WidgetCustomizationDrawer } from '@/components/dashboard/WidgetCustomizationDrawer';
import { ViewModeSelector } from '@/components/dashboard/ViewModeSelector';
import { 
  WidgetFluxo, WidgetPendencias, WidgetIAInsight, WidgetFeedIA,
  WidgetSimulacao, WidgetAgingCobranca, WidgetComplianceFiscal,
} from '@/components/dashboard/widgets';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useDashboardAlerts } from '@/hooks/useDashboardAlerts';
import { useDashboardFluxo } from '@/hooks/useDashboardFluxo';
import { useBudgetVsActual } from '@/hooks/useDashboardData';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import { useModularWidgets } from '@/hooks/useModularWidgets';
import { useWidgetData } from '@/hooks/useWidgetData';
import { useViewMode } from '@/hooks/useViewMode';
import { useFinancialHealthMetrics } from '@/hooks/useFinancialHealthMetrics';
import { useRealtimeTransactions, useSupabaseConnectionStatus } from '@/hooks/useRealtimeTransactions';
import { useRevenueExpensesData, useExpensesByCategory, useRecentTransactions } from '@/hooks/useAnalyticsData';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import {
  Wallet, Target, ArrowDownCircle, ArrowUpCircle, BarChart3,
  AlertTriangle, FileDown, TrendingUp, PieChart, Activity, Settings,
  Users, UserCheck, Clock, Banknote,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface PeriodConfig {
  label: string;
  start: Date;
  end: Date;
}

const PERIOD_STORAGE_KEY = 'dashboard-preferred-period';
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

function getPeriodDates(type: PeriodType): PeriodConfig {
  const now = new Date();
  switch (type) {
    case 'today':
      return {
        label: format(now, "d 'de' MMMM yyyy", { locale: ptBR }),
        start: now,
        end: now,
      };
    case 'week':
      return {
        label: 'Esta Semana',
        start: startOfWeek(now, { locale: ptBR }),
        end: endOfWeek(now, { locale: ptBR }),
      };
    case 'month':
      return {
        label: format(now, 'MMMM yyyy', { locale: ptBR }),
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    case 'quarter':
      return {
        label: `${Math.ceil((now.getMonth() + 1) / 3)}º Trimestre ${now.getFullYear()}`,
        start: startOfQuarter(now),
        end: endOfQuarter(now),
      };
    case 'year':
      return {
        label: String(now.getFullYear()),
        start: startOfYear(now),
        end: endOfYear(now),
      };
    default:
      return {
        label: format(now, 'MMMM yyyy', { locale: ptBR }),
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
  }
}

export default function DashboardModern() {
  const navigate = useNavigate();
  const { user, currentCompany } = useAuth();
  
  // Period state with localStorage persistence
  const [periodType, setPeriodType] = useState<PeriodType>(() => {
    const saved = localStorage.getItem(PERIOD_STORAGE_KEY);
    return (saved as PeriodType) || 'month';
  });
  
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  
  // Date range filter state
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date()),
  }));

  // View Mode System
  const {
    viewMode,
    changeViewMode,
    isWidgetEnabled: isViewModeWidgetEnabled,
    getCFOMessage,
    customWidgets,
    updateCustomWidgets,
    isCustomMode,
  } = useViewMode();

  // Modular widgets system (for custom mode)
  const { 
    widgets: modularWidgets, 
    updateWidgets, 
    saveWidgets: saveModularWidgets, 
    resetToDefaults: resetModularWidgets,
  } = useModularWidgets();
  
  // Widget data
  const { 
    vendasData, fluxoData, pendencias, iaRecommendations, iaNotificacoes,
    simulacaoData, estoqueCritico, agingCobranca, rankingVendas, complianceFiscal,
    aiInsights, triggerRefresh, isLoading: widgetLoading,
  } = useWidgetData();

  // Use view mode widget visibility
  const isWidgetEnabled = isViewModeWidgetEnabled;

  // Widget removal handler (only works in custom mode)
  const handleRemoveWidget = useCallback((widgetKey: string) => {
    if (!isCustomMode) return;
    const updated = customWidgets.map(w => w.key === widgetKey ? { ...w, enabled: false } : w);
    updateCustomWidgets(updated);
  }, [isCustomMode, customWidgets, updateCustomWidgets]);


  // Memoized period dates
  const periodConfig = useMemo(() => getPeriodDates(periodType), [periodType]);

  // Save period preference
  useEffect(() => {
    localStorage.setItem(PERIOD_STORAGE_KEY, periodType);
  }, [periodType]);

  // Enable realtime sync and connection monitoring
  useRealtimeTransactions();
  useSupabaseConnectionStatus();

  // Data hooks
  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    refetch: refetchMetrics 
  } = useDashboardMetrics();
  
  const { 
    data: healthMetrics, 
    isLoading: healthLoading 
  } = useFinancialHealthMetrics();

  const { data: onboarding } = useOnboardingStatus();
  const onboardingComplete = onboarding
    ? Object.entries(onboarding).every(([k, v]) => k === 'firstProject' || v === true)
    : true;

  const { 
    data: alerts = [], 
    isLoading: alertsLoading,
    refetch: refetchAlerts 
  } = useDashboardAlerts(5);
  
  const { 
    data: fluxoProjetado = [], 
    isLoading: fluxoLoading,
    refetch: refetchFluxo 
  } = useDashboardFluxo(30);

  const currentYear = new Date().getFullYear();
  const { 
    data: budgetData = [], 
    isLoading: budgetLoading,
    refetch: refetchBudget 
  } = useBudgetVsActual(currentYear);
  
  // Analytics data hooks
  const { 
    data: revenueExpensesData = [], 
    isLoading: revenueExpensesLoading 
  } = useRevenueExpensesData(dateRange);
  
  const { 
    data: categoryData = [], 
    isLoading: categoryLoading 
  } = useExpensesByCategory(dateRange);
  
  const { 
    data: recentTransactions = [] 
  } = useRecentTransactions(10);

  // RH KPIs
  const { data: rhMetrics } = useQuery({
    queryKey: ['dashboard-rh-metrics', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const today = new Date().toISOString().split('T')[0];

      const [empRes, pontoRes, folhaRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, status')
          .eq('company_id', currentCompany.id)
          .in('status', ['ativo', 'experiencia']),
        supabase
          .from('time_daily_summary')
          .select('employee_id, worked_hours, bank_hours')
          .eq('company_id', currentCompany.id)
          .eq('work_date', today)
          .gt('worked_hours', 0),
        supabase
          .from('payroll_periods')
          .select('id, status, total_net')
          .eq('company_id', currentCompany.id)
          .in('status', ['preview', 'rascunho', 'calculando'])
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const totalAtivos = (empRes.data || []).length;
      const comPontoHoje = (pontoRes.data || []).length;
      const folhaPendente = (folhaRes.data || [])[0] ?? null;

      const bankRes = await supabase
        .from('time_daily_summary')
        .select('bank_hours')
        .eq('company_id', currentCompany.id)
        .gte('work_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);

      const totalBanco = (bankRes.data || []).reduce((s, r) => s + (r.bank_hours || 0), 0);

      return { totalAtivos, comPontoHoje, folhaPendente, totalBanco };
    },
    enabled: !!currentCompany?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Refresh all data
  const handleRefresh = useCallback(() => {
    refetchMetrics();
    refetchAlerts();
    refetchFluxo();
    refetchBudget();
    setLastRefresh(new Date());
  }, [refetchMetrics, refetchAlerts, refetchFluxo, refetchBudget]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(handleRefresh, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh, handleRefresh]);

  // Loading state
  const isInitialLoading = metricsLoading && !metrics;
  const hasData = metrics && (
    metrics.saldoCaixa.valor !== 0 || 
    metrics.contasReceber.valor !== 0 || 
    metrics.contasPagar.valor !== 0
  );

  // User display name
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

  // CFO message based on view mode
  const cfoModeMessage = useMemo(() => {
    return getCFOMessage(userName, {
      produtosCriticos: estoqueCritico.length,
      obrigacoesPendentes: complianceFiscal.filter(o => o.status !== 'entregue').length,
    });
  }, [getCFOMessage, userName, estoqueCritico, complianceFiscal]);

  // Calculate health status for CFO Hero
  const healthStatus = useMemo(() => {
    if (!healthMetrics) return 'good' as const;
    
    const taxaPoupanca = healthMetrics.totalReceitas > 0
      ? ((healthMetrics.totalReceitas - healthMetrics.totalDespesas) / healthMetrics.totalReceitas) * 100
      : 0;
    
    const percentualFixos = healthMetrics.totalReceitas > 0
      ? (healthMetrics.despesasFixas / healthMetrics.totalReceitas) * 100
      : 0;
    
    const projecaoFimMes = healthMetrics.saldoAtual - (healthMetrics.mediaGastosDiarios * healthMetrics.diasRestantesMes);
    
    if (taxaPoupanca < 0 || projecaoFimMes < 0) return 'risk' as const;
    if (taxaPoupanca < 10 || percentualFixos > 60) return 'attention' as const;
    if (taxaPoupanca < 20 || percentualFixos > 50) return 'good' as const;
    return 'excellent' as const;
  }, [healthMetrics]);

  const savingsRate = useMemo(() => {
    if (!healthMetrics || healthMetrics.totalReceitas === 0) return 0;
    return ((healthMetrics.totalReceitas - healthMetrics.totalDespesas) / healthMetrics.totalReceitas) * 100;
  }, [healthMetrics]);

  const projectedBalance = useMemo(() => {
    if (!healthMetrics) return 0;
    return healthMetrics.saldoAtual - (healthMetrics.mediaGastosDiarios * healthMetrics.diasRestantesMes);
  }, [healthMetrics]);

  // Prepare export data
  const exportReportData = useMemo(() => {
    const totalReceitas = revenueExpensesData.reduce((sum, d) => sum + d.receitas, 0);
    const totalDespesas = revenueExpensesData.reduce((sum, d) => sum + d.despesas, 0);

    return {
      companyName: currentCompany?.name || 'Empresa',
      saldoCaixa: metrics?.saldoCaixa?.valor || 0,
      contasReceber: metrics?.contasReceber?.valor || 0,
      contasPagar: metrics?.contasPagar?.valor || 0,
      totalReceitas,
      totalDespesas,
      transactions: recentTransactions.map(t => ({
        id: t.id,
        description: t.description || '',
        direction: t.direction as 'entrada' | 'saida',
        total_amount: Number(t.total_amount) || 0,
        transaction_date: t.transaction_date,
        status: t.status || '',
        category: t.category || null,
      })),
    };
  }, [currentCompany, metrics, revenueExpensesData, recentTransactions]);

  // Health diagnostic for export
  const healthDiagnosticExport = useMemo(() => {
    if (!healthMetrics) return null;
    return {
      status: healthStatus,
      savingsRate,
      fixedCostsPercentage: healthMetrics.totalReceitas > 0 
        ? (healthMetrics.despesasFixas / healthMetrics.totalReceitas) * 100 
        : 0,
      projectedEndBalance: projectedBalance,
    };
  }, [healthMetrics, healthStatus, savingsRate, projectedBalance]);

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
          {/* Dashboard Header */}
          <DashboardHeader
            userName={userName}
            companyName={currentCompany?.name}
            periodLabel={periodConfig.label}
            periodType={periodType}
            onPeriodChange={setPeriodType}
            autoRefresh={autoRefresh}
            onAutoRefreshChange={setAutoRefresh}
            onRefresh={handleRefresh}
            isRefreshing={metricsLoading}
            lastRefresh={lastRefresh}
          />

          {/* Loading skeleton */}
          {isInitialLoading ? (
            <DashboardSkeleton kpiCount={4} showCharts showTable={false} />
          ) : (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Onboarding: trilha de implantação enquanto incompleta */}
              {onboarding && !onboardingComplete && (
                <section aria-label="Implantação">
                  <OnboardingChecklist status={onboarding} />
                </section>
              )}

              {/* Pulso executivo: 4 KPIs reais + Caixa de Decisões */}
              <section aria-label="Pulso executivo" className="space-y-4">
                <PulseKPIs />
                <div className="grid gap-4 lg:grid-cols-2">
                  <DecisionsSummary />
                  <CFOVirtualHero
                    healthStatus={healthStatus}
                    savingsRate={savingsRate}
                    projectedBalance={projectedBalance}
                    onViewAnalysis={() => navigate('/financeiro/fluxo-projetado')}
                    isLoading={healthLoading}
                  />
                </div>
              </section>

              {/* View Mode Selector and Actions */}
              <motion.div 
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <ViewModeSelector currentMode={viewMode} onModeChange={changeViewMode} />
                  <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
                </div>
                <div className="flex items-center gap-3">
                  {isCustomMode && (
                    <Button onClick={() => setIsCustomizeOpen(true)} variant="outline" className="rounded-xl">
                      <Settings className="mr-2 h-4 w-4" />
                      Personalizar
                    </Button>
                  )}
                  <Button onClick={() => setIsExportDialogOpen(true)} variant="outline" className="rounded-xl">
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </motion.div>

              {/* View Mode CFO Message */}
              {cfoModeMessage && (
                <motion.div
                  key={viewMode}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent rounded-xl p-4 border border-violet-500/20"
                >
                  <p className="text-sm text-foreground">
                    <span className="font-semibold text-violet-600">💡 CFO Virtual:</span>{' '}
                    {cfoModeMessage}
                  </p>
                </motion.div>
              )}

              {/* Widgets Grid with Layout Transitions */}
              <LayoutGroup>
                <motion.section 
                  aria-label="Widgets do Dashboard"
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6"
                >
                  <AnimatePresence mode="popLayout">
                    {isWidgetEnabled('fluxo') && (
                      <motion.div key="fluxo" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
                        <WidgetFluxo data={fluxoData} isLoading={widgetLoading.fluxo} aiInsight={aiInsights.fluxo} />
                      </motion.div>
                    )}
                    {isWidgetEnabled('pendencias') && (
                      <motion.div key="pendencias" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
                        <WidgetPendencias pendencias={pendencias} isLoading={widgetLoading.pendencias} aiInsight={aiInsights.pendencias} />
                      </motion.div>
                    )}
                    {isWidgetEnabled('ia-insight') && (
                      <motion.div key="ia-insight" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
                        <WidgetIAInsight recommendations={iaRecommendations} isLoading={widgetLoading.iaInsight} />
                      </motion.div>
                    )}
                    {isWidgetEnabled('feed-ia') && (
                      <motion.div key="feed-ia" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
                        <WidgetFeedIA notificacoes={iaNotificacoes} isLoading={widgetLoading.feedIA} aiInsight={aiInsights.feedIA} />
                      </motion.div>
                    )}
                    {isWidgetEnabled('simulacao') && (
                      <motion.div key="simulacao" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
                        <WidgetSimulacao saldoAtual={simulacaoData.saldoAtual} receitaMensal={simulacaoData.receitaMensal} isLoading={widgetLoading.simulacao} aiInsight={aiInsights.simulacao} onRefresh={triggerRefresh} onViewDetails={() => navigate('/orcamento/projecoes')} onRemove={isCustomMode ? () => handleRemoveWidget('simulacao') : undefined} />
                      </motion.div>
                    )}
                    {isWidgetEnabled('aging-cobranca') && (
                      <motion.div key="aging-cobranca" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
                        <WidgetAgingCobranca data={agingCobranca} isLoading={widgetLoading.agingCobranca} aiInsight={aiInsights.agingCobranca} onRefresh={triggerRefresh} onViewDetails={() => navigate('/ar/aging')} onRemove={isCustomMode ? () => handleRemoveWidget('aging-cobranca') : undefined} />
                      </motion.div>
                    )}
                    {isWidgetEnabled('compliance-fiscal') && (
                      <motion.div key="compliance-fiscal" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
                        <WidgetComplianceFiscal obrigacoes={complianceFiscal} isLoading={widgetLoading.complianceFiscal} aiInsight={aiInsights.complianceFiscal} onRefresh={triggerRefresh} onViewDetails={() => navigate('/controladoria/compliance')} onRemove={isCustomMode ? () => handleRemoveWidget('compliance-fiscal') : undefined} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.section>
              </LayoutGroup>

              {/* KPI Cards - Bento Style */}
              <section aria-label="Indicadores principais">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
                  <ModernKPICard
                    title="Saldo em Caixa"
                    value={formatCurrency(metrics?.saldoCaixa?.valor || 0)}
                    icon={Wallet}
                    variant="primary"
                    trend={metrics?.saldoCaixa?.variacao ? (metrics.saldoCaixa.variacao > 0 ? 'up' : 'down') : undefined}
                    trendValue={metrics?.saldoCaixa?.variacao ? `${metrics.saldoCaixa.variacao > 0 ? '+' : ''}${metrics.saldoCaixa.variacao.toFixed(0)}%` : undefined}
                    isLoading={metricsLoading}
                    onClick={() => navigate('/tesouraria/posicao')}
                    delay={0}
                  />
                  <ModernKPICard
                    title="Contas a Receber"
                    value={formatCurrency(metrics?.contasReceber?.valor || 0)}
                    subtitle={metrics?.contasReceber?.detalhe 
                      ? `${metrics.contasReceber.detalhe.vencidoPercentual.toFixed(0)}% vencido`
                      : undefined
                    }
                    icon={ArrowDownCircle}
                    variant={metrics?.contasReceber?.detalhe?.vencidoPercentual > 20 ? 'warning' : 'success'}
                    isLoading={metricsLoading}
                    onClick={() => navigate('/ar')}
                    delay={0.1}
                  />
                  <ModernKPICard
                    title="Contas a Pagar"
                    value={formatCurrency(metrics?.contasPagar?.valor || 0)}
                    subtitle={metrics?.contasPagar?.detalhe 
                      ? `${metrics.contasPagar.detalhe.vencidoPercentual.toFixed(0)}% vencido`
                      : undefined
                    }
                    icon={ArrowUpCircle}
                    variant={metrics?.contasPagar?.detalhe?.vencidoPercentual > 10 ? 'danger' : 'default'}
                    isLoading={metricsLoading}
                    onClick={() => navigate('/ap')}
                    delay={0.2}
                  />
                  <ModernKPICard
                    title="Execução Orçamentária"
                    value={metrics?.execucaoOrcamento?.valorFormatado || '0%'}
                    subtitle={metrics?.execucaoOrcamento?.detalhe 
                      ? `${formatCurrency(metrics.execucaoOrcamento.detalhe.realizado)} / ${formatCurrency(metrics.execucaoOrcamento.detalhe.orcado)}`
                      : undefined
                    }
                    icon={Target}
                    variant={metrics?.execucaoOrcamento?.status === 'danger' ? 'danger' : 'default'}
                    isLoading={metricsLoading}
                    onClick={() => navigate('/paineis/orcamento')}
                    delay={0.3}
                  />
                </div>
              </section>

              {/* RH KPI Cards */}
              <section aria-label="Indicadores de RH">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recursos Humanos</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
                  <ModernKPICard
                    title="Colaboradores Ativos"
                    value={rhMetrics?.totalAtivos?.toString() ?? '—'}
                    subtitle="em situação ativo / experiência"
                    icon={Users}
                    variant="primary"
                    isLoading={!rhMetrics}
                    onClick={() => navigate('/hcm/colaboradores')}
                    delay={0}
                  />
                  <ModernKPICard
                    title="Ponto Hoje"
                    value={rhMetrics ? `${rhMetrics.comPontoHoje} / ${rhMetrics.totalAtivos}` : '—'}
                    subtitle="colaboradores com registro hoje"
                    icon={UserCheck}
                    variant={rhMetrics && rhMetrics.totalAtivos > 0 && rhMetrics.comPontoHoje / rhMetrics.totalAtivos < 0.5 ? 'warning' : 'success'}
                    isLoading={!rhMetrics}
                    onClick={() => navigate('/hcm/gestor-ponto')}
                    delay={0.1}
                  />
                  <ModernKPICard
                    title="Folha Pendente"
                    value={rhMetrics?.folhaPendente ? formatCurrency(rhMetrics.folhaPendente.total_net || 0) : 'Nenhuma'}
                    subtitle={rhMetrics?.folhaPendente ? `Status: ${rhMetrics.folhaPendente.status}` : 'sem folha aberta'}
                    icon={Banknote}
                    variant={rhMetrics?.folhaPendente ? 'warning' : 'default'}
                    isLoading={!rhMetrics}
                    onClick={() => navigate('/hcm/folha')}
                    delay={0.2}
                  />
                  <ModernKPICard
                    title="Banco de Horas"
                    value={rhMetrics ? `${rhMetrics.totalBanco >= 0 ? '+' : ''}${rhMetrics.totalBanco.toFixed(1)}h` : '—'}
                    subtitle="saldo acumulado no mês"
                    icon={Clock}
                    variant={rhMetrics && rhMetrics.totalBanco < -20 ? 'danger' : rhMetrics && rhMetrics.totalBanco > 40 ? 'warning' : 'default'}
                    isLoading={!rhMetrics}
                    onClick={() => navigate('/hcm/banco-horas')}
                    delay={0.3}
                  />
                </div>
              </section>

              {/* Bento Grid - Charts & Widgets */}
              <section aria-label="Analytics e Projeções">
                <BentoGrid>
                  {/* Receitas e Despesas — unificado (série + composição) */}
                  <BentoCard size="md" delay={0.4}>
                    <RevenueExpensesPanel
                      revenueData={revenueExpensesData}
                      revenueLoading={revenueExpensesLoading}
                      categoryData={categoryData}
                      categoryLoading={categoryLoading}
                    />
                  </BentoCard>

                  {/* Cash Flow Projection */}
                  <BentoCard size="md" delay={0.6}>
                    <div className="h-full flex flex-col">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                          <Activity className="w-4 h-4 text-emerald-500" />
                        </div>
                        <h3 className="font-semibold text-foreground">Projeção de Fluxo</h3>
                      </div>
                      <div className="flex-1">
                        <CashFlowProjection
                          data={fluxoProjetado}
                          isLoading={fluxoLoading}
                          title=""
                          showBars
                        />
                      </div>
                    </div>
                  </BentoCard>

                  {/* Alerts Panel */}
                  <BentoCard size="md" delay={0.7}>
                    <div className="h-full flex flex-col">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                        <h3 className="font-semibold text-foreground">Alertas & Notificações</h3>
                      </div>
                      <div className="flex-1 overflow-auto">
                        <AlertsPanel
                          alerts={alerts}
                          isLoading={alertsLoading}
                          maxVisible={5}
                        />
                      </div>
                    </div>
                  </BentoCard>
                </BentoGrid>
              </section>

              {/* Empty State */}
              {!hasData && !metricsLoading && (
                <Card className="border-dashed border-2 border-border/50 rounded-2xl">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-2xl bg-primary/10 p-4 mb-4">
                      <BarChart3 className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-lg mb-2 text-foreground">Configure seu sistema</CardTitle>
                    <CardDescription className="max-w-md mb-4 text-muted-foreground">
                      Cadastre suas contas bancárias, clientes e fornecedores para ver seus dados financeiros.
                    </CardDescription>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button onClick={() => navigate('/cadastros/contas-bancarias')} className="rounded-xl">
                        Cadastrar Contas
                      </Button>
                      <Button variant="outline" onClick={() => navigate('/cadastros/clientes-fornecedores')} className="rounded-xl">
                        Cadastrar Parceiros
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </div>

        {/* Floating Quick Actions Widget */}
        <FloatingQuickActions />

        {/* Report Export Dialog */}
        <ReportExportDialog
          open={isExportDialogOpen}
          onOpenChange={setIsExportDialogOpen}
          reportData={exportReportData}
          healthDiagnostic={healthDiagnosticExport}
        />

        {/* Widget Customization Drawer (only in custom mode) */}
        {isCustomMode && (
          <WidgetCustomizationDrawer
            open={isCustomizeOpen}
            onOpenChange={setIsCustomizeOpen}
            widgets={customWidgets}
            onWidgetsChange={updateCustomWidgets}
            onSave={() => {}}
            onReset={() => updateCustomWidgets(modularWidgets)}
          />
        )}
      </div>
    </MainLayout>
  );
}
