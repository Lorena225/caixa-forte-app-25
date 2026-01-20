import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileText, 
  MessageSquare, 
  BellRing, 
  Brain,
  RefreshCw,
  Eye,
  Inbox
} from "lucide-react";
import { useAILogs } from "@/hooks/useAIModule";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const AGENT_CONFIG: Record<string, { icon: React.ComponentType<any>; colorClass: string; label: string }> = {
  whatsapp: { icon: MessageSquare, colorClass: "text-success", label: "WhatsApp" },
  monitor: { icon: BellRing, colorClass: "text-warning", label: "Monitor" },
  analyst: { icon: Brain, colorClass: "text-primary", label: "Analista" },
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

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Logs de IA & Auditoria"
          description="Histórico completo de todas as ações e decisões dos agentes de IA"
        />

        {/* Filters - Consistent with other modules */}
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

        {/* Logs Table - Consistent with AP/AR tables */}
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
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !logs?.length ? (
              <div className="text-center py-12">
                <div className="mb-4 rounded-full bg-muted p-4 w-fit mx-auto">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhum registro encontrado</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Os logs de atividade dos agentes de IA aparecerão aqui conforme eles processam mensagens e geram alertas.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Agente</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Latência</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const agentConfig = AGENT_CONFIG[log.agent_type] || AGENT_CONFIG.analyst;
                    const statusConfig = STATUS_CONFIG[log.status] || { variant: "secondary" as const, label: log.status };
                    const AgentIcon = agentConfig.icon;
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <AgentIcon className={`h-4 w-4 ${agentConfig.colorClass}`} />
                            <span className="text-sm">{agentConfig.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.origin}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="text-sm text-muted-foreground truncate block">
                            {log.input_text || "(sem texto)"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {log.latency_ms ? `${log.latency_ms}ms` : "-"}
                        </TableCell>
                        <TableCell>
                          <LogDetailDialog log={log} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function LogDetailDialog({ log }: { log: any }) {
  const agentConfig = AGENT_CONFIG[log.agent_type] || AGENT_CONFIG.analyst;
  const statusConfig = STATUS_CONFIG[log.status] || { variant: "secondary" as const, label: log.status };
  
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
                <p className="text-sm font-mono truncate">{log.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data/Hora</label>
                <p className="text-sm">
                  {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Agente</label>
                <p className="text-sm">{agentConfig.label}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
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
                <pre className="bg-muted rounded-lg p-3 mt-1 text-xs overflow-auto max-h-40">
                  {JSON.stringify(log.input_raw, null, 2)}
                </pre>
              </div>
            )}

            {log.interpretation && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Interpretação da IA</label>
                <pre className="bg-muted rounded-lg p-3 mt-1 text-xs overflow-auto max-h-40">
                  {JSON.stringify(log.interpretation, null, 2)}
                </pre>
              </div>
            )}

            {log.action_executed && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ação Executada</label>
                <pre className="bg-success/10 rounded-lg p-3 mt-1 text-xs overflow-auto max-h-40">
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

            <div className="grid grid-cols-3 gap-4 pt-2 border-t">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Latência</label>
                <p className="text-sm">{log.latency_ms ? `${log.latency_ms}ms` : "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tokens</label>
                <p className="text-sm">{log.tokens_used || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Custo Estimado</label>
                <p className="text-sm">{log.cost_estimate ? `$${Number(log.cost_estimate).toFixed(6)}` : "-"}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
