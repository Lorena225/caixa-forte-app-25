import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Download, Filter, BarChart3, Target
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { VarianceAnalysisTable } from '@/components/budget/VarianceAnalysisTable';
import { useBudgetVarianceAnalysis, useBudgetVarianceAlerts } from '@/hooks/useBudgetAdvanced';
import { useBudgetMasters } from '@/hooks/useBudgetModule';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer,
  Cell
} from 'recharts';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function VarianciaPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>();
  const [varianceFilter, setVarianceFilter] = useState<'all' | 'favorable' | 'unfavorable'>('all');

  const { data: budgets = [] } = useBudgetMasters(selectedYear);
  const { data: varianceData = [], isLoading } = useBudgetVarianceAnalysis(selectedYear, selectedBudgetId);
  const { data: alerts = [] } = useBudgetVarianceAlerts(selectedYear);

  // Filter variance data
  const filteredVariance = varianceData.filter(item => {
    if (varianceFilter === 'all') return true;
    if (varianceFilter === 'favorable') return item.variance_status === 'favorable';
    return item.variance_status === 'unfavorable';
  });

  // Calculate stats
  const stats = {
    totalBudget: varianceData.reduce((sum, i) => sum + (i.budget_amount || 0), 0),
    totalActual: varianceData.reduce((sum, i) => sum + (i.actual_amount || 0), 0),
    totalVariance: varianceData.reduce((sum, i) => sum + (i.variance_amount || 0), 0),
    favorableCount: varianceData.filter(i => i.variance_status === 'favorable').length,
    unfavorableCount: varianceData.filter(i => i.variance_status === 'unfavorable').length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
  };

  // Chart data - top 10 by variance
  const chartData = [...varianceData]
    .sort((a, b) => Math.abs(b.variance_amount || 0) - Math.abs(a.variance_amount || 0))
    .slice(0, 10)
    .map(item => ({
      name: item.account_name?.substring(0, 20) || 'N/A',
      variance: item.variance_amount || 0,
      percent: item.variance_percent || 0,
      status: item.variance_status,
    }));

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Análise de Variância"
          description="Compare orçado vs realizado e identifique desvios"
        />

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedBudgetId || '__none__'} onValueChange={(v) => setSelectedBudgetId(v === '__none__' ? undefined : v)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione um orçamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Todos os orçamentos</SelectItem>
                {budgets.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={varianceFilter} onValueChange={(v) => setVarianceFilter(v as typeof varianceFilter)}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="favorable">Favoráveis</SelectItem>
                <SelectItem value="unfavorable">Desfavoráveis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Orçado</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.totalBudget)}</p>
                </div>
                <Target className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Realizado</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.totalActual)}</p>
                </div>
                <BarChart3 className="h-6 w-6 text-info" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Variação Total</p>
                  <p className={`text-xl font-bold ${stats.totalVariance >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(stats.totalVariance)}
                  </p>
                </div>
                {stats.totalVariance >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-success" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-destructive" />
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Favoráveis</p>
                  <p className="text-xl font-bold text-success">{stats.favorableCount}</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Desfavoráveis</p>
                  <p className="text-xl font-bold text-destructive">{stats.unfavorableCount}</p>
                </div>
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alertas Críticos</p>
                  <p className="text-xl font-bold text-warning">{stats.criticalAlerts}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Maiores Desvios</CardTitle>
              <CardDescription>Contas com maior variação absoluta</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Sem dados de variância</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis type="category" dataKey="name" width={150} />
                    <RechartsTooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Conta: ${label}`}
                    />
                    <Bar dataKey="variance" name="Variação">
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.status === 'favorable' ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Alertas de Variância
              </CardTitle>
              <CardDescription>Desvios que requerem atenção</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p>Nenhum alerta de variância</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto">
                  {alerts.slice(0, 5).map(alert => (
                    <div 
                      key={alert.id} 
                      className="p-3 rounded-lg border bg-card flex items-start gap-3"
                    >
                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                        alert.severity === 'critical' ? 'text-destructive' : 
                        alert.severity === 'warning' ? 'text-warning' : 'text-info'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{alert.message}</p>
                        <p className="text-sm text-muted-foreground">
                          Variação de {formatCurrency(alert.variance_amount)} ({alert.variance_percent?.toFixed(1)}%)
                        </p>
                      </div>
                      <Badge variant={
                        alert.severity === 'critical' ? 'destructive' : 
                        alert.severity === 'warning' ? 'outline' : 'secondary'
                      }>
                        {alert.severity === 'critical' ? 'Alto' : alert.severity === 'warning' ? 'Médio' : 'Baixo'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Table */}
        <VarianceAnalysisTable data={filteredVariance} groupBy="account" />
      </div>
    </MainLayout>
  );
}
