import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, Calculator } from 'lucide-react';
import { useLiquidityDashboard } from '@/hooks/useLiquidityDashboard';
import { formatCurrency } from '@/lib/formatters';

export function WhatIfSimulator() {
  const { data: liquidity } = useLiquidityDashboard();
  
  const [revenueChange, setRevenueChange] = useState(0);
  const [expenseChange, setExpenseChange] = useState(0);
  const [delayDays, setDelayDays] = useState(0);

  const simulation = useMemo(() => {
    if (!liquidity) return null;

    const baseReceivables = liquidity.receivables_30d;
    const basePayables = liquidity.payables_30d;
    const baseBalance = liquidity.total_balance;

    // Apply revenue change
    const adjustedReceivables = baseReceivables * (1 + revenueChange / 100);
    
    // Apply expense change
    const adjustedPayables = basePayables * (1 + expenseChange / 100);
    
    // Calculate delay impact (reduce receivables by delay percentage)
    const delayImpact = (delayDays / 30) * adjustedReceivables * 0.5;
    const effectiveReceivables = adjustedReceivables - delayImpact;

    const projectedBalance = baseBalance + effectiveReceivables - adjustedPayables;
    const netPosition = effectiveReceivables - adjustedPayables;
    const coverageDays = adjustedPayables > 0 
      ? Math.floor((projectedBalance / (adjustedPayables / 30)))
      : 999;

    return {
      adjustedReceivables: effectiveReceivables,
      adjustedPayables,
      projectedBalance,
      netPosition,
      coverageDays,
      originalBalance: baseBalance,
      balanceChange: projectedBalance - (baseBalance + baseReceivables - basePayables),
      isRisk: projectedBalance < 0 || coverageDays < 15,
    };
  }, [liquidity, revenueChange, expenseChange, delayDays]);

  if (!liquidity) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Simulador What-If</CardTitle>
            <CardDescription>Teste cenários e visualize o impacto no fluxo de caixa</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sliders */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Variação na Receita
              </Label>
              <Badge variant={revenueChange >= 0 ? 'default' : 'destructive'}>
                {revenueChange >= 0 ? '+' : ''}{revenueChange}%
              </Badge>
            </div>
            <Slider
              value={[revenueChange]}
              onValueChange={([v]) => setRevenueChange(v)}
              min={-50}
              max={50}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>-50%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Variação nas Despesas
              </Label>
              <Badge variant={expenseChange <= 0 ? 'default' : 'destructive'}>
                {expenseChange >= 0 ? '+' : ''}{expenseChange}%
              </Badge>
            </div>
            <Slider
              value={[expenseChange]}
              onValueChange={([v]) => setExpenseChange(v)}
              min={-30}
              max={50}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>-30%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Atraso Médio nos Recebimentos
              </Label>
              <Badge variant="outline">{delayDays} dias</Badge>
            </div>
            <Slider
              value={[delayDays]}
              onValueChange={([v]) => setDelayDays(v)}
              min={0}
              max={30}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 dias</span>
              <span>15 dias</span>
              <span>30 dias</span>
            </div>
          </div>
        </div>

        {/* Results */}
        {simulation && (
          <div className={`rounded-lg p-4 border ${simulation.isRisk ? 'bg-destructive/10 border-destructive' : 'bg-success/10 border-success'}`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Projetado (30d)</p>
                <p className={`text-2xl font-bold ${simulation.projectedBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(simulation.projectedBalance)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Impacto no Saldo</p>
                <p className={`text-2xl font-bold ${simulation.balanceChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {simulation.balanceChange >= 0 ? '+' : ''}{formatCurrency(simulation.balanceChange)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dias de Cobertura</p>
                <p className={`text-lg font-bold ${simulation.coverageDays >= 30 ? 'text-success' : simulation.coverageDays >= 15 ? 'text-warning' : 'text-destructive'}`}>
                  {simulation.coverageDays < 999 ? `${simulation.coverageDays} dias` : '∞'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Posição Líquida</p>
                <p className={`text-lg font-bold ${simulation.netPosition >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(simulation.netPosition)}
                </p>
              </div>
            </div>
            
            {simulation.isRisk && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-destructive/30">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive font-medium">
                  Cenário de risco: {simulation.projectedBalance < 0 
                    ? 'Saldo negativo projetado' 
                    : 'Cobertura insuficiente para obrigações'}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
