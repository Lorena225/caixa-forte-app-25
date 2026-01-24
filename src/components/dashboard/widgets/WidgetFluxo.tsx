import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface FluxoData {
  mes: string;
  receitas: number;
  despesas: number;
}

interface WidgetFluxoProps {
  data: FluxoData[];
  isLoading?: boolean;
  aiInsight?: string;
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-3">
        <p className="font-medium text-sm text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const WidgetFluxo = memo(function WidgetFluxo({
  data,
  isLoading = false,
  aiInsight = 'Seu fluxo de caixa está positivo. Receitas superam despesas em 23%.',
  className,
}: WidgetFluxoProps) {
  const [showAiTooltip, setShowAiTooltip] = useState(false);

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
          <Skeleton className="h-[200px] w-full rounded-lg" />
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
        'hover:shadow-xl hover:border-blue-500/30',
        'transition-all duration-300 p-6',
        className
      )}>
        {/* Glassmorphism gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Fluxo de Caixa</h3>
              <p className="text-xs text-muted-foreground">Receitas vs Despesas</p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[200px] relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="receitasGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="despesasGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="mes" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="receitas"
                name="Receitas"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#receitasGradient)"
              />
              <Area
                type="monotone"
                dataKey="despesas"
                name="Despesas"
                stroke="#f43f5e"
                strokeWidth={2}
                fill="url(#despesasGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
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

export default WidgetFluxo;
