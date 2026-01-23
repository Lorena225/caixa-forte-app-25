import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Undo2, Redo2, Plus, Check, X, Sparkles } from 'lucide-react';

interface EditModeToolbarProps {
  onSave: () => void;
  onCancel: () => void;
  onAddWidget?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isSaving?: boolean;
  hasChanges?: boolean;
  className?: string;
}

export const EditModeToolbar = memo(function EditModeToolbar({
  onSave,
  onCancel,
  onAddWidget,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isSaving = false,
  hasChanges = false,
  className,
}: EditModeToolbarProps) {
  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 transform -translate-x-1/2',
      'bg-card rounded-xl shadow-2xl border border-border',
      'px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-1.5 sm:gap-2',
      'z-[100]',
      'animate-in slide-in-from-bottom-4 fade-in duration-300',
      className
    )}>
      {/* Edit Mode Indicator */}
      <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-md mr-1">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">Modo Edição</span>
      </div>

      <Separator orientation="vertical" className="hidden sm:block h-6 bg-border" />

      {/* Undo */}
      <Button 
        variant="ghost" 
        size="sm"
        className="h-8 sm:h-9 px-2 sm:px-3 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40"
        onClick={onUndo}
        disabled={!canUndo || isSaving}
        title="Desfazer (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
        <span className="hidden lg:inline ml-1.5">Desfazer</span>
      </Button>

      {/* Redo */}
      <Button 
        variant="ghost" 
        size="sm"
        className="h-8 sm:h-9 px-2 sm:px-3 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40"
        onClick={onRedo}
        disabled={!canRedo || isSaving}
        title="Refazer (Ctrl+Y)"
      >
        <Redo2 className="h-4 w-4" />
        <span className="hidden lg:inline ml-1.5">Refazer</span>
      </Button>

      <Separator orientation="vertical" className="h-6 bg-border" />

      {/* Add Widget */}
      {onAddWidget && (
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 sm:h-9 px-2 sm:px-3 text-muted-foreground hover:text-primary hover:bg-primary/10"
          onClick={onAddWidget}
          disabled={isSaving}
          title="Adicionar Widget"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline ml-1.5">Adicionar</span>
        </Button>
      )}

      <Separator orientation="vertical" className="h-6 bg-border" />

      {/* Cancel */}
      <Button 
        variant="ghost"
        size="sm"
        className="h-8 sm:h-9 px-2 sm:px-3 text-muted-foreground hover:text-foreground hover:bg-muted"
        onClick={onCancel}
        disabled={isSaving}
      >
        <X className="h-4 w-4" />
        <span className="hidden sm:inline ml-1.5">Cancelar</span>
      </Button>

      {/* Save */}
      <Button 
        size="sm"
        className={cn(
          'h-8 sm:h-9 px-3 sm:px-4 rounded-lg',
          'font-semibold text-sm',
          'disabled:opacity-50'
        )}
        onClick={onSave}
        disabled={isSaving}
      >
        <Check className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline">{isSaving ? 'Salvando...' : 'Salvar'}</span>
      </Button>
    </div>
  );
});

EditModeToolbar.displayName = 'EditModeToolbar';
