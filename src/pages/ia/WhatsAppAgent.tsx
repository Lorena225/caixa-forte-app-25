import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { 
  MessageSquare, 
  Check, 
  X, 
  Clock, 
  Phone,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Search,
  Inbox
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
  suggested: { label: "Aguardando", variant: "default" },
  approved: { label: "Aprovada", variant: "default" },
  executed: { label: "Executada", variant: "default" },
  rejected: { label: "Rejeitada", variant: "destructive" },
  error: { label: "Erro", variant: "destructive" },
};

export default function WhatsAppAgent() {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const { data: allMessages, isLoading, refetch } = useAIWhatsAppMessages();
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

  const getActionIcon = (action: any) => {
    if (!action) return null;
    const actionType = action.action || action.type;
    if (actionType === "settle" || actionType === "baixa") {
      return <ArrowDownCircle className="h-4 w-4 text-success" />;
    }
    if (actionType === "create" || actionType === "lancamento") {
      return <ArrowUpCircle className="h-4 w-4 text-info" />;
    }
    return null;
  };

  const stats = {
    total: allMessages?.length || 0,
    pending: pendingMessages?.length || 0,
    executed: allMessages?.filter(m => m.action_status === "executed").length || 0,
    rejected: allMessages?.filter(m => m.action_status === "rejected").length || 0,
  };

  // Filter messages based on search and status
  const filteredMessages = allMessages?.filter(msg => {
    const matchesSearch = !searchTerm || 
      msg.message_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.phone_sender?.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || msg.action_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Agente WhatsApp"
          description="Baixas e lançamentos automáticos via mensagens do WhatsApp"
        />

        {/* Stats - Consistent with AP/AR aging summary */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Mensagens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className={stats.pending > 0 ? "border-warning/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                Aguardando Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-warning">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Executadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{stats.executed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <X className="h-4 w-4 text-destructive" />
                Rejeitadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Consistent with AP/AR filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por telefone ou mensagem..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="suggested">Aguardando</SelectItem>
                    <SelectItem value="executed">Executadas</SelectItem>
                    <SelectItem value="rejected">Rejeitadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Messages - Tabs consistent with AP/AR */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pendentes
                  {stats.pending > 0 && (
                    <Badge variant="destructive" className="ml-1">{stats.pending}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Todas
                </TabsTrigger>
                <TabsTrigger value="executed" className="gap-2">
                  <Check className="h-4 w-4" />
                  Executadas
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <TabsContent value="pending" className="mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !pendingMessages?.length ? (
                <div className="text-center py-12">
                  <div className="mb-4 rounded-full bg-muted p-4 w-fit mx-auto">
                    <Check className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Nenhuma ação pendente</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Todas as mensagens recebidas foram processadas. Novas mensagens do WhatsApp aparecerão aqui.
                  </p>
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
                        getActionIcon={getActionIcon}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !filteredMessages?.length ? (
                <div className="text-center py-12">
                  <div className="mb-4 rounded-full bg-muted p-4 w-fit mx-auto">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Nenhuma mensagem recebida</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Quando o agente receber mensagens do WhatsApp, elas aparecerão aqui para revisão e aprovação.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {filteredMessages.map((msg) => (
                      <MessageCard
                        key={msg.id}
                        message={msg}
                        getActionIcon={getActionIcon}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="executed" className="mt-0">
              {!allMessages?.filter(m => m.action_status === "executed").length ? (
                <div className="text-center py-12">
                  <div className="mb-4 rounded-full bg-muted p-4 w-fit mx-auto">
                    <Check className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Nenhuma ação executada</h3>
                  <p className="text-sm text-muted-foreground">
                    Ações aprovadas e executadas aparecerão nesta lista.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {allMessages?.filter(m => m.action_status === "executed").map((msg) => (
                      <MessageCard
                        key={msg.id}
                        message={msg}
                        getActionIcon={getActionIcon}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

interface MessageCardProps {
  message: any;
  onApprove?: () => void;
  onReject?: () => void;
  isPending?: boolean;
  getActionIcon: (action: any) => React.ReactNode;
}

function MessageCard({ message, onApprove, onReject, isPending, getActionIcon }: MessageCardProps) {
  const status = STATUS_CONFIG[message.action_status] || { label: message.action_status, variant: "secondary" as const };
  const action = message.suggested_action as any;

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${isPending ? 'bg-warning/5 border-warning/30' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
            <Phone className="h-5 w-5 text-success" />
          </div>
          <div className="min-w-0">
            <p className="font-medium font-mono text-sm">{message.phone_sender}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      {/* Message Text */}
      <div className="bg-muted rounded-lg p-3">
        <p className="text-sm">{message.message_text || "(sem texto)"}</p>
      </div>

      {/* Suggested Action - Clear visual distinction */}
      {action && (
        <div className={`rounded-lg p-3 space-y-2 ${isPending ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'}`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {getActionIcon(action)}
            <span>{isPending ? "Ação Sugerida pela IA:" : "Ação:"}</span>
          </div>
          <div className="text-sm space-y-1 pl-6">
            <p><span className="text-muted-foreground">Tipo:</span> {action.action || action.type}</p>
            {action.data?.description && (
              <p><span className="text-muted-foreground">Descrição:</span> {action.data.description}</p>
            )}
            {action.data?.amount && (
              <p><span className="text-muted-foreground">Valor:</span> {formatCurrency(action.data.amount)}</p>
            )}
            {action.data?.counterparty && (
              <p><span className="text-muted-foreground">Contraparte:</span> {action.data.counterparty}</p>
            )}
          </div>
          {message.confidence_score && (
            <p className="text-xs text-muted-foreground pl-6">
              Confiança: {(message.confidence_score * 100).toFixed(0)}%
            </p>
          )}
        </div>
      )}

      {/* Action Buttons - Prominent for pending items */}
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
