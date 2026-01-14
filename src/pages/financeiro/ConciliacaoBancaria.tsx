import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GitCompare, Upload, RefreshCw, CheckCircle2, AlertCircle, 
  FileText, Calendar, DollarSign, ArrowRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { 
  useBankReconciliations, 
  useBankTransactions, 
  useAutoReconcile,
  BankTransaction 
} from '@/hooks/useBankReconciliation';

export default function ConciliacaoBancaria() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('__all__');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const { data: reconciliations = [], isLoading: loadingReconciliations } = useBankReconciliations();
  const { data: transactions = [], isLoading: loadingTransactions } = useBankTransactions();
  const autoReconcile = useAutoReconcile();

  const getStatusBadge = (status: string) => {
    const styles = {
      pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      em_andamento: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      concluida: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelada: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    const labels = {
      pendente: 'Pendente',
      em_andamento: 'Em Andamento',
      concluida: 'Concluída',
      cancelada: 'Cancelada',
    };
    return (
      <Badge className={styles[status as keyof typeof styles] || styles.pendente}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getTransactionStatusBadge = (status: BankTransaction['status']) => {
    const styles = {
      nao_conciliado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      sugerido: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      conciliado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      divergente: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    const labels = {
      nao_conciliado: 'Não Conciliado',
      sugerido: 'Sugerido',
      conciliado: 'Conciliado',
      divergente: 'Divergente',
    };
    return (
      <Badge className={styles[status]}>
        {labels[status]}
      </Badge>
    );
  };

  // Mock statistics
  const stats = {
    totalConciliado: 0,
    totalPendente: 0,
    totalDivergencias: 0,
    percentualConciliado: 0,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Conciliação Bancária"
          description="Concilie automaticamente extratos bancários com lançamentos do sistema"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="import">Importar Extrato</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Conciliado</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalConciliado)}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pendente</p>
                      <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalPendente)}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Divergências</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalDivergencias)}</p>
                    </div>
                    <GitCompare className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">% Conciliado</p>
                      <p className="text-2xl font-bold">{stats.percentualConciliado.toFixed(1)}%</p>
                    </div>
                    <RefreshCw className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent reconciliations */}
            <Card>
              <CardHeader>
                <CardTitle>Conciliações Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingReconciliations ? (
                  <p className="text-center text-muted-foreground py-8">Carregando...</p>
                ) : reconciliations.length === 0 ? (
                  <div className="text-center py-12">
                    <GitCompare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma conciliação encontrada</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Importe um extrato bancário para começar
                    </p>
                    <Button className="mt-4" onClick={() => setActiveTab('import')}>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Extrato
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Conta</TableHead>
                        <TableHead className="text-right">Saldo Extrato</TableHead>
                        <TableHead className="text-right">Saldo Sistema</TableHead>
                        <TableHead className="text-right">Diferença</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliations.map((rec) => (
                        <TableRow key={rec.id}>
                          <TableCell>{new Date(rec.statement_date).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell className="text-right">{formatCurrency(rec.statement_balance)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(rec.system_balance)}</TableCell>
                          <TableCell className="text-right">
                            <span className={rec.difference !== 0 ? 'text-red-600' : 'text-green-600'}>
                              {formatCurrency(rec.difference)}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(rec.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Importar Extrato Bancário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Conta Bancária</label>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas as contas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data do Extrato</label>
                    <Input type="date" />
                  </div>
                </div>

                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Arraste o arquivo ou clique para selecionar</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Formatos aceitos: OFX, CSV, XLS, XLSX
                  </p>
                  <Input type="file" className="mt-4 max-w-xs mx-auto" accept=".ofx,.csv,.xls,.xlsx" />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline">Cancelar</Button>
                  <Button disabled>
                    <Upload className="h-4 w-4 mr-2" />
                    Processar Arquivo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Transações para Conciliar</CardTitle>
                <Button onClick={() => autoReconcile.mutate('')} disabled={autoReconcile.isPending}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${autoReconcile.isPending ? 'animate-spin' : ''}`} />
                  Conciliar Automaticamente
                </Button>
              </CardHeader>
              <CardContent>
                {loadingTransactions ? (
                  <p className="text-center text-muted-foreground py-8">Carregando...</p>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma transação pendente</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Débito</TableHead>
                        <TableHead className="text-right">Crédito</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{new Date(tx.transaction_date).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell className="text-right text-red-600">
                            {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                          </TableCell>
                          <TableCell>{getTransactionStatusBadge(tx.status)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Histórico de Conciliações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reconciliations.filter(r => r.status === 'concluida').length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma conciliação finalizada</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Conta</TableHead>
                        <TableHead className="text-right">Saldo Final</TableHead>
                        <TableHead>Conciliado em</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliations
                        .filter(r => r.status === 'concluida')
                        .map((rec) => (
                          <TableRow key={rec.id}>
                            <TableCell>{new Date(rec.statement_date).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell className="text-right">{formatCurrency(rec.statement_balance)}</TableCell>
                            <TableCell>
                              {rec.reconciled_at 
                                ? new Date(rec.reconciled_at).toLocaleDateString('pt-BR')
                                : '-'
                              }
                            </TableCell>
                            <TableCell>{getStatusBadge(rec.status)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
