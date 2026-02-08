import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSellerCockpit } from "@/hooks/useSellerCockpit";
import { formatCurrency } from "@/services/cpqService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Target, TrendingUp, Calendar, Flame, Trophy, Users, Clock, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SellerCockpit() {
  const { data, isLoading } = useSellerCockpit();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <PageHeader title="Meu Painel" description="Carregando..." />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!data?.seller) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md text-center p-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Perfil de Vendedor não encontrado</h2>
            <p className="text-muted-foreground">Seu usuário não está vinculado a um perfil de vendedor.</p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const { currentGoal, upcomingTasks, hotOpportunities, pipelineSummary, performance } = data;
  const goalColor = currentGoal.percent >= 100 ? "text-emerald-500" : currentGoal.percent >= 70 ? "text-amber-500" : "text-red-500";

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title={`Olá, ${data.seller.name.split(" ")[0]}!`} 
          description="Seu painel de vendas personalizado"
        />

        {/* Goal Speedometer */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" /> Meta do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/20" />
                    <circle 
                      cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" 
                      className={goalColor}
                      strokeDasharray={`${Math.min(currentGoal.percent, 100) * 2.83} 283`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-2xl font-bold ${goalColor}`}>{currentGoal.percent.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Meta</span>
                    <span className="font-medium">{formatCurrency(currentGoal.target)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Realizado</span>
                    <span className="font-medium text-emerald-600">{formatCurrency(currentGoal.achieved)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gap</span>
                    <span className="font-medium text-amber-600">{formatCurrency(currentGoal.gap)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{performance.win_rate.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {performance.won_count} ganhas / {performance.won_count + performance.lost_count} fechadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(performance.avg_deal_size)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Ciclo médio: {performance.avg_sales_cycle_days.toFixed(0)} dias
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Hot Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" /> Oportunidades Quentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hotOpportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma oportunidade aberta</p>
              ) : (
                <div className="space-y-3">
                  {hotOpportunities.slice(0, 5).map((opp) => (
                    <div key={opp.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm truncate max-w-[200px]">{opp.title}</p>
                        <p className="text-xs text-muted-foreground">{opp.stage_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm text-emerald-600">{formatCurrency(opp.amount)}</p>
                        <Badge variant="outline" className="text-xs">{opp.probability}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Próximas Atividades
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade agendada</p>
              ) : (
                <div className="space-y-3">
                  {upcomingTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{task.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(task.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Resumo do Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma oportunidade no pipeline</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-4">
                {pipelineSummary.map((stage) => (
                  <div key={stage.stage_id} className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.stage_color }} />
                      <span className="font-medium text-sm">{stage.stage_name}</span>
                      <Badge variant="secondary" className="ml-auto">{stage.count}</Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total</span>
                        <span>{formatCurrency(stage.total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ponderado</span>
                        <span className="text-primary">{formatCurrency(stage.weighted_total)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
