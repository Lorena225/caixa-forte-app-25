import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  MoreVertical, 
  Play, 
  Pause, 
  Pencil, 
  History, 
  Trash2,
  Zap,
  TestTube,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Automation, TRIGGER_LABELS, TRIGGER_ICONS, ACTION_LABELS } from '@/types/automations';

interface AutomationCardProps {
  automation: Automation;
  onEdit: (id: string) => void;
  onViewHistory: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
  isToggling?: boolean;
  isTesting?: boolean;
}

export function AutomationCard({
  automation,
  onEdit,
  onViewHistory,
  onToggle,
  onTest,
  onDelete,
  isToggling,
  isTesting,
}: AutomationCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const triggerTypes = automation.triggers.map(t => t.type);
  const triggerLabel = triggerTypes.length > 0 
    ? TRIGGER_LABELS[triggerTypes[0]] || triggerTypes[0]
    : 'Sem trigger';
  const triggerIcon = triggerTypes.length > 0 
    ? TRIGGER_ICONS[triggerTypes[0]] || '⚡'
    : '⚡';

  const actionCount = automation.actions.length;
  const actionTypes = automation.actions.map(a => ACTION_LABELS[a.type] || a.type);

  const lastExecuted = automation.last_executed_at
    ? formatDistanceToNow(new Date(automation.last_executed_at), { 
        addSuffix: true, 
        locale: ptBR 
      })
    : 'Nunca executada';

  return (
    <>
      <Card className={`transition-all hover:shadow-md ${!automation.is_active ? 'opacity-60' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant={automation.is_active ? 'default' : 'secondary'}
                  className={automation.is_active ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  {automation.is_active ? '🟢 Ativa' : '🔴 Inativa'}
                </Badge>
                <h3 className="font-semibold text-foreground truncate">
                  {automation.name}
                </h3>
              </div>

              {/* Description */}
              {automation.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {automation.description}
                </p>
              )}

              {/* Info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span>{triggerIcon}</span>
                  <span>Trigger: {triggerLabel}</span>
                  {triggerTypes.length > 1 && (
                    <span className="text-xs">(+{triggerTypes.length - 1})</span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Ações: {actionCount}</span>
                </span>
                <span className="flex items-center gap-1">
                  <History className="h-3.5 w-3.5" />
                  <span>{lastExecuted}</span>
                </span>
                {automation.execution_count > 0 && (
                  <span className="text-xs">
                    ({automation.execution_count}x executada)
                  </span>
                )}
              </div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(automation.id)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewHistory(automation.id)}>
                  <History className="h-4 w-4 mr-2" />
                  Histórico
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onTest(automation.id)}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Testar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onToggle(automation.id, !automation.is_active)}
                  disabled={isToggling}
                >
                  {isToggling ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : automation.is_active ? (
                    <Pause className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {automation.is_active ? 'Desativar' : 'Ativar'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir automação?</AlertDialogTitle>
            <AlertDialogDescription>
              A automação "{automation.name}" será excluída permanentemente. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(automation.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
