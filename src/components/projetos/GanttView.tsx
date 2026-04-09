import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Calendar } from 'lucide-react';
import { useProjectTasks, useProjectMilestones, type ProjectTask } from '@/hooks/useProjects';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth,
  differenceInCalendarDays, isWeekend, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useProject } from '@/hooks/useProjects';

const statusColors: Record<string, string> = {
  a_fazer: 'bg-slate-400',
  fazendo: 'bg-blue-500',
  revisao: 'bg-amber-500',
  feito: 'bg-green-500',
  bloqueado: 'bg-red-500',
  arquivado: 'bg-gray-300',
};

const priorityBg: Record<string, string> = {
  baixa: 'bg-slate-400',
  media: 'bg-blue-500',
  alta: 'bg-orange-500',
  urgente: 'bg-red-500',
};

interface GanttViewProps {
  projectId: string;
}

export function GanttView({ projectId }: GanttViewProps) {
  const { data: project } = useProject(projectId);
  const { data: tasks, isLoading } = useProjectTasks(projectId);
  const { data: milestones } = useProjectMilestones(projectId);

  // Determina intervalo do Gantt
  const { startDate, endDate, days } = useMemo(() => {
    const tasksWithDates = (tasks || []).filter(t => t.start_date || t.due_date);

    let earliest = project?.start_date
      ? parseISO(project.start_date)
      : startOfMonth(new Date());

    let latest = project?.deadline
      ? parseISO(project.deadline)
      : endOfMonth(new Date());

    for (const t of tasksWithDates) {
      if (t.start_date) {
        const d = parseISO(t.start_date);
        if (d < earliest) earliest = d;
      }
      if (t.due_date) {
        const d = parseISO(t.due_date);
        if (d > latest) latest = d;
      }
    }

    for (const m of milestones || []) {
      if (m.due_date) {
        const d = parseISO(m.due_date);
        if (d > latest) latest = d;
      }
    }

    // garantir mínimo de 30 dias visíveis
    if (differenceInCalendarDays(latest, earliest) < 30) {
      latest = new Date(earliest.getTime() + 30 * 86400000);
    }

    const days = eachDayOfInterval({ start: earliest, end: latest });
    return { startDate: earliest, endDate: latest, days };
  }, [tasks, milestones, project]);

  const totalDays = differenceInCalendarDays(endDate, startDate) + 1;

  const getBarStyle = (startStr?: string, endStr?: string) => {
    if (!startStr && !endStr) return null;
    const start = startStr ? parseISO(startStr) : startDate;
    const end = endStr ? parseISO(endStr) : start;
    const left = (differenceInCalendarDays(start, startDate) / totalDays) * 100;
    const width = Math.max(((differenceInCalendarDays(end, start) + 1) / totalDays) * 100, 1);
    return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` };
  };

  // Agrupar tarefas por milestone
  const groups = useMemo(() => {
    const milestoneMap: Record<string, ProjectTask[]> = { '': [] };
    for (const m of milestones || []) milestoneMap[m.id] = [];
    for (const t of tasks || []) {
      const key = t.milestone_id || '';
      if (!milestoneMap[key]) milestoneMap[key] = [];
      milestoneMap[key].push(t);
    }
    return milestoneMap;
  }, [tasks, milestones]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const visibleTasks = (tasks || []).filter(t => t.start_date || t.due_date);

  if (visibleTasks.length === 0 && (milestones || []).length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sem datas cadastradas</p>
          <p className="text-sm mt-1">Defina datas de início e fim nas tarefas para visualizar o Gantt</p>
        </CardContent>
      </Card>
    );
  }

  // Cabeçalho de meses
  const monthHeaders = useMemo(() => {
    const months: { label: string; cols: number }[] = [];
    let cur = new Date(startDate);
    while (cur <= endDate) {
      const monthStart = new Date(cur.getFullYear(), cur.getMonth(), 1);
      const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      const clampedEnd = monthEnd > endDate ? endDate : monthEnd;
      const clampedStart = monthStart < startDate ? startDate : monthStart;
      const cols = differenceInCalendarDays(clampedEnd, clampedStart) + 1;
      months.push({ label: format(cur, 'MMM yyyy', { locale: ptBR }), cols });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return months;
  }, [startDate, endDate]);

  const COL_W = 28; // px per day

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Cronograma (Gantt)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div style={{ minWidth: totalDays * COL_W + 200 }}>

            {/* Cabeçalho: meses */}
            <div className="flex border-b bg-muted/50">
              <div className="w-48 flex-shrink-0 border-r px-3 py-2 text-xs font-semibold text-muted-foreground">
                Tarefa
              </div>
              <div className="flex flex-1">
                {monthHeaders.map((m, i) => (
                  <div
                    key={i}
                    className="border-r text-xs font-semibold text-muted-foreground px-2 py-2 capitalize"
                    style={{ width: m.cols * COL_W }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Cabeçalho: dias */}
            <div className="flex border-b bg-muted/30">
              <div className="w-48 flex-shrink-0 border-r" />
              <div className="flex flex-1">
                {days.map((d, i) => (
                  <div
                    key={i}
                    className={cn(
                      'text-center text-[10px] py-1 border-r flex-shrink-0',
                      isWeekend(d) && 'bg-muted/60 text-muted-foreground/60',
                      isToday(d) && 'bg-primary/20 text-primary font-bold'
                    )}
                    style={{ width: COL_W }}
                    title={format(d, 'dd/MM/yyyy')}
                  >
                    {format(d, 'd')}
                  </div>
                ))}
              </div>
            </div>

            {/* Linha "hoje" marker helper — rendered as background in rows */}
            {/* Linhas de tarefas */}
            {(milestones || []).length > 0 ? (
              (milestones || []).map(milestone => (
                <div key={milestone.id}>
                  {/* Milestone header */}
                  <div className="flex border-b bg-indigo-50/60">
                    <div className="w-48 flex-shrink-0 border-r px-3 py-1.5 flex items-center gap-2">
                      <span className="text-xs font-semibold text-indigo-700 truncate">{milestone.name}</span>
                      {milestone.due_date && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {format(parseISO(milestone.due_date), 'dd/MM')}
                        </span>
                      )}
                    </div>
                    <div className="relative flex-1 h-7">
                      {/* Milestone diamond marker */}
                      {milestone.due_date && (() => {
                        const barStyle = getBarStyle(milestone.due_date, milestone.due_date);
                        return barStyle ? (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-indigo-500"
                            style={{ left: barStyle.left }}
                            title={`Marco: ${milestone.name}`}
                          />
                        ) : null;
                      })()}
                    </div>
                  </div>
                  {/* Tasks for this milestone */}
                  {(groups[milestone.id] || []).map(task => (
                    <GanttRow
                      key={task.id}
                      task={task}
                      days={days}
                      startDate={startDate}
                      totalDays={totalDays}
                      COL_W={COL_W}
                      getBarStyle={getBarStyle}
                    />
                  ))}
                </div>
              ))
            ) : null}

            {/* Tasks without milestone */}
            {(groups[''] || []).map(task => (
              <GanttRow
                key={task.id}
                task={task}
                days={days}
                startDate={startDate}
                totalDays={totalDays}
                COL_W={COL_W}
                getBarStyle={getBarStyle}
              />
            ))}

          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface GanttRowProps {
  task: ProjectTask;
  days: Date[];
  startDate: Date;
  totalDays: number;
  COL_W: number;
  getBarStyle: (s?: string, e?: string) => { left: string; width: string } | null;
}

function GanttRow({ task, days, COL_W, getBarStyle }: GanttRowProps) {
  const barStyle = getBarStyle(task.start_date, task.due_date);
  const isOverdue = task.due_date && task.status !== 'feito' && new Date(task.due_date) < new Date();

  return (
    <div className="flex border-b hover:bg-muted/20 transition-colors">
      <div className="w-48 flex-shrink-0 border-r px-3 py-2 flex items-center gap-2">
        {task.assignee && (
          <Avatar className="h-5 w-5 flex-shrink-0">
            <AvatarFallback className="text-[9px]">
              {task.assignee.full_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}
        <span className="text-xs truncate flex-1" title={task.title}>{task.title}</span>
        {isOverdue && <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />}
      </div>

      <div className="relative flex-1" style={{ height: 36 }}>
        {/* Grid lines per day */}
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              'absolute top-0 bottom-0 border-r border-border/40',
              isWeekend(d) && 'bg-muted/30',
              isToday(d) && 'bg-primary/10'
            )}
            style={{ left: i * COL_W, width: COL_W }}
          />
        ))}

        {/* Task bar */}
        {barStyle && (
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 h-5 rounded flex items-center px-1 gap-1 overflow-hidden cursor-default',
              statusColors[task.status] || 'bg-slate-400',
              isOverdue && 'opacity-90 ring-1 ring-red-400'
            )}
            style={{ left: barStyle.left, width: barStyle.width, minWidth: 4 }}
            title={`${task.title} | ${task.status}`}
          >
            <span className="text-white text-[10px] truncate font-medium">{task.title}</span>
          </div>
        )}

        {/* No dates — show dashed hint */}
        {!barStyle && (
          <div className="absolute inset-0 flex items-center px-2">
            <span className="text-[10px] text-muted-foreground/50 italic">sem datas</span>
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="w-20 flex-shrink-0 flex items-center justify-end pr-2">
        <div className={cn('w-2 h-2 rounded-full', statusColors[task.status])} />
      </div>
    </div>
  );
}
