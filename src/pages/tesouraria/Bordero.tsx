import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  FileStack, CheckCircle, Clock, Send, ArrowLeft, ArrowRight, 
  Filter, Search, AlertCircle, Banknote
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { 
  useOpenTitles, 
  useProcessSettlement, 
  TitleType, 
  SettlementItem 
} from '@/hooks/useSettlements';

type Step = 'filters' | 'select' | 'confirm';

interface TitleWithAmount {
  id: string;
  amount_to_settle: number;
  interest: number;
  penalty: number;
  discount: number;
}

export default function Bordero() {
  const { currentCompany } = useAuth();
  const [step, setStep] = useState<Step>('filters');
  
  // Step 1: Filters
  const [titleType, setTitleType] = useState<TitleType>('PAGAR');
  const [counterpartyId, setCounterpartyId] = useState<string>('__all__');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  
  // Step 2: Selection
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  
  // Step 3: Confirmation
  const [settlementDate, setSettlementDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bankAccountId, setBankAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [titleAmounts, setTitleAmounts] = useState<Record<string, TitleWithAmount>>({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  const processSettlement = useProcessSettlement();

  // Fetch open titles
  const { data: openTitles = [], isLoading: titlesLoading } = useOpenTitles({
    title_type: titleType,
    counterparty_id: counterpartyId === '__all__' ? undefined : counterpartyId,
    due_date_from: dueDateFrom || undefined,
    due_date_to: dueDateTo || undefined,
  });

  // Fetch wallets for bank account selection
  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets-bordero', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('wallets')
        .select('id, name')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  // Fetch counterparties for filter
  const { data: counterparties = [] } = useQuery({
    queryKey: ['counterparties-bordero', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('counterparties')
        .select('id, name')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  // Selected titles with amounts
  const selectedTitlesData = useMemo(() => {
    return openTitles.filter(t => selectedTitles.includes(t.id));
  }, [openTitles, selectedTitles]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalBalance = 0;
    let totalSettlement = 0;
    let totalInterest = 0;
    let totalPenalty = 0;
    let totalDiscount = 0;

    selectedTitlesData.forEach(t => {
      const amounts = titleAmounts[t.id];
      totalBalance += t.balance_amount;
      if (amounts) {
        totalSettlement += amounts.amount_to_settle;
        totalInterest += amounts.interest;
        totalPenalty += amounts.penalty;
        totalDiscount += amounts.discount;
      } else {
        totalSettlement += t.balance_amount;
      }
    });

    return {
      balance: totalBalance,
      settlement: totalSettlement,
      interest: totalInterest,
      penalty: totalPenalty,
      discount: totalDiscount,
      net: totalSettlement + totalInterest + totalPenalty - totalDiscount,
    };
  }, [selectedTitlesData, titleAmounts]);

  const toggleTitle = (id: string) => {
    setSelectedTitles(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedTitles.length === openTitles.length) {
      setSelectedTitles([]);
    } else {
      setSelectedTitles(openTitles.map(t => t.id));
    }
  };

  const initializeTitleAmounts = () => {
    const amounts: Record<string, TitleWithAmount> = {};
    selectedTitlesData.forEach(t => {
      amounts[t.id] = {
        id: t.id,
        amount_to_settle: t.balance_amount,
        interest: 0,
        penalty: 0,
        discount: 0,
      };
    });
    setTitleAmounts(amounts);
  };

  const updateTitleAmount = (id: string, field: keyof TitleWithAmount, value: number) => {
    setTitleAmounts(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleNextStep = () => {
    if (step === 'filters') {
      setStep('select');
    } else if (step === 'select') {
      if (selectedTitles.length === 0) {
        toast.error('Selecione pelo menos um título');
        return;
      }
      initializeTitleAmounts();
      setStep('confirm');
    }
  };

  const handlePrevStep = () => {
    if (step === 'select') {
      setStep('filters');
    } else if (step === 'confirm') {
      setStep('select');
    }
  };

  const handleConfirm = async () => {
    if (!bankAccountId) {
      toast.error('Selecione a conta bancária');
      return;
    }

    const items: SettlementItem[] = selectedTitlesData.map(t => {
      const amounts = titleAmounts[t.id];
      return {
        transaction_id: t.id,
        amount_settled: amounts?.amount_to_settle || t.balance_amount,
        interest: amounts?.interest || 0,
        penalty: amounts?.penalty || 0,
        discount: amounts?.discount || 0,
      };
    });

    try {
      await processSettlement.mutateAsync({
        settlement_type: titleType === 'PAGAR' ? 'PAGAMENTO' : 'RECEBIMENTO',
        origin: 'BORDERO',
        title_type: titleType,
        settlement_date: settlementDate,
        bank_account_id: bankAccountId,
        notes: notes || `Borderô ${titleType === 'PAGAR' ? 'Pagamento' : 'Recebimento'} - ${selectedTitles.length} títulos`,
        items,
      });

      toast.success(`Borderô criado com ${selectedTitles.length} títulos`);
      setConfirmDialogOpen(false);
      
      // Reset state
      setStep('filters');
      setSelectedTitles([]);
      setTitleAmounts({});
      setNotes('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Borderô (Baixa em Lote)"
          description="Agrupe títulos para pagamento ou recebimento em lote"
        >
          <div className="flex items-center gap-2">
            {step !== 'filters' && (
              <Button variant="outline" onClick={handlePrevStep}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            )}
            {step !== 'confirm' && (
              <Button onClick={handleNextStep} disabled={step === 'select' && selectedTitles.length === 0}>
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === 'confirm' && (
              <Button 
                onClick={() => setConfirmDialogOpen(true)} 
                disabled={!bankAccountId || processSettlement.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                Confirmar Borderô
              </Button>
            )}
          </div>
        </PageHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <Badge variant={step === 'filters' ? 'default' : 'secondary'}>1. Filtros</Badge>
          <div className="h-px w-8 bg-border" />
          <Badge variant={step === 'select' ? 'default' : 'secondary'}>2. Seleção</Badge>
          <div className="h-px w-8 bg-border" />
          <Badge variant={step === 'confirm' ? 'default' : 'secondary'}>3. Confirmação</Badge>
        </div>

        {/* Step 1: Filters */}
        {step === 'filters' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros do Borderô
              </CardTitle>
              <CardDescription>
                Defina os critérios para buscar os títulos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Tipo de Operação</Label>
                  <Select value={titleType} onValueChange={(v) => setTitleType(v as TitleType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAGAR">Pagamento (Contas a Pagar)</SelectItem>
                      <SelectItem value="RECEBER">Recebimento (Contas a Receber)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Parceiro (opcional)</Label>
                  <Select value={counterpartyId} onValueChange={setCounterpartyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {counterparties.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vencimento De</Label>
                  <Input 
                    type="date" 
                    value={dueDateFrom} 
                    onChange={(e) => setDueDateFrom(e.target.value)} 
                  />
                </div>
                <div>
                  <Label>Vencimento Até</Label>
                  <Input 
                    type="date" 
                    value={dueDateTo} 
                    onChange={(e) => setDueDateTo(e.target.value)} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Selection */}
        {step === 'select' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Títulos Encontrados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{openTitles.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Selecionados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">{selectedTitles.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Selecionado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${titleType === 'PAGAR' ? 'text-destructive' : 'text-green-600'}`}>
                    {formatCurrency(selectedTitlesData.reduce((sum, t) => sum + t.balance_amount, 0))}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileStack className="h-5 w-5" />
                  Títulos Disponíveis
                </CardTitle>
                <CardDescription>
                  Selecione os títulos para incluir no borderô
                </CardDescription>
              </CardHeader>
              <CardContent>
                {titlesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : openTitles.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedTitles.length === openTitles.length && openTitles.length > 0}
                            onCheckedChange={selectAll}
                          />
                        </TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Parceiro</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor Original</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openTitles.map((title) => (
                        <TableRow 
                          key={title.id}
                          className={selectedTitles.includes(title.id) ? 'bg-primary/5' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedTitles.includes(title.id)}
                              onCheckedChange={() => toggleTitle(title.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {title.document_number || '-'}
                          </TableCell>
                          <TableCell>{title.counterparty_name || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {title.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant={new Date(title.due_date) < new Date() ? 'destructive' : 'outline'}>
                              {format(new Date(title.due_date), 'dd/MM/yyyy')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(title.original_amount)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(title.balance_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum título encontrado com os filtros selecionados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Step 3: Confirmation */}
        {step === 'confirm' && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Borderô</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Data da Baixa</Label>
                    <Input 
                      type="date" 
                      value={settlementDate}
                      onChange={(e) => setSettlementDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Conta Bancária *</Label>
                    <Select value={bankAccountId} onValueChange={setBankAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {wallets.map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observações opcionais..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo</span>
                    <Badge>{titleType === 'PAGAR' ? 'Pagamento' : 'Recebimento'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantidade</span>
                    <span className="font-bold">{selectedTitles.length} títulos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Saldos</span>
                    <span>{formatCurrency(totals.balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total a Baixar</span>
                    <span>{formatCurrency(totals.settlement)}</span>
                  </div>
                  {totals.interest > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">+ Juros</span>
                      <span className="text-destructive">{formatCurrency(totals.interest)}</span>
                    </div>
                  )}
                  {totals.penalty > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">+ Multa</span>
                      <span className="text-destructive">{formatCurrency(totals.penalty)}</span>
                    </div>
                  )}
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">- Desconto</span>
                      <span className="text-green-600">-{formatCurrency(totals.discount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-medium">Valor Líquido</span>
                    <span className={`text-xl font-bold ${titleType === 'PAGAR' ? 'text-destructive' : 'text-green-600'}`}>
                      {formatCurrency(totals.net)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Título</CardTitle>
                <CardDescription>
                  Ajuste os valores individuais se necessário
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="text-right">Valor a Baixar</TableHead>
                      <TableHead className="text-right">Juros</TableHead>
                      <TableHead className="text-right">Multa</TableHead>
                      <TableHead className="text-right">Desconto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTitlesData.map((title) => {
                      const amounts = titleAmounts[title.id];
                      return (
                        <TableRow key={title.id}>
                          <TableCell className="font-mono text-sm">
                            {title.document_number || '-'}
                          </TableCell>
                          <TableCell>{title.counterparty_name || '-'}</TableCell>
                          <TableCell>
                            {format(new Date(title.due_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(title.balance_amount)}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={title.balance_amount}
                              value={amounts?.amount_to_settle || title.balance_amount}
                              onChange={(e) => updateTitleAmount(title.id, 'amount_to_settle', Number(e.target.value))}
                              className="w-28 text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={amounts?.interest || 0}
                              onChange={(e) => updateTitleAmount(title.id, 'interest', Number(e.target.value))}
                              className="w-24 text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={amounts?.penalty || 0}
                              onChange={(e) => updateTitleAmount(title.id, 'penalty', Number(e.target.value))}
                              className="w-24 text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={amounts?.discount || 0}
                              onChange={(e) => updateTitleAmount(title.id, 'discount', Number(e.target.value))}
                              className="w-24 text-right"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Confirmar Borderô
              </DialogTitle>
              <DialogDescription>
                Esta ação irá baixar os títulos selecionados e não pode ser desfeita diretamente.
                Caso necessário, utilize a função de Estorno.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Tipo de operação</span>
                  <Badge>{titleType === 'PAGAR' ? 'Pagamento' : 'Recebimento'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Títulos</span>
                  <span className="font-bold">{selectedTitles.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor total</span>
                  <span className={`font-bold text-xl ${titleType === 'PAGAR' ? 'text-destructive' : 'text-green-600'}`}>
                    {formatCurrency(totals.net)}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Os títulos serão baixados com a data {format(new Date(settlementDate), 'dd/MM/yyyy')} 
                  e terão seus saldos atualizados.
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={processSettlement.isPending}>
                <Send className="mr-2 h-4 w-4" />
                {processSettlement.isPending ? 'Processando...' : 'Confirmar e Baixar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
