import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/common/DataTable";
import { 
  FileText, 
  MessageSquare, 
  BellRing, 
  Brain,
  RefreshCw,
  Eye,
  Check,
  X,
  AlertCircle,
  Clock
} from "lucide-react";
import { useAILogs } from "@/hooks/useAIModule";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const AGENT_CONFIG: Record<string, { icon: React.ComponentType<any>; color: string; label: string }> = {
  whatsapp: { icon: MessageSquare, color: "text-green-500", label: "WhatsApp" },
  monitor: { icon: BellRing, color: "text-orange-500", label: "Monitor" },
  analyst: { icon: Brain, color: "text-purple-500", label: "Analista" },
};

const STATUS_CONFIG: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  success: { variant: "default", label: "Sucesso" },
  error: { variant: "destructive", label: "Erro" },
  pending_approval: { variant: "secondary", label: "Pendente" },
  processing: { variant: "outline", label: "Processando" },
  cancelled: { variant: "secondary", label: "Cancelado" },
};

export default function IALogs() {
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: logs, isLoading, refetch } = useAILogs({
    agent_type: agentFilter !== "all" ? agentFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 200,
  });

  const columns = [
    {
      key: "created_at",
      header: "Data/Hora",
      render: (log: any) => (
        <span className="text-sm">
          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
        </span>
      ),
    },
    {
      key: "agent_type",
      header: "Agente",
      render: (log: any) => {
        const config = AGENT_CONFIG[log.agent_type] || AGENT_CONFIG.analyst;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.color}`} />
            <span className="text-sm">{config.label}</span>
          </div>
        );
      },
    },
    {
      key: "origin",
      header: "Origem",
      render: (log: any) => (
        <Badge variant="outline" className="text-xs">
          {log.origin}
        </Badge>
      ),
    },
    {
      key: "input_text",
      header: "Entrada",
      render: (log: any) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {log.input_text || "(sem texto)"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (log: any) => {
        const config = STATUS_CONFIG[log.status] || { variant: "secondary" as const, label: log.status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "latency_ms",
      header: "Latência",
      render: (log: any) => (
        <span className="text-sm text-muted-foreground">
          {log.latency_ms ? `${log.latency_ms}ms` : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (log: any) => <LogDetailDialog log={log} />,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Logs de IA & Auditoria"
          description="Histórico completo de todas as ações e decisões dos agentes de IA"
        />

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Agente</label>
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="monitor">Monitor</SelectItem>
                    <SelectItem value="analyst">Analista</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                    <SelectItem value="pending_approval">Pendente</SelectItem>
                    <SelectItem value="processing">Processando</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Registros de Atividade
            </CardTitle>
            <CardDescription>
              {logs?.length || 0} registros encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={logs || []}
              columns={columns}
              loading={isLoading}
              emptyMessage="Nenhum registro encontrado"
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function LogDetailDialog({ log }: { log: any }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Log</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID</label>
                <p className="text-sm font-mono">{log.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data/Hora</label>
                <p className="text-sm">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Agente</label>
                <p className="text-sm">{AGENT_CONFIG[log.agent_type]?.label || log.agent_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant={STATUS_CONFIG[log.status]?.variant || "secondary"}>
                  {STATUS_CONFIG[log.status]?.label || log.status}
                </Badge>
              </div>
            </div>

            {log.input_text && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Entrada (Texto)</label>
                <div className="bg-muted rounded-lg p-3 mt-1">
                  <p className="text-sm whitespace-pre-wrap">{log.input_text}</p>
                </div>
              </div>
            )}

            {log.input_raw && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Entrada (JSON)</label>
                <pre className="bg-muted rounded-lg p-3 mt-1 text-xs overflow-auto">
                  {JSON.stringify(log.input_raw, null, 2)}
                </pre>
              </div>
            )}

            {log.interpretation && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Interpretação</label>
                <pre className="bg-muted rounded-lg p-3 mt-1 text-xs overflow-auto">
                  {JSON.stringify(log.interpretation, null, 2)}
                </pre>
              </div>
            )}

            {log.action_executed && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ação Executada</label>
                <pre className="bg-muted rounded-lg p-3 mt-1 text-xs overflow-auto">
                  {JSON.stringify(log.action_executed, null, 2)}
                </pre>
              </div>
            )}

            {log.error_message && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Erro</label>
                <div className="bg-destructive/10 text-destructive rounded-lg p-3 mt-1">
                  <p className="text-sm">{log.error_message}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              {log.latency_ms && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Latência</label>
                  <p className="text-sm">{log.latency_ms}ms</p>
                </div>
              )}
              {log.tokens_used && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tokens</label>
                  <p className="text-sm">{log.tokens_used}</p>
                </div>
              )}
              {log.cost_estimate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Custo Estimado</label>
                  <p className="text-sm">${Number(log.cost_estimate).toFixed(6)}</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
