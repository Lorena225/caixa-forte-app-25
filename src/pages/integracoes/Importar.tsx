import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  useIntegration, 
  useCreateImportBatch, 
  useUpdateImportBatch,
  useImportTransactions,
  useCreateReconciliationMatch,
  useMarkImportedAsProcessed,
} from '@/hooks/useIntegrations';
import { useTransactions, useWallets } from '@/hooks/useCompanyData';
import { useAuth } from '@/contexts/AuthContext';
import { parseOFX, generateTransactionHash } from '@/lib/parsers/ofxParser';
import { parseCSV, generateCSVHash } from '@/lib/parsers/csvParser';
import { reconcileTransaction, ReconciliationSettings } from '@/lib/reconciliation';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface ParsedTransaction {
  date: Date;
  amount: number;
  description: string;
  direction: 'in' | 'out';
  fitId?: string;
  counterparty?: string;
  hash: string;
}

export default function ImportarExtrato() {
  const { integrationId } = useParams<{ integrationId: string }>();
  const navigate = useNavigate();
  const { currentCompany } = useAuth();
  
  const { data: integration, isLoading: loadingIntegration } = useIntegration(integrationId || null);
  const { data: wallets } = useWallets();
  const { data: existingTransactions } = useTransactions();
  
  const createBatch = useCreateImportBatch();
  const updateBatch = useUpdateImportBatch();
  const importTransactions = useImportTransactions();
  const createMatches = useCreateReconciliationMatch();
  const markProcessed = useMarkImportedAsProcessed();

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<{
    total: number;
    reconciled: number;
    created: number;
    duplicates: number;
  } | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);
    setParsedData([]);
    setSummary(null);

    try {
      const content = await selectedFile.text();
      const fileName = selectedFile.name.toLowerCase();
      
      let transactions: ParsedTransaction[] = [];

      if (fileName.endsWith('.ofx') || fileName.endsWith('.ofc')) {
        const result = parseOFX(content);
        transactions = result.transactions.map(t => ({
          date: t.datePosted,
          amount: Math.abs(t.amount),
          description: t.memo || t.name || 'Sem descrição',
          direction: t.amount >= 0 ? 'in' : 'out',
          fitId: t.fitId,
          hash: generateTransactionHash(t, result.account.accountId),
        }));
      } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        const result = parseCSV(content);
        transactions = result.transactions.map((t, idx) => ({
          date: t.date,
          amount: Math.abs(t.amount),
          description: t.description || 'Sem descrição',
          direction: t.amount >= 0 ? 'in' : 'out',
          counterparty: t.counterparty,
          hash: generateCSVHash(t, idx),
        }));
      } else {
        throw new Error('Formato de arquivo não suportado. Use OFX ou CSV.');
      }

      if (transactions.length === 0) {
        throw new Error('Nenhuma transação encontrada no arquivo.');
      }

      setParsedData(transactions);
      toast.success(`${transactions.length} transações encontradas`);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
      toast.error('Erro ao processar arquivo');
    }
  }, []);

  const processImport = useCallback(async () => {
    if (!integrationId || !currentCompany || parsedData.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      // Create batch
      const batch = await createBatch.mutateAsync({
        integrationId,
        filename: file?.name,
      });

      setProgress(10);

      // Import transactions to imported_transactions table
      const importedTxs = await importTransactions.mutateAsync(
        parsedData.map(t => ({
          batch_id: batch.id,
          integration_id: integrationId,
          external_hash: t.hash,
          external_id: t.fitId || null,
          fit_id: t.fitId || null,
          posted_at: t.date.toISOString().split('T')[0],
          amount: t.amount,
          direction: t.direction,
          description_raw: t.description,
          counterparty_raw: t.counterparty || null,
          processed: false,
        }))
      );

      setProgress(40);

      // Reconciliation
      const settings: ReconciliationSettings = {
        autoReconcileThreshold: 90,
        dateTolerance: 3,
        amountTolerance: 0.05,
        amountTolerancePercent: 0,
        autoCreateTransactions: false,
      };

      const matches: Array<{
        importedTransactionId: string;
        transactionId?: string;
        matchType: 'exact' | 'fuzzy' | 'manual';
        confidence: number;
        rulesApplied: string[];
        actionTaken: 'mark_paid' | 'create' | 'ignore' | 'pending';
      }> = [];

      let reconciledCount = 0;
      let duplicatesCount = 0;

      for (let i = 0; i < importedTxs.length; i++) {
        const imported = importedTxs[i];
        
        // Convert direction for reconciliation
        const walletId = wallets?.[0]?.id; // Use first wallet as default
        
        const result = reconcileTransaction(
          {
            id: imported.id,
            external_id: imported.external_id || undefined,
            external_hash: imported.external_hash,
            posted_at: imported.posted_at,
            amount: imported.amount,
            direction: imported.direction as 'in' | 'out',
            description_raw: imported.description_raw || undefined,
            counterparty_raw: imported.counterparty_raw || undefined,
            fit_id: imported.fit_id || undefined,
            wallet_id: walletId,
          },
          (existingTransactions || []).filter(t => t.status !== 'cancelado'),
          settings
        );

        matches.push({
          importedTransactionId: result.importedTransactionId,
          transactionId: result.transactionId,
          matchType: result.matchType,
          confidence: result.confidence,
          rulesApplied: result.rulesApplied,
          actionTaken: result.suggestedAction,
        });

        if (result.confidence >= 90) reconciledCount++;
        if (result.rulesApplied.includes('duplicate')) duplicatesCount++;

        setProgress(40 + Math.floor((i / importedTxs.length) * 40));
      }

      // Save reconciliation matches
      if (matches.length > 0) {
        await createMatches.mutateAsync(matches);
      }

      setProgress(90);

      // Mark high-confidence matches as processed
      const processedIds = matches
        .filter(m => m.confidence >= 90)
        .map(m => m.importedTransactionId);

      if (processedIds.length > 0) {
        await markProcessed.mutateAsync(processedIds);
      }

      // Update batch status
      await updateBatch.mutateAsync({
        id: batch.id,
        data: {
          status: 'success',
          summary_json: {
            imported: importedTxs.length,
            reconciled: reconciledCount,
            created: 0,
            duplicates: duplicatesCount,
            errors: 0,
          },
        },
      });

      setProgress(100);
      setSummary({
        total: importedTxs.length,
        reconciled: reconciledCount,
        created: 0,
        duplicates: duplicatesCount,
      });

      toast.success('Importação concluída com sucesso!');
    } catch (err) {
      console.error('Erro na importação:', err);
      toast.error('Erro durante a importação');
    } finally {
      setIsProcessing(false);
    }
  }, [integrationId, currentCompany, parsedData, file, wallets, existingTransactions, createBatch, importTransactions, createMatches, markProcessed, updateBatch]);

  const totals = useMemo(() => {
    const entradas = parsedData.filter(t => t.direction === 'in').reduce((acc, t) => acc + t.amount, 0);
    const saidas = parsedData.filter(t => t.direction === 'out').reduce((acc, t) => acc + t.amount, 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [parsedData]);

  if (loadingIntegration) {
    return (
      <MainLayout>
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title={`Importar Extrato - ${integration?.name || ''}`}
        description="Faça upload de um arquivo OFX ou CSV para importar transações"
      >
        <Button variant="outline" onClick={() => navigate('/integracoes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Voltar
        </Button>
      </PageHeader>

      <div className="space-y-6 mt-6">
        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload de Arquivo</CardTitle>
            <CardDescription>Selecione um arquivo OFX ou CSV do seu banco</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : 'Clique para selecionar ou arraste um arquivo'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">OFX, CSV ou TXT</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".ofx,.ofc,.csv,.txt"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
            </label>
          </CardContent>
        </Card>

        {parseError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {parsedData.length > 0 && !summary && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Entradas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.entradas)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Saídas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.saidas)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${totals.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totals.saldo)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Preview ({parsedData.length} transações)</CardTitle>
                  <CardDescription>Revise as transações antes de processar</CardDescription>
                </div>
                <Button onClick={processImport} disabled={isProcessing}>
                  <Play className="mr-2 h-4 w-4" />
                  {isProcessing ? 'Processando...' : 'Processar Importação'}
                </Button>
              </CardHeader>
              <CardContent>
                {isProcessing && (
                  <div className="mb-4">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1 text-center">{progress}%</p>
                  </div>
                )}
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 50).map((tx, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{format(tx.date, 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                          <TableCell className="max-w-xs truncate">{tx.description}</TableCell>
                          <TableCell>
                            <Badge variant={tx.direction === 'in' ? 'default' : 'secondary'}>
                              {tx.direction === 'in' ? 'Entrada' : 'Saída'}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right ${tx.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(tx.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {parsedData.length > 50 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            ... e mais {parsedData.length - 50} transações
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Success Summary */}
        {summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Importação Concluída
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{summary.total}</div>
                  <div className="text-sm text-muted-foreground">Importadas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{summary.reconciled}</div>
                  <div className="text-sm text-muted-foreground">Conciliadas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{summary.total - summary.reconciled - summary.duplicates}</div>
                  <div className="text-sm text-muted-foreground">Pendentes</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-muted-foreground">{summary.duplicates}</div>
                  <div className="text-sm text-muted-foreground">Duplicadas</div>
                </div>
              </div>
              <div className="flex gap-2 mt-6 justify-center">
                <Button onClick={() => navigate('/integracoes/conciliacao')}>
                  Ir para Conciliação
                </Button>
                <Button variant="outline" onClick={() => {
                  setFile(null);
                  setParsedData([]);
                  setSummary(null);
                }}>
                  Importar Outro Arquivo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
