import { useAuth } from '@/contexts/AuthContext';
import { useDashboardKPIs, useCashflowMonthly } from '@/hooks/useCompanyData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatShortMonth } from '@/lib/formatters';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle,
  AlertTriangle,
  Target
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function Dashboard() {
  const { currentCompany } = useAuth();
  const { data: kpis, isLoading } = useDashboardKPIs();
  const currentYear = new Date().getFullYear();
  const { data: cashflow = [] } = useCashflowMonthly(currentYear);

  const chartData = cashflow.map((item) => ({
    month: formatShortMonth(item.month || 0),
    entradas: Number(item.entradas_pagas || 0),
    saidas: Number(item.saidas_pagas || 0),
  }));

  const kpiCards = [
    { 
      title: 'Receitas do Mês', 
      value: formatCurrency(kpis?.receipts || 0), 
      change: kpis?.receiptChange ? `${Number(kpis.receiptChange) >= 0 ? '+' : ''}${kpis.receiptChange}%` : null, 
      trend: Number(kpis?.receiptChange || 0) >= 0 ? 'up' : 'down',
      icon: TrendingUp,
      color: 'success'
    },
    { 
      title: 'Despesas do Mês', 
      value: formatCurrency(kpis?.expenses || 0), 
      change: kpis?.expenseChange ? `${Number(kpis.expenseChange) >= 0 ? '+' : ''}${kpis.expenseChange}%` : null, 
      trend: Number(kpis?.expenseChange || 0) <= 0 ? 'up' : 'down',
      icon: TrendingDown,
      color: 'danger'
    },
    { 
      title: 'Saldo em Caixa', 
      value: formatCurrency(kpis?.balance || 0), 
      change: null, 
      trend: null,
      icon: Wallet,
      color: 'primary'
    },
    { 
      title: 'Lucro/Resultado', 
      value: formatCurrency(kpis?.profit || 0), 
      change: kpis?.profit && kpis?.receipts ? `${((kpis.profit / kpis.receipts) * 100).toFixed(1)}% margem` : null, 
      trend: (kpis?.profit || 0) >= 0 ? 'up' : 'down',
      icon: Target,
      color: 'warning'
    },
  ];

  const summaryCards = [
    { title: 'A Receber', value: formatCurrency(kpis?.arTotal || 0), icon: ArrowDownCircle, color: 'text-success' },
    { title: 'A Pagar', value: formatCurrency(kpis?.apTotal || 0), icon: ArrowUpCircle, color: 'text-destructive' },
    { title: 'Vencidos', value: String(kpis?.overdueCount || 0), icon: AlertTriangle, color: 'text-warning' },
    { title: 'Resultado', value: formatCurrency((kpis?.receipts || 0) - (kpis?.expenses || 0)), icon: Target, color: 'text-primary' },
  ];

  const pieData = [
    { name: 'Receitas', value: kpis?.receipts || 0, color: 'hsl(var(--success))' },
    { name: 'Despesas', value: kpis?.expenses || 0, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

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
        {kpiCards.map((kpi) => (
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
              <div className="text-2xl font-bold">{isLoading ? '...' : kpi.value}</div>
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
                <p className="text-xl font-semibold">{isLoading ? '...' : card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Caixa Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 && chartData.some(d => d.entradas > 0 || d.saidas > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Adicione lançamentos para visualizar o gráfico
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Receitas x Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Adicione lançamentos para visualizar o gráfico
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}