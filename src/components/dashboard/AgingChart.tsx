import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface AgingBucket {
  aging_bucket: string;
  doc_count: number;
  total_amount: number;
}

interface AgingChartProps {
  data: AgingBucket[];
  title: string;
  type: 'ar' | 'ap';
  onBucketClick?: (bucket: string) => void;
  isLoading?: boolean;
}

const bucketLabels: Record<string, string> = {
  a_vencer: 'A Vencer',
  '0_30': '0-30 dias',
  '31_60': '31-60 dias',
  '61_90': '61-90 dias',
  '90_plus': '90+ dias',
};

const bucketOrder = ['a_vencer', '0_30', '31_60', '61_90', '90_plus'];

const bucketColors: Record<string, { ar: string; ap: string }> = {
  a_vencer: { ar: 'hsl(var(--success))', ap: 'hsl(var(--info))' },
  '0_30': { ar: 'hsl(var(--warning))', ap: 'hsl(var(--warning))' },
  '31_60': { ar: 'hsl(38 80% 55%)', ap: 'hsl(38 80% 55%)' },
  '61_90': { ar: 'hsl(25 95% 53%)', ap: 'hsl(25 95% 53%)' },
  '90_plus': { ar: 'hsl(var(--destructive))', ap: 'hsl(var(--destructive))' },
};

export function AgingChart({ data, title, type, onBucketClick, isLoading }: AgingChartProps) {
  const chartData = useMemo(() => {
    return bucketOrder.map((bucket) => {
      const item = data.find((d) => d.aging_bucket === bucket);
      return {
        bucket,
        label: bucketLabels[bucket],
        amount: Number(item?.total_amount || 0),
        count: item?.doc_count || 0,
        color: bucketColors[bucket][type],
      };
    });
  }, [data, type]);

  const total = chartData.reduce((sum, d) => sum + d.amount, 0);
  const overdueTotal = chartData
    .filter((d) => d.bucket !== 'a_vencer')
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-lg font-bold">{formatCurrency(total)}</div>
          </div>
        </div>
        {overdueTotal > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-destructive font-medium">
              Vencido: {formatCurrency(overdueTotal)}
            </span>
            <span className="text-xs text-muted-foreground">
              ({((overdueTotal / total) * 100).toFixed(1)}%)
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-pulse bg-muted rounded h-full w-full" />
          </div>
        ) : total > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis 
                type="number" 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                className="text-xs"
              />
              <YAxis 
                type="category" 
                dataKey="label" 
                width={80}
                className="text-xs"
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => label}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar
                dataKey="amount"
                name="Valor"
                radius={[0, 4, 4, 0]}
                cursor={onBucketClick ? 'pointer' : 'default'}
                onClick={(data) => onBucketClick?.(data.bucket)}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        )}

        {/* Legend with buckets */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          {chartData.map((item) => (
            <button
              key={item.bucket}
              className={cn(
                'flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors',
                onBucketClick && 'hover:bg-muted cursor-pointer'
              )}
              onClick={() => onBucketClick?.(item.bucket)}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
              <span className="font-medium">{item.count}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
