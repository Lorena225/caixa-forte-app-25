import { memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { BarChart3, ExternalLink } from 'lucide-react';
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface BudgetData {
  month: string;
  orcado: number;
  realizado: number;
}

interface BudgetVsActualChartProps {
  data: BudgetData[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onConfigure?: () => void;
  className?: string;
}

const chartConfig = {
  orcado: { label: 'Orçado', color: 'hsl(var(--primary))' },
  realizado: { label: 'Real', color: 'hsl(187, 85%, 43%)' }, // Cyan
};

export const BudgetVsActualChart = memo(function BudgetVsActualChart({
  data,
  isLoading = false,
  onConfigure,
  className,
}: BudgetVsActualChartProps) {
  return (
    <Card className={cn(
      'bg-card border border-border rounded-xl',
      'shadow-sm hover:shadow-md transition-shadow',
      'h-[320px] flex flex-col',
      className
    )}>
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Orçado vs Real
        </h3>
        <div className="flex items-center gap-1">
          {onConfigure && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={onConfigure}
              title="Ver detalhes"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Chart Content */}
      <CardContent className="pt-4 flex-1 flex flex-col">
        {isLoading ? (
          <Skeleton className="flex-1 w-full" />
        ) : data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="flex-1 w-full min-h-[160px]">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                width={40}
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
              <Bar 
                dataKey="orcado" 
                fill="hsl(var(--primary))" 
                radius={[3, 3, 0, 0]} 
                barSize={24}
              />
              <Bar 
                dataKey="realizado" 
                fill="hsl(187, 85%, 43%)" 
                radius={[3, 3, 0, 0]} 
                barSize={24}
              />
            </BarChart>
          </ChartContainer>
        )}

        {/* Legend */}
        {data.length > 0 && (
          <div className="flex items-center justify-center gap-6 pt-3 border-t border-border mt-auto">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
              <span>Orçado</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(187,85%,43%)]" />
              <span>Realizado</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

BudgetVsActualChart.displayName = 'BudgetVsActualChart';
