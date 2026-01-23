import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  FolderKanban,
  Clock,
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  MoreVertical,
  FileText,
  TrendingUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ProjectStatus = 'em_andamento' | 'pausado' | 'concluido' | 'atrasado';

interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  status: ProjectStatus;
  progress: number;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  manager: string;
  team: number;
  tasksTotal: number;
  tasksCompleted: number;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; icon: React.ElementType }> = {
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', icon: PlayCircle },
  pausado: { label: 'Pausado', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', icon: PauseCircle },
  concluido: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', icon: CheckCircle2 },
  atrasado: { label: 'Atrasado', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', icon: AlertTriangle },
};

const mockProjects: Project[] = [
  {
    id: '1',
    code: 'PRJ-001',
    name: 'Implementação ERP Financeiro',
    client: 'Empresa ABC Ltda',
    status: 'em_andamento',
    progress: 65,
    budget: 150000,
    spent: 87500,
    startDate: '2024-01-15',
    endDate: '2024-06-30',
    manager: 'João Silva',
    team: 5,
    tasksTotal: 48,
    tasksCompleted: 31,
  },
  {
    id: '2',
    code: 'PRJ-002',
    name: 'Consultoria Tributária',
    client: 'Indústria XYZ S/A',
    status: 'atrasado',
    progress: 40,
    budget: 80000,
    spent: 45000,
    startDate: '2024-02-01',
    endDate: '2024-04-30',
    manager: 'Maria Santos',
    team: 3,
    tasksTotal: 24,
    tasksCompleted: 10,
  },
  {
    id: '3',
    code: 'PRJ-003',
    name: 'Auditoria Contábil Anual',
    client: 'Grupo Delta',
    status: 'concluido',
    progress: 100,
    budget: 45000,
    spent: 42000,
    startDate: '2024-01-01',
    endDate: '2024-03-15',
    manager: 'Carlos Oliveira',
    team: 2,
    tasksTotal: 18,
    tasksCompleted: 18,
  },
  {
    id: '4',
    code: 'PRJ-004',
    name: 'Migração de Dados Fiscais',
    client: 'Tech Solutions',
    status: 'pausado',
    progress: 25,
    budget: 60000,
    spent: 15000,
    startDate: '2024-03-01',
    endDate: '2024-07-31',
    manager: 'Ana Costa',
    team: 4,
    tasksTotal: 36,
    tasksCompleted: 9,
  },
];

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export default function ProjetosIndex() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('todos');

  const filteredProjects = mockProjects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'todos') return matchesSearch;
    return matchesSearch && project.status === activeTab;
  });

  const stats = {
    total: mockProjects.length,
    emAndamento: mockProjects.filter((p) => p.status === 'em_andamento').length,
    atrasados: mockProjects.filter((p) => p.status === 'atrasado').length,
    concluidos: mockProjects.filter((p) => p.status === 'concluido').length,
    budgetTotal: mockProjects.reduce((sum, p) => sum + p.budget, 0),
    spentTotal: mockProjects.reduce((sum, p) => sum + p.spent, 0),
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Projetos e Ordens de Serviço"
          description="Gestão de projetos, alocação de recursos e controle de custos"
          action={{
            label: 'Novo Projeto',
            onClick: () => navigate('/projetos/novo'),
            icon: Plus,
          }}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FolderKanban className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projetos Ativos</p>
                  <p className="text-2xl font-bold text-foreground">{stats.emAndamento}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Atrasados</p>
                  <p className="text-2xl font-bold text-destructive">{stats.atrasados}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Orçamento Total</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(stats.budgetTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Executado</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(stats.spentTotal)}</p>
                  <p className="text-xs text-muted-foreground">
                    {((stats.spentTotal / stats.budgetTotal) * 100).toFixed(0)}% do orçamento
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="todos">Todos ({mockProjects.length})</TabsTrigger>
              <TabsTrigger value="em_andamento">Em Andamento</TabsTrigger>
              <TabsTrigger value="atrasado">Atrasados</TabsTrigger>
              <TabsTrigger value="concluido">Concluídos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const StatusIcon = STATUS_CONFIG[project.status].icon;
            const budgetUsed = (project.spent / project.budget) * 100;
            const isOverBudget = budgetUsed > 100;

            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Project Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {project.code}
                        </Badge>
                        <Badge className={STATUS_CONFIG[project.status].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {STATUS_CONFIG[project.status].label}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.client}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {project.manager} • {project.team} pessoas
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(project.startDate)} - {formatDate(project.endDate)}
                        </span>
                      </div>
                    </div>

                    {/* Center: Progress */}
                    <div className="space-y-2 min-w-[200px]">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium text-foreground">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {project.tasksCompleted} de {project.tasksTotal} tarefas concluídas
                      </p>
                    </div>

                    {/* Right: Budget */}
                    <div className="space-y-2 min-w-[180px] text-right">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Orçamento:</span>{' '}
                        <span className="font-medium text-foreground">{formatCurrency(project.budget)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Executado:</span>{' '}
                        <span className={cn('font-medium', isOverBudget ? 'text-destructive' : 'text-foreground')}>
                          {formatCurrency(project.spent)}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(budgetUsed, 100)}
                        className={cn('h-2', isOverBudget && '[&>div]:bg-destructive')}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/projetos/${project.id}`)}>
                        <FileText className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuItem>Nova OS</DropdownMenuItem>
                          <DropdownMenuItem>Alocar Recursos</DropdownMenuItem>
                          <DropdownMenuItem>Faturar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredProjects.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum projeto encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Ajuste os filtros ou crie um novo projeto.
                </p>
                <Button onClick={() => navigate('/projetos/novo')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Projeto
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
