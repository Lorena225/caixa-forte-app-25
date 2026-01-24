import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WidgetMenu } from './WidgetMenu';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface AgingData {
  periodo: string;
  valor: number;
  count: number;
}

interface WidgetAgingCobrancaProps {
  data?: AgingData[];
  isLoading?: boolean;
  aiInsight?: string;
  onRefresh?: () => void;
  onViewDetails?: () => void;
  onRemove?: () => void;
  className?: string;
}

const defaultData: AgingData[] = [
  { periodo: 'A vencer', valor: 45000, count: 12 },
  { periodo: '1-30 dias', valor: 28000, count: 8 },
  { periodo: '31-60 dias', valor: 15000, count: 5 },
  { periodo: '61-90 dias', valor: 8500, count: 3 },
  { periodo: '+90 dias', valor: 12000, count: 4 },
];

const barColors = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#dc2626'];

export const WidgetAgingCobranca = memo(function WidgetAgingCobranca({
  data = defaultData,
  isLoading = false,
  aiInsight = 'R$ 35.500 estão vencidos há mais de 30 dias. Priorize ações de cobrança.',
  onRefresh,
  onViewDetails,
  onRemove,
  className,
}: WidgetAgingCobrancaProps) {
  const [showAiTooltip, setShowAiTooltip] = useState(false);

  const totalVencido = data.slice(1).reduce((sum, d) => sum + d.valor, 0);

  if (isLoading) {
    return (
      <Card className={cn(
        'relative overflow-hidden rounded-2xl border border-border/50',
        'bg-card/80 backdrop-blur-sm shadow-lg p-6',
        className
      )}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className={cn(
        'relative overflow-hidden rounded-2xl border border-border/50',
        'bg-card/80 backdrop-blur-xl shadow-lg',
        'hover:shadow-xl hover:border-orange-500/30',
        'transition-all duration-300 p-6',
        className
      )}>
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Aging de Cobrança</h3>
              <p className="text-xs text-muted-foreground">
                Total vencido: <span className="text-red-500 font-medium">{formatCurrency(totalVencido)}</span>
              </p>
            </div>
          </div>
          <WidgetMenu
            onRefresh={onRefresh}
            onViewDetails={onViewDetails}
            onRemove={onRemove}
            detailsLabel="Ver Cobrança"
          />
        </div>

        {/* Bar Chart */}
        <div className="h-44 w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis 
                type="number" 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                type="category" 
                dataKey="periodo" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <RechartsTooltip
                formatter={(value: number, name, props) => [
                  formatCurrency(value),
                  `${props.payload.count} título(s)`
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={barColors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-3 relative z-10">
          {data.map((d, i) => (
            <div key={d.periodo} className="flex items-center gap-1.5">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: barColors[i] }}
              />
              <span className="text-[10px] text-muted-foreground">{d.count}</span>
            </div>
          ))}
        </div>

        {/* AI Opinion Badge */}
        <TooltipProvider>
          <Tooltip open={showAiTooltip} onOpenChange={setShowAiTooltip}>
            <TooltipTrigger asChild>
              <motion.div 
                className="absolute bottom-3 right-3 z-20"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400 hover:from-violet-500/20 hover:to-purple-500/20 transition-all"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Opinião da IA
                </Badge>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              className="max-w-xs bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0 shadow-xl"
            >
              <p className="text-sm">{aiInsight}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Card>
    </motion.div>
  );
});

export default WidgetAgingCobranca;
