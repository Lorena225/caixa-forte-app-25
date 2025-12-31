import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  useReconciliationMatches, 
  useApproveReconciliation,
  useMarkTransactionPaid,
  useMarkImportedAsProcessed,
  ReconciliationAction,
  parseSummary,
} from '@/hooks/useIntegrations';
import { CheckCircle, Clock, AlertCircle, Check, X, FileText, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

export default function Conciliacao() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'reconciled' | 'pending' | 'no_match'>('pending');
  
  const { data: allMatches, isLoading, refetch } = useReconciliationMatches();
  const approveReconciliation = useApproveReconciliation();
  const markPaid = useMarkTransactionPaid();
  const markProcessed = useMarkImportedAsProcessed();

  const { reconciled, pending, noMatch } = useMemo(() => {
    if (!allMatches) return { reconciled: [], pending: [], noMatch: [] };
    
    return {
      reconciled: allMatches.filter(m => m.action_taken === 'mark_paid' || m.action_taken === 'ignore'),
      pending: allMatches.filter(m => m.action_taken === 'pending' && m.confidence >= 50),
      noMatch: allMatches.filter(m => m.action_taken === 'pending' && m.confidence < 50),
    };
  }, [allMatches]);

  const currentList = activeTab === 'reconciled' ? reconciled : activeTab === 'pending' ? pending : noMatch;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(currentList.map(m => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkAction = async (action: ReconciliationAction) => {
    if (selectedIds.size === 0) {
      toast.error('Selecione pelo menos um item');
      return;
    }

    try {
      for (const id of selectedIds) {
        const match = currentList.find(m => m.id === id);
        if (!match) continue;

        await approveReconciliation.mutateAsync({ matchId: id, action });

        // If marking as paid, update the transaction
        if (action === 'mark_paid' && match.transaction_id && match.imported_transaction) {
          await markPaid.mutateAsync({
            transactionId: match.transaction_id,
            paidDate: match.imported_transaction.posted_at,
          });
        }

        // Mark imported transaction as processed
        if (match.imported_transaction) {
          await markProcessed.mutateAsync([match.imported_transaction.id]);
        }
      }

      setSelectedIds(new Set());
      refetch();
      toast.success(`${selectedIds.size} itens processados`);
    } catch (err) {
      toast.error('Erro ao processar itens');
    }
  };

  const handleSingleAction = async (matchId: string, action: ReconciliationAction) => {
    try {
      const match = currentList.find(m => m.id === matchId);
      if (!match) return;

      await approveReconciliation.mutateAsync({ matchId, action });

      if (action === 'mark_paid' && match.transaction_id && match.imported_transaction) {
        await markPaid.mutateAsync({
          transactionId: match.transaction_id,
          paidDate: match.imported_transaction.posted_at,
        });
      }

      if (match.imported_transaction) {
        await markProcessed.mutateAsync([match.imported_transaction.id]);
      }

      refetch();
      toast.success('Ação aplicada com sucesso');
    } catch (err) {
      toast.error('Erro ao aplicar ação');
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) return <Badge className="bg-green-500">{confidence}%</Badge>;
    if (confidence >= 60) return <Badge className="bg-yellow-500">{confidence}%</Badge>;
    return <Badge variant="secondary">{confidence}%</Badge>;
  };

  return (
    <MainLayout>
      <PageHeader
        title="Central de Conciliação"
        description="Revise e aprove matches entre transações importadas e lançamentos"
      >
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />Atualizar
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mt-6">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveTab('reconciled')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Conciliados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reconciled.length}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveTab('pending')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pendentes de Revisão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending.length}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveTab('no_match')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Sem Match
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{noMatch.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {activeTab === 'reconciled' && 'Conciliados Automaticamente'}
              {activeTab === 'pending' && 'Pendentes de Revisão'}
              {activeTab === 'no_match' && 'Sem Match (Criar Lançamento)'}
            </CardTitle>
            <CardDescription>
              {activeTab === 'pending' && 'Revise e aprove ou rejeite os matches sugeridos'}
              {activeTab === 'no_match' && 'Crie novos lançamentos para as transações sem correspondência'}
            </CardDescription>
          </div>
          {selectedIds.size > 0 && activeTab !== 'reconciled' && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleBulkAction('mark_paid')} disabled={approveReconciliation.isPending}>
                <Check className="mr-1 h-3 w-3" />Baixar ({selectedIds.size})
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('ignore')} disabled={approveReconciliation.isPending}>
                <X className="mr-1 h-3 w-3" />Ignorar ({selectedIds.size})
              </Button>
              {activeTab === 'no_match' && (
                <Button size="sm" variant="secondary" onClick={() => handleBulkAction('create')} disabled={approveReconciliation.isPending}>
                  <FileText className="mr-1 h-3 w-3" />Criar ({selectedIds.size})
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as typeof activeTab); setSelectedIds(new Set()); }}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Pendentes ({pending.length})</TabsTrigger>
              <TabsTrigger value="no_match">Sem Match ({noMatch.length})</TabsTrigger>
              <TabsTrigger value="reconciled">Conciliados ({reconciled.length})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : currentList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum item nesta categoria
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {activeTab !== 'reconciled' && (
                          <TableHead className="w-10">
                            <Checkbox
                              checked={selectedIds.size === currentList.length && currentList.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                        )}
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição Importada</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Confiança</TableHead>
                        <TableHead>Status</TableHead>
                        {activeTab !== 'reconciled' && <TableHead>Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentList.map((match) => (
                        <TableRow key={match.id}>
                          {activeTab !== 'reconciled' && (
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(match.id)}
                                onCheckedChange={(checked) => handleSelect(match.id, !!checked)}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            {match.imported_transaction && format(new Date(match.imported_transaction.posted_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {match.imported_transaction?.description_raw || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={match.imported_transaction?.direction === 'in' ? 'default' : 'secondary'}>
                              {match.imported_transaction?.direction === 'in' ? 'Entrada' : 'Saída'}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right ${match.imported_transaction?.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                            {match.imported_transaction && formatCurrency(match.imported_transaction.amount)}
                          </TableCell>
                          <TableCell>{getConfidenceBadge(match.confidence)}</TableCell>
                          <TableCell>
                            <Badge variant={match.action_taken === 'pending' ? 'outline' : 'default'}>
                              {match.action_taken === 'mark_paid' && 'Baixado'}
                              {match.action_taken === 'ignore' && 'Ignorado'}
                              {match.action_taken === 'create' && 'Criado'}
                              {match.action_taken === 'pending' && 'Pendente'}
                            </Badge>
                          </TableCell>
                          {activeTab !== 'reconciled' && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleSingleAction(match.id, 'mark_paid')}
                                  title="Baixar"
                                >
                                  <Check className="h-3 w-3 text-green-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleSingleAction(match.id, 'ignore')}
                                  title="Ignorar"
                                >
                                  <X className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
