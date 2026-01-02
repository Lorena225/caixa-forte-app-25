import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIntegrationLogs, IntegrationLog } from '@/hooks/useEnterpriseIntegrations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, ArrowDownLeft, ArrowUpRight, Eye, CheckCircle, AlertCircle } from 'lucide-react';

export default function EnterpriseLogs() {
  const [directionFilter, setDirectionFilter] = useState<'in' | 'out' | 'all'>('all');
  const { data: logs, isLoading, refetch } = useIntegrationLogs(
    directionFilter === 'all' ? undefined : { direction: directionFilter }
  );
  const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null);

  const getStatusBadge = (statusCode: number | null) => {
    if (!statusCode) return <Badge variant="outline">-</Badge>;
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />{statusCode}</Badge>;
    }
    if (statusCode >= 400) {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />{statusCode}</Badge>;
    }
    return <Badge variant="secondary">{statusCode}</Badge>;
  };

  return (
    <MainLayout>
      <PageHeader
        title="Logs de Integração"
        description="Histórico de requisições HTTP de integrações"
      >
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />Atualizar
        </Button>
      </PageHeader>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Logs de Requisições</CardTitle>
            <CardDescription>Últimas 200 requisições</CardDescription>
          </div>
          <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v as 'in' | 'out' | 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Direção..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="in">Entrada (Webhooks)</SelectItem>
              <SelectItem value="out">Saída (Chamadas)</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : logs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum log encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Direção</TableHead>
                  <TableHead>Conexão</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => {
                  const conn = log.connection as { name?: string } | undefined;
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {log.direction === 'in' ? (
                          <Badge variant="outline"><ArrowDownLeft className="h-3 w-3 mr-1" />IN</Badge>
                        ) : (
                          <Badge variant="outline"><ArrowUpRight className="h-3 w-3 mr-1" />OUT</Badge>
                        )}
                      </TableCell>
                      <TableCell>{conn?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.method || '-'}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate font-mono text-xs">
                        {log.endpoint}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status_code)}</TableCell>
                      <TableCell>
                        {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="ghost" onClick={() => setSelectedLog(log)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Detalhes do Log</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Endpoint:</span>
                                  <p className="font-mono break-all">{log.endpoint}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Status:</span>
                                  <p>{log.status_code || 'N/A'}</p>
                                </div>
                              </div>
                              {log.error_message && (
                                <div>
                                  <span className="text-muted-foreground text-sm">Erro:</span>
                                  <p className="text-destructive text-sm">{log.error_message}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground text-sm">Request:</span>
                                <ScrollArea className="h-32 rounded border p-2">
                                  <pre className="text-xs">
                                    {JSON.stringify(log.request_meta_json, null, 2)}
                                  </pre>
                                </ScrollArea>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-sm">Response:</span>
                                <ScrollArea className="h-32 rounded border p-2">
                                  <pre className="text-xs">
                                    {JSON.stringify(log.response_meta_json, null, 2)}
                                  </pre>
                                </ScrollArea>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
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
