import { memo } from 'react';
import { MoreVertical, RefreshCw, ExternalLink, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface WidgetMenuProps {
  onRefresh?: () => void;
  onViewDetails?: () => void;
  onRemove?: () => void;
  detailsLabel?: string;
}

export const WidgetMenu = memo(function WidgetMenu({
  onRefresh,
  onViewDetails,
  onRemove,
  detailsLabel = 'Ver Detalhes',
}: WidgetMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {onRefresh && (
          <DropdownMenuItem onClick={onRefresh} className="cursor-pointer">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar Dados
          </DropdownMenuItem>
        )}
        {onViewDetails && (
          <DropdownMenuItem onClick={onViewDetails} className="cursor-pointer">
            <ExternalLink className="mr-2 h-4 w-4" />
            {detailsLabel}
          </DropdownMenuItem>
        )}
        {onRemove && (
          <DropdownMenuItem 
            onClick={onRemove} 
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <X className="mr-2 h-4 w-4" />
            Remover do Dashboard
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default WidgetMenu;
