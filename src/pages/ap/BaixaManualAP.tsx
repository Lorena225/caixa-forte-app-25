import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { useWallets, useCounterparties } from '@/hooks/useCompanyData';
import {
  useOpenTitles,
  useProcessSettlement,
  useValidateSettlement,
  SettlementType,
  SettlementItem,
  SETTLEMENT_TYPE_LABELS,
  ValidationResult,
} from '@/hooks/useSettlements';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { 
  Search, ArrowRight, ArrowLeft, Check, AlertCircle, 
  XCircle, CheckCircle2, AlertTriangle, Loader2, ExternalLink, Ban
} from 'lucide-react';
import { Link } from 'react-router-dom';

type Step = 'filters' | 'selection' | 'settlement';

interface SelectedTitle {
  id: string;
  description: string;
  counterparty_name: string | null;
  document_number: string | null;
  due_date: string;
  original_amount: number;
  balance_amount: number;
  amount_to_settle: number;
  interest: number;
  penalty: number;
  discount: number;
  updated_at?: string;
}

export default function BaixaManualAP() {
  const [step, setStep] = useState<Step>('filters');
  const [counterpartyId, setCounterpartyId] = useState<string>('');
  const [dueDateFrom, setDueDateFrom] = useState<string>('');
  const [dueDateTo, setDueDateTo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTitles, setSelectedTitles] = useState<SelectedTitle[]>([]);
  const [settlementType, setSettlementType] = useState<SettlementType>('PAGAMENTO');
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [validationMode, setValidationMode] = useState<'ALL_OR_NOTHING' | 'PARTIAL_OK'>('PARTIAL_OK');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [lastSettlementId, setLastSettlementId] = useState<string | null>(null);

  const { data: counterparties = [] } = useCounterparties();
  const { data: wallets = [] } = useWallets();
  const processSettlement = useProcessSettlement();
  const validateSettlement = useValidateSettlement();

  const bankWallets = wallets.filter((w) => w.type === 'banco');

  const { data: openTitles = [], isLoading } = useOpenTitles({
    title_type: 'PAGAR',
    counterparty_id: counterpartyId || undefined,
    due_date_from: dueDateFrom || undefined,
    due_date_to: dueDateTo || undefined,
  });

  const filteredTitles = useMemo(() => {
    if (!searchTerm) return openTitles;
    const term = searchTerm.toLowerCase();
    return openTitles.filter(
      (t) =>
        t.description.toLowerCase().includes(term) ||
        t.document_number?.toLowerCase().includes(term) ||
        t.counterparty_name?.toLowerCase().includes(term)
    );
  }, [openTitles, searchTerm]);

  const canSelectTitle = (title: typeof openTitles[0]) => {
    return title.balance_amount > 0;
  };

  const handleToggleSelect = (id: string) => {
    const title = openTitles.find((t) => t.id === id);
    if (title && !canSelectTitle(title)) return;
    
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    const selectableTitles = filteredTitles.filter(canSelectTitle);
    if (selectedIds.size === selectableTitles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableTitles.map((t) => t.id)));
    }
  };

  const handleGoToSelection = () => {
    setStep('selection');
    setSelectedIds(new Set());
  };

  const handleGoToSettlementWithTitles = (titleIds: string[]) => {
    const titles = openTitles
      .filter((t) => titleIds.includes(t.id) && canSelectTitle(t))
      .map((t) => ({
        ...t,
        amount_to_settle: t.balance_amount,
        interest: 0,
        penalty: 0,
        discount: 0,
      }));
    setSelectedTitles(titles);
    setSettlementType('PAGAMENTO');
    setValidationResult(null);
    setStep('settlement');
  };

  const handleGoToSettlement = () => {
    handleGoToSettlementWithTitles(Array.from(selectedIds));
  };

  const handleSettleSingleTitle = (id: string) => {
    handleGoToSettlementWithTitles([id]);
  };

  const handleBack = () => {
    if (step === 'selection') setStep('filters');
    else if (step === 'settlement') {
      setStep('selection');
      setValidationResult(null);
    }
  };

  const handleUpdateSettlementItem = (id: string, field: keyof SelectedTitle, value: number) => {
    setSelectedTitles((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, [field]: value };
        if (field === 'amount_to_settle' && value > t.balance_amount) {
          updated.amount_to_settle = t.balance_amount;
        }
        return updated;
      })
    );
    setValidationResult(null);
  };

  const totalToSettle = selectedTitles.reduce(
    (sum, t) => sum + t.amount_to_settle + t.interest + t.penalty - t.discount,
    0
  );

  const buildItems = (): SettlementItem[] => {
    return selectedTitles.map((t) => ({
      transaction_id: t.id,
      amount_settled: t.amount_to_settle,
      interest: t.interest,
      penalty: t.penalty,
      discount: t.discount,
      expected_updated_at: t.updated_at,
    }));
  };

  const handleValidate = async () => {
    const requiresBankAccount = ['PAGAMENTO', 'RECEBIMENTO'].includes(settlementType);
    
    // Frontend validation
    if (!settlementDate) {
      setValidationResult({
        is_valid: false,
        global_errors: [{ code: 'MISSING_DATE', message: 'A data da baixa é obrigatória.' }],
        item_results: [],
        summary: { total_titles: 0, total_amount: 0, bank_account_id: '', settlement_date: '', settlement_type: '', mode: '' },
      });
      return;
    }
    
    if (requiresBankAccount && !bankAccountId) {
      setValidationResult({
        is_valid: false,
        global_errors: [{ code: 'MISSING_BANK', message: 'Selecione uma conta bancária.' }],
        item_results: [],
        summary: { total_titles: 0, total_amount: 0, bank_account_id: '', settlement_date: '', settlement_type: '', mode: '' },
      });
      return;
    }
    
    if (selectedTitles.length === 0) {
      setValidationResult({
        is_valid: false,
        global_errors: [{ code: 'NO_TITLES', message: 'Selecione pelo menos um título.' }],
        item_results: [],
        summary: { total_titles: 0, total_amount: 0, bank_account_id: '', settlement_date: '', settlement_type: '', mode: '' },
      });
      return;
    }
    
    if (totalToSettle <= 0) {
      setValidationResult({
        is_valid: false,
        global_errors: [{ code: 'ZERO_AMOUNT', message: 'O valor total deve ser maior que zero.' }],
        item_results: [],
        summary: { total_titles: 0, total_amount: 0, bank_account_id: '', settlement_date: '', settlement_type: '', mode: '' },
      });
      return;
    }
    
    try {
      const result = await validateSettlement.mutateAsync({
        settlement_type: settlementType,
        settlement_date: settlementDate,
        bank_account_id: requiresBankAccount ? bankAccountId : undefined,
        notes: notes || undefined,
        items: buildItems(),
        mode: validationMode,
      });
      
      setValidationResult(result);
      
      if (result.is_valid) {
        setConfirmDialogOpen(true);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleConfirmSettlement = async () => {
    const requiresBankAccount = ['PAGAMENTO', 'RECEBIMENTO'].includes(settlementType);
    
    let itemsToProcess = buildItems();
    if (validationMode === 'PARTIAL_OK' && validationResult) {
      const validIds = new Set(
        validationResult.item_results
          .filter((r) => r.ok)
          .map((r) => r.transaction_id)
      );
      itemsToProcess = itemsToProcess.filter((i) => validIds.has(i.transaction_id));
    }

    try {
      const settlementId = await processSettlement.mutateAsync({
        settlement_type: settlementType,
        origin: 'MANUAL',
        title_type: 'PAGAR',
        settlement_date: settlementDate,
        bank_account_id: requiresBankAccount ? bankAccountId : undefined,
        notes: notes || undefined,
        items: itemsToProcess,
      });

      setLastSettlementId(settlementId);
      setConfirmDialogOpen(false);
      setStep('filters');
      setSelectedIds(new Set());
      setSelectedTitles([]);
      setNotes('');
      setValidationResult(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const selectedCount = selectedIds.size;
  const selectedTotal = openTitles
    .filter((t) => selectedIds.has(t.id))
    .reduce((sum, t) => sum + t.balance_amount, 0);

  const requiresBankAccount = ['PAGAMENTO', 'RECEBIMENTO'].includes(settlementType);
  const canValidate = selectedTitles.length > 0 && settlementDate && (!requiresBankAccount || bankAccountId);
  
  const validItemsCount = validationResult?.item_results.filter((r) => r.ok).length || 0;
  const invalidItemsCount = validationResult?.item_results.filter((r) => !r.ok).length || 0;
  const hasWarnings = validationResult?.item_results.some((r) => r.warnings.length > 0);
  const selectableCount = filteredTitles.filter(canSelectTitle).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Success message with links */}
      {lastSettlementId && step === 'filters' && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/30">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700 dark:text-green-400">Baixa processada com sucesso!</AlertTitle>
          <AlertDescription className="flex gap-4">
            <Link 
              to={`/tesouraria/historico-baixas`} 
              className="text-primary hover:underline flex items-center gap-1"
            >
              Ver histórico de baixas <ExternalLink className="h-3 w-3" />
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Stepper */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 ${step === 'filters' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'filters' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            1
          </div>
          <span className="font-medium">Filtros</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 ${step === 'selection' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'selection' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            2
          </div>
          <span className="font-medium">Seleção</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 ${step === 'settlement' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'settlement' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            3
          </div>
          <span className="font-medium">Baixa</span>
        </div>
      </div>

      {/* Step 1: Filters */}
      {step === 'filters' && (
        <Card>
          <CardHeader>
            <CardTitle>Filtrar Títulos a Pagar</CardTitle>
            <CardDescription>Defina os critérios para buscar títulos em aberto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Select value={counterpartyId || '__all__'} onValueChange={(v) => setCounterpartyId(v === '__all__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {counterparties
                      .filter((c) => c.type !== 'cliente')
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vencimento De</Label>
                <Input
                  type="date"
                  value={dueDateFrom}
                  onChange={(e) => setDueDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Vencimento Até</Label>
                <Input
                  type="date"
                  value={dueDateTo}
                  onChange={(e) => setDueDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {isLoading ? (
                  'Carregando...'
                ) : (
                  <>
                    <strong>{openTitles.length}</strong> títulos encontrados totalizando{' '}
                    <strong>{formatCurrency(openTitles.reduce((s, t) => s + t.balance_amount, 0))}</strong>
                  </>
                )}
              </div>
              <Button onClick={handleGoToSelection} disabled={isLoading || openTitles.length === 0}>
                Buscar Títulos <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Selection */}
      {step === 'selection' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Selecionar Títulos</CardTitle>
                <CardDescription>
                  Marque os títulos que deseja baixar ou clique no ícone para baixar individualmente
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === selectableCount && selectableCount > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="w-14 text-center">Baixar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTitles.map((title) => {
                    const isSelectable = canSelectTitle(title);
                    return (
                      <TableRow 
                        key={title.id} 
                        className={`${isSelectable ? 'cursor-pointer hover:bg-muted/50' : 'opacity-60'}`}
                        onClick={() => isSelectable && handleToggleSelect(title.id)}
                      >
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Checkbox
                                    checked={selectedIds.has(title.id)}
                                    onCheckedChange={() => handleToggleSelect(title.id)}
                                    disabled={!isSelectable}
                                  />
                                </div>
                              </TooltipTrigger>
                              {!isSelectable && (
                                <TooltipContent>
                                  <p>Título sem saldo disponível</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="font-medium">{title.description}</TableCell>
                        <TableCell>{title.counterparty_name || '-'}</TableCell>
                        <TableCell>{title.document_number || '-'}</TableCell>
                        <TableCell>{formatDate(title.due_date)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(title.balance_amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={!isSelectable}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSettleSingleTitle(title.id);
                                  }}
                                >
                                  {isSelectable ? (
                                    <Check className="h-4 w-4 text-success" />
                                  ) : (
                                    <Ban className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{isSelectable ? 'Baixar este título' : 'Título sem saldo'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredTitles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum título encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Fixed Selection Bar */}
            {selectedCount > 0 && (
              <div className="sticky bottom-0 left-0 right-0 mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="default" className="text-sm px-3 py-1">
                    {selectedCount} título{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
                  </Badge>
                  <span className="text-sm font-medium">
                    Total: <span className="text-primary font-bold">{formatCurrency(selectedTotal)}</span>
                  </span>
                </div>
                <Button onClick={handleGoToSettlement}>
                  <Check className="mr-2 h-4 w-4" />
                  Baixar selecionados
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              {selectedCount === 0 && (
                <p className="text-sm text-muted-foreground">
                  Selecione títulos ou clique no ícone de baixa individual
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Settlement */}
      {step === 'settlement' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Itens da Baixa</CardTitle>
                <CardDescription>
                  {selectedTitles.length} título{selectedTitles.length > 1 ? 's' : ''} selecionado{selectedTitles.length > 1 ? 's' : ''} - Ajuste os valores se necessário
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right w-28">Saldo</TableHead>
                        <TableHead className="text-right w-28">Valor Baixa</TableHead>
                        <TableHead className="text-right w-24">Juros</TableHead>
                        <TableHead className="text-right w-24">Multa</TableHead>
                        <TableHead className="text-right w-24">Desconto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTitles.map((title) => {
                        const itemResult = validationResult?.item_results.find(
                          (r) => r.transaction_id === title.id
                        );
                        const hasError = itemResult && !itemResult.ok;
                        const hasWarning = itemResult?.warnings && itemResult.warnings.length > 0;
                        
                        return (
                          <TableRow 
                            key={title.id}
                            className={hasError ? 'bg-destructive/10' : hasWarning ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}
                          >
                            <TableCell>
                              <div className="flex items-start gap-2">
                                {hasError && <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />}
                                {!hasError && hasWarning && <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />}
                                {itemResult?.ok && !hasWarning && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />}
                                <div>
                                  <p className="font-medium">{title.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {title.counterparty_name || 'Sem fornecedor'} • Venc: {formatDate(title.due_date)}
                                  </p>
                                  {hasError && itemResult?.errors.map((err, i) => (
                                    <p key={i} className="text-xs text-destructive mt-1">{err.message}</p>
                                  ))}
                                  {hasWarning && itemResult?.warnings.map((warn, i) => (
                                    <p key={i} className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">{warn.message}</p>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(title.balance_amount)}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={title.balance_amount}
                                value={title.amount_to_settle}
                                onChange={(e) =>
                                  handleUpdateSettlementItem(title.id, 'amount_to_settle', parseFloat(e.target.value) || 0)
                                }
                                className="w-28 text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={title.interest}
                                onChange={(e) =>
                                  handleUpdateSettlementItem(title.id, 'interest', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={title.penalty}
                                onChange={(e) =>
                                  handleUpdateSettlementItem(title.id, 'penalty', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={title.discount}
                                onChange={(e) =>
                                  handleUpdateSettlementItem(title.id, 'discount', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 text-right"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Validation Errors Panel */}
            {validationResult && (validationResult.global_errors.length > 0 || invalidItemsCount > 0) && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Erros de Validação
                  </CardTitle>
                  <CardDescription>
                    Corrija os erros abaixo antes de confirmar a baixa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-60">
                    <div className="space-y-3">
                      {validationResult.global_errors.map((error, i) => (
                        <Alert key={`global-${i}`} variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error.message}</AlertDescription>
                        </Alert>
                      ))}
                      
                      {validationResult.item_results
                        .filter((r) => !r.ok)
                        .map((item) => (
                          <div key={item.transaction_id} className="p-3 bg-destructive/10 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <XCircle className="h-4 w-4 text-destructive" />
                              <span className="font-medium text-sm">
                                {item.document_number || item.description.slice(0, 30)}
                              </span>
                              {item.counterparty_name && (
                                <span className="text-xs text-muted-foreground">
                                  • {item.counterparty_name}
                                </span>
                              )}
                            </div>
                            {item.errors.map((err, i) => (
                              <p key={i} className="text-sm text-destructive ml-6">{err.message}</p>
                            ))}
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                  
                  {validationMode === 'PARTIAL_OK' && validItemsCount > 0 && invalidItemsCount > 0 && (
                    <Alert className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{validItemsCount}</strong> de {selectedTitles.length} títulos estão válidos. 
                        Você pode prosseguir para baixar apenas os válidos ou corrigir os erros.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Baixa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Baixa</Label>
                  <Select value={settlementType} onValueChange={(v) => {
                    setSettlementType(v as SettlementType);
                    setValidationResult(null);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAGAMENTO">Pagamento</SelectItem>
                      <SelectItem value="CANCELAMENTO">Cancelamento</SelectItem>
                      <SelectItem value="ABATIMENTO">Abatimento</SelectItem>
                      <SelectItem value="COMPENSACAO">Compensação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data da Baixa *</Label>
                  <Input
                    type="date"
                    value={settlementDate}
                    onChange={(e) => {
                      setSettlementDate(e.target.value);
                      setValidationResult(null);
                    }}
                  />
                  {validationResult?.global_errors.some((e) => e.code === 'MISSING_DATE') && (
                    <p className="text-xs text-destructive">A data da baixa é obrigatória.</p>
                  )}
                </div>

                {requiresBankAccount && (
                  <div className="space-y-2">
                    <Label>Conta Bancária *</Label>
                    <Select value={bankAccountId || '__none__'} onValueChange={(v) => {
                      setBankAccountId(v === '__none__' ? '' : v);
                      setValidationResult(null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Selecione...</SelectItem>
                        {bankWallets.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationResult?.global_errors.some((e) => e.code === 'MISSING_BANK') && (
                      <p className="text-xs text-destructive">Selecione uma conta bancária.</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Modo de Validação</Label>
                  <Select value={validationMode} onValueChange={(v) => {
                    setValidationMode(v as 'ALL_OR_NOTHING' | 'PARTIAL_OK');
                    setValidationResult(null);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PARTIAL_OK">Permitir parcial (baixar apenas válidos)</SelectItem>
                      <SelectItem value="ALL_OR_NOTHING">Tudo ou nada (abortar se houver erro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Títulos:</span>
                    <span>{selectedTitles.length}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(totalToSettle)}</span>
                  </div>
                  {validationResult && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Válidos:</span>
                      <span className={validItemsCount === selectedTitles.length ? 'text-green-600' : 'text-yellow-600'}>
                        {validItemsCount} / {selectedTitles.length}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                  <Button
                    onClick={handleValidate}
                    disabled={!canValidate || validateSettlement.isPending}
                    className="flex-1"
                  >
                    {validateSettlement.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Validar e Confirmar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Validation Summary */}
            {validationResult && validationResult.is_valid && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950/30">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-700 dark:text-green-400">Validação OK</AlertTitle>
                <AlertDescription>
                  {validItemsCount} título(s) validado(s) com sucesso. 
                  {hasWarnings && ' Verifique os avisos na tabela.'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar Baixa</DialogTitle>
            <DialogDescription>
              Revise os dados antes de confirmar a operação.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium">{SETTLEMENT_TYPE_LABELS[settlementType]}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Data:</span>
                <p className="font-medium">{formatDate(settlementDate)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Títulos:</span>
                <p className="font-medium">{validItemsCount}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>
                <p className="font-medium text-lg">{formatCurrency(totalToSettle)}</p>
              </div>
            </div>
            
            {notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Observação:</span>
                <p className="font-medium">{notes}</p>
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta operação irá atualizar o saldo e status dos títulos selecionados.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmSettlement}
              disabled={processSettlement.isPending}
            >
              {processSettlement.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" /> Confirmar Baixa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
