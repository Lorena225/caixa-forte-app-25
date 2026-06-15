import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, KanbanSquare, Clock } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useProjectTasks, useCreateTask, useUpdateTaskStatus } from '@/hooks/useProjectModule';
import { format, addDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const COLUMNS = [
  { key: 'todo', label: 'A fazer', accent: 'border-t-slate-400' },
  { key: 'in_progress', label: 'Em andamento', accent: 'border-t-blue-500' },
  { key: 'blocked', label: 'Bloqueada', accent: 'border-t-red-500' },
  { key: 'done', label: 'Concluída', accent: 'border-t-emerald-500' },
];

export default function KanbanProjetos() {
  const { data: projects = [] } = useProjects({ status: 'todos', search: '' });
  const [projectId, setProjectId] = useState<string>('');
  const { data: tasks = [], isLoading } = useProjectTasks(projectId || null);
  const createTask = useCreateTask();
  const updateStatus = useUpdateTaskStatus();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', start_date: format(new Date(), 'yyyy-MM-dd'), due_date: format(addDays(new Date(), 5), 'yyyy-MM-dd'), estimated_hours: '' });
  const [dragId, setDragId] = useState<string | null>(null);

  const submit = () => {
    if (!projectId || !form.title) return;
    createTask.mutate({
      project_id: projectId, title: form.title, start_date: form.start_date,
      due_date: form.due_date, estimated_hours: Number(form.estimated_hours || 0),
    }, { onSuccess: () => { setOpen(false); setForm({ ...form, title: '', estimated_hours: '' }); } });
  };

  const tasksByStatus = (status: string) => tasks.filter((t: any) => (t.status ?? 'todo') === status);

  const onDrop = (status: string) => {
    if (dragId) {
      const task = tasks.find((t: any) => t.id === dragId);
      if (task && task.status !== status) updateStatus.mutate({ id: dragId, status });
      setDragId(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader title="Kanban de Tarefas"
          description="Quadro de tarefas por status — arraste os cartões entre as colunas" />

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <Label>Projeto</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {projectId && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Tarefa</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Título</Label>
                        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Início</Label>
                          <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                        <div><Label>Fim</Label>
                          <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                      </div>
                      <div><Label>Horas estimadas</Label>
                        <Input type="number" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} /></div>
                    </div>
                    <DialogFooter><Button onClick={submit} disabled={createTask.isPending}>
                      {createTask.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Adicionar</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        {!projectId ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <KanbanSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Selecione um projeto para ver o quadro de tarefas.</p>
          </CardContent></Card>
        ) : isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const colTasks = tasksByStatus(col.key);
              return (
                <div key={col.key}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(col.key)}
                  className="min-h-[200px]">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-sm font-medium">{col.label}</span>
                    <Badge variant="secondary">{colTasks.length}</Badge>
                  </div>
                  <div className={cn('space-y-2 rounded-lg bg-muted/30 p-2 border-t-2 min-h-[160px]', col.accent)}>
                    {colTasks.map((t: any) => (
                      <div key={t.id} draggable
                        onDragStart={() => setDragId(t.id)}
                        className="bg-background border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm">
                        <p className="text-sm font-medium">{t.title}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {t.estimated_hours ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.estimated_hours}h</span> : null}
                          {t.due_date && <span>{format(parseISO(t.due_date), 'dd/MM')}</span>}
                        </div>
                      </div>
                    ))}
                    {colTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Vazio</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
