import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useBanksReference } from '@/hooks/useBanksReference';
import { useWallets } from '@/hooks/useCompanyData';
import {
  useOpenTitles,
  useProcessSettlement,
  MatchStatus,
  MATCH_STATUS_LABELS,
} from '@/hooks/useSettlements';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Upload, FileText, Check, X, AlertCircle, AlertTriangle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type FileStep = 'upload' | 'matching' | 'review';

interface ParsedRow {
  id: string;
  external_key: string;
  amount: number;
  event_date: string;
  description: string;
  match_status: MatchStatus;
  match_reason: string | null;
  suggested_transaction_id: string | null;
  suggested_transaction_description: string | null;
  selected: boolean;
}

export default function BaixaAutomaticaAP() {
  const { currentCompany, user } = useAuth();
  const { toast } = useToast();
  const [bankId, setBankId] = useState<string>('');
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [fileStep, setFileStep] = useState<FileStep>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { data: banks = [] } = useBanksReference();
  const { data: wallets = [] } = useWallets();
  const { data: openTitles = [] } = useOpenTitles({ title_type: 'PAGAR' });
  const processSettlement = useProcessSettlement();

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileName(file.name);
      setProcessing(true);

      try {
        const text = await file.text();
        const lines = text.split('\n').filter((l) => l.trim());
        const dataLines = lines.slice(1);

        const rows: ParsedRow[] = dataLines.map((line, index) => {
          const parts = line.split(';').map((p) => p.trim().replace(/"/g, ''));
          const external_key = parts[0] || '';
          const amount = parseFloat(parts[1]?.replace(',', '.') || '0');
          const event_date = parts[2] || new Date().toISOString().split('T')[0];
          const description = parts[3] || '';

          let match_status: MatchStatus = 'NOT_FOUND';
          let match_reason: string | null = null;
          let suggested_transaction_id: string | null = null;
          let suggested_transaction_description: string | null = null;

          const exactMatch = openTitles.find(
            (t) => t.document_number?.toLowerCase() === external_key.toLowerCase()
          );

          if (exactMatch) {
            if (Math.abs(exactMatch.balance_amount - amount) < 0.01) {
              match_status = 'OK';
              suggested_transaction_id = exactMatch.id;
              suggested_transaction_description = exactMatch.description;
            } else {
              match_status = 'VALUE_MISMATCH';
              match_reason = `Esperado ${formatCurrency(exactMatch.balance_amount)}, arquivo ${formatCurrency(amount)}`;
              suggested_transaction_id = exactMatch.id;
              suggested_transaction_description = exactMatch.description;
            }
          } else {
            const valueMatch = openTitles.find(
              (t) => Math.abs(t.balance_amount - amount) < 0.01
            );
            if (valueMatch) {
              match_status = 'AMBIGUOUS';
              match_reason = 'Encontrado por valor, verificar manualmente';
              suggested_transaction_id = valueMatch.id;
              suggested_transaction_description = valueMatch.description;
            } else {
              match_status = 'NOT_FOUND';
              match_reason = 'Nenhum título correspondente encontrado';
            }
          }

          return {
            id: `row-${index}`,
            external_key,
            amount,
            event_date,
            description,
            match_status,
            match_reason,
            suggested_transaction_id,
            suggested_transaction_description,
            selected: match_status === 'OK',
          };
        });

        setParsedRows(rows);
        setFileStep('matching');
      } catch (error) {
        toast({
          title: 'Erro ao processar arquivo',
          description: 'Verifique o formato do arquivo.',
          variant: 'destructive',
        });
      } finally {
        setProcessing(false);
      }
    },
    [openTitles, toast]
  );

  const handleToggleRow = (id: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSelectAllOk = () => {
    setParsedRows((prev) =>
      prev.map((r) => ({
        ...r,
        selected: r.match_status === 'OK' || r.selected,
      }))
    );
  };

  const handleDeselectAll = () => {
    setParsedRows((prev) => prev.map((r) => ({ ...r, selected: false })));
  };

  const selectedRows = parsedRows.filter((r) => r.selected && r.suggested_transaction_id);
  const totalSelected = selectedRows.reduce((sum, r) => sum + r.amount, 0);

  const stats = useMemo(() => {
    const ok = parsedRows.filter((r) => r.match_status === 'OK').length;
    const notFound = parsedRows.filter((r) => r.match_status === 'NOT_FOUND').length;
    const mismatch = parsedRows.filter((r) => r.match_status === 'VALUE_MISMATCH').length;
    const ambiguous = parsedRows.filter((r) => r.match_status === 'AMBIGUOUS').length;
    return { ok, notFound, mismatch, ambiguous, total: parsedRows.length };
  }, [parsedRows]);

  const handleProcessSettlement = async () => {
    if (!currentCompany?.id || !user?.id) return;

    const items = selectedRows.map((r) => ({
      transaction_id: r.suggested_transaction_id!,
      amount_settled: r.amount,
    }));

    await processSettlement.mutateAsync({
      settlement_type: 'PAGAMENTO',
      origin: 'CSV',
      title_type: 'PAGAR',
      settlement_date: new Date().toISOString().split('T')[0],
      bank_account_id: bankAccountId || undefined,
      notes: `Importação automática: ${fileName}`,
      items,
    });

    setConfirmDialogOpen(false);
    setFileStep('upload');
    setParsedRows([]);
    setFileName('');
  };

  const getStatusBadge = (status: MatchStatus) => {
    const variants: Record<MatchStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      OK: 'default',
      NOT_FOUND: 'destructive',
      VALUE_MISMATCH: 'secondary',
      ALREADY_SETTLED: 'outline',
      AMBIGUOUS: 'secondary',
    };
    const icons: Record<MatchStatus, React.ReactNode> = {
      OK: <Check className="h-3 w-3 mr-1" />,
      NOT_FOUND: <X className="h-3 w-3 mr-1" />,
      VALUE_MISMATCH: <AlertTriangle className="h-3 w-3 mr-1" />,
      ALREADY_SETTLED: <AlertCircle className="h-3 w-3 mr-1" />,
      AMBIGUOUS: <Search className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge variant={variants[status]} className="text-xs">
        {icons[status]}
        {MATCH_STATUS_LABELS[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upload Step */}
      {fileStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Importar Arquivo de Retorno</CardTitle>
            <CardDescription>
              Selecione o banco, conta e faça upload do arquivo CNAB ou CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Banco</Label>
                <Select value={bankId || '__none__'} onValueChange={(v) => setBankId(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Todos</SelectItem>
                    {banks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.compe_code} - {b.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Conta Bancária</Label>
                <Select
                  value={bankAccountId || '__none__'}
                  onValueChange={(v) => setBankAccountId(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione...</SelectItem>
                    {wallets.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                Arraste o arquivo aqui ou clique para selecionar
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Formatos aceitos: CSV, TXT (CNAB 240/400)
              </p>
              <Input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="max-w-xs mx-auto"
                disabled={processing}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Formato CSV esperado</h4>
              <p className="text-sm text-muted-foreground font-mono">
                documento;valor;data;descricao
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Exemplo: NF001;1500,00;2026-01-15;Pagamento fornecedor
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matching/Review Step */}
      {(fileStep === 'matching' || fileStep === 'review') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {fileName}
                </CardTitle>
                <CardDescription>
                  Revise os registros encontrados e selecione os que deseja processar
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAllOk}>
                  Selecionar OK
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Limpar Seleção
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Stats */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 bg-success/10 rounded-lg">
                <p className="text-2xl font-bold text-success">{stats.ok}</p>
                <p className="text-xs text-muted-foreground">Encontrados</p>
              </div>
              <div className="text-center p-3 bg-destructive/10 rounded-lg">
                <p className="text-2xl font-bold text-destructive">{stats.notFound}</p>
                <p className="text-xs text-muted-foreground">Não encontrados</p>
              </div>
              <div className="text-center p-3 bg-warning/10 rounded-lg">
                <p className="text-2xl font-bold text-warning">{stats.mismatch}</p>
                <p className="text-xs text-muted-foreground">Valor divergente</p>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <p className="text-2xl font-bold">{stats.ambiguous}</p>
                <p className="text-xs text-muted-foreground">Ambíguos</p>
              </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Descrição Arquivo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Título Sugerido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={row.match_status === 'NOT_FOUND' ? 'opacity-60' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={row.selected}
                          onCheckedChange={() => handleToggleRow(row.id)}
                          disabled={!row.suggested_transaction_id}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.external_key}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{row.description}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(row.amount)}
                      </TableCell>
                      <TableCell>{formatDate(row.event_date)}</TableCell>
                      <TableCell>
                        <div>
                          {getStatusBadge(row.match_status)}
                          {row.match_reason && (
                            <p className="text-xs text-muted-foreground mt-1">{row.match_reason}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.suggested_transaction_description ? (
                          <span className="text-sm">{row.suggested_transaction_description}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFileStep('upload');
                  setParsedRows([]);
                  setFileName('');
                }}
              >
                Cancelar
              </Button>
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <Badge variant="secondary" className="mr-2">
                    {selectedRows.length} selecionados
                  </Badge>
                  <span className="text-muted-foreground">
                    Total: <strong>{formatCurrency(totalSelected)}</strong>
                  </span>
                </div>
                <Button
                  onClick={() => setConfirmDialogOpen(true)}
                  disabled={selectedRows.length === 0 || processSettlement.isPending}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Processar Baixas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Processamento</DialogTitle>
            <DialogDescription>
              Você está prestes a processar a baixa de <strong>{selectedRows.length}</strong> título(s) no
              valor total de <strong>{formatCurrency(totalSelected)}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleProcessSettlement} disabled={processSettlement.isPending}>
              {processSettlement.isPending ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
