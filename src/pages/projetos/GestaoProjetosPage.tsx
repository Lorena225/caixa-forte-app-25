import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Plus, Search, FolderKanban, LayoutList, Calendar,
  Clock, Users, AlertTriangle, TrendingUp, Target,
  Play, CheckCircle2, Pause, MoreHorizontal, DollarSign
} from "lucide-react";
import { useProjects, useProjectStats } from "@/hooks/useProjects";
import { ProjectFormDialog } from "@/components/projetos/ProjectFormDialog";
import { ProjectsList } from "@/components/projetos/ProjectsList";
import { KanbanBoard } from "@/components/projetos/KanbanBoard";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

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
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const { data: projects, isLoading: projectsLoading } = useProjects({ 
    status: statusFilter,
    search 
  });
  const { data: stats, isLoading: statsLoading } = useProjectStats();

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
              <Target className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.planejamento || 0}</div>
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
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.concluidos || 0}</div>
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
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.atrasados || 0}</div>
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
              <Clock className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet-600">
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

        {/* Tabs de Navegação */}
        <Tabs defaultValue="projetos" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="projetos" className="gap-2">
                <FolderKanban className="h-4 w-4" />
                Projetos
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2">
                <LayoutList className="h-4 w-4" />
                Kanban de Tarefas
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <div className="relative w-64">
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
          </div>

          <TabsContent value="projetos">
            <ProjectsList 
              projects={projects || []} 
              isLoading={projectsLoading}
              onSelectProject={setSelectedProjectId}
            />
          </TabsContent>

          <TabsContent value="kanban">
            {selectedProjectId ? (
              <KanbanBoard projectId={selectedProjectId} />
            ) : (
              <Card className="p-12">
                <div className="text-center text-muted-foreground">
                  <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <h3 className="font-medium mb-2">Selecione um Projeto</h3>
                  <p className="text-sm">
                    Clique em um projeto na lista para visualizar o Kanban de tarefas
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <ProjectFormDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
        />
      </div>
    </MainLayout>
  );
}
