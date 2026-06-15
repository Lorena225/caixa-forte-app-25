import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

/**
 * Estado vazio premium — substitui os "Sem dados" secos por um bloco guiado,
 * com ícone, título, explicação e (opcionalmente) uma ação que ensina o próximo
 * passo. Distingue 4 contextos para o dashboard não parecer "quebrado":
 *  - 'empty'      : sem dados ainda (onboarding) → guia a ação
 *  - 'no-results' : filtro sem resultado → sugere limpar filtro
 *  - 'no-data'    : sem dados no período → neutro, informativo
 *  - 'error'      : falha ao carregar → ação de retry
 */
type Variant = 'empty' | 'no-results' | 'no-data' | 'error';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  variant?: Variant;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon, title, description, variant = 'empty',
  action, secondaryAction, className, compact,
}: Props) {
  const accent =
    variant === 'error' ? 'text-destructive bg-destructive/10'
    : variant === 'no-data' ? 'text-muted-foreground bg-muted'
    : 'text-primary bg-primary/10';

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-8' : 'py-14',
      className,
    )}>
      {Icon && (
        <div className={cn('rounded-2xl p-3 mb-4', accent)}>
          <Icon className="h-7 w-7" />
        </div>
      )}
      <p className="font-semibold text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 mt-5">
          {action && <Button size="sm" onClick={action.onClick}>{action.label}</Button>}
          {secondaryAction && (
            <Button size="sm" variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
