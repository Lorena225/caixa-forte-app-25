import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, Target, TrendingUp, DollarSign, UserPlus, Kanban, Award, BarChart3 } from "lucide-react";
import { usePipelineStats, useSellers, useLeads } from "@/hooks/useCRM";

export default function CRMIndex() {
  const navigate = useNavigate();
  const { data: stats } = usePipelineStats();
  const { data: sellers } = useSellers();
  const { data: leads } = useLeads({ status: "new" });

  const menuItems = [
    {
      title: "Pipeline de Vendas",
      description: "Funil visual de oportunidades",
      icon: Kanban,
      route: "/crm/pipeline",
      color: "text-blue-500",
    },
    {
      title: "Leads",
      description: "Gestão de leads e prospecção",
      icon: UserPlus,
      route: "/crm/leads",
      color: "text-emerald-500",
    },
    {
      title: "Oportunidades",
      description: "Todas as oportunidades em lista",
      icon: Target,
      route: "/crm/oportunidades",
      color: "text-purple-500",
    },
    {
      title: "Vendedores",
      description: "Equipe comercial",
      icon: Users,
      route: "/crm/vendedores",
      color: "text-amber-500",
    },
    {
      title: "Comissões",
      description: "Cálculo e pagamento de comissões",
      icon: DollarSign,
      route: "/crm/comissoes",
      color: "text-green-500",
    },
    {
      title: "Metas",
      description: "Metas e acompanhamento",
      icon: Award,
      route: "/crm/metas",
      color: "text-rose-500",
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="CRM" 
          description="Gestão de relacionamento com clientes e pipeline de vendas"
        />

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Aberto</CardTitle>
              <Kanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOpen || 0}</div>
              <p className="text-xs text-muted-foreground">oportunidades ativas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor em Negociação</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {(stats?.totalValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">potencial de fechamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {(stats?.winRate || 0).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">win rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novos Leads</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leads?.length || 0}</div>
              <p className="text-xs text-muted-foreground">aguardando contato</p>
            </CardContent>
          </Card>
        </div>

        {/* Menu Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {menuItems.map((item) => (
            <Card 
              key={item.route}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(item.route)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Quick Stats by Stage */}
        {stats?.byStage && Object.keys(stats.byStage).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Pipeline por Estágio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                {Object.entries(stats.byStage).map(([stage, data]) => (
                  <div key={stage} className="text-center p-4 rounded-lg bg-muted/50">
                    <div 
                      className="w-4 h-4 rounded-full mx-auto mb-2" 
                      style={{ backgroundColor: data.color }}
                    />
                    <div className="text-sm font-medium">{stage}</div>
                    <div className="text-2xl font-bold">{data.count}</div>
                    <div className="text-xs text-muted-foreground">
                      {data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center gap-4">
          <Button size="lg" onClick={() => navigate("/crm/pipeline")}>
            <Kanban className="mr-2 h-5 w-5" />
            Ver Pipeline
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/crm/leads")}>
            <UserPlus className="mr-2 h-5 w-5" />
            Novo Lead
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
