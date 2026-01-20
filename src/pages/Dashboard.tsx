import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { KPICard, KPIGrid } from '@/components/dashboard/KPICard';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { CashFlowProjection } from '@/components/dashboard/CashFlowProjection';
import { DashboardSkeleton } from '@/components/common/DashboardSkeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useDashboardAlerts } from '@/hooks/useDashboardAlerts';
import { useDashboardFluxo } from '@/hooks/useDashboardFluxo';
import { useBudgetVsActual } from '@/hooks/useDashboardData';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  FileText,
  BarChart3,
  Settings,
  RefreshCw,
  Clock,
  Download,
  Calendar,
  Building2,
  AlertTriangle,
  PieChart,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  PieChart as RechartsPie,
  Pie,
  Legend,
} from 'recharts';

type PeriodType = 'month' | 'quarter' | 'year';

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
  }
}

// Expense distribution mock data (would come from API)
const useExpenseDistribution = () => {
  return {
    data: [
      { name: 'Pessoal', value: 35, color: 'hsl(var(--chart-1))' },
      { name: 'Operacional', value: 25, color: 'hsl(var(--chart-2))' },
      { name: 'Impostos', value: 18, color: 'hsl(var(--chart-3))' },
      { name: 'Financeiro', value: 12, color: 'hsl(var(--chart-4))' },
      { name: 'Outros', value: 10, color: 'hsl(var(--chart-5))' },
    ],
    isLoading: false,
  };
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, currentCompany, companies } = useAuth();
  
  // Period state with localStorage persistence
  const [periodType, setPeriodType] = useState<PeriodType>(() => {
    const saved = localStorage.getItem(PERIOD_STORAGE_KEY);
    return (saved as PeriodType) || 'month';
  });
  
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

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
    error: metricsError,
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

  const { data: expenseData, isLoading: expenseLoading } = useExpenseDistribution();

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

  // Chart config
  const budgetChartConfig = {
    orcado: { label: 'Orçado', color: 'hsl(var(--muted-foreground))' },
    realizado: { label: 'Realizado', color: 'hsl(var(--primary))' },
  };

  // User display name
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Bem-vindo, {userName}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {currentCompany?.name || 'Dashboard Financeiro'} • {periodConfig.label}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
              <SelectTrigger className="w-[140px]" aria-label="Selecionar período">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
              </SelectContent>
            </Select>

            {/* Company Selector (if multi-tenant) */}
            {companies && companies.length > 1 && (
              <Select value={currentCompany?.id} disabled>
                <SelectTrigger className="w-[180px]" aria-label="Selecionar empresa">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Auto-refresh toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                aria-label="Auto-refresh"
              />
              <Label htmlFor="auto-refresh" className="text-xs text-muted-foreground">
                Auto
              </Label>
            </div>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={metricsLoading}
              aria-label="Atualizar dados"
            >
              <RefreshCw className={`h-4 w-4 ${metricsLoading ? 'animate-spin' : ''}`} />
            </Button>

            {/* Last update time */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{format(lastRefresh, 'HH:mm', { locale: ptBR })}</span>
            </div>

            {/* Export button */}
            <Button variant="outline" size="sm" aria-label="Exportar dashboard">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Loading skeleton */}
        {isInitialLoading ? (
          <DashboardSkeleton kpiCount={4} showCharts showTable={false} />
        ) : (
          <>
            {/* Budget Overflow Alert */}
            {budgetOverflow && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive animate-scale-in">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Execução orçamentária acima de 120%</p>
                  <p className="text-sm opacity-80">
                    O orçamento atual está em {metrics?.execucaoOrcamento?.detalhe?.percentual?.toFixed(0)}% de execução. Revise os gastos.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={() => navigate('/paineis/orcamento')}>
                  Ver Orçamento
                </Button>
              </div>
            )}

            {/* KPIs Section */}
            <section aria-label="Indicadores principais">
              <KPIGrid columns={4}>
                <KPICard
                  title="Saldo em Caixa"
                  value={formatCurrency(metrics?.saldoCaixa?.valor || 0)}
                  icon={Wallet}
                  variant="primary"
                  isLoading={metricsLoading}
                  onClick={() => navigate('/tesouraria/posicao')}
                />
                <KPICard
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
                />
                <KPICard
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

            {/* Charts Section with Tabs */}
            <section aria-label="Gráficos">
              <Tabs defaultValue="fluxo" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 max-w-md">
                  <TabsTrigger value="fluxo" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="hidden sm:inline">Fluxo 30d</span>
                  </TabsTrigger>
                  <TabsTrigger value="orcamento" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Orçado x Real</span>
                  </TabsTrigger>
                  <TabsTrigger value="despesas" className="gap-2">
                    <PieChart className="h-4 w-4" />
                    <span className="hidden sm:inline">Despesas</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="fluxo" className="mt-4 animate-fade-in">
                  <CashFlowProjection
                    data={fluxoProjetado}
                    isLoading={fluxoLoading}
                    title="Projeção de Fluxo de Caixa"
                    showBars
                  />
                </TabsContent>

                <TabsContent value="orcamento" className="mt-4 animate-fade-in">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Orçado vs Realizado</CardTitle>
                      <CardDescription>Últimos 6 meses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {budgetLoading ? (
                        <Skeleton className="h-[250px] w-full" />
                      ) : budgetChartData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[250px] text-center">
                          <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                          <p className="text-sm text-muted-foreground">Nenhum dado orçamentário disponível</p>
                          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/financeiro/orcamento-real')}>
                            Configurar Orçamento
                          </Button>
                        </div>
                      ) : (
                        <ChartContainer config={budgetChartConfig} className="h-[250px] w-full">
                          <BarChart data={budgetChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis 
                              tick={{ fontSize: 10 }} 
                              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                              tickLine={false}
                              axisLine={false}
                            />
                            <ChartTooltip
                              content={
                                <ChartTooltipContent 
                                  formatter={(value, name) => [
                                    formatCurrency(Number(value)), 
                                    budgetChartConfig[name as keyof typeof budgetChartConfig]?.label || name
                                  ]}
                                />
                              }
                            />
                            <Bar dataKey="orcado" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} />
                            <Bar dataKey="realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ChartContainer>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="despesas" className="mt-4 animate-fade-in">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Distribuição de Despesas</CardTitle>
                      <CardDescription>Por categoria</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {expenseLoading ? (
                        <Skeleton className="h-[250px] w-full" />
                      ) : (
                        <ChartContainer config={{}} className="h-[250px] w-full">
                          <RechartsPie>
                            <Pie
                              data={expenseData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={2}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {expenseData?.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Legend verticalAlign="bottom" height={36} />
                          </RechartsPie>
                        </ChartContainer>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>

            {/* Alerts Section */}
            <section aria-label="Alertas">
              <AlertsPanel
                alerts={alerts}
                isLoading={alertsLoading}
                maxVisible={5}
              />
            </section>

            {/* Quick Actions Section */}
            <section aria-label="Ações rápidas">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Button
                      variant="outline"
                      className="h-auto flex-col gap-2 p-4 hover:bg-primary/5 hover:border-primary/30 transition-all"
                      onClick={() => navigate('/lancamentos')}
                    >
                      <Plus className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium">Lançar Conta</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto flex-col gap-2 p-4 hover:bg-primary/5 hover:border-primary/30 transition-all"
                      onClick={() => navigate('/financeiro/orcamento-real')}
                    >
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium">Novo Orçamento</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto flex-col gap-2 p-4 hover:bg-primary/5 hover:border-primary/30 transition-all"
                      onClick={() => navigate('/paineis/executivo')}
                    >
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium">Relatório Completo</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto flex-col gap-2 p-4 hover:bg-muted/50 transition-all"
                      onClick={() => navigate('/admin')}
                    >
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs font-medium">Configurações</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Empty State */}
            {!hasData && !metricsLoading && (
              <Card className="border-dashed animate-fade-in">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-primary/10 p-4 mb-4">
                    <BarChart3 className="h-8 w-8 text-primary" />
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
