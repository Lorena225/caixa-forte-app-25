import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar, useFilters } from '@/components/dashboard/FilterBar';
import { KPICard, KPIGrid } from '@/components/dashboard/KPICard';
import { AgingChart } from '@/components/dashboard/AgingChart';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import {
  useExecutiveKPIs,
  useARAgingSummary,
  useAPAgingSummary,
  useCashFlowProjection,
  useBudgetVsActual,
} from '@/hooks/useDashboardData';
import { useCashflowMonthly } from '@/hooks/useCompanyData';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  FileDown,
  BarChart3,
} from 'lucide-react';

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useFilters();
  const currentYear = new Date().getFullYear();

  const { data: kpis, isLoading: kpisLoading } = useExecutiveKPIs(filters);
  const { data: arAging = [], isLoading: arLoading } = useARAgingSummary();
  const { data: apAging = [], isLoading: apLoading } = useAPAgingSummary();
  const { data: cashflowMonthly = [] } = useCashflowMonthly(currentYear);
  const { data: projection = [] } = useCashFlowProjection();
  const { data: budgetData = [] } = useBudgetVsActual(currentYear);

  const handleDrilldown = (source: string, params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    searchParams.set('source', source);
    navigate(`/reports/drilldown?${searchParams.toString()}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Dashboard Executivo"
          description="Visão geral financeira em tempo real"
        >
          <Button variant="outline" size="sm" className="gap-2">
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </Button>
        </PageHeader>

        <FilterBar filters={filters} onFiltersChange={setFilters} />

        {/* Main KPIs */}
        <KPIGrid columns={5}>
          <KPICard
            title="Saldo em Caixa"
            value={formatCurrency(kpis?.cashBalance || 0)}
            icon={Wallet}
            variant="primary"
            isLoading={kpisLoading}
            onClick={() => handleDrilldown('cash_balance')}
          />
          <KPICard
            title="Receita do Período"
            value={formatCurrency(kpis?.revenue || 0)}
            icon={TrendingUp}
            variant="success"
            isLoading={kpisLoading}
            onClick={() => handleDrilldown('revenue', { direction: 'entrada' })}
          />
          <KPICard
            title="Despesas do Período"
            value={formatCurrency(kpis?.expenses || 0)}
            icon={TrendingDown}
            variant="danger"
            isLoading={kpisLoading}
            onClick={() => handleDrilldown('expenses', { direction: 'saida' })}
          />
          <KPICard
            title="Resultado"
            value={formatCurrency(kpis?.profit || 0)}
            change={kpis?.margin ? `${kpis.margin.toFixed(1)}% margem` : undefined}
            trend={(kpis?.profit || 0) >= 0 ? 'up' : 'down'}
            icon={Target}
            variant={(kpis?.profit || 0) >= 0 ? 'success' : 'danger'}
            isLoading={kpisLoading}
          />
          <KPICard
            title="Inadimplência"
            value={formatCurrency(kpis?.arOverdue || 0)}
            subtitle={kpis?.arOverduePercent ? `${kpis.arOverduePercent.toFixed(1)}% do AR` : undefined}
            icon={AlertTriangle}
            variant={kpis?.arOverdue ? 'warning' : 'default'}
            isLoading={kpisLoading}
            onClick={() => handleDrilldown('ar_overdue', { status: 'overdue' })}
          />
        </KPIGrid>

        {/* Secondary KPIs */}
        <KPIGrid columns={4}>
          <KPICard
            title="A Receber"
            value={formatCurrency(kpis?.arTotal || 0)}
            icon={ArrowDownCircle}
            variant="success"
            isLoading={kpisLoading}
            onClick={() => navigate('/ar')}
          />
          <KPICard
            title="A Pagar"
            value={formatCurrency(kpis?.apTotal || 0)}
            icon={ArrowUpCircle}
            variant="danger"
            isLoading={kpisLoading}
            onClick={() => navigate('/ap')}
          />
          <KPICard
            title="AP Próx. 7 dias"
            value={formatCurrency(kpis?.apNext7Days || 0)}
            icon={ArrowUpCircle}
            isLoading={kpisLoading}
          />
          <KPICard
            title="Orçado x Real"
            value={budgetData.length > 0 ? 
              `${((budgetData.reduce((s, b) => s + Number(b.actual_revenue || 0), 0) / 
                  Math.max(budgetData.reduce((s, b) => s + Number(b.target_revenue || 0), 0), 1)) * 100).toFixed(0)}%` 
              : '—'}
            subtitle="execução receita"
            icon={BarChart3}
            isLoading={kpisLoading}
            onClick={() => navigate('/dashboards/budget')}
          />
        </KPIGrid>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <CashFlowChart
            data={cashflowMonthly}
            title="Fluxo de Caixa Mensal"
            type="bar"
          />
          <CashFlowChart
            data={projection}
            title="Projeção 13 Semanas"
            type="area"
          />
        </div>

        {/* Aging Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AgingChart
            data={arAging}
            title="Aging Contas a Receber"
            type="ar"
            isLoading={arLoading}
            onBucketClick={(bucket) => handleDrilldown('ar_aging', { bucket })}
          />
          <AgingChart
            data={apAging}
            title="Aging Contas a Pagar"
            type="ap"
            isLoading={apLoading}
            onBucketClick={(bucket) => handleDrilldown('ap_aging', { bucket })}
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Relatórios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/fluxo-caixa')}>
                Fluxo de Caixa
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/dre')}>
                DRE
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/contabilidade/balancete')}>
                Balancete
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/contas-receber')}>
                Contas a Receber
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/contas-pagar')}>
                Contas a Pagar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
