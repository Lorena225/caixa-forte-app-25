import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { BudgetScenario } from '@/hooks/useBudgetAdvanced';

interface ScenarioComparisonProps {
  scenarios: BudgetScenario[];
  baseBudget: { revenue: number; expense: number };
}

const SCENARIO_COLORS: Record<string, string> = {
  pessimista: 'hsl(var(--destructive))',
  realista: 'hsl(var(--primary))',
  otimista: 'hsl(var(--success))',
  custom: 'hsl(var(--accent))',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function ScenarioComparison({ scenarios, baseBudget }: ScenarioComparisonProps) {
  const chartData = useMemo(() => {
    return scenarios.map((scenario) => {
      // Apply adjustment rules to calculate scenario totals
      let revenueMultiplier = 1;
      let expenseMultiplier = 1;

      for (const rule of scenario.adjustment_rules) {
        if (rule.target === 'revenue' && rule.adjustment_type === 'percentage') {
          revenueMultiplier *= (1 + rule.adjustment_value / 100);
        }
        if (rule.target === 'expense' && rule.adjustment_type === 'percentage') {
          expenseMultiplier *= (1 + rule.adjustment_value / 100);
        }
      }

      const revenue = baseBudget.revenue * revenueMultiplier;
      const expense = baseBudget.expense * expenseMultiplier;
      const profit = revenue - expense;

      return {
        name: scenario.name,
        type: scenario.scenario_type,
        probability: scenario.probability,
        Receita: revenue,
        Despesa: expense,
        Lucro: profit,
        color: SCENARIO_COLORS[scenario.scenario_type] || SCENARIO_COLORS.custom,
      };
    });
  }, [scenarios, baseBudget]);

  // Add base budget for comparison
  const fullData = [
    {
      name: 'Base',
      type: 'base',
      probability: 1,
      Receita: baseBudget.revenue,
      Despesa: baseBudget.expense,
      Lucro: baseBudget.revenue - baseBudget.expense,
      color: 'hsl(var(--muted-foreground))',
    },
    ...chartData,
  ];

  if (scenarios.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum cenário configurado para comparação.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comparação de Cenários</CardTitle>
        <CardDescription>
          Impacto estimado de cada cenário no resultado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {chartData.map((scenario) => (
            <Card key={scenario.name} className="border-2" style={{ borderColor: scenario.color }}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{scenario.name}</h4>
                  <Badge variant="outline" style={{ borderColor: scenario.color, color: scenario.color }}>
                    {formatPercent(scenario.probability)}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receita</span>
                    <span className="font-medium">{formatCurrency(scenario.Receita)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Despesa</span>
                    <span className="font-medium">{formatCurrency(scenario.Despesa)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="text-muted-foreground">Lucro</span>
                    <span className={`font-bold ${scenario.Lucro >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(scenario.Lucro)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fullData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                className="text-xs"
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="Receita" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesa" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Lucro" radius={[4, 4, 0, 0]}>
                {fullData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.Lucro >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recommendation */}
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Recomendação</h4>
          <p className="text-sm text-muted-foreground">
            Com base na probabilidade e impacto dos cenários, recomenda-se focar no cenário{' '}
            <strong className="text-foreground">
              {chartData.find(s => s.type === 'realista')?.name || 'Realista'}
            </strong>{' '}
            para planejamento estratégico, mantendo contingências para o cenário pessimista.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
