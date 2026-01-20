import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Bot, 
  MessageSquare, 
  BellRing, 
  Brain, 
  FileText, 
  Settings,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { useAISettingsExtended, useAIAlertsSummary } from "@/hooks/useAIModule";

const modules = [
  {
    title: "Configurações de IA",
    description: "Configure chaves de API, modos de operação e preferências dos agentes",
    icon: Settings,
    href: "/ia/configuracoes",
    bgColor: "bg-muted",
    iconColor: "text-muted-foreground",
  },
  {
    title: "Agente WhatsApp",
    description: "Baixas e lançamentos automáticos via mensagens do WhatsApp",
    icon: MessageSquare,
    href: "/ia/whatsapp",
    bgColor: "bg-success/10",
    iconColor: "text-success",
  },
  {
    title: "Monitor Financeiro",
    description: "Alertas e insights em tempo real sobre sua conta",
    icon: BellRing,
    href: "/ia/alertas",
    bgColor: "bg-warning/10",
    iconColor: "text-warning",
  },
  {
    title: "Analista Inteligente",
    description: "Chat com IA para análises, relatórios e perguntas sobre seus dados",
    icon: Brain,
    href: "/ia/analista",
    bgColor: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    title: "Logs de IA & Auditoria",
    description: "Histórico completo de todas as ações e decisões dos agentes",
    icon: FileText,
    href: "/ia/logs",
    bgColor: "bg-info/10",
    iconColor: "text-info",
  },
];

export default function IAIndex() {
  const { data: settings, isLoading: loadingSettings } = useAISettingsExtended();
  const { data: alertsSummary } = useAIAlertsSummary();

  const isAIEnabled = settings?.enabled ?? false;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="IA & ChatGPT Financeiro"
          description="Módulo de inteligência artificial para automatização e análise financeira"
        />

        {/* Status Banner */}
        <Card className={isAIEnabled ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}>
          <CardContent className="flex items-center gap-4 py-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${isAIEnabled ? 'bg-success/20' : 'bg-warning/20'}`}>
              {isAIEnabled ? (
                <CheckCircle2 className="h-6 w-6 text-success" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-warning" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">
                {loadingSettings ? "Verificando..." : isAIEnabled ? "IA Ativa" : "IA Desativada"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isAIEnabled 
                  ? `Modo: ${settings?.autopilot_mode === 'safe' ? 'Assistido' : settings?.autopilot_mode === 'autopilot' ? 'Automático' : 'Balanceado'}`
                  : "Ative a IA nas configurações para usar os agentes"
                }
              </p>
            </div>
            {alertsSummary && alertsSummary.unread_count > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="animate-pulse">
                  {alertsSummary.critical_count} críticos
                </Badge>
                <Badge variant="secondary">
                  {alertsSummary.unread_count} não lidos
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agents Overview - Consistent with AP/AR Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-success" />
                Agente WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Processa mensagens e executa baixas/lançamentos
                </p>
                <Badge variant={settings?.agent_whatsapp_enabled ? "default" : "secondary"}>
                  {settings?.agent_whatsapp_enabled ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BellRing className="h-4 w-4 text-warning" />
                Monitor Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Observa eventos e gera alertas de riscos
                </p>
                <Badge variant={settings?.agent_monitor_enabled ? "default" : "secondary"}>
                  {settings?.agent_monitor_enabled ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Analista IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Responde perguntas e gera relatórios
                </p>
                <Badge variant={settings?.agent_analyst_enabled ? "default" : "secondary"}>
                  {settings?.agent_analyst_enabled ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Module Links - Consistent hover styles */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Link key={module.href} to={module.href}>
              <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${module.bgColor}`}>
                      <module.icon className={`h-5 w-5 ${module.iconColor}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <CardTitle className="text-lg mt-3">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Tips - Consistent with other modules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Como Funciona
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/20 text-success text-sm font-bold">1</span>
                  Agente WhatsApp
                </h4>
                <p className="text-sm text-muted-foreground">
                  Recebe mensagens como "Paguei R$ 500 do fornecedor X" e executa a baixa automaticamente.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/20 text-warning text-sm font-bold">2</span>
                  Monitor Financeiro
                </h4>
                <p className="text-sm text-muted-foreground">
                  Observa seu fluxo de caixa e envia alertas quando detecta riscos ou oportunidades.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold">3</span>
                  Analista IA
                </h4>
                <p className="text-sm text-muted-foreground">
                  Pergunte "Quais clientes mais atrasaram?" e receba análises detalhadas em segundos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
