import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  CheckCircle2,
  XCircle,
  Bell
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificacaoIA {
  id: string;
  tipo: 'anomalia' | 'alerta' | 'sucesso' | 'tendencia' | 'info';
  titulo: string;
  mensagem: string;
  timestamp: Date;
  lida?: boolean;
}

interface WidgetFeedIAProps {
  notificacoes: NotificacaoIA[];
  isLoading?: boolean;
  aiInsight?: string;
  className?: string;
  onMarkAsRead?: (id: string) => void;
}

const tipoConfig = {
  anomalia: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-500/20',
    borderColor: 'border-red-500/30',
  },
  alerta: {
    icon: Bell,
    color: 'text-amber-500',
    bgColor: 'bg-amber-100 dark:bg-amber-500/20',
    borderColor: 'border-amber-500/30',
  },
  sucesso: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-100 dark:bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
  },
  tendencia: {
    icon: TrendingUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-500/20',
    borderColor: 'border-blue-500/30',
  },
  info: {
    icon: Sparkles,
    color: 'text-violet-500',
    bgColor: 'bg-violet-100 dark:bg-violet-500/20',
    borderColor: 'border-violet-500/30',
  },
};

export const WidgetFeedIA = memo(function WidgetFeedIA({
  notificacoes,
  isLoading = false,
  aiInsight = 'Monitoramento ativo: 3 anomalias detectadas nas últimas 24h.',
  className,
  onMarkAsRead,
}: WidgetFeedIAProps) {
  const [showAiTooltip, setShowAiTooltip] = useState(false);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

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
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
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
        'hover:shadow-xl hover:border-violet-500/30',
        'transition-all duration-300 p-6',
        className
      )}>
        {/* Glassmorphism gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Radio className="w-6 h-6 text-white" />
              </div>
              {/* Live indicator */}
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-card"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-lg">Feed de IA</h3>
                {naoLidas > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    {naoLidas} novas
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Notificações em tempo real</p>
            </div>
          </div>
        </div>

        {/* Notifications Feed */}
        <ScrollArea className="h-[220px] relative z-10">
          <div className="space-y-2 pr-2">
            <AnimatePresence>
              {notificacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Sparkles className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma notificação recente</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    A IA está monitorando seus dados
                  </p>
                </div>
              ) : (
                notificacoes.map((notif, index) => {
                  const config = tipoConfig[notif.tipo];
                  const IconComponent = config.icon;

                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => onMarkAsRead?.(notif.id)}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-xl cursor-pointer',
                        'border transition-all duration-200',
                        !notif.lida 
                          ? 'bg-violet-50/50 dark:bg-violet-500/5 border-violet-500/20' 
                          : 'bg-background/50 border-border/30',
                        'hover:bg-background/80'
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                        config.bgColor
                      )}>
                        <IconComponent className={cn('w-4 h-4', config.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={cn(
                            'text-sm font-medium text-foreground truncate',
                            !notif.lida && 'font-semibold'
                          )}>
                            {notif.titulo}
                          </h4>
                          {!notif.lida && (
                            <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notif.mensagem}
                        </p>
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground/70">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(notif.timestamp, { addSuffix: true, locale: ptBR })}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
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

export default WidgetFeedIA;
