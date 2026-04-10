import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, Clock, Users, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle2, PieChart
} from "lucide-react";
import { useProjectProfitability, useProject, useTimesheets } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";

interface ProjectProfitabilityPanelProps {
  projectId: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function ProjectProfitabilityPanel({ projectId }: ProjectProfitabilityPanelProps) {
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: profitability, isLoading: profitabilityLoading } = useProjectProfitability(projectId);
  const { data: timesheets } = useTimesheets({ project_id: projectId });

  const isLoading = projectLoading || profitabilityLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const contractValue = profitability?.contract_value || project?.budget_amount || 0;
  const totalHours = profitability?.total_hours || 0;
  const personnelCost = profitability?.personnel_cost || 0;
  const margin = profitability?.contribution_margin || (contractValue - personnelCost);
  const marginPercentage = profitability?.margin_percentage || (contractValue > 0 ? ((margin / contractValue) * 100) : 0);
  const budgetedHours = project?.budget_hours || 0;
  const hoursUsagePercent = budgetedHours > 0 ? (totalHours / budgetedHours) * 100 : 0;

  const isHealthy = marginPercentage >= 20;
  const isWarning = marginPercentage >= 0 && marginPercentage < 20;
  const isCritical = marginPercentage < 0;

  // Calculate team members from timesheets
  const uniqueUsers = new Set(timesheets?.map(t => t.user_id) || []);
  const teamSize = uniqueUsers.size;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {/* Receita do Contrato */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita (Contrato)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(contractValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Valor total do projeto
            </p>
          </CardContent>
        </Card>

        {/* Custo de Pessoal */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo de Pessoal
            </CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(personnelCost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalHours.toFixed(1)}h × custo/hora
            </p>
          </CardContent>
        </Card>

        {/* Horas Utilizadas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Horas Utilizadas
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalHours.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {budgetedHours}h orçadas
            </p>
            <Progress 
              value={Math.min(hoursUsagePercent, 100)} 
              className={cn("h-1.5 mt-2", hoursUsagePercent > 100 && "bg-red-200")}
            />
            {hoursUsagePercent > 100 && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Estouro de {(hoursUsagePercent - 100).toFixed(0)}%
              </p>
            )}
          </CardContent>
        </Card>

        {/* Margem de Contribuição */}
        <Card className={cn(
          "border-2",
          isHealthy && "border-green-200 bg-green-50/50",
          isWarning && "border-amber-200 bg-amber-50/50",
          isCritical && "border-red-200 bg-red-50/50"
        )}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margem de Contribuição
            </CardTitle>
            {isHealthy && <TrendingUp className="h-4 w-4 text-green-500" />}
            {isWarning && <AlertTriangle className="h-4 w-4 text-amber-500" />}
            {isCritical && <TrendingDown className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              isHealthy && "text-green-600",
              isWarning && "text-amber-600",
              isCritical && "text-red-600"
            )}>
              {formatCurrency(margin)}
            </div>
            <Badge className={cn(
              "mt-1",
              isHealthy && "bg-green-100 text-green-700",
              isWarning && "bg-amber-100 text-amber-700",
              isCritical && "bg-red-100 text-red-700"
            )}>
              {marginPercentage.toFixed(1)}% de margem
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Composição de Custos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Composição Financeira
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Receita</span>
                </div>
                <span className="text-sm font-medium">{formatCurrency(contractValue)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm">(-) Custo de Pessoal</span>
                </div>
                <span className="text-sm font-medium text-orange-600">
                  {formatCurrency(-personnelCost)}
                </span>
              </div>

              <div className="border-t pt-2 flex items-center justify-between font-medium">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    isHealthy && "bg-green-500",
                    isWarning && "bg-amber-500",
                    isCritical && "bg-red-500"
                  )} />
                  <span className="text-sm">(=) Margem</span>
                </div>
                <span className={cn(
                  "text-sm",
                  isHealthy && "text-green-600",
                  isWarning && "text-amber-600",
                  isCritical && "text-red-600"
                )}>
                  {formatCurrency(margin)}
                </span>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="h-4 bg-muted rounded-full overflow-hidden flex">
              <div 
                className={cn(
                  isHealthy && "bg-green-500",
                  isWarning && "bg-amber-500",
                  isCritical && "bg-red-500"
                )}
                style={{ width: `${Math.max(0, marginPercentage)}%` }}
              />
              <div 
                className="bg-orange-500"
                style={{ width: `${contractValue > 0 ? (personnelCost / contractValue) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Indicadores de Saúde */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Indicadores do Projeto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Custo por Hora</p>
                <p className="text-xs text-muted-foreground">Média ponderada</p>
              </div>
              <span className="text-lg font-bold">
                {totalHours > 0 ? formatCurrency(personnelCost / totalHours) : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Receita por Hora</p>
                <p className="text-xs text-muted-foreground">Valor gerado</p>
              </div>
              <span className="text-lg font-bold text-green-600">
                {totalHours > 0 ? formatCurrency(contractValue / totalHours) : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Equipe Alocada</p>
                <p className="text-xs text-muted-foreground">Membros ativos</p>
              </div>
              <span className="text-lg font-bold">
                {teamSize} {teamSize === 1 ? 'pessoa' : 'pessoas'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Progresso</p>
                <p className="text-xs text-muted-foreground">Conclusão do projeto</p>
              </div>
              <Badge variant={project?.progress_percentage === 100 ? "default" : "secondary"}>
                {project?.progress_percentage || 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
