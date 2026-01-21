import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ShieldCheck, Pencil, Copy, Trash2, Users, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role } from '@/types/permissions';

interface RoleCardProps {
  role: Role;
  permissionCount?: { granted: number; total: number };
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  isLoading?: boolean;
}

export const RoleCard = memo(function RoleCard({
  role,
  permissionCount = { granted: 0, total: 50 },
  onEdit,
  onDuplicate,
  onDelete,
  onClick,
  isLoading,
}: RoleCardProps) {
  const isSystem = role.is_system;
  const userCount = role.user_count || 0;

  if (isLoading) {
    return <RoleCardSkeleton />;
  }

  return (
    <Card
      className={cn(
        'group transition-all duration-200 hover:shadow-md',
        onClick && 'cursor-pointer hover:border-primary/50'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Papel: ${role.name}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={cn(
              'shrink-0 rounded-lg p-2.5',
              isSystem
                ? 'bg-primary/10 text-primary'
                : 'bg-success/10 text-success'
            )}
          >
            {isSystem ? <ShieldCheck className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{role.name}</h3>
              {isSystem && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                  Sistema
                </Badge>
              )}
            </div>
            
            {role.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {role.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="gap-1.5 text-xs">
                      <Key className="h-3 w-3" />
                      {permissionCount.granted} / {permissionCount.total}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {permissionCount.granted} permissões concedidas de {permissionCount.total} disponíveis
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1.5">
                        {[...Array(Math.min(userCount, 3))].map((_, i) => (
                          <Avatar key={i} className="h-5 w-5 border-2 border-background">
                            <AvatarFallback className="text-[8px] bg-muted">
                              {String.fromCharCode(65 + i)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {userCount} {userCount === 1 ? 'usuário' : 'usuários'}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {userCount} {userCount === 1 ? 'usuário possui' : 'usuários possuem'} este papel
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.();
                    }}
                    aria-label="Editar papel"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate?.();
                    }}
                    aria-label="Duplicar papel"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicar</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.();
                    }}
                    disabled={isSystem}
                    aria-label="Excluir papel"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isSystem ? 'Papéis de sistema não podem ser excluídos' : 'Excluir'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

RoleCard.displayName = 'RoleCard';

function RoleCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-3">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { RoleCardSkeleton };
