import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CFOVirtualHeroProps {
  healthStatus: 'excellent' | 'good' | 'attention' | 'risk';
  savingsRate: number;
  projectedBalance: number;
  onViewAnalysis?: () => void;
  isLoading?: boolean;
}

export const CFOVirtualHero = memo(function CFOVirtualHero({
  healthStatus,
  savingsRate,
  projectedBalance,
  onViewAnalysis,
  isLoading = false,
}: CFOVirtualHeroProps) {
  const insight = useMemo(() => {
    if (healthStatus === 'excellent') {
      return {
        title: 'Excelente Performance Financeira',
        message: `Sua empresa está economizando ${savingsRate.toFixed(0)}% da receita. Continue assim para maximizar seu capital de giro.`,
        icon: TrendingUp,
        mood: 'positive',
      };
    }
    if (healthStatus === 'good') {
      return {
        title: 'Saúde Financeira Estável',
        message: `Taxa de poupança de ${savingsRate.toFixed(0)}%. Há oportunidades para otimizar custos operacionais.`,
        icon: TrendingUp,
        mood: 'neutral',
      };
    }
    if (healthStatus === 'attention') {
      return {
        title: 'Atenção ao Fluxo de Caixa',
        message: `Projeção indica saldo de R$ ${projectedBalance.toFixed(0)} ao final do mês. Revise despesas variáveis.`,
        icon: AlertTriangle,
        mood: 'warning',
      };
    }
    return {
      title: 'Alerta: Risco Financeiro Detectado',
      message: `Despesas superam receitas. Projeção negativa de R$ ${Math.abs(projectedBalance).toFixed(0)} para o mês.`,
      icon: TrendingDown,
      mood: 'danger',
    };
  }, [healthStatus, savingsRate, projectedBalance]);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-slate-800/50 to-slate-700/50 p-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-600/50 rounded mb-4" />
        <div className="h-4 w-full bg-slate-600/50 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-2xl p-6 lg:p-8',
        'bg-gradient-to-br from-[hsl(var(--cfo-gradient-start))] via-[hsl(var(--cfo-gradient-mid))] to-[hsl(var(--cfo-gradient-end))]',
        'border border-white/10 shadow-xl'
      )}
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 backdrop-blur-xl bg-white/5" />
      
      {/* Animated background orbs */}
      <motion.div
        className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Content */}
        <div className="flex items-start gap-4 flex-1">
          {/* Icon */}
          <motion.div
            className={cn(
              'flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center',
              'bg-white/10 backdrop-blur-sm border border-white/20'
            )}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Brain className="w-7 h-7 text-white" />
          </motion.div>

          <div className="space-y-2">
            {/* Badge */}
            <motion.div 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span className="text-xs font-medium text-white/90">CFO Virtual</span>
            </motion.div>

            {/* Title */}
            <motion.h2
              className="text-xl lg:text-2xl font-bold text-white tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {insight.title}
            </motion.h2>

            {/* Message */}
            <motion.p
              className="text-white/80 text-sm lg:text-base max-w-xl leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {insight.message}
            </motion.p>
          </div>
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={onViewAnalysis}
            variant="secondary"
            className={cn(
              'group relative overflow-hidden',
              'bg-white/10 hover:bg-white/20 text-white border-white/20',
              'backdrop-blur-sm transition-all duration-300',
              'px-6 py-3 h-auto rounded-xl font-medium'
            )}
          >
            <span className="relative z-10 flex items-center gap-2">
              Ver Análise Completa
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Button>
        </motion.div>
      </div>

      {/* Status indicator dots */}
      <motion.div
        className="absolute top-4 right-4 flex items-center gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full',
              insight.mood === 'positive' && 'bg-emerald-400',
              insight.mood === 'neutral' && 'bg-blue-400',
              insight.mood === 'warning' && 'bg-amber-400',
              insight.mood === 'danger' && 'bg-red-400'
            )}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
});

export default CFOVirtualHero;
