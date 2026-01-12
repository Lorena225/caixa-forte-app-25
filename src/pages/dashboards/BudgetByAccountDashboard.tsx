import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { KPICard, KPIGrid } from '@/components/dashboard/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { formatCurrency, formatShortMonth } from '@/lib/formatters';
import { useBudgetByAccountView, useBudgetAccountSummary } from '@/hooks/useBudgetAccounts';
import { Target, TrendingUp, TrendingDown, FileDown, ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CATEGORY_LABELS: Record<string, string> = { receita: 'Receitas', despesa: 'Despesas', custo: 'Custos' };

export default function BudgetByAccountDashboard() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | 'all'>(currentMonth);

  const { data: budgetData = [], isLoading } = useBudgetByAccountView(year, month === 'all' ? undefined : month);
  const { data: summary } = useBudgetAccountSummary(year);

  const chartData = Object.entries(summary?.byCategory || {}).map(([category, data]) => ({
    category: CATEGORY_LABELS[category] || category,
    Meta: Math.abs(data.target),
    Realizado: Math.abs(data.actual),
  }));

  const monthlyChartData = Object.entries(summary?.byMonth || {}).sort(([a], [b]) => Number(a) - Number(b)).map(([m, data]) => ({
    month: formatShortMonth(Number(m)),
    Meta: Math.abs(data.target),
    Realizado: Math.abs(data.actual),
  }));

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Orçamento por Conta" description="Análise de metas vs. realizado por conta contábil">
          <div className="flex items-center gap-2">
            <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{[currentYear - 1, currentYear, currentYear + 1].map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={month.toString()} onValueChange={(v) => setMonth(v === 'all' ? 'all' : Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos meses</SelectItem>
                {Array.from({ length: 12 }, (_, i) => <SelectItem key={i} value={(i + 1).toString()}>{formatShortMonth(i + 1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2"><FileDown className="h-4 w-4" />Exportar</Button>
          </div>
        </PageHeader>

        <KPIGrid columns={4}>
          <KPICard title="Total Meta" value={formatCurrency(Math.abs(summary?.totalTarget || 0))} subtitle="orçado" icon={Target} isLoading={!summary} />
          <KPICard title="Total Realizado" value={formatCurrency(Math.abs(summary?.totalActual || 0))} subtitle="executado" icon={DollarSign} isLoading={!summary} />
          <KPICard title="Acima Orçamento" value={String(summary?.accountsOverBudget || 0)} subtitle="contas" icon={ArrowUpCircle} variant="danger" isLoading={!summary} />
          <KPICard title="Abaixo Orçamento" value={String(summary?.accountsUnderBudget || 0)} subtitle="contas" icon={ArrowDownCircle} variant="success" isLoading={!summary} />
        </KPIGrid>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Por Categoria</CardTitle></CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" width={80} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="Meta" fill="hsl(var(--muted-foreground) / 0.3)" />
                    <Bar dataKey="Realizado" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground">Sem dados</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Evolução Mensal</CardTitle></CardHeader>
            <CardContent>
              {monthlyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="Meta" fill="hsl(var(--muted-foreground) / 0.3)" />
                    <Bar dataKey="Realizado" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground">Sem dados</div>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Detalhamento por Conta</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <TableSkeleton columns={6} rows={8} /> : budgetData.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma meta cadastrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Tipo</TableHead>
                    {month === 'all' && <TableHead>Mês</TableHead>}
                    <TableHead className="text-right">Meta</TableHead>
                    <TableHead className="text-right">Realizado</TableHead>
                    <TableHead className="text-right">Variação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetData.map((row: Record<string, unknown>) => (
                    <TableRow key={row.id as string}>
                      <TableCell className="font-mono text-sm">{String(row.account_code)}</TableCell>
                      <TableCell className="font-medium">{String(row.account_name)}</TableCell>
                      <TableCell><Badge variant="outline">{CATEGORY_LABELS[String(row.category_type)] || String(row.category_type)}</Badge></TableCell>
                      {month === 'all' && <TableCell>{formatShortMonth(Number(row.month))}</TableCell>}
                      <TableCell className="text-right">{formatCurrency(Number(row.target_amount))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(row.actual_amount))}</TableCell>
                      <TableCell className={`text-right font-medium ${Number(row.variance) < 0 ? 'text-destructive' : 'text-success'}`}>
                        <div className="flex items-center justify-end gap-1">
                          {Number(row.variance) > 0 ? <TrendingUp className="h-4 w-4" /> : Number(row.variance) < 0 ? <TrendingDown className="h-4 w-4" /> : null}
                          {formatCurrency(Math.abs(Number(row.variance)))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
