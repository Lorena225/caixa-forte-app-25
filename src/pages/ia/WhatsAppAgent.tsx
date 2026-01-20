import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Check, 
  X, 
  Clock, 
  AlertCircle,
  FileText,
  Image,
  Mic,
  Phone,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw
} from "lucide-react";
import { 
  useAIWhatsAppMessages, 
  useApproveWhatsAppAction, 
  useRejectWhatsAppAction 
} from "@/hooks/useAIModule";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/formatters";

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  received: { label: "Recebida", variant: "secondary" },
  processing: { label: "Processando", variant: "outline" },
  suggested: { label: "Aguardando Aprovação", variant: "default" },
  approved: { label: "Aprovada", variant: "default" },
  executed: { label: "Executada", variant: "default" },
  rejected: { label: "Rejeitada", variant: "destructive" },
  error: { label: "Erro", variant: "destructive" },
};

export default function WhatsAppAgent() {
  const [activeTab, setActiveTab] = useState("pending");
  
  const { data: allMessages, isLoading } = useAIWhatsAppMessages();
  const { data: pendingMessages } = useAIWhatsAppMessages({ status: "suggested" });
  const approveAction = useApproveWhatsAppAction();
  const rejectAction = useRejectWhatsAppAction();

  const handleApprove = async (messageId: string) => {
    try {
      await approveAction.mutateAsync(messageId);
      toast.success("Ação aprovada e executada");
    } catch (error) {
      toast.error("Erro ao aprovar ação");
    }
  };

  const handleReject = async (messageId: string) => {
    try {
      await rejectAction.mutateAsync(messageId);
      toast.success("Ação rejeitada");
    } catch (error) {
      toast.error("Erro ao rejeitar ação");
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
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

  const getActionIcon = (action: any) => {
    if (!action) return null;
    const actionType = action.action || action.type;
    if (actionType === "settle" || actionType === "baixa") {
      return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
    }
    if (actionType === "create" || actionType === "lancamento") {
      return <ArrowUpCircle className="h-4 w-4 text-blue-500" />;
    }
    return null;
  };

  const stats = {
    total: allMessages?.length || 0,
    pending: pendingMessages?.length || 0,
    executed: allMessages?.filter(m => m.action_status === "executed").length || 0,
    rejected: allMessages?.filter(m => m.action_status === "rejected").length || 0,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Agente WhatsApp"
          description="Baixas e lançamentos automáticos via mensagens do WhatsApp"
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total de Mensagens</p>
            </CardContent>
          </Card>
          <Card className={stats.pending > 0 ? "border-orange-500/50" : ""}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
              <p className="text-sm text-muted-foreground">Aguardando Aprovação</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{stats.executed}</div>
              <p className="text-sm text-muted-foreground">Executadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{stats.rejected}</div>
              <p className="text-sm text-muted-foreground">Rejeitadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Messages */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pendentes
              {stats.pending > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.pending}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="executed">Executadas</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Ações Pendentes de Aprovação</CardTitle>
                <CardDescription>
                  Revise e aprove as ações sugeridas pela IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !pendingMessages?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma ação pendente</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {pendingMessages.map((msg) => (
                        <MessageCard
                          key={msg.id}
                          message={msg}
                          onApprove={() => handleApprove(msg.id)}
                          onReject={() => handleReject(msg.id)}
                          isPending
                          getMessageIcon={getMessageIcon}
                          getActionIcon={getActionIcon}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Todas as Mensagens</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !allMessages?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma mensagem recebida</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {allMessages.map((msg) => (
                        <MessageCard
                          key={msg.id}
                          message={msg}
                          getMessageIcon={getMessageIcon}
                          getActionIcon={getActionIcon}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="executed" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Mensagens Executadas</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {allMessages?.filter(m => m.action_status === "executed").map((msg) => (
                      <MessageCard
                        key={msg.id}
                        message={msg}
                        getMessageIcon={getMessageIcon}
                        getActionIcon={getActionIcon}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

interface MessageCardProps {
  message: any;
  onApprove?: () => void;
  onReject?: () => void;
  isPending?: boolean;
  getMessageIcon: (type: string) => React.ReactNode;
  getActionIcon: (action: any) => React.ReactNode;
}

function MessageCard({ message, onApprove, onReject, isPending, getMessageIcon, getActionIcon }: MessageCardProps) {
  const status = STATUS_CONFIG[message.action_status] || { label: message.action_status, variant: "secondary" as const };
  const action = message.suggested_action as any;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <Phone className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="font-medium font-mono text-sm">{message.phone_sender}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getMessageIcon(message.message_type)}
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-sm">{message.message_text || "(sem texto)"}</p>
      </div>

      {action && (
        <div className="bg-primary/5 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            {getActionIcon(action)}
            <span>Ação Sugerida:</span>
          </div>
          <div className="text-sm space-y-1">
            <p><strong>Tipo:</strong> {action.action || action.type}</p>
            {action.data?.description && (
              <p><strong>Descrição:</strong> {action.data.description}</p>
            )}
            {action.data?.amount && (
              <p><strong>Valor:</strong> {formatCurrency(action.data.amount)}</p>
            )}
            {action.data?.counterparty && (
              <p><strong>Contraparte:</strong> {action.data.counterparty}</p>
            )}
          </div>
          {message.confidence_score && (
            <p className="text-xs text-muted-foreground">
              Confiança: {(message.confidence_score * 100).toFixed(0)}%
            </p>
          )}
        </div>
      )}

      {isPending && onApprove && onReject && (
        <div className="flex gap-2 pt-2">
          <Button onClick={onApprove} className="flex-1">
            <Check className="h-4 w-4 mr-2" />
            Aprovar e Executar
          </Button>
          <Button variant="outline" onClick={onReject}>
            <X className="h-4 w-4 mr-2" />
            Rejeitar
          </Button>
        </div>
      )}
    </div>
  );
}
