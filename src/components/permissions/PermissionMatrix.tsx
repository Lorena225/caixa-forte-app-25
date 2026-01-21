import { useState, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Eye, Plus, Pencil, Trash2, CheckCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import type { Permission, PermissionAction } from '@/types/permissions';

interface PermissionMatrixProps {
  selectedPermissions: Set<string>;
  onPermissionChange: (permissionId: string, checked: boolean) => void;
  loading?: boolean;
  readOnly?: boolean;
}

const ACTIONS: { key: PermissionAction; label: string; icon: typeof Eye; color: string }[] = [
  { key: 'ver', label: 'Ver', icon: Eye, color: 'text-success' },
  { key: 'criar', label: 'Criar', icon: Plus, color: 'text-primary' },
  { key: 'editar', label: 'Editar', icon: Pencil, color: 'text-warning' },
  { key: 'deletar', label: 'Deletar', icon: Trash2, color: 'text-destructive' },
  { key: 'aprovar', label: 'Aprovar', icon: CheckCircle, color: 'text-info' },
  { key: 'configurar', label: 'Config.', icon: Settings, color: 'text-muted-foreground' },
];

export const PermissionMatrix = memo(function PermissionMatrix({
  selectedPermissions,
  onPermissionChange,
  loading = false,
  readOnly = false,
}: PermissionMatrixProps) {
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allPermissions = [], isLoading } = usePermissions();

  // Get unique modules
  const modules = useMemo(() => {
    const set = new Set(allPermissions.map((p) => p.module));
    return Array.from(set).sort();
  }, [allPermissions]);

  // Group permissions by module and resource
  const groupedPermissions = useMemo(() => {
    let filtered = allPermissions;

    // Apply filters
    if (moduleFilter !== 'all') {
      filtered = filtered.filter((p) => p.module === moduleFilter);
    }
    if (actionFilter !== 'all') {
      filtered = filtered.filter((p) => p.action === actionFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.resource?.toLowerCase().includes(query) ||
          p.module.toLowerCase().includes(query)
      );
    }

    // Group by module -> resource
    const groups: Record<string, Record<string, Permission[]>> = {};
    filtered.forEach((perm) => {
      const module = perm.module || 'Outros';
      const resource = perm.resource || 'Geral';
      if (!groups[module]) groups[module] = {};
      if (!groups[module][resource]) groups[module][resource] = [];
      groups[module][resource].push(perm);
    });

    return groups;
  }, [allPermissions, moduleFilter, actionFilter, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = allPermissions.length;
    const selected = selectedPermissions.size;
    const percentage = total > 0 ? (selected / total) * 100 : 0;
    return { total, selected, percentage };
  }, [allPermissions, selectedPermissions]);

  const getPermissionForAction = (
    permissions: Permission[],
    action: PermissionAction
  ): Permission | undefined => {
    return permissions.find((p) => p.action === action);
  };

  if (isLoading || loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 flex-1" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Matriz de Permissões</CardTitle>
          <Badge variant="secondary">
            {stats.selected} / {stats.total} selecionadas
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os módulos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os módulos</SelectItem>
              {modules.map((module) => (
                <SelectItem key={module} value={module}>
                  {module}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Todas as ações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {ACTIONS.map((action) => (
                <SelectItem key={action.key} value={action.key}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar recurso..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Matrix Table */}
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[250px]">Módulo / Recurso</TableHead>
                {ACTIONS.map((action) => (
                  <TableHead key={action.key} className="w-[80px] text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center">
                            <action.icon className={cn('h-4 w-4', action.color)} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{action.label}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                ))}
                <TableHead className="w-[60px] text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedPermissions).map(([module, resources]) =>
                Object.entries(resources).map(([resource, permissions], resourceIndex) => {
                  const rowSelected = permissions.filter((p) =>
                    selectedPermissions.has(p.id)
                  ).length;

                  return (
                    <TableRow
                      key={`${module}-${resource}`}
                      className={cn(resourceIndex % 2 === 0 && 'bg-muted/30')}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">{module}</span>
                          <span className="text-sm">{resource}</span>
                        </div>
                      </TableCell>
                      {ACTIONS.map((action) => {
                        const perm = getPermissionForAction(permissions, action.key);
                        if (!perm) {
                          return (
                            <TableCell key={action.key} className="text-center">
                              <span className="text-muted-foreground/30">—</span>
                            </TableCell>
                          );
                        }

                        const isChecked = selectedPermissions.has(perm.id);
                        return (
                          <TableCell key={action.key} className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-center">
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) =>
                                        onPermissionChange(perm.id, !!checked)
                                      }
                                      disabled={readOnly}
                                      aria-label={`${action.label} ${resource}`}
                                      className={cn(
                                        isChecked && action.color.replace('text-', 'border-')
                                      )}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">{perm.name}</p>
                                  {perm.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {perm.description}
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <Badge
                          variant={rowSelected > 0 ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {rowSelected}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {Object.keys(groupedPermissions).length === 0 && (
                <TableRow>
                  <TableCell colSpan={ACTIONS.length + 2} className="text-center py-8">
                    <p className="text-muted-foreground">Nenhuma permissão encontrada</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Footer Stats */}
        <div className="flex items-center gap-4 pt-2">
          <div className="flex-1">
            <Progress value={stats.percentage} className="h-2" />
          </div>
          <span className="text-sm text-muted-foreground shrink-0">
            {stats.selected} de {stats.total} permissões ({stats.percentage.toFixed(0)}%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
});

PermissionMatrix.displayName = 'PermissionMatrix';
