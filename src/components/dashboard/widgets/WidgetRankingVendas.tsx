import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WidgetMenu } from './WidgetMenu';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface ProdutoRanking {
  id: string;
  nome: string;
  valorTotal: number;
  quantidadeVendida: number;
  margemLucro: number;
  variacao: number;
}

interface WidgetRankingVendasProps {
  produtos?: ProdutoRanking[];
  isLoading?: boolean;
  aiInsight?: string;
  onRefresh?: () => void;
  onViewDetails?: () => void;
  onRemove?: () => void;
  className?: string;
}

const defaultProdutos: ProdutoRanking[] = [
  { id: '1', nome: 'Consultoria Estratégica', valorTotal: 85000, quantidadeVendida: 12, margemLucro: 65, variacao: 15 },
  { id: '2', nome: 'Licença Software Pro', valorTotal: 62000, quantidadeVendida: 45, margemLucro: 80, variacao: 8 },
  { id: '3', nome: 'Treinamento In-Company', valorTotal: 48000, quantidadeVendida: 8, margemLucro: 55, variacao: -5 },
  { id: '4', nome: 'Suporte Premium', valorTotal: 35000, quantidadeVendida: 120, margemLucro: 70, variacao: 22 },
  { id: '5', nome: 'Implementação ERP', valorTotal: 28000, quantidadeVendida: 3, margemLucro: 45, variacao: 10 },
];

const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#94a3b8', '#64748b'];

export const WidgetRankingVendas = memo(function WidgetRankingVendas({
  produtos = defaultProdutos,
  isLoading = false,
  aiInsight = 'Consultoria Estratégica lidera com 65% de margem. Foque na expansão deste serviço.',
  onRefresh,
  onViewDetails,
  onRemove,
  className,
}: WidgetRankingVendasProps) {
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
          {[1, 2, 3, 4, 5].map(i => (
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
        'hover:shadow-xl hover:border-yellow-500/30',
        'transition-all duration-300 p-6',
        className
      )}>
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-amber-500/5 pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/25">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Ranking de Vendas</h3>
              <p className="text-xs text-muted-foreground">Top 5 mais rentáveis do mês</p>
            </div>
          </div>
          <WidgetMenu
            onRefresh={onRefresh}
            onViewDetails={onViewDetails}
            onRemove={onRemove}
            detailsLabel="Ver Vendas"
          />
        </div>

        {/* Ranking List */}
        <div className="space-y-2.5 relative z-10">
          {produtos.slice(0, 5).map((produto, index) => (
            <motion.div
              key={produto.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="flex items-center gap-3 bg-muted/30 rounded-lg p-3"
            >
              {/* Position Medal */}
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: medalColors[index] }}
              >
                {index + 1}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {produto.nome}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{produto.quantidadeVendida} vendas</span>
                  <span>•</span>
                  <span className="text-emerald-600">{produto.margemLucro}% margem</span>
                </div>
              </div>

              {/* Value and Trend */}
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(produto.valorTotal)}
                </p>
                <div className={cn(
                  'flex items-center justify-end gap-0.5 text-xs',
                  produto.variacao >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {produto.variacao >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {produto.variacao >= 0 ? '+' : ''}{produto.variacao}%
                </div>
              </div>
            </motion.div>
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

export default WidgetRankingVendas;
