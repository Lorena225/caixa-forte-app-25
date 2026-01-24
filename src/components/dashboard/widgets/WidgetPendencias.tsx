import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowUpCircle, ArrowDownCircle, Sparkles, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Pendencia {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'pagar' | 'receber';
  vencimento: string;
  diasVencido?: number;
}

interface WidgetPendenciasProps {
  pendencias: Pendencia[];
  isLoading?: boolean;
  aiInsight?: string;
  className?: string;
}

export const WidgetPendencias = memo(function WidgetPendencias({
  pendencias,
  isLoading = false,
  aiInsight = 'Atenção: 3 contas vencem hoje totalizando R$ 5.400.',
  className,
}: WidgetPendenciasProps) {
  const [showAiTooltip, setShowAiTooltip] = useState(false);

  const totalPagar = pendencias
    .filter(p => p.tipo === 'pagar')
    .reduce((sum, p) => sum + p.valor, 0);
  
  const totalReceber = pendencias
    .filter(p => p.tipo === 'receber')
    .reduce((sum, p) => sum + p.valor, 0);

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
            <Skeleton className="h-6 w-36" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
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
        'hover:shadow-xl hover:border-amber-500/30',
        'transition-all duration-300 p-6',
        className
      )}>
        {/* Glassmorphism gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Pendências do Dia</h3>
              <p className="text-xs text-muted-foreground">{pendencias.length} contas vencendo</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-500/10">
            <ArrowUpCircle className="w-4 h-4 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">A Pagar</p>
              <p className="font-semibold text-red-600 dark:text-red-400 text-sm">
                {formatCurrency(totalPagar)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
            <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">A Receber</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                {formatCurrency(totalReceber)}
              </p>
            </div>
          </div>
        </div>

        {/* Pendencias List */}
        <ScrollArea className="h-[140px] relative z-10">
          <div className="space-y-2">
            {pendencias.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma pendência para hoje</p>
              </div>
            ) : (
              pendencias.map((pendencia, index) => (
                <motion.div
                  key={pendencia.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg',
                    'bg-background/50 border border-border/30',
                    'hover:bg-background/80 transition-colors'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      pendencia.tipo === 'pagar' 
                        ? 'bg-red-100 dark:bg-red-500/20' 
                        : 'bg-emerald-100 dark:bg-emerald-500/20'
                    )}>
                      {pendencia.tipo === 'pagar' 
                        ? <ArrowUpCircle className="w-4 h-4 text-red-500" />
                        : <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate max-w-[150px]">
                        {pendencia.descricao}
                      </p>
                      <p className="text-xs text-muted-foreground">{pendencia.vencimento}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'text-sm font-semibold',
                      pendencia.tipo === 'pagar' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                    )}>
                      {formatCurrency(pendencia.valor)}
                    </p>
                    {pendencia.diasVencido && pendencia.diasVencido > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {pendencia.diasVencido}d atraso
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>

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

export default WidgetPendencias;
