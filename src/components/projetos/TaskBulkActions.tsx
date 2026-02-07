import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { BulkActionsBar, BulkAction } from "@/components/bulk";
import { 
  Users, Calendar, Archive, Trash2, CheckCircle2, 
  AlertTriangle
} from "lucide-react";
import { useUpdateTasksBulk, useCompanyUsers, ProjectTask } from "@/hooks/useProjects";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

interface TaskBulkActionsProps {
  tasks: ProjectTask[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function TaskBulkActions({ tasks, selectedIds, onSelectionChange }: TaskBulkActionsProps) {
  const { data: users } = useCompanyUsers();
  const updateTasksBulk = useUpdateTasksBulk();
  
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDeadlineDialog, setShowDeadlineDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  
  const [assignTo, setAssignTo] = useState("");
  const [newDeadline, setNewDeadline] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));

  const handleAssign = async () => {
    if (!assignTo) {
      toast.error("Selecione um responsável");
      return;
    }
    
    await updateTasksBulk.mutateAsync({
      ids: selectedIds,
      data: { assigned_to: assignTo },
    });
    
    setShowAssignDialog(false);
    setAssignTo("");
    onSelectionChange([]);
  };

  const handleChangeDeadline = async () => {
    await updateTasksBulk.mutateAsync({
      ids: selectedIds,
      data: { due_date: newDeadline },
    });
    
    setShowDeadlineDialog(false);
    onSelectionChange([]);
  };

  const handleArchive = async () => {
    await updateTasksBulk.mutateAsync({
      ids: selectedIds,
      data: { status: 'arquivado' as ProjectTask['status'] },
    });
    
    setShowArchiveDialog(false);
    onSelectionChange([]);
    toast.success(`${selectedIds.length} tarefa(s) arquivada(s)`);
  };

  const handleMarkDone = async () => {
    await updateTasksBulk.mutateAsync({
      ids: selectedIds,
      data: { 
        status: 'feito' as ProjectTask['status'],
        completed_at: new Date().toISOString(),
      },
    });
    
    onSelectionChange([]);
    toast.success(`${selectedIds.length} tarefa(s) concluída(s)`);
  };

  const bulkActions: BulkAction[] = [
    {
      id: 'assign',
      label: 'Alterar Responsável',
      icon: <Users className="h-4 w-4" />,
      variant: 'default',
      onClick: () => setShowAssignDialog(true),
    },
    {
      id: 'deadline',
      label: 'Mudar Prazo',
      icon: <Calendar className="h-4 w-4" />,
      variant: 'default',
      onClick: () => setShowDeadlineDialog(true),
    },
    {
      id: 'done',
      label: 'Marcar Concluído',
      icon: <CheckCircle2 className="h-4 w-4" />,
      variant: 'default',
      onClick: handleMarkDone,
    },
    {
      id: 'archive',
      label: 'Arquivar',
      icon: <Archive className="h-4 w-4" />,
      variant: 'destructive',
      onClick: () => setShowArchiveDialog(true),
    },
  ];

  return (
    <>
      <BulkActionsBar
        selectedCount={selectedIds.length}
        actions={bulkActions}
        onClearSelection={() => onSelectionChange([])}
      />

      {/* Dialog: Alterar Responsável */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alterar Responsável
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Atribuir <Badge variant="secondary">{selectedIds.length} tarefa(s)</Badge> para:
            </p>
            
            <div className="space-y-2">
              <Label>Novo Responsável</Label>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={!assignTo || updateTasksBulk.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Mudar Prazo */}
      <Dialog open={showDeadlineDialog} onOpenChange={setShowDeadlineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Alterar Prazo
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Definir novo prazo para <Badge variant="secondary">{selectedIds.length} tarefa(s)</Badge>:
            </p>
            
            <div className="space-y-2">
              <Label>Nova Data de Entrega</Label>
              <Input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeadlineDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleChangeDeadline}
              disabled={updateTasksBulk.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Arquivar */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Arquivar Tarefas
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja arquivar <Badge variant="destructive">{selectedIds.length} tarefa(s)</Badge>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              As tarefas arquivadas não aparecerão mais no Kanban, mas poderão ser restauradas posteriormente.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleArchive}
              disabled={updateTasksBulk.isPending}
            >
              Arquivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Selection checkbox component for use in task cards
interface TaskSelectionCheckboxProps {
  taskId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function TaskSelectionCheckbox({ taskId, selectedIds, onSelectionChange }: TaskSelectionCheckboxProps) {
  const isSelected = selectedIds.includes(taskId);
  
  const handleChange = (checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, taskId]);
    } else {
      onSelectionChange(selectedIds.filter(id => id !== taskId));
    }
  };

  return (
    <Checkbox
      checked={isSelected}
      onCheckedChange={handleChange}
      className="mr-2"
      onClick={(e) => e.stopPropagation()}
    />
  );
}
