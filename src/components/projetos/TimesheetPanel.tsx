import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Play, Square, Plus, Clock, DollarSign, Users, TrendingUp, Trash2
} from 'lucide-react';
import {
  useTimesheets, useProjectTasks, useActiveTimesheet,
  useStartTimesheet, useStopTimesheet, useCreateTimesheet,
  type Timesheet
} from '@/hooks/useProjects';
import { format, parseISO, differenceInMinutes, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtH = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
};

interface Props {
  projectId: string;
}

export function TimesheetPanel({ projectId }: Props) {
  const qc = useQueryClient();
  const { data: timesheets, isLoading } = useTimesheets({ project_id: projectId });
  const { data: tasks } = useProjectTasks(projectId);
  const { data: activeTimesheet } = useActiveTimesheet();
  const startTimer = useStartTimesheet();
  const stopTimer = useStopTimesheet();
  const createTs = useCreateTimesheet();

  const [elapsed, setElapsed] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({
    task_id: '',
    start_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    description: '',
    is_billable: true,
  });

  // Timer ao vivo para o timesheet ativo NESTE projeto
  const activeInThisProject = activeTimesheet?.project_id === projectId ? activeTimesheet : null;

  useEffect(() => {
    if (!activeInThisProject) { setElapsed(0); return; }
    const tick = () => {
      const start = parseISO(activeInThisProject.start_time);
      setElapsed(differenceInMinutes(new Date(), start));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [activeInThisProject?.id]);

  // Stats do mês atual
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();
  const monthTs = (timesheets || []).filter(t =>
    t.start_time >= monthStart && t.start_time <= monthEnd && t.end_time
  );
  const totalMin = monthTs.reduce((s, t) => s + (t.duration_minutes || calcMin(t)), 0);
  const billableMin = monthTs
    .filter(t => t.is_billable)
    .reduce((s, t) => s + (t.duration_minutes || calcMin(t)), 0);
  const billableRevenue = monthTs
    .filter(t => t.is_billable && t.hourly_rate)
    .reduce((s, t) => s + ((t.duration_minutes || calcMin(t)) / 60) * (t.hourly_rate || 0), 0);

  // Group by user for billing table
  const byUser: Record<string, { name: string; min: number; billableMin: number; revenue: number }> = {};
  for (const t of timesheets || []) {
    if (!t.end_time) continue;
    const uid = t.user_id;
    const name = t.user?.full_name || 'Desconhecido';
    const min = t.duration_minutes || calcMin(t);
    if (!byUser[uid]) byUser[uid] = { name, min: 0, billableMin: 0, revenue: 0 };
    byUser[uid].min += min;
    if (t.is_billable) {
      byUser[uid].billableMin += min;
      byUser[uid].revenue += (min / 60) * (t.hourly_rate || 0);
    }
  }

  const handleStop = async () => {
    if (!activeInThisProject) return;
    await stopTimer.mutateAsync({ id: activeInThisProject.id });
  };

  const handleStart = async () => {
    await startTimer.mutateAsync({ project_id: projectId });
  };

  const handleManualSave = async () => {
    await createTs.mutateAsync({
      project_id: projectId,
      task_id: manual.task_id || undefined,
      start_time: new Date(manual.start_time).toISOString(),
      end_time: new Date(manual.end_time).toISOString(),
      description: manual.description || undefined,
      is_billable: manual.is_billable,
    });
    setShowManual(false);
    setManual({
      task_id: '', start_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"), description: '', is_billable: true,
    });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('timesheets').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success('Registro removido');
    }
  };

  return (
    <div className="space-y-5">
      {/* Timer + KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Timer card */}
        <Card className={cn('col-span-1 border-2', activeInThisProject ? 'border-primary' : 'border-transparent')}>
          <CardContent className="p-4 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground font-medium">Timer de horas</p>
            <p className={cn('text-3xl font-mono font-bold', activeInThisProject ? 'text-primary' : 'text-muted-foreground')}>
              {activeInThisProject ? fmtH(elapsed) : '0h00'}
            </p>
            {activeInThisProject ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStop}
                disabled={stopTimer.isPending}
                className="gap-2"
              >
                <Square className="h-3 w-3" /> Parar
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleStart}
                disabled={startTimer.isPending || !!activeTimesheet}
                className="gap-2"
              >
                <Play className="h-3 w-3" /> Iniciar
              </Button>
            )}
            {activeTimesheet && !activeInThisProject && (
              <p className="text-xs text-amber-600">Timer ativo em outro projeto</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">Horas este mês</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{fmtH(totalMin)}</p>
            <p className="text-xs text-muted-foreground mt-1">{monthTs.length} registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-500" />
              <p className="text-xs text-muted-foreground">Faturável este mês</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{fmtH(billableMin)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {billableRevenue > 0 ? fmt(billableRevenue) : 'sem taxa cadastrada'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-muted-foreground">Membros ativos</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">{Object.keys(byUser).length}</p>
            <p className="text-xs text-muted-foreground mt-1">com apontamentos</p>
          </CardContent>
        </Card>
      </div>

      {/* Billing por membro */}
      {Object.keys(byUser).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Horas por Membro (total)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead className="text-center">Total horas</TableHead>
                  <TableHead className="text-center">Faturável</TableHead>
                  <TableHead className="text-right">Receita estimada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byUser).map(([uid, row]) => (
                  <TableRow key={uid}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-center">{fmtH(row.min)}</TableCell>
                    <TableCell className="text-center text-green-600">{fmtH(row.billableMin)}</TableCell>
                    <TableCell className="text-right">{row.revenue > 0 ? fmt(row.revenue) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Registros recentes */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Registro de Horas</CardTitle>
            <CardDescription>Apontamentos de tempo neste projeto</CardDescription>
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowManual(true)}>
            <Plus className="h-4 w-4" /> Lançar horas
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
          ) : (timesheets || []).filter(t => t.end_time).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum apontamento registrado</p>
              <p className="text-xs mt-1">Use o timer acima ou lance horas manualmente</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Membro</TableHead>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-center">Duração</TableHead>
                  <TableHead className="text-center">Faturável</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(timesheets || [])
                  .filter(t => t.end_time)
                  .slice(0, 100)
                  .map(t => (
                    <TableRow key={t.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm">
                        {format(parseISO(t.start_time), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm">{t.user?.full_name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.task?.title || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                        {t.description || '—'}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {fmtH(t.duration_minutes || calcMin(t))}
                      </TableCell>
                      <TableCell className="text-center">
                        {t.is_billable
                          ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Sim</Badge>
                          : <Badge variant="outline" className="text-xs">Não</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: lançamento manual */}
      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançar horas manualmente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tarefa (opcional)</Label>
              <Select value={manual.task_id} onValueChange={v => setManual(p => ({ ...p, task_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tarefa..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem tarefa</SelectItem>
                  {(tasks || []).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input
                  type="datetime-local"
                  value={manual.start_time}
                  onChange={e => setManual(p => ({ ...p, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fim</Label>
                <Input
                  type="datetime-local"
                  value={manual.end_time}
                  onChange={e => setManual(p => ({ ...p, end_time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={manual.description}
                onChange={e => setManual(p => ({ ...p, description: e.target.value }))}
                placeholder="O que foi feito..."
                rows={2}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={manual.is_billable}
                onCheckedChange={v => setManual(p => ({ ...p, is_billable: v }))}
              />
              <Label>Horas faturáveis</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManual(false)}>Cancelar</Button>
            <Button
              onClick={handleManualSave}
              disabled={createTs.isPending || !manual.start_time || !manual.end_time}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function calcMin(t: Timesheet): number {
  if (!t.end_time) return 0;
  return differenceInMinutes(parseISO(t.end_time), parseISO(t.start_time));
}
