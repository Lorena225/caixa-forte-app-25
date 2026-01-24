import { memo, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface ExpensesByCategoryChartProps {
  data: CategoryData[];
  isLoading?: boolean;
  className?: string;
}

const DEFAULT_COLORS = [
  'hsl(221, 83%, 53%)', // Blue
  'hsl(142, 76%, 36%)', // Green
  'hsl(45, 93%, 47%)',  // Yellow
  'hsl(0, 84%, 60%)',   // Red
  'hsl(262, 83%, 58%)', // Purple
  'hsl(187, 85%, 43%)', // Cyan
  'hsl(24, 95%, 53%)',  // Orange
  'hsl(330, 81%, 60%)', // Pink
];

// Custom active shape for the donut chart
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" className="text-sm font-semibold fill-foreground">
        {payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="text-xs fill-muted-foreground">
        {formatCurrency(value)}
      </text>
      <text x={cx} y={cy + 28} textAnchor="middle" className="text-xs fill-muted-foreground">
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={innerRadius - 4}
        outerRadius={innerRadius - 2}
        fill={fill}
      />
    </g>
  );
};

export const ExpensesByCategoryChart = memo(function ExpensesByCategoryChart({
  data,
  isLoading = false,
  className,
}: ExpensesByCategoryChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Add colors to data if not present
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }));
  }, [data]);

  // Calculate total
  const total = useMemo(() => {
    return data.reduce((sum, d) => sum + d.value, 0);
  }, [data]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

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
            Despesas por Categoria
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Distribuição de gastos
          </p>
        </div>
        {data.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(total)}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4 flex-1 flex flex-col">
        {isLoading ? (
          <Skeleton className="flex-1 w-full min-h-[200px]" />
        ) : data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center min-h-[200px]">
            <PieChartIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-center gap-4 flex-1">
            {/* Donut Chart */}
            <div className="flex-1 min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                    paddingAngle={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        className="cursor-pointer transition-opacity hover:opacity-80"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Interactive Legend */}
            <div className="w-full lg:w-auto lg:min-w-[160px] max-h-[200px] overflow-y-auto">
              <div className="space-y-2">
                {chartData.slice(0, 8).map((entry, index) => (
                  <button
                    key={entry.name}
                    className={cn(
                      'flex items-center gap-2 w-full p-2 rounded-lg transition-colors text-left',
                      'hover:bg-muted/50',
                      activeIndex === index && 'bg-muted'
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => setActiveIndex(index)}
                  >
                    <div 
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {entry.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(entry.value)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {((entry.value / total) * 100).toFixed(0)}%
                    </span>
                  </button>
                ))}
                {data.length > 8 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    +{data.length - 8} categorias
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
