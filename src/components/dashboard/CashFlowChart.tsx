import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatShortMonth } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';

interface CashFlowChartProps {
  data: Array<{
    date?: string;
    month?: number;
    week_start?: string;
    week_number?: number;
    inflows?: number;
    outflows?: number;
    entradas?: number;
    saidas?: number;
    net?: number;
    resultado?: number;
    balance?: number;
    closing_balance?: number;
    projected_balance?: number;
  }>;
  title: string;
  type?: 'bar' | 'line' | 'area' | 'combined';
  showProjection?: boolean;
  height?: number;
  onPointClick?: (data: any) => void;
  isLoading?: boolean;
}

export function CashFlowChart({
  data,
  title,
  type = 'bar',
  showProjection = false,
  height = 300,
  onPointClick,
  isLoading,
}: CashFlowChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => {
      let label = '';
      if (item.date) {
        label = format(new Date(item.date), 'dd/MM', { locale: ptBR });
      } else if (item.month) {
        label = formatShortMonth(item.month);
      } else if (item.week_start) {
        label = `S${item.week_number}`;
      }

      return {
        label,
        rawDate: item.date || item.week_start || item.month,
        inflows: Number(item.inflows || item.entradas || 0),
        outflows: Number(item.outflows || item.saidas || 0),
        net: Number(item.net || item.resultado || 0),
        balance: Number(item.balance || item.closing_balance || item.projected_balance || 0),
      };
    });
  }, [data]);

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" className="text-xs" />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              name="Saldo"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
              onClick={onPointClick}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" className="text-xs" />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              name="Saldo Projetado"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary) / 0.2)"
              strokeWidth={2}
            />
          </AreaChart>
        );

      case 'combined':
        return (
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" className="text-xs" />
            <YAxis 
              yAxisId="left"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} 
              className="text-xs" 
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} 
              className="text-xs" 
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="inflows"
              name="Entradas"
              fill="hsl(var(--success))"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="outflows"
              name="Saídas"
              fill="hsl(var(--destructive))"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="balance"
              name="Saldo"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        );

      case 'bar':
      default:
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" className="text-xs" />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Bar
              dataKey="inflows"
              name="Entradas"
              fill="hsl(var(--success))"
              radius={[4, 4, 0, 0]}
              onClick={onPointClick}
            />
            <Bar
              dataKey="outflows"
              name="Saídas"
              fill="hsl(var(--destructive))"
              radius={[4, 4, 0, 0]}
              onClick={onPointClick}
            />
          </BarChart>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse bg-muted rounded" style={{ height }} />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          <div 
            className="flex items-center justify-center text-muted-foreground"
            style={{ height }}
          >
            Nenhum dado disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}
