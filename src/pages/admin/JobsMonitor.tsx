import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useJobsQueue, useSystemMetrics, useCancelJob, useRetryJob } from "@/hooks/useJobsMonitoring";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw, Eye, XCircle, RotateCcw, Play, Clock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

export default function JobsMonitor() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: jobs, isLoading, refetch } = useJobsQueue({ status: statusFilter });
  const { data: metrics } = useSystemMetrics();
  const cancelJob = useCancelJob();
  const retryJob = useRetryJob();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Concluído</Badge>;
      case "running":
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Executando</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Falhou</Badge>;
      case "exhausted":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Esgotado</Badge>;
      case "stuck":
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Travado</Badge>;
      case "cancelled":
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return "-";
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <MainLayout>
      <PageHeader
        title="Monitor de Jobs"
        description="Acompanhe tarefas assíncronas: exports, imports, refresh de cache"
      >
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />Atualizar
        </Button>
      </PageHeader>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-5 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.jobs_pending || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Executando</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{metrics?.jobs_running || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Concluídos (1h)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{metrics?.jobs_completed_1h || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Falhas (1h)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{metrics?.jobs_failed_1h || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tempo Médio (1h)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(metrics?.avg_job_duration_1h || null)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Fila de Jobs</CardTitle>
            <CardDescription>Últimas 100 tarefas</CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="running">Executando</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
              <SelectItem value="failed">Falhas</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : jobs?.length === 0 ? (
            <div className="text-center py-8">
              <Play className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum job encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs?.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(job.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{job.job_type}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(job.computed_status)}</TableCell>
                    <TableCell>{job.attempts}/{job.max_attempts}</TableCell>
                    <TableCell>{formatDuration(job.duration_seconds)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Detalhes do Job</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Tipo:</span>
                                  <p>{job.job_type}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Status:</span>
                                  <p>{job.computed_status}</p>
                                </div>
                              </div>
                              {job.payload_json && (
                                <div>
                                  <span className="text-muted-foreground text-sm">Payload:</span>
                                  <ScrollArea className="h-32 rounded border p-2">
                                    <pre className="text-xs">
                                      {JSON.stringify(job.payload_json, null, 2)}
                                    </pre>
                                  </ScrollArea>
                                </div>
                              )}
                              {job.result_json && (
                                <div>
                                  <span className="text-muted-foreground text-sm">Resultado:</span>
                                  <ScrollArea className="h-32 rounded border p-2">
                                    <pre className="text-xs">
                                      {JSON.stringify(job.result_json, null, 2)}
                                    </pre>
                                  </ScrollArea>
                                </div>
                              )}
                              {job.error_json && (
                                <div>
                                  <span className="text-muted-foreground text-sm">Erro:</span>
                                  <ScrollArea className="h-32 rounded border p-2">
                                    <pre className="text-xs text-destructive">
                                      {JSON.stringify(job.error_json, null, 2)}
                                    </pre>
                                  </ScrollArea>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        {(job.status === "pending" || job.status === "running") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => cancelJob.mutate(job.id)}
                            disabled={cancelJob.isPending}
                            title="Cancelar"
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        {(job.computed_status === "failed" || job.computed_status === "exhausted") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => retryJob.mutate(job.id)}
                            disabled={retryJob.isPending}
                            title="Retentar"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
