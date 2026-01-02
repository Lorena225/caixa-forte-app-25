import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIntegrationJobs, useCancelJob, JobStatus } from '@/hooks/useEnterpriseIntegrations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, Clock, CheckCircle, AlertCircle, XCircle, Loader2, Ban } from 'lucide-react';

export default function Jobs() {
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const { data: jobs, isLoading, refetch } = useIntegrationJobs(
    statusFilter === 'all' ? undefined : { status: statusFilter }
  );
  const cancelJob = useCancelJob();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      case 'running':
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Executando</Badge>;
      case 'cancelled':
        return <Badge variant="secondary"><Ban className="h-3 w-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Jobs de Sincronização"
        description="Acompanhe e gerencie jobs de integração"
      >
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />Atualizar
        </Button>
      </PageHeader>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Jobs de Integração</CardTitle>
            <CardDescription>Últimos 100 jobs</CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as JobStatus | 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="running">Executando</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
              <SelectItem value="failed">Falhos</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : jobs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum job encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agendado</TableHead>
                  <TableHead>Conexão</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Erro</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs?.map((job) => {
                  const duration = job.completed_at && job.started_at
                    ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
                    : null;
                  const conn = job.connection as { name?: string } | undefined;
                  
                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        {format(new Date(job.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{conn?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{job.job_type}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>{job.attempts}/{job.max_attempts}</TableCell>
                      <TableCell>
                        {duration !== null ? `${duration}s` : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-destructive">
                        {job.last_error || '-'}
                      </TableCell>
                      <TableCell>
                        {(job.status === 'pending' || job.status === 'running') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelJob.mutate(job.id)}
                            disabled={cancelJob.isPending}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
