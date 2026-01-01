import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWhatsAppInbox } from "@/hooks/useWhatsAppInbox";
import { useAIDecisions } from "@/hooks/useAIDecisions";
import { MessageSquare, ArrowDownLeft, ArrowUpRight, FileText, Image, Mic, Bot } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Inbox() {
  const { data: messages, isLoading: loadingMessages } = useWhatsAppInbox();
  const { data: decisions, isLoading: loadingDecisions } = useAIDecisions();

  const getMessageIcon = (msgType: string) => {
    switch (msgType) {
      case "text":
        return <MessageSquare className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "audio":
        return <Mic className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received":
        return <Badge variant="outline" className="text-xs">Recebida</Badge>;
      case "processed":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Processada</Badge>;
      case "pending":
        return <Badge variant="secondary" className="text-xs">Pendente</Badge>;
      case "sent":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">Enviada</Badge>;
      case "failed":
        return <Badge variant="destructive" className="text-xs">Erro</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getDecisionStatusBadge = (status: string) => {
    switch (status) {
      case "pending_confirmation":
        return <Badge variant="secondary">Aguardando</Badge>;
      case "confirmed":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Confirmado</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejeitado</Badge>;
      case "executed":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Executado</Badge>;
      case "expired":
        return <Badge variant="outline">Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Inbox & Decisões"
          description="Mensagens recebidas e decisões da IA"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Mensagens
              </CardTitle>
              <CardDescription>
                Últimas mensagens recebidas via WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {loadingMessages ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : !messages?.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma mensagem recebida</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {messages.map((msg) => (
                      <div key={msg.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            msg.direction === "inbound" 
                              ? "bg-green-500/10 text-green-500"
                              : "bg-blue-500/10 text-blue-500"
                          }`}>
                            {msg.direction === "inbound" ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">
                                {msg.phone}
                              </span>
                              {getMessageIcon(msg.msg_type)}
                              {getStatusBadge(msg.status)}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {msg.text_body || msg.media_url || "(sem conteúdo)"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(msg.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* AI Decisions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Decisões da IA
              </CardTitle>
              <CardDescription>
                Interpretações e ações propostas
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {loadingDecisions ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : !decisions?.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma decisão processada</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {decisions.map((decision) => {
                      const actions = Array.isArray(decision.proposed_actions_json) 
                        ? decision.proposed_actions_json as { action: string; data?: { amount?: number } }[]
                        : [];
                      
                      return (
                        <div key={decision.id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">
                                {decision.intent.replace(/_/g, " ")}
                              </span>
                              {getDecisionStatusBadge(decision.status)}
                            </div>
                            {decision.confidence && (
                              <Badge variant="outline" className="text-xs">
                                {Math.round(decision.confidence * 100)}%
                              </Badge>
                            )}
                          </div>
                          
                          {actions.length > 0 && (
                            <div className="space-y-1 mt-2">
                              {actions.slice(0, 2).map((action, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>→ {action.action}</span>
                                  {action.data?.amount && (
                                    <Badge variant="secondary" className="text-xs">
                                      R$ {action.data.amount.toLocaleString("pt-BR")}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                              {actions.length > 2 && (
                                <span className="text-xs text-muted-foreground">
                                  +{actions.length - 2} ações
                                </span>
                              )}
                            </div>
                          )}
                          
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(decision.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
