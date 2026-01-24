import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WidgetMenu } from './WidgetMenu';
import { cn } from '@/lib/utils';

interface ProdutoCritico {
  id: string;
  nome: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  unidade: string;
}

interface WidgetEstoqueCriticoProps {
  produtos?: ProdutoCritico[];
  isLoading?: boolean;
  aiInsight?: string;
  onRefresh?: () => void;
  onViewDetails?: () => void;
  onRemove?: () => void;
  className?: string;
}

const defaultProdutos: ProdutoCritico[] = [
  { id: '1', nome: 'Papel A4 Resma', estoqueAtual: 15, estoqueMinimo: 50, unidade: 'un' },
  { id: '2', nome: 'Toner HP 85A', estoqueAtual: 2, estoqueMinimo: 10, unidade: 'un' },
  { id: '3', nome: 'Cabo USB-C', estoqueAtual: 8, estoqueMinimo: 25, unidade: 'un' },
  { id: '4', nome: 'Mouse Wireless', estoqueAtual: 3, estoqueMinimo: 15, unidade: 'un' },
];

export const WidgetEstoqueCritico = memo(function WidgetEstoqueCritico({
  produtos = defaultProdutos,
  isLoading = false,
  aiInsight = 'Você tem 4 produtos com estoque crítico. Recomendo pedido urgente para evitar ruptura.',
  onRefresh,
  onViewDetails,
  onRemove,
  className,
}: WidgetEstoqueCriticoProps) {
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
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
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
        'hover:shadow-xl hover:border-red-500/30',
        'transition-all duration-300 p-6',
        className
      )}>
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5 pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/25">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Estoque Crítico</h3>
              <p className="text-xs text-muted-foreground">{produtos.length} produtos abaixo do mínimo</p>
            </div>
          </div>
          <WidgetMenu
            onRefresh={onRefresh}
            onViewDetails={onViewDetails}
            onRemove={onRemove}
            detailsLabel="Ver Estoque"
          />
        </div>

        {/* Product List */}
        <div className="space-y-3 relative z-10 max-h-64 overflow-y-auto">
          {produtos.slice(0, 5).map((produto, index) => {
            const percentual = (produto.estoqueAtual / produto.estoqueMinimo) * 100;
            const isCritico = percentual < 30;
            
            return (
              <motion.div
                key={produto.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-muted/30 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground truncate flex-1 mr-2">
                    {produto.nome}
                  </span>
                  {isCritico && (
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Progress 
                    value={percentual} 
                    className={cn(
                      'h-2 flex-1',
                      isCritico ? '[&>div]:bg-red-500' : '[&>div]:bg-amber-500'
                    )}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {produto.estoqueAtual}/{produto.estoqueMinimo} {produto.unidade}
                  </span>
                </div>
              </motion.div>
            );
          })}
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

export default WidgetEstoqueCritico;
