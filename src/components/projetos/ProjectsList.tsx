import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, Calendar, Users, MoreHorizontal, Play, 
  Pause, CheckCircle2, Target, AlertTriangle, ExternalLink
} from "lucide-react";
import { Project } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { format, differenceInDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  planejamento: { label: 'Planejamento', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Target },
  em_andamento: { label: 'Em Andamento', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Play },
  pausado: { label: 'Pausado', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Pause },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'text-slate-500' },
  media: { label: 'Média', color: 'text-blue-500' },
  alta: { label: 'Alta', color: 'text-orange-500' },
  urgente: { label: 'Urgente', color: 'text-red-500' },
};

interface ProjectsListProps {
  projects: Project[];
  isLoading: boolean;
  onSelectProject: (id: string) => void;
}

export function ProjectsList({ projects, isLoading, onSelectProject }: ProjectsListProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <h3 className="font-medium mb-2">Nenhum projeto encontrado</h3>
          <p className="text-sm">
            Crie seu primeiro projeto para começar a gerenciar entregas.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => {
        const status = statusConfig[project.status] || statusConfig.planejamento;
        const StatusIcon = status.icon;
        const priority = priorityConfig[project.priority] || priorityConfig.media;
        
        const isOverdue = project.deadline && isPast(new Date(project.deadline)) && 
                         project.status !== 'concluido' && project.status !== 'cancelado';
        
        const daysRemaining = project.deadline 
          ? differenceInDays(new Date(project.deadline), new Date())
          : null;

        return (
          <Card 
            key={project.id} 
            className={cn(
              "transition-all hover:shadow-md cursor-pointer",
              isOverdue && "border-red-200 bg-red-50/30"
            )}
            onClick={() => onSelectProject(project.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Avatar do Gerente */}
                <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {project.manager?.full_name?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>

                {/* Conteúdo Principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">
                          {project.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {project.project_number}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {project.counterparty && (
                          <span>{project.counterparty.name}</span>
                        )}
                        {project.contract && (
                          <span className="text-xs">
                            • Contrato: {project.contract.contract_number}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={cn("border", status.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projetos/${project.id}`);
                          }}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(project.id);
                          }}>
                            Ver Kanban
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="flex items-center gap-6 mt-4">
                    {/* Progresso */}
                    <div className="flex-1 max-w-xs">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{project.progress_percentage}%</span>
                      </div>
                      <Progress value={project.progress_percentage} className="h-1.5" />
                    </div>

                    {/* Prazo */}
                    {project.deadline && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Calendar className={cn("h-4 w-4", isOverdue ? "text-red-500" : "text-muted-foreground")} />
                        <span className={cn(isOverdue && "text-red-600 font-medium")}>
                          {isOverdue 
                            ? `${Math.abs(daysRemaining!)} dias atrasado`
                            : daysRemaining === 0 
                              ? 'Vence hoje'
                              : `${daysRemaining} dias restantes`
                          }
                        </span>
                      </div>
                    )}

                    {/* Orçamento */}
                    {project.budget_amount > 0 && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {formatCurrency(project.budget_amount)}
                        </span>
                      </div>
                    )}

                    {/* Horas */}
                    {project.budget_hours > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{project.budget_hours}h orçadas</span>
                      </div>
                    )}

                    {/* Prioridade */}
                    <div className={cn("text-sm font-medium", priority.color)}>
                      {priority.label}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
