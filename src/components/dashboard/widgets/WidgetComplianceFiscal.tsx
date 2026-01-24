import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileCheck, CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WidgetMenu } from './WidgetMenu';
import { cn } from '@/lib/utils';

interface ObrigacaoFiscal {
  id: string;
  nome: string;
  vencimento: string;
  status: 'entregue' | 'pendente' | 'atrasado';
  tipo: string;
}

interface WidgetComplianceFiscalProps {
  obrigacoes?: ObrigacaoFiscal[];
  isLoading?: boolean;
  aiInsight?: string;
  onRefresh?: () => void;
  onViewDetails?: () => void;
  onRemove?: () => void;
  className?: string;
}

const defaultObrigacoes: ObrigacaoFiscal[] = [
  { id: '1', nome: 'SPED Fiscal', vencimento: '15/02/2025', status: 'entregue', tipo: 'Federal' },
  { id: '2', nome: 'ECD', vencimento: '28/02/2025', status: 'pendente', tipo: 'Federal' },
  { id: '3', nome: 'DCTFWeb', vencimento: '15/02/2025', status: 'entregue', tipo: 'Federal' },
  { id: '4', nome: 'GFIP', vencimento: '07/02/2025', status: 'atrasado', tipo: 'Federal' },
  { id: '5', nome: 'ISS Mensal', vencimento: '10/02/2025', status: 'entregue', tipo: 'Municipal' },
  { id: '6', nome: 'ECF', vencimento: '31/07/2025', status: 'pendente', tipo: 'Federal' },
];

const statusConfig = {
  entregue: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    label: 'Entregue',
  },
  pendente: {
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Pendente',
  },
  atrasado: {
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Atrasado',
  },
};

export const WidgetComplianceFiscal = memo(function WidgetComplianceFiscal({
  obrigacoes = defaultObrigacoes,
  isLoading = false,
  aiInsight = 'GFIP está em atraso! Regularize para evitar multas de até 20% sobre o valor devido.',
  onRefresh,
  onViewDetails,
  onRemove,
  className,
}: WidgetComplianceFiscalProps) {
  const [showAiTooltip, setShowAiTooltip] = useState(false);

  const entregues = obrigacoes.filter(o => o.status === 'entregue').length;
  const pendentes = obrigacoes.filter(o => o.status === 'pendente').length;
  const atrasados = obrigacoes.filter(o => o.status === 'atrasado').length;

  const scorePercent = (entregues / obrigacoes.length) * 100;

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
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-full" />
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
        'hover:shadow-xl hover:border-indigo-500/30',
        'transition-all duration-300 p-6',
        className
      )}>
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Compliance Fiscal</h3>
              <p className="text-xs text-muted-foreground">
                Score: <span className={cn(
                  'font-semibold',
                  scorePercent >= 80 ? 'text-emerald-500' : scorePercent >= 50 ? 'text-amber-500' : 'text-red-500'
                )}>{scorePercent.toFixed(0)}%</span>
              </p>
            </div>
          </div>
          <WidgetMenu
            onRefresh={onRefresh}
            onViewDetails={onViewDetails}
            onRemove={onRemove}
            detailsLabel="Ver Obrigações"
          />
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-emerald-600">{entregues}</p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">Entregues</p>
          </div>
          <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-amber-600">{pendentes}</p>
            <p className="text-[10px] text-amber-700 dark:text-amber-400">Pendentes</p>
          </div>
          <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-red-600">{atrasados}</p>
            <p className="text-[10px] text-red-700 dark:text-red-400">Atrasados</p>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2 max-h-40 overflow-y-auto relative z-10">
          {obrigacoes.slice(0, 6).map((obrigacao, index) => {
            const config = statusConfig[obrigacao.status];
            const Icon = config.icon;
            
            return (
              <motion.div
                key={obrigacao.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon className={cn('w-4 h-4 shrink-0', config.color)} />
                  <span className="text-sm text-foreground truncate">{obrigacao.nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{obrigacao.vencimento}</span>
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', config.bg, config.color)}>
                    {config.label}
                  </Badge>
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

export default WidgetComplianceFiscal;
