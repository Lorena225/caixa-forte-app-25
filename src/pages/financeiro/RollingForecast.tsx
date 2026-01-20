import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, TrendingDown, Calendar, RefreshCcw, Download, 
  Target, Sparkles, Info, BarChart3
} from 'lucide-react';
import { formatCurrency, formatShortMonth } from '@/lib/formatters';
import { 
  useBudgetMasters, 
  useBudgetForecasts,
  useGenerateRollingForecast,
  useBudgetVsActualAdvanced 
} from '@/hooks/useBudgetModule';
import { useBudgetVsActual } from '@/hooks/useDashboardData';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area
} from 'recharts';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function RollingForecast() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [year, setYear] = useState(currentYear);
  const [cutoffMonth, setCutoffMonth] = useState(Math.max(currentMonth - 1, 1));
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | undefined>();

  const { data: budgets = [] } = useBudgetMasters(year);
  const { data: vsActualData = [] } = useBudgetVsActual(year);
  const { data: forecasts = [] } = useBudgetForecasts(year, cutoffMonth);
  const generateForecast = useGenerateRollingForecast();

  const activeBudget = budgets.find(b => b.is_active) || budgets[0];

  // Build combined data: Actual for months <= cutoff, Forecast for months > cutoff
  const combinedData = MONTHS.map((month, idx) => {
    const monthNum = idx + 1;
    const vsData = vsActualData.find(v => v.month === monthNum);
    const isActual = monthNum <= cutoffMonth;

    return {
      month,
      monthNum,
      isActual,
      receita: isActual 
        ? Number(vsData?.actual_revenue || 0) 
        : Number(vsData?.target_revenue || 0),
      despesa: isActual 
        ? Number(vsData?.actual_expense || 0) 
        : Number(vsData?.target_expense || 0),
      receitaMeta: Number(vsData?.target_revenue || 0),
      despesaMeta: Number(vsData?.target_expense || 0),
    };
  });

  // Calculate totals
  const totals = combinedData.reduce((acc, item) => ({
    actualRevenue: acc.actualRevenue + (item.isActual ? item.receita : 0),
    forecastRevenue: acc.forecastRevenue + (!item.isActual ? item.receita : 0),
    actualExpense: acc.actualExpense + (item.isActual ? item.despesa : 0),
    forecastExpense: acc.forecastExpense + (!item.isActual ? item.despesa : 0),
    totalTarget: acc.totalTarget + item.receitaMeta,
  }), { actualRevenue: 0, forecastRevenue: 0, actualExpense: 0, forecastExpense: 0, totalTarget: 0 });

  const projectedTotal = totals.actualRevenue + totals.forecastRevenue;
  const projectedExpense = totals.actualExpense + totals.forecastExpense;
  const projectedProfit = projectedTotal - projectedExpense;
  const completionRate = totals.totalTarget > 0 ? (projectedTotal / totals.totalTarget) * 100 : 0;

  const handleGenerateForecast = () => {
    if (!activeBudget?.id) return;
    generateForecast.mutate({
      budgetId: activeBudget.id,
      year,
      cutoffMonth,
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Rolling Forecast"
          description="Previsão contínua com realizado + projeção do restante do ano"
        />

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ano</label>
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 min-w-[200px]">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Ponto de Corte: {MONTHS[cutoffMonth - 1]}
              </label>
              <Slider
                value={[cutoffMonth]}
                onValueChange={([v]) => setCutoffMonth(v)}
                min={1}
                max={12}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Orçamento Base</label>
              <Select value={selectedBudgetId || activeBudget?.id || ''} onValueChange={setSelectedBudgetId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {budgets.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} {b.is_active && '(Ativo)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleGenerateForecast}
              disabled={generateForecast.isPending}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Atualizar Forecast
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Realizado:</strong> Dados consolidados até {MONTHS[cutoffMonth - 1]}. 
            <strong className="ml-2">Forecast:</strong> Projeção de {MONTHS[cutoffMonth]} a Dez baseada no orçamento vigente.
          </AlertDescription>
        </Alert>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Realizado YTD</p>
                  <p className="text-2xl font-bold">{formatCurrency(totals.actualRevenue)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Forecast Restante</p>
                  <p className="text-2xl font-bold">{formatCurrency(totals.forecastRevenue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projeção Anual</p>
                  <p className="text-2xl font-bold">{formatCurrency(projectedTotal)}</p>
                </div>
                <Target className="h-8 w-8 text-info" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lucro Projetado</p>
                  <p className={`text-2xl font-bold ${projectedProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(projectedProfit)}
                  </p>
                </div>
                {projectedProfit >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-success" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-destructive" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">% da Meta</p>
                  <p className="text-2xl font-bold">{completionRate.toFixed(1)}%</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Realizado + Forecast
            </CardTitle>
            <CardDescription>
              Barras sólidas: Realizado | Barras transparentes: Forecast | Linha: Meta Original
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `${label} - ${combinedData.find(d => d.month === label)?.isActual ? 'Realizado' : 'Forecast'}`}
                />
                <Legend />
                <Bar 
                  dataKey="receita" 
                  name="Receita" 
                  fill="hsl(var(--success))"
                  fillOpacity={0.8}
                />
                <Bar 
                  dataKey="despesa" 
                  name="Despesa" 
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.8}
                />
                <Line 
                  type="monotone" 
                  dataKey="receitaMeta" 
                  name="Meta Receita" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Meta Receita</TableHead>
                  <TableHead className="text-right">Despesa</TableHead>
                  <TableHead className="text-right">Meta Despesa</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedData.map((row) => (
                  <TableRow key={row.monthNum} className={!row.isActual ? 'bg-muted/30' : ''}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell>
                      <Badge variant={row.isActual ? 'default' : 'secondary'}>
                        {row.isActual ? 'Realizado' : 'Forecast'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(row.receita)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(row.receitaMeta)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.despesa)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(row.despesaMeta)}</TableCell>
                    <TableCell className={`text-right font-medium ${row.receita - row.despesa >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(row.receita - row.despesa)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-right">{formatCurrency(projectedTotal)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.totalTarget)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(projectedExpense)}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className={`text-right ${projectedProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(projectedProfit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
