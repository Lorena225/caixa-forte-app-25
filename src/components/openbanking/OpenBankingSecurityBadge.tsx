import { memo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OpenBankingSecurityBadgeProps {
  variant?: 'compact' | 'full' | 'inline';
  className?: string;
  showTooltip?: boolean;
}

export const OpenBankingSecurityBadge = memo(function OpenBankingSecurityBadge({
  variant = 'full',
  className,
  showTooltip = true,
}: OpenBankingSecurityBadgeProps) {
  const badge = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center gap-2 rounded-lg border transition-colors',
        variant === 'compact' && 'p-1.5 bg-success/5 border-success/20',
        variant === 'full' && 'p-3 bg-gradient-to-r from-success/10 to-success/5 border-success/20',
        variant === 'inline' && 'px-2 py-1 bg-success/10 border-success/20 text-xs',
        className
      )}
    >
      <div className={cn(
        'flex items-center justify-center rounded-md bg-success/20',
        variant === 'compact' && 'p-1',
        variant === 'full' && 'p-2',
        variant === 'inline' && 'p-0.5',
      )}>
        <Shield className={cn(
          'text-success',
          variant === 'compact' && 'h-3.5 w-3.5',
          variant === 'full' && 'h-5 w-5',
          variant === 'inline' && 'h-3 w-3',
        )} />
      </div>
      
      {variant !== 'compact' && (
        <div className="flex-1">
          <div className={cn(
            'font-medium text-success flex items-center gap-1',
            variant === 'inline' ? 'text-xs' : 'text-sm'
          )}>
            <Lock className="h-3 w-3" />
            Conexão Criptografada
          </div>
          {variant === 'full' && (
            <p className="text-xs text-muted-foreground mt-0.5">
              via Open Banking Brasil • Regulado pelo Banco Central
            </p>
          )}
        </div>
      )}
      
      {variant === 'full' && (
        <CheckCircle className="h-4 w-4 text-success" />
      )}
    </motion.div>
  );

  if (!showTooltip || variant === 'full') {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-1">
              <Shield className="h-3 w-3 text-success" />
              Conexão Segura Open Banking
            </p>
            <p className="text-xs text-muted-foreground">
              Seus dados são transmitidos via protocolo OAuth 2.0 diretamente com a instituição financeira. 
              Nenhuma credencial é armazenada em nossos servidores.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
