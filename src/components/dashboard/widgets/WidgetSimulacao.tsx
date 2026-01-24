import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, TrendingDown, Sparkles, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WidgetMenu } from './WidgetMenu';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface WidgetSimulacaoProps {
  saldoAtual?: number;
  receitaMensal?: number;
  isLoading?: boolean;
  aiInsight?: string;
  onRefresh?: () => void;
  onViewDetails?: () => void;
  onRemove?: () => void;
  className?: string;
}

export const WidgetSimulacao = memo(function WidgetSimulacao({
  saldoAtual = 125000,
  receitaMensal = 85000,
  isLoading = false,
  aiInsight = 'Uma queda de 20% nas vendas reduziria seu fluxo de caixa em R$ 17.000/mês.',
  onRefresh,
  onViewDetails,
  onRemove,
  className,
}: WidgetSimulacaoProps) {
  const [showAiTooltip, setShowAiTooltip] = useState(false);
  const [variacao, setVariacao] = useState([0]); // -50 to +50

  const impactoMensal = (receitaMensal * variacao[0]) / 100;
  const novaReceita = receitaMensal + impactoMensal;
  const impactoFluxo = impactoMensal;
  const projecao90Dias = saldoAtual + (impactoFluxo * 3);

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
          <Skeleton className="h-8 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
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
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Simulação What-If</h3>
              <p className="text-xs text-muted-foreground">Impacto no fluxo de caixa</p>
            </div>
          </div>
          <WidgetMenu
            onRefresh={onRefresh}
            onViewDetails={onViewDetails}
            onRemove={onRemove}
            detailsLabel="Ver Projeções"
          />
        </div>

        {/* Slider */}
        <div className="space-y-4 mb-6 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Variação nas vendas</span>
            <span className={cn(
              'text-sm font-semibold',
              variacao[0] > 0 ? 'text-emerald-600' : variacao[0] < 0 ? 'text-red-600' : 'text-muted-foreground'
            )}>
              {variacao[0] > 0 ? '+' : ''}{variacao[0]}%
            </span>
          </div>
          <Slider
            value={variacao}
            onValueChange={setVariacao}
            min={-50}
            max={50}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-50%</span>
            <span>0%</span>
            <span>+50%</span>
          </div>
        </div>

        {/* Impact Grid */}
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-muted/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              {impactoMensal >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">Impacto Mensal</span>
            </div>
            <p className={cn(
              'text-lg font-bold',
              impactoMensal >= 0 ? 'text-emerald-600' : 'text-red-600'
            )}>
              {impactoMensal >= 0 ? '+' : ''}{formatCurrency(impactoMensal)}
            </p>
          </div>

          <div className="bg-muted/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRight className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Projeção 90 dias</span>
            </div>
            <p className={cn(
              'text-lg font-bold',
              projecao90Dias >= saldoAtual ? 'text-emerald-600' : 'text-red-600'
            )}>
              {formatCurrency(projecao90Dias)}
            </p>
          </div>
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

export default WidgetSimulacao;
