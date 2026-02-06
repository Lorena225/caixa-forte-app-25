import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
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

export function RollingForecastChart() {
  const [days, setDays] = useState(30);
  const { data: forecast, isLoading } = useRollingForecast(days);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Rolling Forecast</CardTitle>
          <CardDescription>Projeção do saldo com base em títulos confirmados</CardDescription>
        </div>
        <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="15">15 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="60">60 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sem dados para projeção
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                domain={[
                  hasNegative ? minBalance * 1.1 : 0,
                  maxBalance * 1.1
                ]}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'projectedBalance' ? 'Saldo Projetado' :
                  name === 'inflow' ? 'Entradas' :
                  name === 'outflow' ? 'Saídas' : name
                ]}
                labelFormatter={(label) => `Data: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              {hasNegative && (
                <ReferenceLine 
                  y={0} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5" 
                  label={{ value: 'Zero', position: 'right' }}
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
        
        {/* Summary stats */}
        {forecast && forecast.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Saldo Inicial</p>
              <p className="text-lg font-bold">
                {formatCurrency(forecast[0]?.projectedBalance - forecast[0]?.netFlow || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Saldo Final Projetado</p>
              <p className={`text-lg font-bold ${forecast[forecast.length - 1]?.projectedBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(forecast[forecast.length - 1]?.projectedBalance || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Saldo Mínimo</p>
              <p className={`text-lg font-bold ${minBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(minBalance)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
