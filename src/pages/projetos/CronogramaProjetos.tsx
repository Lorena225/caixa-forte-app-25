import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, GanttChartSquare, Loader2, LayoutTemplate, CalendarRange, Link2, X as XIcon, AlertTriangle } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useProjectTasks, useCreateTask, useUpdateTaskStatus, useTemplates, useApplyTemplate,
  useTaskDependencies, useCreateDependency, useDeleteDependency } from '@/hooks/useProjectModule';
import { computeCriticalPath } from '@/lib/criticalPath';
import { differenceInDays, format, addDays, max, min, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const statusColor: Record<string, string> = {
  todo: 'bg-slate-400', in_progress: 'bg-blue-500', done: 'bg-emerald-500', blocked: 'bg-red-500',
};
const statusLabel: Record<string, string> = {
  todo: 'A fazer', in_progress: 'Em andamento', done: 'Concluída', blocked: 'Bloqueada',
};

export default function CronogramaProjetos() {
  const { data: projects = [] } = useProjects({ status: 'todos', search: '' });
  const [projectId, setProjectId] = useState<string>('');
  const { data: tasks = [], isLoading } = useProjectTasks(projectId || null);
  const { data: deps = [] } = useTaskDependencies(projectId || null);
  const { data: templates = [] } = useTemplates();
  const createTask = useCreateTask();
  const updateStatus = useUpdateTaskStatus();
  const applyTemplate = useApplyTemplate();
  const createDep = useCreateDependency();
  const deleteDep = useDeleteDependency();

  // Caminho crítico (CPM) sobre as tarefas com datas
  const cpm = useMemo(() => {
    const cpmTasks = tasks
      .filter((t: any) => t.start_date && t.due_date)
      .map((t: any) => ({
        id: t.id,
        duration: Math.max(differenceInDays(parseISO(t.due_date), parseISO(t.start_date)) + 1, 1),
      }));
    const cpmEdges = deps.map((d: any) => ({ predecessor_id: d.predecessor_id, successor_id: d.successor_id }));
    return computeCriticalPath(cpmTasks, cpmEdges);
  }, [tasks, deps]);

  const taskName = (id: string) => tasks.find((t: any) => t.id === id)?.title ?? '—';

  const [open, setOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [form, setForm] = useState({ title: '', start_date: format(new Date(), 'yyyy-MM-dd'), due_date: format(addDays(new Date(), 5), 'yyyy-MM-dd'), estimated_hours: '' });
  const [tplForm, setTplForm] = useState({ template_id: '', start_date: format(new Date(), 'yyyy-MM-dd') });
  const [depOpen, setDepOpen] = useState(false);
  const [depForm, setDepForm] = useState({ predecessor_id: '', successor_id: '' });

  // janela temporal do gantt
  const { startWindow, totalDays } = useMemo(() => {
    const withDates = tasks.filter((t: any) => t.start_date && t.due_date);
    if (withDates.length === 0) return { startWindow: new Date(), totalDays: 30 };
    const starts = withDates.map((t: any) => parseISO(t.start_date));
    const ends = withDates.map((t: any) => parseISO(t.due_date));
    const sw = min(starts); const ew = max(ends);
    return { startWindow: sw, totalDays: Math.max(differenceInDays(ew, sw) + 2, 7) };
  }, [tasks]);

  const submit = () => {
    if (!projectId || !form.title) return;
    createTask.mutate({
      project_id: projectId, title: form.title, start_date: form.start_date,
      due_date: form.due_date, estimated_hours: Number(form.estimated_hours || 0),
    }, { onSuccess: () => { setOpen(false); setForm({ ...form, title: '', estimated_hours: '' }); } });
  };

  const applyTpl = () => {
    if (!projectId || !tplForm.template_id) return;
    applyTemplate.mutate({ projectId, templateId: tplForm.template_id, startDate: tplForm.start_date },
      { onSuccess: () => setTplOpen(false) });
  };

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader title="Cronograma"
          description="Linha do tempo de tarefas por projeto, com aplicação de templates de estrutura" />

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
                <>
                  <Dialog open={tplOpen} onOpenChange={setTplOpen}>
                    <DialogTrigger asChild><Button variant="outline"><LayoutTemplate className="h-4 w-4 mr-1" />Aplicar template</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Aplicar template de projeto</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>Template</Label>
                          <Select value={tplForm.template_id} onValueChange={(v) => setTplForm({ ...tplForm, template_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>{templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                          </Select></div>
                        <div><Label>Data de início</Label>
                          <Input type="date" value={tplForm.start_date} onChange={(e) => setTplForm({ ...tplForm, start_date: e.target.value })} /></div>
                        {templates.length === 0 && <p className="text-xs text-muted-foreground">Nenhum template cadastrado. Crie um em Templates de Projeto.</p>}
                      </div>
                      <DialogFooter><Button onClick={applyTpl} disabled={applyTemplate.isPending || !tplForm.template_id}>
                        {applyTemplate.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Aplicar</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={depOpen} onOpenChange={setDepOpen}>
                    <DialogTrigger asChild><Button variant="outline"><Link2 className="h-4 w-4 mr-1" />Dependências</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Dependências entre tarefas</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">A tarefa sucessora só pode iniciar após a predecessora terminar (finish-start). Define o caminho crítico.</p>
                        <div><Label>Predecessora (termina antes)</Label>
                          <Select value={depForm.predecessor_id} onValueChange={(v) => setDepForm({ ...depForm, predecessor_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>{tasks.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                          </Select></div>
                        <div><Label>Sucessora (depende da anterior)</Label>
                          <Select value={depForm.successor_id} onValueChange={(v) => setDepForm({ ...depForm, successor_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>{tasks.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                          </Select></div>
                        <Button size="sm" disabled={createDep.isPending || !depForm.predecessor_id || !depForm.successor_id}
                          onClick={() => createDep.mutate({ project_id: projectId, ...depForm },
                            { onSuccess: () => setDepForm({ predecessor_id: '', successor_id: '' }) })}>
                          {createDep.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Adicionar dependência
                        </Button>
                        {cpm.hasCycle && (
                          <Alert variant="destructive"><AlertTriangle className="h-4 w-4" />
                            <AlertDescription>Há um ciclo de dependências. Remova uma das ligações para o caminho crítico ser calculável.</AlertDescription>
                          </Alert>
                        )}
                        {deps.length > 0 && (
                          <div className="space-y-1 pt-2 max-h-48 overflow-auto">
                            {deps.map((d: any) => (
                              <div key={d.id} className="flex items-center justify-between text-sm border rounded p-2">
                                <span className="truncate">{taskName(d.predecessor_id)} → {taskName(d.successor_id)}</span>
                                <Button size="sm" variant="ghost" onClick={() => deleteDep.mutate(d.id)}><XIcon className="h-3 w-3" /></Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
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
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {!projectId ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <CalendarRange className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Selecione um projeto para ver o cronograma.</p>
          </CardContent></Card>
        ) : isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : tasks.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <GanttChartSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhuma tarefa neste projeto.</p>
            <p className="text-sm">Adicione tarefas ou aplique um template para montar o cronograma.</p>
          </CardContent></Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2"><GanttChartSquare className="h-4 w-4" />Linha do tempo</span>
              {!cpm.hasCycle && cpm.criticalPath.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  Caminho crítico: <span className="text-red-600 font-medium">{cpm.projectDuration} dias</span> · {cpm.criticalPath.length} tarefa(s)
                </span>
              )}
            </CardTitle></CardHeader>
            <CardContent>
              {cpm.hasCycle && (
                <Alert variant="destructive" className="mb-4"><AlertTriangle className="h-4 w-4" />
                  <AlertDescription>Ciclo de dependências detectado — o caminho crítico não pode ser calculado até que seja resolvido.</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                {tasks.map((t: any) => {
                  const hasDates = t.start_date && t.due_date;
                  const offset = hasDates ? differenceInDays(parseISO(t.start_date), startWindow) : 0;
                  const span = hasDates ? Math.max(differenceInDays(parseISO(t.due_date), parseISO(t.start_date)) + 1, 1) : 1;
                  const leftPct = (offset / totalDays) * 100;
                  const widthPct = (span / totalDays) * 100;
                  const r = cpm.results[t.id];
                  const isCritical = r?.critical && !cpm.hasCycle;
                  const slack = r?.slack ?? 0;
                  return (
                    <div key={t.id} className="grid grid-cols-[200px_1fr] gap-3 items-center">
                      <div className="min-w-0">
                        <p className={cn('text-sm font-medium truncate flex items-center gap-1', isCritical && 'text-red-600')}>
                          {isCritical && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                          {t.title}
                        </p>
                        <button className="text-xs text-muted-foreground hover:underline"
                          onClick={() => {
                            const next = t.status === 'todo' ? 'in_progress' : t.status === 'in_progress' ? 'done' : 'todo';
                            updateStatus.mutate({ id: t.id, status: next });
                          }}>
                          {statusLabel[t.status] ?? t.status} ↻
                        </button>
                        {hasDates && !cpm.hasCycle && (
                          <p className="text-[10px] text-muted-foreground">
                            {isCritical ? 'Crítica · folga 0' : `folga ${slack}d`}
                          </p>
                        )}
                      </div>
                      <div className="relative h-7 bg-muted/40 rounded">
                        {hasDates && (
                          <div className={cn('absolute h-5 top-1 rounded text-[10px] text-white px-1 flex items-center overflow-hidden',
                            isCritical ? 'ring-2 ring-red-500 ring-offset-1' : '', statusColor[t.status] ?? 'bg-slate-400')}
                            style={{ left: `${Math.max(leftPct, 0)}%`, width: `${Math.min(widthPct, 100)}%` }}
                            title={`${format(parseISO(t.start_date), 'dd/MM')} – ${format(parseISO(t.due_date), 'dd/MM')}${isCritical ? ' · CRÍTICA' : ` · folga ${slack}d`}`}>
                            {t.estimated_hours ? `${t.estimated_hours}h` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-4 text-xs text-muted-foreground flex-wrap">
                {Object.entries(statusLabel).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1">
                    <span className={cn('w-3 h-3 rounded', statusColor[k])} />{v}
                  </span>
                ))}
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded ring-2 ring-red-500" />Caminho crítico
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
