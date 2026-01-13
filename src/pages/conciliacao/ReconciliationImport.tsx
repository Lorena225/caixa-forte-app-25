import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useWallets } from '@/hooks/useCompanyData';
import { useRunReconciliation, useBankStatementImports } from '@/hooks/useReconciliation';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { 
  Upload, FileText, CheckCircle, AlertTriangle, 
  Play, Clock, ArrowUpCircle, ArrowDownCircle,
  RefreshCw, Info
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReconciliationImport() {
  const { currentCompany } = useAuth();
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    lineCount: number;
    totalCredits: number;
    totalDebits: number;
  } | null>(null);

  const { data: wallets = [] } = useWallets();
  const { data: imports = [], isLoading: importsLoading, refetch: refetchImports } = useBankStatementImports();
  const runReconciliation = useRunReconciliation();

  const bankWallets = wallets.filter((w) => w.type === 'banco');

  const handleFileUpload = async () => {
    if (!file || !selectedWallet) {
      toast.error('Selecione uma conta bancária e um arquivo');
      return;
    }

    setIsProcessing(true);
    
    // Simulate file processing (will be replaced with actual Edge Function call)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setImportResult({
      success: true,
      lineCount: Math.floor(Math.random() * 50) + 10,
      totalCredits: Math.random() * 50000 + 10000,
      totalDebits: Math.random() * 30000 + 5000,
    });
    
    setIsProcessing(false);
    toast.success('Arquivo importado com sucesso!');
    refetchImports();
  };

  const handleRunReconciliation = async () => {
    if (!selectedWallet) {
      toast.error('Selecione uma conta bancária');
      return;
    }

    try {
      await runReconciliation.mutateAsync({ wallet_id: selectedWallet });
      toast.success('Conciliação executada! Verifique as exceções.');
    } catch (error) {
      toast.error('Erro ao executar conciliação');
    }
  };

  const handleSaveForLater = () => {
    toast.info('Extrato salvo para conciliar posteriormente');
    setImportResult(null);
    setFile(null);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { class: string; label: string }> = {
      pending: { class: 'bg-warning/10 text-warning', label: 'Pendente' },
      processing: { class: 'bg-info/10 text-info', label: 'Processando' },
      completed: { class: 'bg-success/10 text-success', label: 'Concluído' },
      error: { class: 'bg-destructive/10 text-destructive', label: 'Erro' },
    };
    const c = config[status] || config.pending;
    return <Badge className={c.class}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Import Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Extrato Bancário
          </CardTitle>
          <CardDescription>
            Formatos suportados: OFX, CSV, TXT (layouts CNAB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Conta Bancária</Label>
              <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent>
                  {bankWallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Arquivo do Extrato</Label>
              <Input
                type="file"
                accept=".ofx,.csv,.txt,.ret"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={66} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Processando arquivo...
              </p>
            </div>
          )}

          {importResult && importResult.success && (
            <Alert className="border-success bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertTitle className="text-success">Arquivo processado com sucesso!</AlertTitle>
              <AlertDescription>
                <div className="grid gap-2 mt-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Lançamentos encontrados:</span>
                    <Badge variant="secondary">{importResult.lineCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <ArrowDownCircle className="h-4 w-4 text-success" />
                      Total de créditos:
                    </span>
                    <span className="font-semibold text-success">
                      {formatCurrency(importResult.totalCredits)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <ArrowUpCircle className="h-4 w-4 text-destructive" />
                      Total de débitos:
                    </span>
                    <span className="font-semibold text-destructive">
                      {formatCurrency(importResult.totalDebits)}
                    </span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-2">
            {!importResult ? (
              <Button
                className="flex-1"
                onClick={handleFileUpload}
                disabled={!file || !selectedWallet || isProcessing}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar Arquivo
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleRunReconciliation}
                  disabled={runReconciliation.isPending}
                  className="flex-1"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Executar Conciliação Agora
                </Button>
                <Button variant="outline" onClick={handleSaveForLater}>
                  <Clock className="mr-2 h-4 w-4" />
                  Salvar para Depois
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Como funciona a conciliação?</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
            <li>Importe o extrato bancário (OFX, CSV ou CNAB)</li>
            <li>O sistema analisa cada lançamento e busca títulos em aberto correspondentes</li>
            <li>Matches de alta confiança são baixados automaticamente (se configurado)</li>
            <li>Matches prováveis vão para a aba "Exceções" para confirmação manual</li>
            <li>Lançamentos sem correspondência podem gerar novos títulos</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Import History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Histórico de Importações
              </CardTitle>
              <CardDescription>Últimas importações de extratos</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchImports()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {importsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : imports && imports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Lançamentos</TableHead>
                  <TableHead>Conciliados</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.slice(0, 10).map((imp: any) => (
                  <TableRow key={imp.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {imp.original_filename || 'extrato.ofx'}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(imp.created_at)}</TableCell>
                    <TableCell>{imp.line_count || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={((imp.matched_count || 0) / (imp.line_count || 1)) * 100} 
                          className="h-2 w-16"
                        />
                        <span className="text-sm">
                          {imp.matched_count || 0}/{imp.line_count || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(imp.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma importação realizada ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
