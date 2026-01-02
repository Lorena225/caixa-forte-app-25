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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useIntegrationDLQ, useResolveDLQ, useReprocessDLQ, IntegrationDLQ as DLQItem } from '@/hooks/useEnterpriseIntegrations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, Eye, RotateCcw, CheckCircle, AlertTriangle, Inbox } from 'lucide-react';

export default function DLQ() {
  const [resolvedFilter, setResolvedFilter] = useState<'pending' | 'resolved' | 'all'>('pending');
  const { data: dlqItems, isLoading, refetch } = useIntegrationDLQ(
    resolvedFilter === 'all' ? undefined : { resolved: resolvedFilter === 'resolved' }
  );
  const resolveDLQ = useResolveDLQ();
  const reprocessDLQ = useReprocessDLQ();

  const [selectedItem, setSelectedItem] = useState<DLQItem | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const handleResolve = async () => {
    if (!selectedItem) return;
    await resolveDLQ.mutateAsync({ id: selectedItem.id, notes: resolveNotes });
    setSelectedItem(null);
    setResolveNotes('');
  };

  const handleReprocess = async (item: DLQItem) => {
    await reprocessDLQ.mutateAsync(item);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Dead Letter Queue"
        description="Eventos que falharam e precisam de atenção"
      >
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />Atualizar
        </Button>
      </PageHeader>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Fila de Erros
            </CardTitle>
            <CardDescription>Eventos que falharam após múltiplas tentativas</CardDescription>
          </div>
          <Select value={resolvedFilter} onValueChange={(v) => setResolvedFilter(v as 'pending' | 'resolved' | 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="resolved">Resolvidos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : dlqItems?.length === 0 ? (
            <div className="text-center py-8">
              <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum item na fila de erros</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Falhou em</TableHead>
                  <TableHead>Conexão</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dlqItems?.map((item) => {
                  const conn = item.connection as { name?: string } | undefined;
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {format(new Date(item.failed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{conn?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.event_type || 'unknown'}</Badge>
                      </TableCell>
                      <TableCell>{item.attempts}</TableCell>
                      <TableCell>
                        {item.resolved_at ? (
                          <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Resolvido</Badge>
                        ) : (
                          <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="icon" variant="ghost" onClick={() => setSelectedItem(item)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes do Erro</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Evento:</span>
                                    <p>{item.event_type || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Tentativas:</span>
                                    <p>{item.attempts}</p>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-sm">Payload:</span>
                                  <ScrollArea className="h-32 rounded border p-2">
                                    <pre className="text-xs">
                                      {JSON.stringify(item.payload_json, null, 2)}
                                    </pre>
                                  </ScrollArea>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-sm">Erro:</span>
                                  <ScrollArea className="h-32 rounded border p-2">
                                    <pre className="text-xs text-destructive">
                                      {JSON.stringify(item.error_json, null, 2)}
                                    </pre>
                                  </ScrollArea>
                                </div>
                                {!item.resolved_at && (
                                  <div className="space-y-2">
                                    <Label>Notas de Resolução</Label>
                                    <Textarea
                                      placeholder="Descreva como o problema foi resolvido..."
                                      value={resolveNotes}
                                      onChange={(e) => setResolveNotes(e.target.value)}
                                    />
                                    <Button onClick={handleResolve} disabled={resolveDLQ.isPending}>
                                      <CheckCircle className="mr-2 h-4 w-4" />Marcar como Resolvido
                                    </Button>
                                  </div>
                                )}
                                {item.notes && (
                                  <div>
                                    <span className="text-muted-foreground text-sm">Notas:</span>
                                    <p className="text-sm">{item.notes}</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          {!item.resolved_at && item.connection_id && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleReprocess(item)}
                              disabled={reprocessDLQ.isPending}
                              title="Reprocessar"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
