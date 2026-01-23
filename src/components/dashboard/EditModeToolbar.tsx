import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Undo2, 
  Redo2, 
  LayoutGrid, 
  Check, 
  X, 
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface EditModeToolbarProps {
  onSave: () => void;
  onCancel: () => void;
  onManageWidgets: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onResetToDefaults?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isSaving?: boolean;
  hasChanges?: boolean;
  className?: string;
}

export const EditModeToolbar = memo(function EditModeToolbar({
  onSave,
  onCancel,
  onManageWidgets,
  onUndo,
  onRedo,
  onResetToDefaults,
  canUndo = false,
  canRedo = false,
  isSaving = false,
  hasChanges = false,
  className,
}: EditModeToolbarProps) {
  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 transform -translate-x-1/2',
      'bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl',
      'border border-border/50',
      'px-2 sm:px-3 py-2 flex items-center gap-1',
      'z-[100]',
      'animate-in slide-in-from-bottom-4 fade-in duration-300',
      className
    )}>
      {/* Edit Mode Indicator */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 rounded-lg mr-1">
        <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
        <span className="text-xs font-semibold text-primary">Modo Edição</span>
        {hasChanges && (
          <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-amber-500/20 text-amber-600 border-0">
            Alterado
          </Badge>
        )}
      </div>

      <Separator orientation="vertical" className="hidden sm:block h-7 bg-border/50" />

      {/* Undo/Redo Group */}
      <div className="flex items-center gap-0.5 px-1">
        <Button 
          variant="ghost" 
          size="sm"
          className={cn(
            'h-9 w-9 p-0 rounded-lg',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            'disabled:opacity-30'
          )}
          onClick={onUndo}
          disabled={!canUndo || isSaving}
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="sm"
          className={cn(
            'h-9 w-9 p-0 rounded-lg',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            'disabled:opacity-30'
          )}
          onClick={onRedo}
          disabled={!canRedo || isSaving}
          title="Refazer (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-7 bg-border/50" />

      {/* Manage Widgets */}
      <Button 
        variant="ghost" 
        size="sm"
        className={cn(
          'h-9 px-3 rounded-lg gap-1.5',
          'text-muted-foreground hover:text-primary hover:bg-primary/10',
          'transition-colors duration-200'
        )}
        onClick={onManageWidgets}
        disabled={isSaving}
        title="Gerenciar Widgets"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden md:inline text-sm">Widgets</span>
      </Button>

      {/* Reset to Defaults */}
      {onResetToDefaults && (
        <Button 
          variant="ghost" 
          size="sm"
          className={cn(
            'h-9 px-3 rounded-lg gap-1.5',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            'transition-colors duration-200'
          )}
          onClick={onResetToDefaults}
          disabled={isSaving}
          title="Restaurar Padrão"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="hidden lg:inline text-sm">Restaurar</span>
        </Button>
      )}

      <Separator orientation="vertical" className="h-7 bg-border/50" />

      {/* Cancel */}
      <Button 
        variant="ghost"
        size="sm"
        className={cn(
          'h-9 px-3 rounded-lg gap-1.5',
          'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
          'transition-colors duration-200'
        )}
        onClick={onCancel}
        disabled={isSaving}
      >
        <X className="h-4 w-4" />
        <span className="hidden sm:inline text-sm">Cancelar</span>
      </Button>

      {/* Save */}
      <Button 
        size="sm"
        className={cn(
          'h-9 px-4 rounded-lg gap-1.5',
          'font-semibold text-sm',
          'bg-primary hover:bg-primary/90',
          'shadow-lg shadow-primary/20',
          'disabled:opacity-50',
          'transition-all duration-200'
        )}
        onClick={onSave}
        disabled={isSaving || !hasChanges}
      >
        <Check className="h-4 w-4" />
        <span className="hidden sm:inline">{isSaving ? 'Salvando...' : 'Salvar'}</span>
      </Button>
    </div>
  );
});

EditModeToolbar.displayName = 'EditModeToolbar';
