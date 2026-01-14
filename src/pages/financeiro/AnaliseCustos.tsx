import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingDown, TrendingUp, PieChart, Calculator, 
  DollarSign, Percent, Target
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useCostClassifications, useCostAnalysis } from '@/hooks/useCostClassifications';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

export default function AnaliseCustos() {
  const [revenueInput, setRevenueInput] = useState('');
  const { data: classifications = [], isLoading } = useCostClassifications();
  const { data: analysis } = useCostAnalysis();

  const pieData = analysis ? [
    { name: 'Fixos', value: analysis.totalFixed },
    { name: 'Variáveis', value: analysis.totalVariable },
    { name: 'Semi-variáveis', value: analysis.totalSemiVariable },
  ].filter(d => d.value > 0) : [];

  // Break-even calculation
  const revenue = parseFloat(revenueInput) || 0;
  const fixedCosts = analysis?.totalFixed || 0;
  const variableCostPercent = analysis?.variablePercent || 0;
  const contributionMargin = 100 - variableCostPercent;
  const breakEvenRevenue = contributionMargin > 0 ? (fixedCosts / (contributionMargin / 100)) : 0;

  // Simulation: What if revenue drops X%?
  const [simulationDrop, setSimulationDrop] = useState(10);
  const simulatedRevenue = revenue * (1 - simulationDrop / 100);
  const simulatedVariableCosts = simulatedRevenue * (variableCostPercent / 100);
  const simulatedProfit = simulatedRevenue - fixedCosts - simulatedVariableCosts;

  const getClassificationBadge = (type: string) => {
    const styles = {
      fixo: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      variavel: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      semi_variavel: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    const labels = {
      fixo: 'Fixo',
      variavel: 'Variável',
      semi_variavel: 'Semi-variável',
    };
    return (
      <Badge className={styles[type as keyof typeof styles] || styles.fixo}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Análise de Custos"
          description="Classificação de custos fixos e variáveis com análise de ponto de equilíbrio"
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Custos Fixos</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(analysis?.totalFixed || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysis?.fixedPercent.toFixed(1)}% do total
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Custos Variáveis</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(analysis?.totalVariable || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysis?.variablePercent.toFixed(1)}% do total
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Custos</p>
                  <p className="text-2xl font-bold">{formatCurrency(analysis?.total || 0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ponto de Equilíbrio</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(breakEvenRevenue)}
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Distribuição de Custos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Break-even Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculadora de Ponto de Equilíbrio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Receita Atual (R$)</label>
                <Input
                  type="number"
                  value={revenueInput}
                  onChange={(e) => setRevenueInput(e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Custos Fixos:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Margem de Contribuição:</span>
                  <span className="font-medium">{contributionMargin.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Ponto de Equilíbrio:</span>
                  <span className="font-bold text-purple-600">{formatCurrency(breakEvenRevenue)}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Simulador: E se a receita cair?
                </h4>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    value={simulationDrop}
                    onChange={(e) => setSimulationDrop(parseInt(e.target.value) || 0)}
                    className="w-20"
                    min={0}
                    max={100}
                  />
                  <span className="text-sm">% de queda</span>
                </div>
                {revenue > 0 && (
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      Receita simulada: <strong>{formatCurrency(simulatedRevenue)}</strong>
                    </p>
                    <p className={`text-sm ${simulatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Lucro/Prejuízo: <strong>{formatCurrency(simulatedProfit)}</strong>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classifications Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Classificação de Contas</CardTitle>
            <Button>
              + Nova Classificação
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : classifications.length === 0 ? (
              <div className="text-center py-12">
                <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma classificação cadastrada</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Classifique suas contas de despesa como fixas ou variáveis
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead className="text-right">% Variável</TableHead>
                    <TableHead className="text-right">Valor (12m)</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classifications.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.account?.account_name || '-'}</TableCell>
                      <TableCell>{c.account?.code || '-'}</TableCell>
                      <TableCell>{getClassificationBadge(c.classification_type)}</TableCell>
                      <TableCell className="text-right">
                        {c.classification_type === 'semi_variavel' 
                          ? `${c.variable_percentage}%` 
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(analysis?.accountTotals[c.account_id] || 0)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Editar</Button>
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
