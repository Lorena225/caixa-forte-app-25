import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus, Search, FolderKanban, LayoutList,
  Clock, AlertTriangle, Target, ArrowLeft,
  Play, CheckCircle2, Pause, DollarSign, Calendar, BarChart2,
  RefreshCw, ExternalLink, Loader2, Link2
} from "lucide-react";
import { useProjects, useProjectStats, useProject } from "@/hooks/useProjects";
import { ProjectFormDialog } from "@/components/projetos/ProjectFormDialog";
import { ProjectsList } from "@/components/projetos/ProjectsList";
import { KanbanBoard } from "@/components/projetos/KanbanBoard";
import { ProjectProfitabilityPanel } from "@/components/projetos/ProjectProfitabilityPanel";
import { GanttView } from "@/components/projetos/GanttView";
import { TimesheetPanel } from "@/components/projetos/TimesheetPanel";
import { useGoogleIntegration, type GoogleCalendarEvent } from "@/hooks/useGoogleIntegration";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const statusLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  planejamento: { label: 'Planejamento', color: 'bg-blue-100 text-blue-800', icon: Target },
  em_andamento: { label: 'Em Andamento', color: 'bg-emerald-100 text-emerald-800', icon: Play },
  pausado: { label: 'Pausado', color: 'bg-amber-100 text-amber-800', icon: Pause },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

export default function GestaoProjetosPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const { data: projects, isLoading: projectsLoading } = useProjects({
    status: statusFilter,
    search
  });
  const { data: stats, isLoading: statsLoading } = useProjectStats();
  const { data: selectedProject } = useProject(selectedProjectId);
  const { connected, connect, upsertCalendarEvent, listCalendarEvents } = useGoogleIntegration();
  const calendarId = localStorage.getItem('google_calendar_id') || 'primary';

  const loadCalendarEvents = async () => {
    if (!connected || !selectedProject) return;
    setCalendarLoading(true);
    const timeMin = new Date().toISOString();
    const timeMax = addDays(new Date(), 90).toISOString();
    const events = await listCalendarEvents(calendarId, timeMin, timeMax);
    // Filtra eventos do projeto pelo nome
    setCalendarEvents(events.filter(e => e.summary?.includes(selectedProject.name)));
    setCalendarLoading(false);
  };

  useEffect(() => {
    if (selectedProject && connected) {
      loadCalendarEvents();
    }
  }, [selectedProject?.id, connected]);

  const handleSyncProjectToCalendar = async () => {
    if (!selectedProject || !connected) return;
    setCalendarLoading(true);
    const start = selectedProject.start_date || format(new Date(), 'yyyy-MM-dd');
    const end = selectedProject.end_date || format(addDays(new Date(), 30), 'yyyy-MM-dd');
    const eventId = await upsertCalendarEvent(calendarId, {
      summary: `📁 ${selectedProject.name}`,
      description: `Projeto: ${selectedProject.name}\nCliente: ${selectedProject.counterparty?.name || '-'}\nStatus: ${selectedProject.status}`,
      start,
      end,
      colorId: '9',
    });
    if (eventId) {
      toast.success('Projeto adicionado ao Google Calendar');
      await loadCalendarEvents();
    }
    setCalendarLoading(false);
  };

  // If a project is selected, show the project detail view
  if (selectedProjectId && selectedProject) {
    return (
      <MainLayout>
        <div className="space-y-6">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedProjectId(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{selectedProject.name}</h1>
                <Badge className={cn(statusLabels[selectedProject.status]?.color)}>
                  {statusLabels[selectedProject.status]?.label}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {selectedProject.project_number}
                {selectedProject.counterparty && ` • ${selectedProject.counterparty.name}`}
              </p>
            </div>
          </div>

          {/* Project Tabs */}
          <Tabs defaultValue="kanban" className="space-y-4">
            <TabsList>
              <TabsTrigger value="kanban" className="gap-2">
                <LayoutList className="h-4 w-4" />
                Tarefas
              </TabsTrigger>
              <TabsTrigger value="gantt" className="gap-2">
                <BarChart2 className="h-4 w-4" />
                Gantt
              </TabsTrigger>
              <TabsTrigger value="horas" className="gap-2">
                <Clock className="h-4 w-4" />
                Horas
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Financeiro
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <Calendar className="h-4 w-4" />
                Google Calendar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="kanban">
              <KanbanBoard projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="gantt">
              <GanttView projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="horas">
              <TimesheetPanel projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="financeiro">
              <ProjectProfitabilityPanel projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="calendar">
              <div className="space-y-4">
                {!connected ? (
                  <Card>
                    <CardContent className="py-10 text-center space-y-4">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground/40" />
                      <div>
                        <p className="font-medium">Google Calendar não conectado</p>
                        <p className="text-sm text-muted-foreground mt-1">Conecte sua conta para sincronizar prazos e entregas</p>
                      </div>
                      <Button onClick={connect} className="gap-2">
                        <Link2 className="h-4 w-4" /> Conectar Google
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div>
                          <CardTitle className="text-base">Sincronizar com Google Calendar</CardTitle>
                          <CardDescription>Adicione o prazo do projeto ao seu calendário</CardDescription>
                        </div>
                        <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Conectado
                        </Badge>
                      </CardHeader>
                      <CardContent className="flex gap-2">
                        <Button onClick={handleSyncProjectToCalendar} disabled={calendarLoading} className="gap-2">
                          {calendarLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                          Adicionar projeto ao Calendar
                        </Button>
                        <Button variant="outline" onClick={loadCalendarEvents} disabled={calendarLoading} size="icon">
                          <RefreshCw className={cn("h-4 w-4", calendarLoading && "animate-spin")} />
                        </Button>
                        <Button variant="outline" asChild>
                          <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="gap-2">
                            <ExternalLink className="h-4 w-4" /> Abrir Calendar
                          </a>
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Eventos relacionados ({calendarEvents.length})</CardTitle>
                        <CardDescription>Eventos do Google Calendar com o nome deste projeto</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {calendarLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground py-4">
                            <Loader2 className="h-4 w-4 animate-spin" /> Carregando eventos...
                          </div>
                        ) : calendarEvents.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Nenhum evento encontrado para este projeto nos próximos 90 dias</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {calendarEvents.map(ev => (
                              <div key={ev.id} className="flex items-start justify-between p-3 border rounded-lg">
                                <div className="space-y-0.5">
                                  <p className="font-medium text-sm">{ev.summary}</p>
                                  {ev.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">{ev.description}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    {ev.start.includes('T')
                                      ? format(new Date(ev.start), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                      : format(new Date(ev.start + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                                    {' → '}
                                    {ev.end.includes('T')
                                      ? format(new Date(ev.end), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                      : format(new Date(ev.end + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader 
            title="Gestão de Projetos" 
            description="Gerencie projetos, tarefas, apontamentos de horas e rentabilidade"
          />
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Projeto
          </Button>
        </div>

        {/* KPIs Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Projetos
              </CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.em_andamento || 0} em andamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Planejamento
              </CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats?.planejamento || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aguardando início
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Concluídos
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats?.concluidos || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Finalizados com sucesso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Atrasados
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats?.atrasados || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Prazo excedido
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Horas Realizadas
              </CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {(stats?.totalHours || 0).toFixed(1)}h
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                de {(stats?.budgetedHours || 0).toFixed(0)}h orçadas
              </p>
              {stats?.budgetedHours ? (
                <Progress 
                  value={Math.min((stats.totalHours / stats.budgetedHours) * 100, 100)} 
                  className="h-1.5 mt-2"
                />
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar projetos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="todos">Todos Status</option>
            <option value="planejamento">Planejamento</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="pausado">Pausado</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        {/* Projects List */}
        <ProjectsList 
          projects={projects || []} 
          isLoading={projectsLoading}
          onSelectProject={setSelectedProjectId}
        />

        {/* Dialogs */}
        <ProjectFormDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
        />
      </div>
    </MainLayout>
  );
}
