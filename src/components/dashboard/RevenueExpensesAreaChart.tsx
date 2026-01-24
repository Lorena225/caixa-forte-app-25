import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthlyData {
  month: string;
  receitas: number;
  despesas: number;
}

interface RevenueExpensesAreaChartProps {
  data: MonthlyData[];
  isLoading?: boolean;
  className?: string;
}

const chartConfig = {
  receitas: { label: 'Receitas', color: 'hsl(142, 76%, 36%)' }, // Green
  despesas: { label: 'Despesas', color: 'hsl(0, 84%, 60%)' }, // Red
};

export const RevenueExpensesAreaChart = memo(function RevenueExpensesAreaChart({
  data,
  isLoading = false,
  className,
}: RevenueExpensesAreaChartProps) {
  // Calculate totals and trend
  const stats = useMemo(() => {
    if (!data.length) return { totalReceitas: 0, totalDespesas: 0, saldo: 0, trend: 0 };
    
    const totalReceitas = data.reduce((sum, d) => sum + d.receitas, 0);
    const totalDespesas = data.reduce((sum, d) => sum + d.despesas, 0);
    const saldo = totalReceitas - totalDespesas;
    
    // Calculate trend (last month vs previous)
    if (data.length >= 2) {
      const lastMonth = data[data.length - 1];
      const prevMonth = data[data.length - 2];
      const lastSaldo = lastMonth.receitas - lastMonth.despesas;
      const prevSaldo = prevMonth.receitas - prevMonth.despesas;
      const trend = prevSaldo !== 0 ? ((lastSaldo - prevSaldo) / Math.abs(prevSaldo)) * 100 : 0;
      return { totalReceitas, totalDespesas, saldo, trend };
    }
    
    return { totalReceitas, totalDespesas, saldo, trend: 0 };
  }, [data]);

  return (
    <Card className={cn(
      'bg-card border border-border rounded-xl',
      'shadow-sm hover:shadow-md transition-shadow',
      'flex flex-col',
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Receitas vs Despesas
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evolução dos últimos 6 meses
          </p>
        </div>
        {data.length > 0 && (
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            stats.trend >= 0 
              ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
          )}>
            {stats.trend >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(stats.trend).toFixed(1)}%
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4 flex-1 flex flex-col">
        {isLoading ? (
          <Skeleton className="flex-1 w-full min-h-[200px]" />
        ) : data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center min-h-[200px]">
            <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="flex-1 w-full min-h-[200px]">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => [
                      formatCurrency(Number(value)), 
                      chartConfig[name as keyof typeof chartConfig]?.label || name
                    ]}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="receitas"
                stackId="1"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                fill="url(#colorReceitas)"
              />
              <Area
                type="monotone"
                dataKey="despesas"
                stackId="2"
                stroke="hsl(0, 84%, 60%)"
                strokeWidth={2}
                fill="url(#colorDespesas)"
              />
            </AreaChart>
          </ChartContainer>
        )}

        {/* Summary Cards */}
        {data.length > 0 && (
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border mt-auto">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Receitas</p>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(stats.totalReceitas)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Despesas</p>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(stats.totalDespesas)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p className={cn(
                'text-sm font-semibold',
                stats.saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              )}>
                {formatCurrency(stats.saldo)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
