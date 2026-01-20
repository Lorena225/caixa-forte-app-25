import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  History,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useBackupExecutions, useBackupJobs } from "@/hooks/useBackupManagement";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  sucesso: { label: "Sucesso", variant: "default", icon: CheckCircle },
  falha: { label: "Falha", variant: "destructive", icon: XCircle },
  em_andamento: { label: "Em Andamento", variant: "secondary", icon: RefreshCw },
  pendente: { label: "Pendente", variant: "outline", icon: Clock },
  cancelado: { label: "Cancelado", variant: "outline", icon: AlertCircle },
};

export default function BackupHistorico() {
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: jobs } = useBackupJobs();
  const { data: executions, isLoading, refetch } = useBackupExecutions(
    selectedJob !== "all" ? selectedJob : undefined
  );

  const filteredExecutions = executions?.filter((exec) => {
    if (selectedStatus !== "all" && exec.status !== selectedStatus) return false;
    return true;
  });

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Histórico de Backups"
          description="Visualize o histórico e status de todas as execuções de backup"
        />

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4">
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Jobs</SelectItem>
                {jobs?.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.nome_job || job.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Execuções Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : !filteredExecutions?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma execução encontrada com os filtros selecionados.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Local</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExecutions.map((exec) => {
                    const status = statusConfig[exec.status] || statusConfig.pendente;
                    const StatusIcon = status.icon;
                    const jobInfo = (exec as unknown as { backup_jobs?: { nome_job?: string; tipo?: string } }).backup_jobs;

                    return (
                      <Collapsible key={exec.id} asChild open={expandedRow === exec.id}>
                        <>
                          <TableRow
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setExpandedRow(expandedRow === exec.id ? null : exec.id)}
                          >
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                  <ChevronDown
                                    className={`h-4 w-4 transition-transform ${
                                      expandedRow === exec.id ? "rotate-180" : ""
                                    }`}
                                  />
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell className="font-medium">
                              {jobInfo?.nome_job || exec.backup_job_id.slice(0, 8)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant} className="gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(exec.iniciado_em), "dd/MM HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {exec.finalizado_em
                                ? formatDistanceToNow(new Date(exec.iniciado_em), {
                                    locale: ptBR,
                                    includeSeconds: true,
                                  }).replace("menos de ", "~")
                                : "-"}
                            </TableCell>
                            <TableCell>{formatBytes(exec.tamanho_bytes)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {exec.trigger_type || "manual"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {exec.local_armazenamento || "-"}
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={8} className="p-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <h4 className="font-medium mb-2">Detalhes</h4>
                                    <pre className="text-xs bg-background p-2 rounded border overflow-auto max-h-32">
                                      {JSON.stringify(exec.detalhes, null, 2)}
                                    </pre>
                                  </div>
                                  {exec.erro_mensagem && (
                                    <div>
                                      <h4 className="font-medium mb-2 text-destructive">Erro</h4>
                                      <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                                        {exec.erro_mensagem}
                                      </p>
                                    </div>
                                  )}
                                  {exec.arquivos_processados && (
                                    <div>
                                      <h4 className="font-medium mb-1">Arquivos Processados</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {exec.arquivos_processados} arquivo(s)
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
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
