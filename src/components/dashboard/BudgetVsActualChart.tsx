import { memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { RefreshCw, Settings, BarChart3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
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
  orcado: { label: 'Orçado', color: '#06B6D4' }, // Cyan
  realizado: { label: 'Real', color: '#0066CC' }, // Primary Blue
};

export const BudgetVsActualChart = memo(function BudgetVsActualChart({
  data,
  isLoading = false,
  onRefresh,
  onConfigure,
  className,
}: BudgetVsActualChartProps) {
  return (
    <Card className={cn(
      'bg-white border border-gray-200 rounded-xl',
      'shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-shadow',
      'h-[320px] flex flex-col',
      className
    )}>
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between pb-4 mb-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">
          Orçado vs Real - Mês Corrente
        </h3>
        <div className="flex items-center gap-2">
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
      </CardHeader>

      {/* Chart Content */}
      <CardContent className="pt-0 flex-1 flex flex-col">
        {isLoading ? (
          <Skeleton className="flex-1 w-full" />
        ) : data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">Nenhum dado disponível</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="flex-1 w-full min-h-[180px]">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: '#6B7280' }} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#6B7280' }} 
                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => [
                      formatCurrency(Number(value)), 
                      chartConfig[name as keyof typeof chartConfig]?.label || name
                    ]}
                    wrapperClassName="!bg-gray-900 !border-0 !rounded-md !shadow-lg"
                    labelClassName="!text-white"
                  />
                }
              />
              <Bar 
                dataKey="orcado" 
                fill="#06B6D4" 
                radius={[4, 4, 0, 0]} 
                barSize={30}
              />
              <Bar 
                dataKey="realizado" 
                fill="#0066CC" 
                radius={[4, 4, 0, 0]} 
                barSize={30}
              />
            </BarChart>
          </ChartContainer>
        )}

        {/* Legend */}
        {data.length > 0 && (
          <div className="flex items-center gap-6 pt-3 border-t border-gray-100 mt-auto">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 rounded-sm bg-cyan-500" />
              <span>Orçado</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 rounded-sm bg-[#0066CC]" />
              <span>Real</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

BudgetVsActualChart.displayName = 'BudgetVsActualChart';
