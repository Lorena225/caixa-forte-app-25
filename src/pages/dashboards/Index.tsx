import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Target,
  ArrowRight,
  PieChart,
  BarChart3,
  Building2,
} from 'lucide-react';

const dashboards = [
  {
    title: 'Dashboard Executivo',
    description: 'Visão geral com KPIs, aging e gráficos principais',
    href: '/dashboards/executive',
    icon: LayoutDashboard,
    color: 'text-primary',
  },
  {
    title: 'Caixa e Fluxo de Caixa',
    description: 'Saldo diário, projeção 13 semanas e próximos vencimentos',
    href: '/dashboards/cash',
    icon: Wallet,
    color: 'text-info',
  },
  {
    title: 'Receita e Margem',
    description: 'Faturamento, lucro e margem por período e dimensão',
    href: '/dashboards/revenue',
    icon: TrendingUp,
    color: 'text-success',
  },
  {
    title: 'Contas a Receber',
    description: 'Aging, inadimplência e top devedores',
    href: '/dashboards/ar',
    icon: ArrowDownCircle,
    color: 'text-success',
  },
  {
    title: 'Contas a Pagar',
    description: 'Aging, desembolsos e top fornecedores',
    href: '/dashboards/ap',
    icon: ArrowUpCircle,
    color: 'text-destructive',
  },
  {
    title: 'Orçamento x Realizado',
    description: 'Comparativo de metas com heatmap de variações',
    href: '/dashboards/budget',
    icon: Target,
    color: 'text-warning',
  },
  {
    title: 'Rentabilidade',
    description: 'Margem de contribuição por produto, cliente e canal',
    href: '/dashboards/profitability',
    icon: PieChart,
    color: 'text-primary',
  },
  {
    title: 'Indicadores',
    description: 'Liquidez, endividamento, capital de giro e EBITDA',
    href: '/dashboards/kpis',
    icon: BarChart3,
    color: 'text-info',
  },
  {
    title: 'Por Polo / Unidade',
    description: 'Resultado financeiro comparativo por centro de custo',
    href: '/paineis/polo',
    icon: Building2,
    color: 'text-violet-600',
  },
];

export default function DashboardsIndex() {
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Dashboards"
          description="Painéis de controle financeiro em tempo real"
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {dashboards.map((dashboard) => (
            <Card key={dashboard.href} className="card-hover">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${dashboard.color}`}>
                    <dashboard.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{dashboard.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {dashboard.description}
                </CardDescription>
                <Button asChild variant="outline" className="w-full">
                  <Link to={dashboard.href}>
                    Acessar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
