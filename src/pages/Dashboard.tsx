import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle,
  AlertTriangle,
  Target,
  PiggyBank
} from 'lucide-react';

export default function Dashboard() {
  const { currentCompany } = useAuth();

  const kpis = [
    { 
      title: 'Receitas do Mês', 
      value: 'R$ 0,00', 
      change: '+0%', 
      trend: 'up',
      icon: TrendingUp,
      color: 'success'
    },
    { 
      title: 'Despesas do Mês', 
      value: 'R$ 0,00', 
      change: '+0%', 
      trend: 'down',
      icon: TrendingDown,
      color: 'danger'
    },
    { 
      title: 'Saldo em Caixa', 
      value: 'R$ 0,00', 
      change: null, 
      trend: null,
      icon: Wallet,
      color: 'primary'
    },
    { 
      title: 'Lucro/Resultado', 
      value: 'R$ 0,00', 
      change: '0%', 
      trend: 'neutral',
      icon: Target,
      color: 'warning'
    },
  ];

  const summaryCards = [
    { title: 'A Receber', value: 'R$ 0,00', icon: ArrowDownCircle, color: 'text-success' },
    { title: 'A Pagar', value: 'R$ 0,00', icon: ArrowUpCircle, color: 'text-destructive' },
    { title: 'Vencidos', value: '0', icon: AlertTriangle, color: 'text-warning' },
    { title: 'Investimentos', value: 'R$ 0,00', icon: PiggyBank, color: 'text-info' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral de {currentCompany?.name || 'sua empresa'}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className={`kpi-card kpi-card-${kpi.color}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className={`h-4 w-4 ${
                kpi.color === 'success' ? 'text-success' : 
                kpi.color === 'danger' ? 'text-destructive' : 
                kpi.color === 'warning' ? 'text-warning' : 'text-primary'
              }`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              {kpi.change && (
                <p className={`text-xs ${
                  kpi.trend === 'up' ? 'text-success' : 
                  kpi.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {kpi.change} em relação ao mês anterior
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="card-hover">
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-full p-3 bg-muted ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-xl font-semibold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder for charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Caixa Mensal</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
            Adicione lançamentos para visualizar o gráfico
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
            Adicione lançamentos para visualizar o gráfico
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
