import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRollingForecast } from '@/hooks/useLiquidityDashboard';
import { formatCurrency } from '@/lib/formatters';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export function CashFlowMiniChart() {
  const { data: forecast, isLoading } = useRollingForecast(30);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = (forecast || []).map(item => ({
    ...item,
    date: format(parseISO(item.date), 'dd/MM', { locale: ptBR }),
    fullDate: item.date,
  }));

  const minBalance = Math.min(...(forecast || []).map(f => f.projectedBalance));
  const maxBalance = Math.max(...(forecast || []).map(f => f.projectedBalance));
  const hasNegative = minBalance < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Fluxo de Caixa Projetado</CardTitle>
          <CardDescription>Saldo consolidado nos próximos 30 dias</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/tesouraria/posicao">
            Ver Detalhes
            <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Sem dados para projeção
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                interval="preserveStartEnd"
              />
              <YAxis 
                tickFormatter={(value) => {
                  if (Math.abs(value) >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}M`;
                  }
                  if (Math.abs(value) >= 1000) {
                    return `${(value / 1000).toFixed(0)}K`;
                  }
                  return value.toString();
                }}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                width={50}
                domain={[
                  hasNegative ? minBalance * 1.1 : 0,
                  maxBalance * 1.1
                ]}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Saldo']}
                labelFormatter={(label) => `Data: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              {hasNegative && (
                <ReferenceLine 
                  y={0} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5" 
                />
              )}
              <Area
                type="monotone"
                dataKey="projectedBalance"
                fill="hsl(var(--primary) / 0.1)"
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="projectedBalance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Saldo Projetado"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
