import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';

interface EditModeToolbarProps {
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  className?: string;
}

export const EditModeToolbar = memo(function EditModeToolbar({
  onSave,
  onCancel,
  isSaving = false,
  className,
}: EditModeToolbarProps) {
  return (
    <div className={cn(
      'bg-white border border-gray-200 rounded-lg px-6 py-3',
      'flex items-center justify-between',
      'sticky top-[64px] z-[98]',
      'shadow-sm',
      className
    )}>
      {/* Left - Info */}
      <div className="flex items-center gap-2">
        <Pencil className="h-4 w-4 text-[#0066CC]" />
        <span className="text-sm font-semibold text-[#0066CC]">
          Modo de Edição Ativado
        </span>
      </div>

      {/* Right - Buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 px-4 bg-white border border-gray-200 rounded-md',
            'text-[13px] text-gray-700',
            'hover:border-gray-300 hover:bg-gray-50'
          )}
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancelar
        </Button>
        <Button
          size="sm"
          className={cn(
            'h-9 px-4 bg-[#0066CC] text-white rounded-md',
            'text-[13px] font-semibold',
            'hover:bg-[#0052A3]',
            'disabled:opacity-50'
          )}
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  );
});

EditModeToolbar.displayName = 'EditModeToolbar';
