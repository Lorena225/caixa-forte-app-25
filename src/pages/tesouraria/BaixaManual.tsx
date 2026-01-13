import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
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
import { useWallets, useCounterparties } from '@/hooks/useCompanyData';
import {
  useOpenTitles,
  useProcessSettlement,
  TitleType,
  SettlementType,
  SettlementItem,
  SETTLEMENT_TYPE_LABELS,
} from '@/hooks/useSettlements';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Search, ArrowRight, ArrowLeft, Check, AlertCircle } from 'lucide-react';

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
}

export default function BaixaManual() {
  const [step, setStep] = useState<Step>('filters');
  const [titleType, setTitleType] = useState<TitleType>('PAGAR');
  const [counterpartyId, setCounterpartyId] = useState<string>('');
  const [dueDateFrom, setDueDateFrom] = useState<string>('');
  const [dueDateTo, setDueDateTo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTitles, setSelectedTitles] = useState<SelectedTitle[]>([]);
  const [settlementType, setSettlementType] = useState<SettlementType>(
    titleType === 'PAGAR' ? 'PAGAMENTO' : 'RECEBIMENTO'
  );
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { data: counterparties = [] } = useCounterparties();
  const { data: wallets = [] } = useWallets();
  const processSettlement = useProcessSettlement();

  const { data: openTitles = [], isLoading } = useOpenTitles({
    title_type: titleType,
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

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTitles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTitles.map((t) => t.id)));
    }
  };

  const handleGoToSelection = () => {
    setStep('selection');
    setSelectedIds(new Set());
  };

  const handleGoToSettlement = () => {
    const titles = openTitles
      .filter((t) => selectedIds.has(t.id))
      .map((t) => ({
        ...t,
        amount_to_settle: t.balance_amount,
        interest: 0,
        penalty: 0,
        discount: 0,
      }));
    setSelectedTitles(titles);
    setSettlementType(titleType === 'PAGAR' ? 'PAGAMENTO' : 'RECEBIMENTO');
    setStep('settlement');
  };

  const handleBack = () => {
    if (step === 'selection') setStep('filters');
    else if (step === 'settlement') setStep('selection');
  };

  const handleUpdateSettlementItem = (id: string, field: keyof SelectedTitle, value: number) => {
    setSelectedTitles((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, [field]: value };
        // Garantir que amount_to_settle não exceda balance_amount
        if (field === 'amount_to_settle' && value > t.balance_amount) {
          updated.amount_to_settle = t.balance_amount;
        }
        return updated;
      })
    );
  };

  const totalToSettle = selectedTitles.reduce(
    (sum, t) => sum + t.amount_to_settle + t.interest + t.penalty - t.discount,
    0
  );

  const handleConfirmSettlement = async () => {
    const items: SettlementItem[] = selectedTitles.map((t) => ({
      transaction_id: t.id,
      amount_settled: t.amount_to_settle,
      interest: t.interest,
      penalty: t.penalty,
      discount: t.discount,
    }));

    const requiresBankAccount = ['PAGAMENTO', 'RECEBIMENTO'].includes(settlementType);

    await processSettlement.mutateAsync({
      settlement_type: settlementType,
      origin: 'MANUAL',
      title_type: titleType,
      settlement_date: settlementDate,
      bank_account_id: requiresBankAccount ? bankAccountId : undefined,
      notes: notes || undefined,
      items,
    });

    setConfirmDialogOpen(false);
    setStep('filters');
    setSelectedIds(new Set());
    setSelectedTitles([]);
    setNotes('');
  };

  const selectedCount = selectedIds.size;
  const selectedTotal = openTitles
    .filter((t) => selectedIds.has(t.id))
    .reduce((sum, t) => sum + t.balance_amount, 0);

  const requiresBankAccount = ['PAGAMENTO', 'RECEBIMENTO'].includes(settlementType);
  const canSubmit = selectedTitles.length > 0 && settlementDate && (!requiresBankAccount || bankAccountId);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Baixa Manual"
          description={
            titleType === 'PAGAR'
              ? 'Realize baixas de títulos a pagar'
              : 'Realize baixas de títulos a receber'
          }
        />

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
              <CardTitle>Filtrar Títulos</CardTitle>
              <CardDescription>Defina os critérios para buscar títulos em aberto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={titleType} onValueChange={(v) => setTitleType(v as TitleType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAGAR">Contas a Pagar</SelectItem>
                      <SelectItem value="RECEBER">Contas a Receber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{titleType === 'PAGAR' ? 'Fornecedor' : 'Cliente'}</Label>
                  <Select value={counterpartyId || '__all__'} onValueChange={(v) => setCounterpartyId(v === '__all__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {counterparties
                        .filter((c) =>
                          titleType === 'PAGAR' ? c.type !== 'cliente' : c.type !== 'fornecedor'
                        )
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
                    Marque os títulos que deseja baixar
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
                          checked={selectedIds.size === filteredTitles.length && filteredTitles.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>{titleType === 'PAGAR' ? 'Fornecedor' : 'Cliente'}</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTitles.map((title) => (
                      <TableRow key={title.id} className="cursor-pointer" onClick={() => handleToggleSelect(title.id)}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(title.id)}
                            onCheckedChange={() => handleToggleSelect(title.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{title.description}</TableCell>
                        <TableCell>{title.counterparty_name || '-'}</TableCell>
                        <TableCell>{title.document_number || '-'}</TableCell>
                        <TableCell>{formatDate(title.due_date)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(title.balance_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTitles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum título encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                  <div className="text-sm">
                    <Badge variant="secondary" className="mr-2">
                      {selectedCount} selecionados
                    </Badge>
                    <span className="text-muted-foreground">
                      Total: <strong>{formatCurrency(selectedTotal)}</strong>
                    </span>
                  </div>
                </div>
                <Button onClick={handleGoToSettlement} disabled={selectedCount === 0}>
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Settlement */}
        {step === 'settlement' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Itens da Baixa</CardTitle>
                  <CardDescription>Ajuste os valores de cada título se necessário</CardDescription>
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
                        {selectedTitles.map((title) => (
                          <TableRow key={title.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{title.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {title.counterparty_name} • Venc: {formatDate(title.due_date)}
                                </p>
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Dados da Baixa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Baixa</Label>
                    <Select value={settlementType} onValueChange={(v) => setSettlementType(v as SettlementType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {titleType === 'PAGAR' ? (
                          <>
                            <SelectItem value="PAGAMENTO">Pagamento</SelectItem>
                            <SelectItem value="CANCELAMENTO">Cancelamento</SelectItem>
                            <SelectItem value="ABATIMENTO">Abatimento</SelectItem>
                            <SelectItem value="COMPENSACAO">Compensação</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="RECEBIMENTO">Recebimento</SelectItem>
                            <SelectItem value="CANCELAMENTO">Cancelamento</SelectItem>
                            <SelectItem value="ABATIMENTO">Abatimento</SelectItem>
                            <SelectItem value="LUCRO_PERDA">Lucro/Perda</SelectItem>
                            <SelectItem value="COMPENSACAO">Compensação</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data da Baixa</Label>
                    <Input
                      type="date"
                      value={settlementDate}
                      onChange={(e) => setSettlementDate(e.target.value)}
                    />
                  </div>

                  {requiresBankAccount && (
                    <div className="space-y-2">
                      <Label>Conta Bancária *</Label>
                      <Select value={bankAccountId || '__none__'} onValueChange={(v) => setBankAccountId(v === '__none__' ? '' : v)}>
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
                  )}

                  <div className="space-y-2">
                    <Label>Observação</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Opcional"
                    />
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
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={handleBack} className="flex-1">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                    <Button
                      onClick={() => setConfirmDialogOpen(true)}
                      disabled={!canSubmit || processSettlement.isPending}
                      className="flex-1"
                    >
                      <Check className="mr-2 h-4 w-4" /> Confirmar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Baixa</DialogTitle>
              <DialogDescription>
                Você está prestes a realizar a baixa de {selectedTitles.length} título(s) no valor total de{' '}
                <strong>{formatCurrency(totalToSettle)}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <AlertCircle className="h-5 w-5 text-warning" />
                <p className="text-sm">Esta ação irá atualizar o saldo e status dos títulos selecionados.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmSettlement} disabled={processSettlement.isPending}>
                {processSettlement.isPending ? 'Processando...' : 'Confirmar Baixa'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
