import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface BudgetItem {
  category: string;
  budgeted: number;
  actual: number;
  type: 'receita' | 'despesa';
}

interface BudgetVsActualChartProps {
  items?: BudgetItem[];
}

// Mock data for demonstration - in production, this would come from a hook
const mockData: BudgetItem[] = [
  { category: 'Vendas', budgeted: 150000, actual: 142500, type: 'receita' },
  { category: 'Serviços', budgeted: 50000, actual: 58000, type: 'receita' },
  { category: 'Pessoal', budgeted: 80000, actual: 78500, type: 'despesa' },
  { category: 'Operacional', budgeted: 35000, actual: 41200, type: 'despesa' },
  { category: 'Marketing', budgeted: 15000, actual: 12000, type: 'despesa' },
  { category: 'Tecnologia', budgeted: 10000, actual: 10500, type: 'despesa' },
];

export function BudgetVsActualChart({ items = mockData }: BudgetVsActualChartProps) {
  const getPercentage = (actual: number, budgeted: number) => {
    if (budgeted === 0) return 0;
    return Math.min((actual / budgeted) * 100, 150);
  };

  const getVariance = (actual: number, budgeted: number, type: 'receita' | 'despesa') => {
    const variance = actual - budgeted;
    const percentage = budgeted > 0 ? (variance / budgeted) * 100 : 0;
    
    // For revenue, positive variance is good; for expenses, negative is good
    const isPositive = type === 'receita' ? variance >= 0 : variance <= 0;
    
    return { variance, percentage, isPositive };
  };

  const receitas = items.filter(i => i.type === 'receita');
  const despesas = items.filter(i => i.type === 'despesa');

  const totalReceitaBudget = receitas.reduce((sum, i) => sum + i.budgeted, 0);
  const totalReceitaActual = receitas.reduce((sum, i) => sum + i.actual, 0);
  const totalDespesaBudget = despesas.reduce((sum, i) => sum + i.budgeted, 0);
  const totalDespesaActual = despesas.reduce((sum, i) => sum + i.actual, 0);

  const renderItem = (item: BudgetItem) => {
    const percentage = getPercentage(item.actual, item.budgeted);
    const { variance, percentage: variancePercent, isPositive } = getVariance(item.actual, item.budgeted, item.type);

    return (
      <div key={item.category} className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{item.category}</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {formatCurrency(item.actual)} / {formatCurrency(item.budgeted)}
            </span>
            <Badge 
              variant={isPositive ? 'default' : 'destructive'} 
              className={`text-xs ${isPositive ? 'bg-success' : ''}`}
            >
              {variancePercent >= 0 ? '+' : ''}{variancePercent.toFixed(1)}%
            </Badge>
          </div>
        </div>
        <div className="relative">
          {/* Budget line (gray background) */}
          <Progress 
            value={100} 
            className="h-3 bg-muted"
          />
          {/* Actual value (colored overlay) */}
          <div 
            className={`absolute top-0 left-0 h-3 rounded-full transition-all ${
              item.type === 'receita' 
                ? (isPositive ? 'bg-success' : 'bg-warning')
                : (isPositive ? 'bg-success' : 'bg-destructive')
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
          {/* Over-budget indicator */}
          {percentage > 100 && item.type === 'despesa' && (
            <div 
              className="absolute top-0 h-3 bg-destructive/50 rounded-r-full"
              style={{ 
                left: '100%', 
                width: `${Math.min(percentage - 100, 50)}%`,
                transform: 'translateX(-100%)'
              }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle>Orçado vs Realizado</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Revenue Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-success" />
            <h4 className="font-semibold">Receitas</h4>
            <Badge variant="outline" className="ml-auto">
              {formatCurrency(totalReceitaActual)} / {formatCurrency(totalReceitaBudget)}
            </Badge>
          </div>
          <div className="space-y-4">
            {receitas.map(renderItem)}
          </div>
        </div>

        {/* Expenses Section */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <h4 className="font-semibold">Despesas</h4>
            <Badge variant="outline" className="ml-auto">
              {formatCurrency(totalDespesaActual)} / {formatCurrency(totalDespesaBudget)}
            </Badge>
          </div>
          <div className="space-y-4">
            {despesas.map(renderItem)}
          </div>
        </div>

        {/* Summary */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Resultado Orçado</p>
              <p className="text-lg font-bold">
                {formatCurrency(totalReceitaBudget - totalDespesaBudget)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Resultado Realizado</p>
              <p className={`text-lg font-bold ${(totalReceitaActual - totalDespesaActual) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(totalReceitaActual - totalDespesaActual)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
