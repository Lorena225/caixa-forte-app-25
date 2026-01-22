import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { KPICard, KPIGrid } from '@/components/dashboard/KPICard';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel';
import { RecentActionsPanel } from '@/components/dashboard/RecentActionsPanel';
import { BudgetVsActualChart } from '@/components/dashboard/BudgetVsActualChart';
import { CashFlowProjection } from '@/components/dashboard/CashFlowProjection';
import { CustomizableWidgetsSection } from '@/components/dashboard/CustomizableWidgetsSection';
import { EditModeToolbar } from '@/components/dashboard/EditModeToolbar';
import { DashboardSkeleton } from '@/components/common/DashboardSkeleton';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useDashboardAlerts } from '@/hooks/useDashboardAlerts';
import { useDashboardFluxo } from '@/hooks/useDashboardFluxo';
import { useBudgetVsActual } from '@/hooks/useDashboardData';
import { cn } from '@/lib/utils';
import {
  Wallet,
  Target,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  BarChart3,
  PieChart,
  AlertTriangle,
} from 'lucide-react';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, currentCompany } = useAuth();
  
  // Period state with localStorage persistence
  const [periodType, setPeriodType] = useState<PeriodType>(() => {
    const saved = localStorage.getItem(PERIOD_STORAGE_KEY);
    return (saved as PeriodType) || 'month';
  });
  
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isEditMode, setIsEditMode] = useState(false);

  // Memoized period dates
  const periodConfig = useMemo(() => getPeriodDates(periodType), [periodType]);

  // Save period preference
  useEffect(() => {
    localStorage.setItem(PERIOD_STORAGE_KEY, periodType);
  }, [periodType]);

  // Data hooks
  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    refetch: refetchMetrics 
  } = useDashboardMetrics();
  
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

  // Budget execution alert
  const budgetOverflow = metrics?.execucaoOrcamento?.detalhe?.percentual 
    ? metrics.execucaoOrcamento.detalhe.percentual > 120 
    : false;

  // Format budget data for chart
  const budgetChartData = useMemo(() => {
    return budgetData.slice(-6).map((item: any) => ({
      month: format(new Date(currentYear, (item.month || 1) - 1), 'MMM', { locale: ptBR }),
      orcado: Number(item.target_revenue || 0),
      realizado: Number(item.actual_revenue || 0),
    }));
  }, [budgetData, currentYear]);

  // User display name
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

  // Edit mode handlers
  const handleSaveEdits = () => {
    // Save dashboard configuration
    setIsEditMode(false);
  };

  const handleCancelEdits = () => {
    setIsEditMode(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Edit Mode Toolbar */}
        {isEditMode && (
          <EditModeToolbar
            onSave={handleSaveEdits}
            onCancel={handleCancelEdits}
          />
        )}

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
          onEditDashboard={() => setIsEditMode(true)}
          isRefreshing={metricsLoading}
          lastRefresh={lastRefresh}
        />

        {/* Loading skeleton */}
        {isInitialLoading ? (
          <DashboardSkeleton kpiCount={4} showCharts showTable={false} />
        ) : (
          <>
            {/* Budget Overflow Alert */}
            {budgetOverflow && (
              <div className={cn(
                'flex items-center gap-3 p-4 rounded-xl',
                'bg-red-50 border border-red-200 text-red-700',
                'animate-scale-in'
              )}>
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Execução orçamentária acima de 120%</p>
                  <p className="text-xs opacity-80 mt-0.5">
                    O orçamento atual está em {metrics?.execucaoOrcamento?.detalhe?.percentual?.toFixed(0)}% de execução. Revise os gastos.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="shrink-0 border-red-300 text-red-700 hover:bg-red-100" 
                  onClick={() => navigate('/paineis/orcamento')}
                >
                  Ver Orçamento
                </Button>
              </div>
            )}

            {/* Section 1: Critical KPIs */}
            <section aria-label="Indicadores principais">
              <KPIGrid columns={4}>
                <KPICard
                  title="Saldo em Caixa"
                  value={formatCurrency(metrics?.saldoCaixa?.valor || 0)}
                  icon={Wallet}
                  variant="primary"
                  isLoading={metricsLoading}
                  onClick={() => navigate('/tesouraria/posicao')}
                  change={metrics?.saldoCaixa?.variacao ? `${metrics.saldoCaixa.variacao > 0 ? '+' : ''}${metrics.saldoCaixa.variacao.toFixed(0)}%` : undefined}
                  trend={metrics?.saldoCaixa?.variacao ? (metrics.saldoCaixa.variacao > 0 ? 'up' : metrics.saldoCaixa.variacao < 0 ? 'down' : 'neutral') : undefined}
                />
                <KPICard
                  title="Contas a Receber"
                  value={formatCurrency(metrics?.contasReceber?.valor || 0)}
                  subtitle={metrics?.contasReceber?.detalhe 
                    ? `${metrics.contasReceber.detalhe.vencidoPercentual.toFixed(0)}% vencido`
                    : '0% vencido'
                  }
                  icon={ArrowDownCircle}
                  variant={metrics?.contasReceber?.detalhe?.vencidoPercentual > 20 ? 'warning' : 'success'}
                  isLoading={metricsLoading}
                  onClick={() => navigate('/ar')}
                />
                <KPICard
                  title="Contas a Pagar"
                  value={formatCurrency(metrics?.contasPagar?.valor || 0)}
                  subtitle={metrics?.contasPagar?.detalhe 
                    ? `${metrics.contasPagar.detalhe.vencidoPercentual.toFixed(0)}% vencido`
                    : '0% vencido'
                  }
                  icon={ArrowUpCircle}
                  variant={metrics?.contasPagar?.detalhe?.vencidoPercentual > 10 ? 'danger' : 'default'}
                  isLoading={metricsLoading}
                  onClick={() => navigate('/ap')}
                />
                <KPICard
                  title="Execução Orçamentária"
                  value={metrics?.execucaoOrcamento?.valorFormatado || '0%'}
                  subtitle={metrics?.execucaoOrcamento?.detalhe 
                    ? `${formatCurrency(metrics.execucaoOrcamento.detalhe.realizado)} / ${formatCurrency(metrics.execucaoOrcamento.detalhe.orcado)}`
                    : undefined
                  }
                  icon={Target}
                  variant={metrics?.execucaoOrcamento?.status || 'default'}
                  isLoading={metricsLoading}
                  onClick={() => navigate('/paineis/orcamento')}
                />
              </KPIGrid>
            </section>

            {/* Section 2: Main Charts */}
            <section aria-label="Gráficos" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Cash Flow Projection */}
              <CashFlowProjection
                data={fluxoProjetado}
                isLoading={fluxoLoading}
                title="Projeção de Fluxo de Caixa"
                showBars
              />

              {/* Budget vs Actual Chart */}
              <BudgetVsActualChart
                data={budgetChartData}
                isLoading={budgetLoading}
                onRefresh={refetchBudget}
                onConfigure={() => navigate('/financeiro/orcamento-real')}
              />
            </section>

            {/* Section 3: Quick Actions + Alerts + Recent Actions */}
            <section 
              aria-label="Ações e alertas" 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <QuickActionsPanel />
              <AlertsPanel
                alerts={alerts}
                isLoading={alertsLoading}
                maxVisible={5}
              />
              <RecentActionsPanel />
            </section>

            {/* Section 4: Customizable Widgets */}
            <CustomizableWidgetsSection
              isEditMode={isEditMode}
              onAddWidget={() => {/* Open widget modal */}}
              onRemoveWidget={(id) => console.log('Remove widget:', id)}
              onConfigureWidget={(id) => console.log('Configure widget:', id)}
              onRefreshWidget={(id) => console.log('Refresh widget:', id)}
            />

            {/* Empty State */}
            {!hasData && !metricsLoading && (
              <Card className="border-dashed animate-fade-in">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-blue-50 p-4 mb-4">
                    <BarChart3 className="h-8 w-8 text-[#0066CC]" />
                  </div>
                  <CardTitle className="text-xl mb-2">Configure seu sistema</CardTitle>
                  <CardDescription className="max-w-md mb-4">
                    Cadastre suas contas bancárias, clientes e fornecedores para começar a ver seus dados financeiros em tempo real.
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button onClick={() => navigate('/cadastros/contas-bancarias')}>
                      Cadastrar Contas
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/cadastros/clientes-fornecedores')}>
                      Cadastrar Parceiros
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
