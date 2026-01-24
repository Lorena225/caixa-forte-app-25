import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface WidgetVendasProps {
  totalVendas: number;
  ticketMedio: number;
  variacaoVendas?: number;
  variacaoTicket?: number;
  isLoading?: boolean;
  aiInsight?: string;
  className?: string;
}

export const WidgetVendas = memo(function WidgetVendas({
  totalVendas,
  ticketMedio,
  variacaoVendas = 0,
  variacaoTicket = 0,
  isLoading = false,
  aiInsight = 'Suas vendas estão 12% acima da média do setor.',
  className,
}: WidgetVendasProps) {
  const [showAiTooltip, setShowAiTooltip] = useState(false);

  if (isLoading) {
    return (
      <Card className={cn(
        'relative overflow-hidden rounded-2xl border border-border/50',
        'bg-card/80 backdrop-blur-sm shadow-lg',
        'p-6',
        className
      )}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Skeleton className="h-8 w-28 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div>
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
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
        'hover:shadow-xl hover:border-emerald-500/30',
        'transition-all duration-300',
        'p-6',
        className
      )}>
        {/* Glassmorphism gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-foreground text-lg">Vendas</h3>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Total Vendas */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold text-foreground">
                {formatCurrency(totalVendas)}
              </span>
              {variacaoVendas !== 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    'flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full',
                    variacaoVendas > 0 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  )}
                >
                  {variacaoVendas > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {variacaoVendas > 0 ? '+' : ''}{variacaoVendas.toFixed(0)}%
                </motion.span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Total de Vendas</p>
          </div>

          {/* Ticket Médio */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold text-foreground">
                {formatCurrency(ticketMedio)}
              </span>
              {variacaoTicket !== 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    'flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full',
                    variacaoTicket > 0 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  )}
                >
                  {variacaoTicket > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {variacaoTicket > 0 ? '+' : ''}{variacaoTicket.toFixed(0)}%
                </motion.span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Ticket Médio</p>
          </div>
        </div>

        {/* AI Opinion Badge */}
        <TooltipProvider>
          <Tooltip open={showAiTooltip} onOpenChange={setShowAiTooltip}>
            <TooltipTrigger asChild>
              <motion.div 
                className="absolute bottom-3 right-3"
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

export default WidgetVendas;
