import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface IARecommendation {
  id: string;
  tipo: 'otimizacao' | 'alerta' | 'oportunidade' | 'insight';
  titulo: string;
  descricao: string;
  impacto?: string;
  prioridade: 'alta' | 'media' | 'baixa';
}

interface WidgetIAInsightProps {
  recommendations: IARecommendation[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const tipoConfig = {
  otimizacao: {
    icon: TrendingUp,
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  alerta: {
    icon: AlertTriangle,
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  oportunidade: {
    icon: Lightbulb,
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-500/10 via-cyan-500/5 to-transparent',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  insight: {
    icon: Brain,
    gradient: 'from-violet-500 to-purple-500',
    bgGradient: 'from-violet-500/10 via-purple-500/5 to-transparent',
    textColor: 'text-violet-600 dark:text-violet-400',
  },
};

export const WidgetIAInsight = memo(function WidgetIAInsight({
  recommendations,
  isLoading = false,
  onRefresh,
  className,
}: WidgetIAInsightProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Auto-rotate recommendations
  useEffect(() => {
    if (recommendations.length <= 1) return;
    
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % recommendations.length);
        setIsAnimating(false);
      }, 300);
    }, 8000);

    return () => clearInterval(interval);
  }, [recommendations.length]);

  if (isLoading) {
    return (
      <Card className={cn(
        'relative overflow-hidden rounded-2xl border border-border/50',
        'bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent',
        'backdrop-blur-xl shadow-lg p-6',
        className
      )}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-14 h-14 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </Card>
    );
  }

  const currentRec = recommendations[currentIndex] || {
    id: 'default',
    tipo: 'insight' as const,
    titulo: 'Análise em andamento',
    descricao: 'A IA está analisando seus dados financeiros para gerar recomendações personalizadas.',
    prioridade: 'media' as const,
  };

  const config = tipoConfig[currentRec.tipo];
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className={cn(
        'relative overflow-hidden rounded-2xl border border-violet-500/20',
        'bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/5',
        'backdrop-blur-xl shadow-lg',
        'hover:shadow-xl hover:border-violet-500/40',
        'transition-all duration-300 p-6',
        className
      )}>
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-10 right-10 w-32 h-32 bg-violet-500/20 rounded-full blur-3xl"
            animate={{
              x: [0, 20, 0],
              y: [0, -20, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-10 left-10 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl"
            animate={{
              x: [0, -15, 0],
              y: [0, 15, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-4">
            <motion.div 
              className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center',
                'bg-gradient-to-br shadow-lg',
                config.gradient
              )}
              animate={{ 
                boxShadow: [
                  '0 0 20px rgba(139, 92, 246, 0.3)',
                  '0 0 40px rgba(139, 92, 246, 0.5)',
                  '0 0 20px rgba(139, 92, 246, 0.3)',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Brain className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-lg">CFO Virtual</h3>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-4 h-4 text-violet-500" />
                </motion.div>
              </div>
              <p className="text-xs text-muted-foreground">Análise inteligente em tempo real</p>
            </div>
          </div>

          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              className="h-8 w-8 rounded-lg hover:bg-violet-500/10"
            >
              <RefreshCw className="w-4 h-4 text-violet-500" />
            </Button>
          )}
        </div>

        {/* Recommendation Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRec.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isAnimating ? 0 : 1, y: isAnimating ? -10 : 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="relative z-10"
          >
            <div className={cn(
              'p-4 rounded-xl border',
              'bg-gradient-to-r',
              config.bgGradient,
              'border-border/30'
            )}>
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                  'bg-gradient-to-br',
                  config.gradient
                )}>
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={cn('font-semibold text-sm', config.textColor)}>
                      {currentRec.titulo}
                    </h4>
                    {currentRec.prioridade === 'alta' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                        Prioritário
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {currentRec.descricao}
                  </p>
                  {currentRec.impacto && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                      💰 Impacto: {currentRec.impacto}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Pagination dots */}
        {recommendations.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4 relative z-10">
            {recommendations.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-200',
                  index === currentIndex 
                    ? 'bg-violet-500 w-4' 
                    : 'bg-violet-500/30 hover:bg-violet-500/50'
                )}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
});

export default WidgetIAInsight;
