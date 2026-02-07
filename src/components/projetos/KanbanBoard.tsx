import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Plus, Clock, GripVertical, MoreHorizontal, 
  CheckCircle2, AlertTriangle, User
} from "lucide-react";
import { 
  useProjectTasks, useUpdateTask, useCreateTask, 
  ProjectTask 
} from "@/hooks/useProjects";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const statusColumns = [
  { id: 'a_fazer', label: 'A Fazer', color: 'bg-slate-100 border-slate-300' },
  { id: 'fazendo', label: 'Fazendo', color: 'bg-blue-100 border-blue-300' },
  { id: 'revisao', label: 'Revisão', color: 'bg-amber-100 border-amber-300' },
  { id: 'feito', label: 'Feito', color: 'bg-green-100 border-green-300' },
];

const priorityColors: Record<string, string> = {
  baixa: 'border-l-slate-400',
  media: 'border-l-blue-400',
  alta: 'border-l-orange-400',
  urgente: 'border-l-red-500',
};

interface KanbanBoardProps {
  projectId: string;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { data: tasks, isLoading } = useProjectTasks(projectId);
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newTaskColumn, setNewTaskColumn] = useState<string>('a_fazer');
  const [newTaskData, setNewTaskData] = useState({ title: '', description: '' });

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    
    if (draggedTask) {
      await updateTask.mutateAsync({
        id: draggedTask,
        status: newStatus as ProjectTask['status'],
      });
    }
    
    setDraggedTask(null);
  };

  const handleAddTask = (columnId: string) => {
    setNewTaskColumn(columnId);
    setNewTaskData({ title: '', description: '' });
    setShowNewTaskDialog(true);
  };

  const handleCreateTask = async () => {
    if (!newTaskData.title.trim()) return;
    
    await createTask.mutateAsync({
      project_id: projectId,
      title: newTaskData.title,
      description: newTaskData.description || undefined,
      status: newTaskColumn as ProjectTask['status'],
      priority: 'media',
      estimated_hours: 0,
      sort_order: 0,
      tags: [],
    });
    
    setShowNewTaskDialog(false);
    setNewTaskData({ title: '', description: '' });
  };

  const getTasksByStatus = (status: string) => {
    return (tasks || []).filter(t => t.status === status);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {statusColumns.map((col) => (
          <Card key={col.id} className={cn("min-h-[500px]", col.color)}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        {statusColumns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          
          return (
            <Card 
              key={column.id} 
              className={cn("min-h-[500px] border-2", column.color)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {column.label}
                    <Badge variant="secondary" className="text-xs">
                      {columnTasks.length}
                    </Badge>
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => handleAddTask(column.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3 px-3">
                {columnTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    isDragging={draggedTask === task.id}
                  />
                ))}
                
                {columnTasks.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Sem tarefas
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => handleAddTask(column.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog para nova tarefa */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={newTaskData.title}
                onChange={(e) => setNewTaskData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título da tarefa"
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newTaskData.description}
                onChange={(e) => setNewTaskData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição opcional"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTaskDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateTask} 
              disabled={!newTaskData.title.trim() || createTask.isPending}
            >
              Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface TaskCardProps {
  task: ProjectTask;
  onDragStart: (e: React.DragEvent) => void;
  isDragging: boolean;
}

function TaskCard({ task, onDragStart, isDragging }: TaskCardProps) {
  const priorityColor = priorityColors[task.priority] || priorityColors.media;
  
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all border-l-4",
        priorityColor,
        isDragging && "opacity-50 rotate-2 scale-95"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm line-clamp-2">{task.title}</p>
            
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
            
            <div className="flex items-center gap-3 mt-2">
              {task.estimated_hours > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{task.actual_hours}/{task.estimated_hours}h</span>
                </div>
              )}
              
              {task.due_date && (
                <div className="text-xs text-muted-foreground">
                  {format(new Date(task.due_date), 'dd/MM')}
                </div>
              )}
              
              {task.assignee && (
                <Avatar className="h-5 w-5">
                  <AvatarImage src={task.assignee.avatar_url} />
                  <AvatarFallback className="text-[10px]">
                    {task.assignee.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Editar</DropdownMenuItem>
              <DropdownMenuItem>Atribuir</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Arquivar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
