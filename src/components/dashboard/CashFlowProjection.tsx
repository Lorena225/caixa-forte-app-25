import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { FluxoProjetado } from '@/types/dashboard';
import { formatCurrency } from '@/lib/formatters';
import {
  Area,
  AreaChart,
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CashFlowProjectionProps {
  data: FluxoProjetado[];
  isLoading?: boolean;
  title?: string;
  showBars?: boolean;
}

const chartConfig = {
  saldoAcumulado: {
    label: 'Saldo',
    color: 'hsl(var(--primary))',
  },
  inflow: {
    label: 'Entradas',
    color: 'hsl(var(--success))',
  },
  outflow: {
    label: 'Saídas',
    color: 'hsl(var(--destructive))',
  },
};

export const CashFlowProjection = memo(function CashFlowProjection({
  data,
  isLoading = false,
  title = 'Projeção de Fluxo de Caixa',
  showBars = false,
}: CashFlowProjectionProps) {
  // Memoize all calculations to avoid recalculating on re-renders
  const { firstBalance, lastBalance, minBalance, variation, variationPercent, negativeDays, hasNegativeProjection, sampledData } = useMemo(() => {
    if (!data.length) return { 
      firstBalance: 0, lastBalance: 0, minBalance: 0, variation: 0, 
      variationPercent: 0, negativeDays: 0, hasNegativeProjection: false, sampledData: [] 
    };
    
    const first = data[0]?.saldoAcumulado || 0;
    const last = data[data.length - 1]?.saldoAcumulado || 0;
    const min = Math.min(...data.map(d => d.saldoAcumulado));
    const varVal = last - first;
    const varPercent = first !== 0 ? (varVal / Math.abs(first)) * 100 : 0;
    const negDays = data.filter(d => d.saldoAcumulado < 0).length;
    const sampled = data.filter((_, index) => index % 3 === 0 || index === data.length - 1);
    
    return {
      firstBalance: first,
      lastBalance: last,
      minBalance: min,
      variation: varVal,
      variationPercent: varPercent,
      negativeDays: negDays,
      hasNegativeProjection: negDays > 0,
      sampledData: sampled,
    };
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Próximos {data.length} dias
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Saldo Final</p>
            <p className={`text-sm font-bold ${lastBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
              {formatCurrency(lastBalance)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Variação</p>
            <div className="flex items-center gap-1">
              {variation > 0 ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : variation < 0 ? (
                <TrendingDown className="h-3 w-3 text-destructive" />
              ) : (
                <Minus className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={`text-sm font-medium ${
                variation > 0 ? 'text-success' : variation < 0 ? 'text-destructive' : ''
              }`}>
                {variationPercent > 0 ? '+' : ''}{variationPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasNegativeProjection && (
          <div className="flex items-center gap-2 p-2 mb-3 rounded-md bg-destructive/10 text-destructive text-xs">
            <TrendingDown className="h-4 w-4 shrink-0" />
            <span>
              Atenção: saldo negativo projetado em {negativeDays} dia(s). 
              Mínimo: {formatCurrency(minBalance)}
            </span>
          </div>
        )}
        
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          {showBars ? (
            <ComposedChart data={sampledData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="dataFormatada" 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => [formatCurrency(Number(value)), chartConfig[name as keyof typeof chartConfig]?.label || name]}
                  />
                }
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Bar dataKey="inflow" fill="hsl(var(--success))" radius={[2, 2, 0, 0]} opacity={0.7} />
              <Bar dataKey="outflow" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} opacity={0.7} />
              <Line 
                type="monotone" 
                dataKey="saldoAcumulado" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          ) : (
            <AreaChart data={sampledData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="dataFormatada" 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent 
                    formatter={(value) => [formatCurrency(Number(value)), 'Saldo']}
                  />
                }
              />
              <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" opacity={0.5} />
              <Area
                type="monotone"
                dataKey="saldoAcumulado"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorSaldo)"
              />
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
});

CashFlowProjection.displayName = 'CashFlowProjection';
