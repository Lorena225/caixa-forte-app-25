import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MoreVertical, 
  Key, 
  KeyRound, 
  UserX, 
  CheckCircle, 
  Clock, 
  XCircle,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { UserProfile, Role } from '@/types/permissions';

interface UserCardProps {
  user: UserProfile;
  roles?: Role[];
  onRoleChange?: (roleId: string) => void;
  onOpenCustomPermissions?: () => void;
  onResetPassword?: () => void;
  onRemoveUser?: () => void;
  onClick?: () => void;
  isLoading?: boolean;
}

export const UserCard = memo(function UserCard({
  user,
  roles = [],
  onRoleChange,
  onOpenCustomPermissions,
  onResetPassword,
  onRemoveUser,
  onClick,
  isLoading,
}: UserCardProps) {
  if (isLoading) {
    return <UserCardSkeleton />;
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getStatusConfig = () => {
    if (!user.is_active) {
      return {
        icon: XCircle,
        label: 'Inativo',
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
      };
    }
    if (user.access_expires_at && new Date(user.access_expires_at) < new Date()) {
      return {
        icon: Clock,
        label: 'Expirado',
        color: 'text-warning',
        bgColor: 'bg-warning/10',
      };
    }
    if (!user.last_access_at) {
      return {
        icon: Mail,
        label: 'Pendente',
        color: 'text-warning',
        bgColor: 'bg-warning/10',
      };
    }
    return {
      icon: CheckCircle,
      label: 'Ativo',
      color: 'text-success',
      bgColor: 'bg-success/10',
    };
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  return (
    <Card
      className={cn(
        'group transition-all duration-200 hover:shadow-md',
        onClick && 'cursor-pointer hover:border-primary/50'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Usuário: ${user.full_name || user.email}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-foreground truncate">
                {user.full_name || 'Sem nome'}
              </h3>
              {user.has_custom_permissions && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 gap-1">
                  <Key className="h-2.5 w-2.5" />
                  Custom
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground truncate mb-2">
              {user.email || user.phone || 'Sem contato'}
            </p>

            <div className="flex items-center gap-3">
              {/* Role selector or badge */}
              {onRoleChange && roles.length > 0 ? (
                <Select
                  value={user.role_id || ''}
                  onValueChange={(value) => {
                    onRoleChange(value);
                  }}
                >
                  <SelectTrigger 
                    className="h-7 w-auto text-xs gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue placeholder="Sem papel" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  {user.role?.name || 'Sem papel'}
                </Badge>
              )}

              {/* Status */}
              <div className={cn('flex items-center gap-1 text-xs', status.color)}>
                <StatusIcon className="h-3.5 w-3.5" />
                <span>{status.label}</span>
              </div>
            </div>
          </div>

          {/* Created date */}
          <div className="hidden sm:block text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">Criado em</p>
            <p className="text-xs">
              {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => e.stopPropagation()}
                aria-label="Mais opções"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onOpenCustomPermissions}>
                <Key className="h-4 w-4 mr-2" />
                Permissões customizadas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onResetPassword}>
                <KeyRound className="h-4 w-4 mr-2" />
                Resetar senha
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onRemoveUser}
                className="text-destructive focus:text-destructive"
              >
                <UserX className="h-4 w-4 mr-2" />
                Remover usuário
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
});

UserCard.displayName = 'UserCard';

function UserCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-3">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export { UserCardSkeleton };
