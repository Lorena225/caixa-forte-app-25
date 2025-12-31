import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useImportBatches, parseSummary } from '@/hooks/useIntegrations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, RefreshCw, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Logs() {
  const { data: batches, isLoading, refetch } = useImportBatches();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Sucesso</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" />Parcial</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Logs de Importação"
        description="Histórico de todas as importações realizadas"
      >
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />Atualizar
        </Button>
      </PageHeader>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Histórico de Importações</CardTitle>
          <CardDescription>Últimas 50 importações</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : batches?.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma importação realizada ainda</p>
              <Button asChild className="mt-4">
                <Link to="/integracoes">Ir para Integrações</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Importadas</TableHead>
                  <TableHead className="text-right">Conciliadas</TableHead>
                  <TableHead className="text-right">Duplicadas</TableHead>
                  <TableHead className="text-right">Erros</TableHead>
                  <TableHead>Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches?.map((batch) => {
                  const summary = parseSummary(batch.summary_json);
                  const duration = batch.finished_at && batch.started_at
                    ? Math.round((new Date(batch.finished_at).getTime() - new Date(batch.started_at).getTime()) / 1000)
                    : null;

                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        {format(new Date(batch.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {batch.source_filename || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{batch.source_type}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell className="text-right font-medium">{summary.imported}</TableCell>
                      <TableCell className="text-right text-green-600">{summary.reconciled}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{summary.duplicates}</TableCell>
                      <TableCell className="text-right text-destructive">{summary.errors}</TableCell>
                      <TableCell>
                        {duration !== null ? `${duration}s` : <Clock className="h-4 w-4 animate-pulse" />}
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
