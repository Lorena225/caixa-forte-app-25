import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { FluxoProjetado } from '@/types/dashboard';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  Area,
  AreaChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Settings } from 'lucide-react';

interface CashFlowProjectionProps {
  data: FluxoProjetado[];
  isLoading?: boolean;
  title?: string;
  showBars?: boolean;
  onRefresh?: () => void;
  onConfigure?: () => void;
}

const chartConfig = {
  saldoAcumulado: {
    label: 'Saldo',
    color: '#0066CC',
  },
  inflow: {
    label: 'Entradas',
    color: '#10B981',
  },
  outflow: {
    label: 'Saídas',
    color: '#EF4444',
  },
};

export const CashFlowProjection = memo(function CashFlowProjection({
  data,
  isLoading = false,
  title = 'Projeção de Fluxo de Caixa',
  showBars = false,
  onRefresh,
  onConfigure,
}: CashFlowProjectionProps) {
  // Memoize all calculations
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
      <Card className={cn(
        'bg-white border border-gray-200 rounded-xl',
        'shadow-[0_1px_3px_rgba(0,0,0,0.05)]',
        'h-[320px]'
      )}>
        <CardHeader className="pb-2">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'bg-white border border-gray-200 rounded-xl',
      'shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)]',
      'transition-shadow h-[320px] flex flex-col'
    )}>
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between pb-4 mb-2 border-b border-gray-100">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-1">
            Próximos {data.length} dias
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Metrics */}
          <div className="text-right">
            <p className="text-xs text-gray-500">Saldo Final</p>
            <p className={cn(
              'text-sm font-bold font-mono',
              lastBalance >= 0 ? 'text-gray-900' : 'text-red-500'
            )}>
              {formatCurrency(lastBalance)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Variação</p>
            <div className="flex items-center gap-1 justify-end">
              {variation > 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : variation < 0 ? (
                <TrendingDown className="h-3 w-3 text-red-500" />
              ) : (
                <Minus className="h-3 w-3 text-gray-400" />
              )}
              <span className={cn(
                'text-sm font-medium',
                variation > 0 ? 'text-emerald-500' : variation < 0 ? 'text-red-500' : 'text-gray-400'
              )}>
                {variationPercent > 0 ? '+' : ''}{variationPercent.toFixed(1)}%
              </span>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-[#0066CC]"
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {onConfigure && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-[#0066CC]"
                onClick={onConfigure}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col">
        {/* Negative Balance Warning */}
        {hasNegativeProjection && (
          <div className="flex items-center gap-2 p-2 mb-3 rounded-lg bg-red-50 text-red-600 text-xs">
            <TrendingDown className="h-4 w-4 shrink-0" />
            <span>
              Atenção: saldo negativo projetado em {negativeDays} dia(s). 
              Mínimo: {formatCurrency(minBalance)}
            </span>
          </div>
        )}
        
        {/* Chart */}
        <ChartContainer config={chartConfig} className="flex-1 w-full min-h-[160px]">
          {showBars ? (
            <ComposedChart data={sampledData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis 
                dataKey="dataFormatada" 
                tick={{ fontSize: 10, fill: '#6B7280' }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#6B7280' }} 
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
              <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
              <Bar dataKey="inflow" fill="#10B981" radius={[2, 2, 0, 0]} opacity={0.7} />
              <Bar dataKey="outflow" fill="#EF4444" radius={[2, 2, 0, 0]} opacity={0.7} />
              <Line 
                type="monotone" 
                dataKey="saldoAcumulado" 
                stroke="#0066CC" 
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          ) : (
            <AreaChart data={sampledData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0066CC" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0066CC" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis 
                dataKey="dataFormatada" 
                tick={{ fontSize: 10, fill: '#6B7280' }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#6B7280' }} 
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
              <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" opacity={0.5} />
              <Area
                type="monotone"
                dataKey="saldoAcumulado"
                stroke="#0066CC"
                strokeWidth={2}
                fill="url(#colorSaldo)"
              />
            </AreaChart>
          )}
        </ChartContainer>

        {/* Legend */}
        {showBars && (
          <div className="flex items-center gap-6 pt-3 border-t border-gray-100 mt-auto">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span>Entradas</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span>Saídas</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 rounded-sm bg-[#0066CC]" />
              <span>Saldo</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

CashFlowProjection.displayName = 'CashFlowProjection';
