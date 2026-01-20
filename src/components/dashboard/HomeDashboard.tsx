import { useNavigate } from 'react-router-dom';
import { startOfMonth } from 'date-fns';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import OnboardingCards from '@/components/dashboard/OnboardingCards';
import { KPICard, KPIGrid } from '@/components/dashboard/KPICard';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { AgingChart } from '@/components/dashboard/AgingChart';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { CashFlowProjection } from '@/components/dashboard/CashFlowProjection';
import { DashboardFilters } from '@/components/dashboard/FilterBar';
import { formatCurrency } from '@/lib/formatters';
import { useExecutiveKPIs, useARAgingSummary, useAPAgingSummary } from '@/hooks/useDashboardData';
import { useCashflowMonthly } from '@/hooks/useCompanyData';
import { useDashboardAlerts } from '@/hooks/useDashboardAlerts';
import { useDashboardFluxo } from '@/hooks/useDashboardFluxo';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  FileText,
  Users,
  Package,
  BarChart3,
  Settings,
  RefreshCw,
} from 'lucide-react';

// Default filters for dashboard
const defaultFilters: DashboardFilters = {
  fromDate: startOfMonth(new Date()),
  toDate: new Date(),
  branchIds: [],
  costCenterIds: [],
  walletIds: [],
  customerIds: [],
  supplierIds: [],
  dimensionFilters: {},
  status: 'all',
  dateField: 'due_date',
};

export default function HomeDashboard() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const { data: kpis, isLoading: kpisLoading } = useExecutiveKPIs(defaultFilters);
  const { data: arAging = [], isLoading: arLoading } = useARAgingSummary();
  const { data: apAging = [], isLoading: apLoading } = useAPAgingSummary();
  const { data: cashflowMonthly = [] } = useCashflowMonthly(currentYear);
  const { data: alerts = [], isLoading: alertsLoading } = useDashboardAlerts(5);
  const { data: fluxoProjetado = [], isLoading: fluxoLoading } = useDashboardFluxo(30);

  // Check if user has completed onboarding (simplified check)
  const hasData = (kpis?.revenue ?? 0) > 0 || (kpis?.expenses ?? 0) > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Início"
        description="Bem-vindo ao Caixa Forte ERP"
      >
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            disabled={kpisLoading}
          >
            <RefreshCw className={`h-4 w-4 ${kpisLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </PageHeader>

      {/* Onboarding Cards - Always show for progress tracking */}
      <OnboardingCards />

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => navigate('/vendas/nova')}
            >
              <Plus className="h-5 w-5 text-primary" />
              <span className="text-xs">Nova Venda</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => navigate('/fiscal/nfe')}
            >
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-xs">Emitir NF-e</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => navigate('/cadastros/clientes-fornecedores')}
            >
              <Users className="h-5 w-5 text-primary" />
              <span className="text-xs">Clientes</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => navigate('/cadastros/produtos')}
            >
              <Package className="h-5 w-5 text-primary" />
              <span className="text-xs">Produtos</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => navigate('/paineis/executivo')}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-xs">Relatórios</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => navigate('/admin')}
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs">Configurar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main KPIs */}
      <KPIGrid columns={5}>
        <KPICard
          title="Saldo em Caixa"
          value={formatCurrency(kpis?.cashBalance || 0)}
          icon={Wallet}
          variant="primary"
          isLoading={kpisLoading}
          onClick={() => navigate('/tesouraria/posicao')}
        />
        <KPICard
          title="Receita do Mês"
          value={formatCurrency(kpis?.revenue || 0)}
          icon={TrendingUp}
          variant="success"
          isLoading={kpisLoading}
          onClick={() => navigate('/contas-receber')}
        />
        <KPICard
          title="Despesas do Mês"
          value={formatCurrency(kpis?.expenses || 0)}
          icon={TrendingDown}
          variant="danger"
          isLoading={kpisLoading}
          onClick={() => navigate('/contas-pagar')}
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
          onClick={() => navigate('/cobranca')}
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
          title="Fluxo de Caixa"
          value="Ver Projeção"
          icon={BarChart3}
          isLoading={kpisLoading}
          onClick={() => navigate('/paineis/fluxo-caixa')}
        />
      </KPIGrid>

      {/* Alerts + Projection Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <AlertsPanel 
          alerts={alerts} 
          isLoading={alertsLoading} 
          maxVisible={5}
          className="lg:col-span-1"
        />
        <CashFlowProjection 
          data={fluxoProjetado} 
          isLoading={fluxoLoading}
          title="Projeção 30 dias"
        />
      </div>

      {/* Charts Row */}
      {hasData && (
        <div className="grid gap-6 lg:grid-cols-2">
          <CashFlowChart
            data={cashflowMonthly}
            title="Fluxo de Caixa Mensal"
            type="bar"
          />
          <AgingChart
            data={arAging}
            title="Contas a Receber"
            type="ar"
            isLoading={arLoading}
          />
        </div>
      )}

      {/* Empty State for new users */}
      {!hasData && !kpisLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl mb-2">Seus gráficos aparecerão aqui</CardTitle>
            <CardDescription className="max-w-md mb-4">
              Complete as etapas de configuração acima para começar a ver seus dados financeiros em tempo real.
            </CardDescription>
            <Button onClick={() => navigate('/cadastros/produtos')}>
              Começar Configuração
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
