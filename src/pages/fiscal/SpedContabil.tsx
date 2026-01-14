import { useState } from 'react';
import { BookOpen, Upload, CheckCircle, AlertTriangle, RefreshCw, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { useSpedAccountingEntries, useSpedAccountingStats, useValidateSpedAccountingEntries } from '@/hooks/useSpedAccounting';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

export default function SpedContabil() {
  const [activeTab, setActiveTab] = useState('lancamentos');
  
  const { data: entries = [], isLoading } = useSpedAccountingEntries();
  const { data: stats } = useSpedAccountingStats();
  const validateMutation = useValidateSpedAccountingEntries();
  
  const handleValidateAll = () => {
    const pendingIds = entries.filter(e => !e.is_validated).map(e => e.id);
    if (pendingIds.length === 0) {
      toast.info('Não há lançamentos pendentes de validação');
      return;
    }
    validateMutation.mutate(pendingIds);
  };
  
  const handleGenerateSped = () => {
    toast.info('Geração de SPED Contábil em desenvolvimento');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SPED Contábil"
        description="Escrituração Contábil Digital - ECD"
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Lançamentos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats?.totalLancamentos || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Débitos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(stats?.totalDebitos || 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Créditos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(stats?.totalCreditos || 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Partidas Dobradas</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats?.partidasDobradasOk ? 'text-green-600' : 'text-destructive'}`}>
              {stats?.partidasDobradasOk ? 'OK' : 'Erro'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alert if balance doesn't match */}
      {stats && !stats.partidasDobradasOk && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Diferença nas Partidas Dobradas</p>
            <p className="text-sm text-muted-foreground">
              Diferença de {formatCurrency(Math.abs(stats.diferenca))} entre débitos e créditos.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
            <TabsTrigger value="plano">Plano de Contas</TabsTrigger>
            <TabsTrigger value="validacao">Validação</TabsTrigger>
            <TabsTrigger value="geracao">Geração</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleValidateAll}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Validar Todos
            </Button>
            <Button onClick={handleGenerateSped}>
              <BookOpen className="h-4 w-4 mr-2" />
              Gerar SPED
            </Button>
          </div>
        </div>

        <TabsContent value="lancamentos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Lançamentos Contábeis</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum lançamento encontrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Nº</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Histórico</TableHead>
                      <TableHead className="text-right">Débito</TableHead>
                      <TableHead className="text-right">Crédito</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.slice(0, 50).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {format(new Date(entry.entry_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{entry.entry_number}</TableCell>
                        <TableCell className="font-mono">{entry.account_code}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{entry.history}</TableCell>
                        <TableCell className="text-right">
                          {entry.debit_value > 0 ? formatCurrency(entry.debit_value) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.credit_value > 0 ? formatCurrency(entry.credit_value) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.is_validated ? (
                            <Badge variant="default" className="bg-green-500">OK</Badge>
                          ) : (
                            <Badge variant="secondary">Pendente</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plano" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Plano de Contas</CardTitle>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                O plano de contas é gerenciado em Cadastros &gt; Plano de Contas
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validacao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Validação de Lançamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Regras de Validação</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Partidas dobradas (débito = crédito)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Conta contábil existente no plano de contas
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Histórico obrigatório
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Numeração sequencial
                    </li>
                  </ul>
                </div>
                <Button onClick={handleValidateAll} disabled={validateMutation.isPending}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${validateMutation.isPending ? 'animate-spin' : ''}`} />
                  Executar Validação Completa
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geracao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerar SPED Contábil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Selecione o período para geração do arquivo SPED Contábil (ECD).
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Período Atual</h4>
                    <p className="text-2xl font-bold">
                      {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stats?.totalLancamentos || 0} lançamentos
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Totais</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Débitos:</span>
                        <span className="font-mono">{formatCurrency(stats?.totalDebitos || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Créditos:</span>
                        <span className="font-mono">{formatCurrency(stats?.totalCreditos || 0)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Diferença:</span>
                        <span className={`font-mono ${stats?.diferenca !== 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {formatCurrency(stats?.diferenca || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <Button onClick={handleGenerateSped} className="w-full" disabled={!stats?.partidasDobradasOk}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Gerar Arquivo SPED Contábil
                </Button>
                {!stats?.partidasDobradasOk && (
                  <p className="text-sm text-destructive text-center">
                    Corrija a diferença nas partidas dobradas antes de gerar o SPED.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
