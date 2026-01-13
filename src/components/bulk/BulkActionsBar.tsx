import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { X, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

export interface BulkAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  tooltip?: string;
}

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  totalAmount?: number;
  isProcessing?: boolean;
  progress?: { current: number; total: number };
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  actions,
  totalAmount,
  isProcessing,
  progress,
  className,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  const primaryActions = actions.slice(0, 2);
  const moreActions = actions.slice(2);

  return (
    <div
      className={cn(
        'sticky bottom-4 z-50 mx-auto w-fit',
        'flex items-center gap-3 rounded-lg border bg-primary px-4 py-3 shadow-lg',
        'animate-in slide-in-from-bottom-4 duration-200',
        className
      )}
    >
      {/* Selection Info */}
      <div className="flex items-center gap-2 text-primary-foreground">
        <span className="font-medium">
          {selectedCount} {selectedCount === 1 ? 'item selecionado' : 'itens selecionados'}
        </span>
        {totalAmount !== undefined && (
          <span className="text-primary-foreground/70">
            • Total: {formatCurrency(totalAmount)}
          </span>
        )}
      </div>

      {/* Clear Selection */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
      >
        <X className="h-4 w-4 mr-1" />
        Limpar
      </Button>

      <div className="h-6 w-px bg-primary-foreground/30" />

      {/* Processing State */}
      {isProcessing && progress ? (
        <div className="flex items-center gap-2 text-primary-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">
            Processando {progress.current} de {progress.total}...
          </span>
        </div>
      ) : (
        <>
          {/* Primary Actions */}
          {primaryActions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                action.variant !== 'destructive' && 'bg-primary-foreground text-primary hover:bg-primary-foreground/90'
              )}
            >
              {action.icon && <span className="mr-1.5">{action.icon}</span>}
              {action.label}
            </Button>
          ))}

          {/* More Actions Dropdown */}
          {moreActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  Mais ações
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {moreActions.map((action, index) => (
                  <div key={action.id}>
                    {index > 0 && action.variant === 'destructive' && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className={cn(
                        action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                      )}
                    >
                      {action.icon && <span className="mr-2">{action.icon}</span>}
                      {action.label}
                    </DropdownMenuItem>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      )}
    </div>
  );
}
