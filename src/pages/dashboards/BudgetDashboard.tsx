import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { KPICard, KPIGrid } from '@/components/dashboard/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatShortMonth } from '@/lib/formatters';
import { useBudgetVsActual } from '@/hooks/useDashboardData';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  FileDown,
  AlertTriangle
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
  ReferenceLine,
} from 'recharts';

export default function BudgetDashboard() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data: budgetData = [], isLoading } = useBudgetVsActual(year);

  // Calculate totals
  const totals = budgetData.reduce((acc, item) => ({
    targetRevenue: acc.targetRevenue + Number(item.target_revenue || 0),
    actualRevenue: acc.actualRevenue + Number(item.actual_revenue || 0),
    targetExpense: acc.targetExpense + Number(item.target_expense || 0),
    actualExpense: acc.actualExpense + Number(item.actual_expense || 0),
    targetProfit: acc.targetProfit + Number(item.target_profit || 0),
    actualProfit: acc.actualProfit + Number(item.actual_profit || 0),
  }), {
    targetRevenue: 0,
    actualRevenue: 0,
    targetExpense: 0,
    actualExpense: 0,
    targetProfit: 0,
    actualProfit: 0,
  });

  const revenueExecution = totals.targetRevenue > 0 
    ? (totals.actualRevenue / totals.targetRevenue) * 100 
    : 0;
  const expenseExecution = totals.targetExpense > 0 
    ? (totals.actualExpense / totals.targetExpense) * 100 
    : 0;
  const profitVariance = totals.actualProfit - totals.targetProfit;

  // Chart data
  const chartData = budgetData.map((item) => ({
    month: formatShortMonth(item.month),
    'Receita Orçada': Number(item.target_revenue || 0),
    'Receita Real': Number(item.actual_revenue || 0),
    'Despesa Orçada': Number(item.target_expense || 0),
    'Despesa Real': Number(item.actual_expense || 0),
  }));

  // Variance heatmap data
  const varianceData = budgetData.map((item) => ({
    month: item.month,
    monthLabel: formatShortMonth(item.month),
    revenueVar: Number(item.revenue_variance_pct || 0),
    expenseVar: Number(item.expense_variance_pct || 0),
    profitVar: Number(item.profit_variance || 0),
  }));

  const getVarianceColor = (value: number) => {
    if (value >= 10) return 'bg-success/20 text-success';
    if (value >= 0) return 'bg-success/10 text-success';
    if (value >= -10) return 'bg-warning/20 text-warning';
    return 'bg-destructive/20 text-destructive';
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Orçamento x Realizado"
          description="Acompanhamento de metas e variações"
        >
          <div className="flex items-center gap-2">
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2">
              <FileDown className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </PageHeader>

        {/* KPIs */}
        <KPIGrid columns={4}>
          <KPICard
            title="Execução Receita"
            value={`${revenueExecution.toFixed(1)}%`}
            subtitle={`${formatCurrency(totals.actualRevenue)} de ${formatCurrency(totals.targetRevenue)}`}
            icon={Target}
            variant={revenueExecution >= 100 ? 'success' : revenueExecution >= 80 ? 'warning' : 'danger'}
            isLoading={isLoading}
          />
          <KPICard
            title="Execução Despesa"
            value={`${expenseExecution.toFixed(1)}%`}
            subtitle={`${formatCurrency(totals.actualExpense)} de ${formatCurrency(totals.targetExpense)}`}
            icon={BarChart3}
            variant={expenseExecution <= 100 ? 'success' : 'danger'}
            isLoading={isLoading}
          />
          <KPICard
            title="Lucro Realizado"
            value={formatCurrency(totals.actualProfit)}
            subtitle={`Meta: ${formatCurrency(totals.targetProfit)}`}
            icon={TrendingUp}
            variant={totals.actualProfit >= totals.targetProfit ? 'success' : 'danger'}
            isLoading={isLoading}
          />
          <KPICard
            title="Variação Lucro"
            value={formatCurrency(Math.abs(profitVariance))}
            change={profitVariance >= 0 ? `+${((profitVariance / Math.max(totals.targetProfit, 1)) * 100).toFixed(1)}%` : `${((profitVariance / Math.max(totals.targetProfit, 1)) * 100).toFixed(1)}%`}
            trend={profitVariance >= 0 ? 'up' : 'down'}
            icon={profitVariance >= 0 ? TrendingUp : TrendingDown}
            variant={profitVariance >= 0 ? 'success' : 'danger'}
            isLoading={isLoading}
          />
        </KPIGrid>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Orçado x Realizado por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Receita Orçada" fill="hsl(var(--success) / 0.3)" />
                  <Bar dataKey="Receita Real" fill="hsl(var(--success))" />
                  <Bar dataKey="Despesa Orçada" fill="hsl(var(--destructive) / 0.3)" />
                  <Bar dataKey="Despesa Real" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                Nenhum dado de orçamento disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variance Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Mapa de Variações (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-center">Var. Receita</TableHead>
                  <TableHead className="text-center">Var. Despesa</TableHead>
                  <TableHead className="text-right">Var. Lucro (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {varianceData.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium">{row.monthLabel}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${getVarianceColor(row.revenueVar)}`}>
                        {row.revenueVar >= 0 ? '+' : ''}{row.revenueVar.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${getVarianceColor(-row.expenseVar)}`}>
                        {row.expenseVar >= 0 ? '+' : ''}{row.expenseVar.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${row.profitVar >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {row.profitVar >= 0 ? '+' : ''}{formatCurrency(row.profitVar)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
