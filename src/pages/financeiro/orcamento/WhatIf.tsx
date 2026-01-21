import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Sparkles, RefreshCcw, Save, BarChart3, Zap, Calculator
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { WhatIfSimulation } from '@/components/budget/WhatIfSimulation';
import { useBudgetMasters } from '@/hooks/useBudgetModule';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function WhatIfPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>();
  
  // Simulation parameters
  const [revenueChange, setRevenueChange] = useState(0);
  const [expenseChange, setExpenseChange] = useState(0);
  const [headcountChange, setHeadcountChange] = useState(0);
  const [inflationRate, setInflationRate] = useState(4.5);

  const { data: budgets = [] } = useBudgetMasters(selectedYear);

  // Calculate projected values based on parameters
  const baseRevenue = 1000000;
  const baseExpense = 800000;
  const baseProfit = baseRevenue - baseExpense;

  const projectedRevenue = baseRevenue * (1 + revenueChange / 100);
  const projectedExpense = baseExpense * (1 + expenseChange / 100) * (1 + inflationRate / 100);
  const projectedProfit = projectedRevenue - projectedExpense;
  const profitChange = ((projectedProfit - baseProfit) / baseProfit) * 100;

  const handleReset = () => {
    setRevenueChange(0);
    setExpenseChange(0);
    setHeadcountChange(0);
    setInflationRate(4.5);
  };

  // Chart data
  const comparisonData = [
    { name: 'Receita', base: baseRevenue, projetado: projectedRevenue },
    { name: 'Despesa', base: baseExpense, projetado: projectedExpense },
    { name: 'Lucro', base: baseProfit, projetado: projectedProfit },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Simulações What-If"
          description="Projete cenários e analise impactos antes de decidir"
        />

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3">
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
                <SelectItem value="__none__">Selecione...</SelectItem>
                {budgets.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={handleReset}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Resetar
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Parameters Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Parâmetros
              </CardTitle>
              <CardDescription>
                Ajuste os valores para simular cenários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Variação da Receita</span>
                  <span className={`font-medium ${revenueChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {revenueChange >= 0 ? '+' : ''}{revenueChange}%
                  </span>
                </div>
                <Slider
                  value={[revenueChange]}
                  onValueChange={([v]) => setRevenueChange(v)}
                  min={-50}
                  max={50}
                  step={1}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Variação das Despesas</span>
                  <span className={`font-medium ${expenseChange <= 0 ? 'text-success' : 'text-destructive'}`}>
                    {expenseChange >= 0 ? '+' : ''}{expenseChange}%
                  </span>
                </div>
                <Slider
                  value={[expenseChange]}
                  onValueChange={([v]) => setExpenseChange(v)}
                  min={-30}
                  max={30}
                  step={1}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Variação de Headcount</span>
                  <span className="font-medium">
                    {headcountChange >= 0 ? '+' : ''}{headcountChange}%
                  </span>
                </div>
                <Slider
                  value={[headcountChange]}
                  onValueChange={([v]) => setHeadcountChange(v)}
                  min={-20}
                  max={20}
                  step={1}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Inflação Projetada</span>
                  <span className="font-medium">{inflationRate.toFixed(1)}%</span>
                </div>
                <Slider
                  value={[inflationRate]}
                  onValueChange={([v]) => setInflationRate(v)}
                  min={0}
                  max={15}
                  step={0.5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-warning" />
                Resultado da Simulação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Receita Projetada</p>
                  <p className="text-2xl font-bold">{formatCurrency(projectedRevenue)}</p>
                  <Badge variant={revenueChange >= 0 ? 'default' : 'destructive'} className="mt-1">
                    {revenueChange >= 0 ? '+' : ''}{revenueChange}%
                  </Badge>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Despesa Projetada</p>
                  <p className="text-2xl font-bold">{formatCurrency(projectedExpense)}</p>
                  <Badge variant={expenseChange <= 0 ? 'default' : 'destructive'} className="mt-1">
                    {(((projectedExpense / baseExpense) - 1) * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Lucro Projetado</p>
                  <p className={`text-2xl font-bold ${projectedProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(projectedProfit)}
                  </p>
                  <Badge variant={profitChange >= 0 ? 'default' : 'destructive'} className="mt-1">
                    {profitChange >= 0 ? '+' : ''}{profitChange.toFixed(1)}%
                  </Badge>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="base" name="Base" fill="hsl(var(--muted-foreground) / 0.3)" />
                  <Bar dataKey="projetado" name="Projetado" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* What-If Component with selected budget */}
        {selectedBudgetId && (
          <WhatIfSimulation 
            budgetId={selectedBudgetId} 
            baseRevenue={baseRevenue}
            baseExpense={baseExpense}
          />
        )}
      </div>
    </MainLayout>
  );
}
