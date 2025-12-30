import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCashflowMonthly } from '@/hooks/useCompanyData';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatShortMonth } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Wallet, Target } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';

export default function FluxoCaixa() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  
  const { data: cashflow = [], isLoading } = useCashflowMonthly(year);
  
  // Calculate running balance
  let runningBalance = 0;
  const chartData = cashflow.map((item) => {
    runningBalance += Number(item.resultado || 0);
    return {
      month: formatShortMonth(item.month || 0),
      entradas: Number(item.entradas_pagas || 0),
      saidas: Number(item.saidas_pagas || 0),
      resultado: Number(item.resultado || 0),
      saldo: runningBalance,
      entradas_previstas: Number(item.entradas_previstas || 0),
      saidas_previstas: Number(item.saidas_previstas || 0),
    };
  });

  const totals = cashflow.reduce(
    (acc, item) => ({
      entradas: acc.entradas + Number(item.entradas_pagas || 0),
      saidas: acc.saidas + Number(item.saidas_pagas || 0),
      resultado: acc.resultado + Number(item.resultado || 0),
      entradas_previstas: acc.entradas_previstas + Number(item.entradas_previstas || 0),
      saidas_previstas: acc.saidas_previstas + Number(item.saidas_previstas || 0),
    }),
    { entradas: 0, saidas: 0, resultado: 0, entradas_previstas: 0, saidas_previstas: 0 }
  );

  const lucratividade = totals.entradas > 0 
    ? ((totals.resultado / totals.entradas) * 100).toFixed(1) 
    : '0.0';

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Fluxo de Caixa" description="Acompanhe entradas e saídas realizadas">
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PageHeader>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="kpi-card kpi-card-success">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Entradas</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold value-positive">{formatCurrency(totals.entradas)}</div>
              <p className="text-xs text-muted-foreground">Previsto: {formatCurrency(totals.entradas_previstas)}</p>
            </CardContent>
          </Card>
          <Card className="kpi-card kpi-card-danger">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saídas</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold value-negative">{formatCurrency(totals.saidas)}</div>
              <p className="text-xs text-muted-foreground">Previsto: {formatCurrency(totals.saidas_previstas)}</p>
            </CardContent>
          </Card>
          <Card className="kpi-card kpi-card-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resultado</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totals.resultado >= 0 ? 'value-positive' : 'value-negative'}`}>
                {formatCurrency(totals.resultado)}
              </div>
            </CardContent>
          </Card>
          <Card className="kpi-card kpi-card-warning">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lucratividade</CardTitle>
              <Target className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lucratividade}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Entradas x Saídas por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
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
              <CardTitle>Saldo Acumulado</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="saldo" 
                      name="Saldo" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Adicione lançamentos para visualizar o gráfico
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th className="text-right">Entradas</th>
                    <th className="text-right">Saídas</th>
                    <th className="text-right">Resultado</th>
                    <th className="text-right">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="font-medium">{row.month}</td>
                      <td className="text-right value-positive">{formatCurrency(row.entradas)}</td>
                      <td className="text-right value-negative">{formatCurrency(row.saidas)}</td>
                      <td className={`text-right font-semibold ${row.resultado >= 0 ? 'value-positive' : 'value-negative'}`}>
                        {formatCurrency(row.resultado)}
                      </td>
                      <td className={`text-right font-semibold ${row.saldo >= 0 ? 'value-positive' : 'value-negative'}`}>
                        {formatCurrency(row.saldo)}
                      </td>
                    </tr>
                  ))}
                  {chartData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum dado para exibir
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
