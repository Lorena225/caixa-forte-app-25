import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  X, 
  ShoppingCart, 
  Target, 
  Receipt, 
  FileText,
  Zap,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const quickActions = [
  {
    id: 'nova-venda',
    label: 'Lançar Venda',
    icon: ShoppingCart,
    route: '/vendas/nova',
    color: 'bg-emerald-500 hover:bg-emerald-600',
  },
  {
    id: 'nova-meta',
    label: 'Nova Meta',
    icon: Target,
    route: '/metas/nova',
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    id: 'nova-receita',
    label: 'Nova Receita',
    icon: ArrowDownCircle,
    route: '/lancamentos?tipo=receita',
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    id: 'nova-despesa',
    label: 'Nova Despesa',
    icon: ArrowUpCircle,
    route: '/lancamentos?tipo=despesa',
    color: 'bg-amber-500 hover:bg-amber-600',
  },
];

interface FloatingQuickActionsProps {
  className?: string;
}

export const FloatingQuickActions = memo(function FloatingQuickActions({ 
  className 
}: FloatingQuickActionsProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('fixed bottom-6 right-6 z-50', className)}>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Action buttons */}
            <motion.div
              className="absolute bottom-16 right-0 flex flex-col gap-3"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.id}
                  variants={{
                    hidden: { opacity: 0, x: 20, scale: 0.8 },
                    visible: { opacity: 1, x: 0, scale: 1 },
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex items-center gap-3 justify-end"
                >
                  {/* Label tooltip */}
                  <motion.span
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium text-white whitespace-nowrap',
                      'bg-slate-800/90 backdrop-blur-sm shadow-lg'
                    )}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                  >
                    {action.label}
                  </motion.span>
                  
                  {/* Action button */}
                  <Button
                    size="icon"
                    className={cn(
                      'w-12 h-12 rounded-full shadow-lg text-white',
                      action.color
                    )}
                    onClick={() => {
                      navigate(action.route);
                      setIsOpen(false);
                    }}
                  >
                    <action.icon className="w-5 h-5" />
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-14 h-14 rounded-full shadow-xl transition-all duration-300',
            'bg-gradient-to-br from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90',
            'text-white border-0'
          )}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Zap className="w-6 h-6" />
            )}
          </motion.div>
        </Button>
      </motion.div>

      {/* Pulse animation when closed */}
      {!isOpen && (
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/30"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
});

export default FloatingQuickActions;
