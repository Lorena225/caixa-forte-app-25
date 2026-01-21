import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Eye, Plus, Pencil, Trash2, CheckCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Permission, PermissionAction } from '@/types/permissions';

interface PermissionBadgeProps {
  permission: Permission;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const actionConfig: Record<string, { icon: typeof Eye; color: string; label: string }> = {
  ver: { icon: Eye, color: 'bg-success/10 text-success border-success/20', label: 'Ver' },
  criar: { icon: Plus, color: 'bg-primary/10 text-primary border-primary/20', label: 'Criar' },
  editar: { icon: Pencil, color: 'bg-warning/10 text-warning border-warning/20', label: 'Editar' },
  deletar: { icon: Trash2, color: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Deletar' },
  aprovar: { icon: CheckCircle, color: 'bg-info/10 text-info border-info/20', label: 'Aprovar' },
  configurar: { icon: Settings, color: 'bg-muted-foreground/10 text-muted-foreground border-muted/20', label: 'Configurar' },
};

const sizeStyles = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
};

export const PermissionBadge = memo(function PermissionBadge({
  permission,
  onRemove,
  size = 'md',
  showIcon = true,
  className,
}: PermissionBadgeProps) {
  const action = (permission.action as PermissionAction) || 'ver';
  const config = actionConfig[action] || actionConfig.ver;
  const Icon = config.icon;

  const iconSize = size === 'sm' ? 10 : size === 'md' ? 12 : 14;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'inline-flex items-center border transition-colors',
              config.color,
              sizeStyles[size],
              onRemove && 'pr-1',
              className
            )}
          >
            {showIcon && <Icon className="shrink-0" size={iconSize} />}
            <span className="truncate max-w-[120px]">{permission.name}</span>
            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-background/50 transition-colors"
                aria-label={`Remover permissão ${permission.name}`}
              >
                <X size={iconSize} />
              </button>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px]">
          <div className="space-y-1">
            <p className="font-medium">{permission.name}</p>
            {permission.description && (
              <p className="text-xs text-muted-foreground">{permission.description}</p>
            )}
            <p className="text-xs">
              <span className="text-muted-foreground">Módulo:</span> {permission.module}
              {permission.resource && (
                <>
                  {' · '}
                  <span className="text-muted-foreground">Recurso:</span> {permission.resource}
                </>
              )}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

PermissionBadge.displayName = 'PermissionBadge';

// Action badge for showing just the action type
interface ActionBadgeProps {
  action: PermissionAction | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ActionBadge = memo(function ActionBadge({
  action,
  size = 'sm',
  className,
}: ActionBadgeProps) {
  const config = actionConfig[action] || actionConfig.ver;
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 10 : size === 'md' ? 12 : 14;

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center border',
        config.color,
        sizeStyles[size],
        className
      )}
    >
      <Icon size={iconSize} />
      <span>{config.label}</span>
    </Badge>
  );
});

ActionBadge.displayName = 'ActionBadge';
