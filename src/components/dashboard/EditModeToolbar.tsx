import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Undo2, Redo2, Plus, Check, X } from 'lucide-react';

interface EditModeToolbarProps {
  onSave: () => void;
  onCancel: () => void;
  onAddWidget?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isSaving?: boolean;
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
  className,
}: EditModeToolbarProps) {
  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 transform -translate-x-1/2',
      'bg-white rounded-xl shadow-2xl border border-gray-200',
      'px-4 py-3 flex items-center gap-2',
      'z-[100]',
      'animate-fade-in',
      className
    )}>
      {/* Undo */}
      <Button 
        variant="ghost" 
        size="sm"
        className="h-9 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40"
        onClick={onUndo}
        disabled={!canUndo || isSaving}
        title="Desfazer"
      >
        <Undo2 className="h-4 w-4 mr-1.5" />
        <span className="hidden sm:inline">Desfazer</span>
      </Button>

      <Separator orientation="vertical" className="h-6 bg-gray-200" />

      {/* Redo */}
      <Button 
        variant="ghost" 
        size="sm"
        className="h-9 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40"
        onClick={onRedo}
        disabled={!canRedo || isSaving}
        title="Refazer"
      >
        <Redo2 className="h-4 w-4 mr-1.5" />
        <span className="hidden sm:inline">Refazer</span>
      </Button>

      <Separator orientation="vertical" className="h-6 bg-gray-200" />

      {/* Add Widget */}
      <Button 
        variant="ghost" 
        size="sm"
        className="h-9 px-3 text-gray-600 hover:text-primary hover:bg-blue-50"
        onClick={onAddWidget}
        disabled={isSaving}
        title="Adicionar Widget"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        <span className="hidden sm:inline">Adicionar Widget</span>
      </Button>

      <Separator orientation="vertical" className="h-6 bg-gray-200" />

      {/* Save */}
      <Button 
        size="sm"
        className={cn(
          'h-9 px-4 bg-primary text-white rounded-lg',
          'hover:bg-primary-dark',
          'font-semibold text-sm',
          'disabled:opacity-50'
        )}
        onClick={onSave}
        disabled={isSaving}
      >
        <Check className="h-4 w-4 mr-1.5" />
        {isSaving ? 'Salvando...' : 'Salvar Layout'}
      </Button>

      {/* Cancel */}
      <Button 
        variant="outline"
        size="sm"
        className="h-9 px-4 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        onClick={onCancel}
        disabled={isSaving}
      >
        <X className="h-4 w-4 mr-1.5" />
        Cancelar
      </Button>
    </div>
  );
});

EditModeToolbar.displayName = 'EditModeToolbar';
