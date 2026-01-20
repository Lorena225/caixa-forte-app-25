import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import {
  Brain,
  Landmark,
  Wallet,
  TrendingUp,
  Shield,
  Zap,
  LineChart,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Network,
  CreditCard,
  Package,
  Target,
  Users,
  BarChart3,
  Activity,
} from "lucide-react";

const INNOVATION_ROADMAP = {
  ai: {
    title: "IA Avançada",
    icon: Brain,
    color: "text-primary",
    features: [
      { name: "Previsão Fluxo de Caixa 30/60/90 dias", status: "implemented", route: "/financeiro/simulacoes" },
      { name: "Simulações 'E Se' (Cenários)", status: "implemented", route: "/financeiro/simulacoes" },
      { name: "Detecção de Anomalias e Antifraude", status: "implemented", route: "/compliance/anomalias" },
      { name: "Aprovações Inteligentes com IA", status: "implemented", route: "/admin/approvals" },
      { name: "CFO Virtual Expandido", status: "implemented", route: "/ia/cfo-virtual" },
      { name: "Análise Preditiva de Inadimplência", status: "future" },
      { name: "Otimização Automática de Capital de Giro", status: "future" },
    ],
  },
  openFinance: {
    title: "Open Finance / Open Banking",
    icon: Landmark,
    color: "text-success",
    features: [
      { name: "Conectores de Contas Bancárias", status: "implemented", route: "/openfinance/conexoes" },
      { name: "Sincronização de Saldos em Tempo Real", status: "implemented", route: "/openfinance/conexoes" },
      { name: "Iniciação de Pagamentos via Pix", status: "implemented", route: "/openfinance/pagamentos" },
      { name: "Conciliação Automática Open Finance", status: "future" },
      { name: "Agregação Multi-Banco Consolidada", status: "future" },
    ],
  },
  embeddedFinance: {
    title: "Embedded Finance",
    icon: Wallet,
    color: "text-warning",
    features: [
      { name: "Antecipação de Recebíveis", status: "implemented", route: "/embedded/antecipacao" },
      { name: "Slot de Parceiros Financeiros", status: "implemented", route: "/embedded/servicos" },
      { name: "Estrutura Revenue Share", status: "implemented", route: "/embedded/servicos" },
      { name: "Linhas de Crédito Empresarial", status: "future" },
      { name: "Conta Digital / Wallet", status: "future" },
      { name: "Seguros Empresariais", status: "future" },
    ],
  },
  supplyChain: {
    title: "Supply Chain Preditivo",
    icon: Package,
    color: "text-info",
    features: [
      { name: "Previsão de Demanda por Produto", status: "implemented", route: "/estoque/previsao-demanda" },
      { name: "Recomendações de Compra (MRP IA)", status: "implemented", route: "/estoque/recomendacoes" },
      { name: "Alertas de Ruptura de Estoque", status: "implemented", route: "/estoque/recomendacoes" },
      { name: "Otimização de Lead Time", status: "future" },
    ],
  },
  realtime: {
    title: "Finanças em Tempo Real",
    icon: Activity,
    color: "text-destructive",
    features: [
      { name: "Posição de Caixa Consolidada", status: "implemented", route: "/financeiro/tempo-real" },
      { name: "Alertas de Risco de Liquidez", status: "implemented", route: "/financeiro/tempo-real" },
      { name: "Projeção Dinâmica de Caixa", status: "implemented", route: "/financeiro/tempo-real" },
      { name: "Integração Completa Open Finance + IA", status: "future" },
    ],
  },
  personas: {
    title: "UX por Persona",
    icon: Users,
    color: "text-muted-foreground",
    features: [
      { name: "Dashboard CEO/Dono", status: "implemented", route: "/dashboards/executive" },
      { name: "Dashboard CFO/Financeiro", status: "implemented", route: "/dashboards/cfo" },
      { name: "Dashboard Compras", status: "future" },
      { name: "Dashboard Vendas", status: "future" },
      { name: "Dashboard Controladoria", status: "future" },
    ],
  },
};

function getStatusBadge(status: string) {
  if (status === "implemented") {
    return <Badge variant="default" className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />Implementado</Badge>;
  }
  return <Badge variant="secondary" className="bg-muted text-muted-foreground"><Clock className="h-3 w-3 mr-1" />Futuro</Badge>;
}

export default function InovacaoIndex() {
  const totalFeatures = Object.values(INNOVATION_ROADMAP).reduce((acc, cat) => acc + cat.features.length, 0);
  const implementedFeatures = Object.values(INNOVATION_ROADMAP).reduce(
    (acc, cat) => acc + cat.features.filter((f) => f.status === "implemented").length, 0
  );
  const progressPercent = Math.round((implementedFeatures / totalFeatures) * 100);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Visão de Inovação & Roadmap"
          description="Transformando o ERP em plataforma disruptiva de IA + Open Finance"
        >
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {implementedFeatures}/{totalFeatures} recursos
          </Badge>
        </PageHeader>

        {/* Progress Overview */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Progresso da Plataforma de Inovação</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  IA embarcada, Open Finance, Embedded Finance e Supply Chain Preditivo
                </p>
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{progressPercent}% concluído</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{implementedFeatures}</div>
                  <div className="text-xs text-muted-foreground">Implementados</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-muted-foreground">{totalFeatures - implementedFeatures}</div>
                  <div className="text-xs text-muted-foreground">Planejados</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-success">{Object.keys(INNOVATION_ROADMAP).length}</div>
                  <div className="text-xs text-muted-foreground">Categorias</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access to Main Features */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="card-hover cursor-pointer" onClick={() => window.location.href = '/financeiro/simulacoes'}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <LineChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Simulações IA</h4>
                  <p className="text-xs text-muted-foreground">Cenários e previsões</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover cursor-pointer" onClick={() => window.location.href = '/openfinance/conexoes'}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Landmark className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h4 className="font-medium">Open Finance</h4>
                  <p className="text-xs text-muted-foreground">Conexões bancárias</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover cursor-pointer" onClick={() => window.location.href = '/embedded/antecipacao'}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <CreditCard className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h4 className="font-medium">Antecipação</h4>
                  <p className="text-xs text-muted-foreground">Recebíveis</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover cursor-pointer" onClick={() => window.location.href = '/ia/cfo-virtual'}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Brain className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h4 className="font-medium">CFO Virtual</h4>
                  <p className="text-xs text-muted-foreground">Análises inteligentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roadmap by Category */}
        <Tabs defaultValue="ai" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {Object.entries(INNOVATION_ROADMAP).map(([key, category]) => (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                <category.icon className={`h-4 w-4 ${category.color}`} />
                <span className="hidden sm:inline">{category.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(INNOVATION_ROADMAP).map(([key, category]) => (
            <TabsContent key={key} value={key}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${category.color}`}>
                      <category.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{category.title}</CardTitle>
                      <CardDescription>
                        {category.features.filter((f) => f.status === "implemented").length} de {category.features.length} recursos implementados
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {category.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {feature.status === "implemented" ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={feature.status === "future" ? "text-muted-foreground" : ""}>
                            {feature.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(feature.status)}
                          {feature.status === "implemented" && feature.route && (
                            <Button asChild variant="ghost" size="sm">
                              <Link to={feature.route}>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Architecture Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Arquitetura da Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-success" />
                  Multi-Tenant & RLS
                </h4>
                <p className="text-sm text-muted-foreground">
                  100% das tabelas com Row Level Security e helper <code>user_belongs_to_company</code>
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Alta Performance
                </h4>
                <p className="text-sm text-muted-foreground">
                  Índices compostos, views materializadas, paginação por cursor
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-warning" />
                  Escala Brasil
                </h4>
                <p className="text-sm text-muted-foreground">
                  Preparado para milhares de empresas e +5.000 usuários
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
