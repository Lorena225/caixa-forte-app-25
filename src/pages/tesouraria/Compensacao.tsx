import { useState, useMemo, useCallback } from 'react';
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
  ArrowLeftRight, ArrowLeft, ArrowRight, Send, 
  AlertCircle, TrendingUp, TrendingDown, Scale, Eye
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
  SettlementItem,
  OpenTitle
} from '@/hooks/useSettlements';

type Step = 'select' | 'allocate' | 'confirm';

interface AllocationItem {
  title: OpenTitle;
  allocated_amount: number;
}

interface AllocationPreview {
  credits: AllocationItem[];
  debits: AllocationItem[];
  total_compensated: number;
}

export default function Compensacao() {
  const { currentCompany } = useAuth();
  const [step, setStep] = useState<Step>('select');
  
  // Selection
  const [counterpartyId, setCounterpartyId] = useState<string>('__all__');
  const [selectedCredits, setSelectedCredits] = useState<string[]>([]);
  const [selectedDebits, setSelectedDebits] = useState<string[]>([]);
  
  // Allocation
  const [compensationAmount, setCompensationAmount] = useState<number>(0);
  const [allocationPreview, setAllocationPreview] = useState<AllocationPreview | null>(null);
  
  // Confirmation
  const [settlementDate, setSettlementDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  const processSettlement = useProcessSettlement();

  // Fetch counterparties
  const { data: counterparties = [] } = useQuery({
    queryKey: ['counterparties-compensacao', currentCompany?.id],
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

  // Fetch credits (receivables) - filtered by counterparty
  const { data: credits = [], isLoading: creditsLoading } = useOpenTitles({
    title_type: 'RECEBER',
    counterparty_id: counterpartyId === '__all__' ? undefined : counterpartyId,
  });

  // Fetch debits (payables) - filtered by counterparty
  const { data: debits = [], isLoading: debitsLoading } = useOpenTitles({
    title_type: 'PAGAR',
    counterparty_id: counterpartyId === '__all__' ? undefined : counterpartyId,
  });

  // Selected data
  const selectedCreditsData = useMemo(() => 
    credits.filter(c => selectedCredits.includes(c.id)), 
    [credits, selectedCredits]
  );
  
  const selectedDebitsData = useMemo(() => 
    debits.filter(d => selectedDebits.includes(d.id)), 
    [debits, selectedDebits]
  );

  // Totals
  const totalCredits = useMemo(() => 
    selectedCreditsData.reduce((sum, c) => sum + c.balance_amount, 0),
    [selectedCreditsData]
  );
  
  const totalDebits = useMemo(() => 
    selectedDebitsData.reduce((sum, d) => sum + d.balance_amount, 0),
    [selectedDebitsData]
  );

  const maxCompensation = useMemo(() => 
    Math.min(totalCredits, totalDebits),
    [totalCredits, totalDebits]
  );

  // Toggle selections
  const toggleCredit = (id: string) => {
    setSelectedCredits(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleDebit = (id: string) => {
    setSelectedDebits(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Allocation algorithm (oldest first)
  const calculateAllocation = useCallback((amount: number): AllocationPreview => {
    const allocatedCredits: AllocationItem[] = [];
    const allocatedDebits: AllocationItem[] = [];
    let remainingAmount = amount;

    // Sort by due date (oldest first)
    const sortedCredits = [...selectedCreditsData].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );
    const sortedDebits = [...selectedDebitsData].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    // Allocate credits
    let creditRemaining = amount;
    for (const credit of sortedCredits) {
      if (creditRemaining <= 0) break;
      const allocated = Math.min(credit.balance_amount, creditRemaining);
      allocatedCredits.push({ title: credit, allocated_amount: allocated });
      creditRemaining -= allocated;
    }

    // Allocate debits
    let debitRemaining = amount;
    for (const debit of sortedDebits) {
      if (debitRemaining <= 0) break;
      const allocated = Math.min(debit.balance_amount, debitRemaining);
      allocatedDebits.push({ title: debit, allocated_amount: allocated });
      debitRemaining -= allocated;
    }

    return {
      credits: allocatedCredits,
      debits: allocatedDebits,
      total_compensated: amount,
    };
  }, [selectedCreditsData, selectedDebitsData]);

  const handleNextStep = () => {
    if (step === 'select') {
      if (selectedCredits.length === 0 || selectedDebits.length === 0) {
        toast.error('Selecione pelo menos um crédito e um débito');
        return;
      }
      setCompensationAmount(maxCompensation);
      setStep('allocate');
    } else if (step === 'allocate') {
      if (compensationAmount <= 0 || compensationAmount > maxCompensation) {
        toast.error('Valor de compensação inválido');
        return;
      }
      const preview = calculateAllocation(compensationAmount);
      setAllocationPreview(preview);
      setStep('confirm');
    }
  };

  const handlePrevStep = () => {
    if (step === 'allocate') {
      setStep('select');
    } else if (step === 'confirm') {
      setStep('allocate');
    }
  };

  const handleShowPreview = () => {
    const preview = calculateAllocation(compensationAmount);
    setAllocationPreview(preview);
    setPreviewDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!allocationPreview) return;

    // Build settlement items - all credits and debits in the same settlement
    const items: SettlementItem[] = [
      ...allocationPreview.credits.map(c => ({
        transaction_id: c.title.id,
        amount_settled: c.allocated_amount,
      })),
      ...allocationPreview.debits.map(d => ({
        transaction_id: d.title.id,
        amount_settled: d.allocated_amount,
      })),
    ];

    const titleIds = [
      ...allocationPreview.credits.map(c => c.title.id),
      ...allocationPreview.debits.map(d => d.title.id),
    ];

    try {
      await processSettlement.mutateAsync({
        settlement_type: 'COMPENSACAO',
        origin: 'COMPENSACAO',
        title_type: 'PAGAR', // Compensação can be either, using PAGAR as default
        settlement_date: settlementDate,
        bank_account_id: undefined, // Compensação doesn't use bank account
        notes: notes || `Compensação de créditos x débitos - ${allocationPreview.credits.length} créditos x ${allocationPreview.debits.length} débitos (${formatCurrency(compensationAmount)})`,
        items,
      });

      toast.success('Compensação realizada com sucesso');
      setConfirmDialogOpen(false);
      
      // Reset state
      setStep('select');
      setSelectedCredits([]);
      setSelectedDebits([]);
      setCompensationAmount(0);
      setAllocationPreview(null);
      setNotes('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const selectedCounterpartyName = counterparties.find(c => c.id === counterpartyId)?.name;

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader
          title="Compensação de Títulos"
          description="Compense créditos a receber com débitos a pagar (sem movimento bancário)"
        >
          <div className="flex items-center gap-2">
            {step !== 'select' && (
              <Button variant="outline" onClick={handlePrevStep}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            )}
            {step !== 'confirm' && (
              <Button 
                onClick={handleNextStep} 
                disabled={
                  (step === 'select' && (selectedCredits.length === 0 || selectedDebits.length === 0)) ||
                  (step === 'allocate' && compensationAmount <= 0)
                }
              >
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === 'confirm' && (
              <Button 
                onClick={() => setConfirmDialogOpen(true)} 
                disabled={processSettlement.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                Confirmar Compensação
              </Button>
            )}
          </div>
        </PageHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <Badge variant={step === 'select' ? 'default' : 'secondary'}>1. Seleção</Badge>
          <div className="h-px w-8 bg-border" />
          <Badge variant={step === 'allocate' ? 'default' : 'secondary'}>2. Alocação</Badge>
          <div className="h-px w-8 bg-border" />
          <Badge variant={step === 'confirm' ? 'default' : 'secondary'}>3. Confirmação</Badge>
        </div>

        {/* Step 1: Selection */}
        {step === 'select' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Filtrar por Parceiro</CardTitle>
                <CardDescription>
                  Selecione um parceiro para compensar créditos e débitos do mesmo cliente/fornecedor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-md">
                  <Label>Parceiro (opcional)</Label>
                  <Select value={counterpartyId} onValueChange={setCounterpartyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os parceiros" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos os parceiros</SelectItem>
                      {counterparties.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Credits (Receivables) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                    Créditos (a Receber)
                  </CardTitle>
                  <CardDescription>
                    Selecionados: {selectedCredits.length} = {formatCurrency(totalCredits)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {creditsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  ) : credits.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10" />
                            <TableHead>Doc</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {credits.map(credit => (
                            <TableRow 
                              key={credit.id}
                              className={selectedCredits.includes(credit.id) ? 'bg-green-50 dark:bg-green-950/30' : ''}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedCredits.includes(credit.id)}
                                  onCheckedChange={() => toggleCredit(credit.id)}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {credit.document_number || credit.description.slice(0, 15)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {format(new Date(credit.due_date), 'dd/MM/yy')}
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                {formatCurrency(credit.balance_amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum crédito encontrado
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Debits (Payables) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <TrendingDown className="h-5 w-5" />
                    Débitos (a Pagar)
                  </CardTitle>
                  <CardDescription>
                    Selecionados: {selectedDebits.length} = {formatCurrency(totalDebits)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {debitsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  ) : debits.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10" />
                            <TableHead>Doc</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {debits.map(debit => (
                            <TableRow 
                              key={debit.id}
                              className={selectedDebits.includes(debit.id) ? 'bg-red-50 dark:bg-red-950/30' : ''}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedDebits.includes(debit.id)}
                                  onCheckedChange={() => toggleDebit(debit.id)}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {debit.document_number || debit.description.slice(0, 15)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {format(new Date(debit.due_date), 'dd/MM/yy')}
                              </TableCell>
                              <TableCell className="text-right font-medium text-destructive">
                                {formatCurrency(debit.balance_amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum débito encontrado
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            {(selectedCredits.length > 0 || selectedDebits.length > 0) && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Créditos</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCredits)}</p>
                    </div>
                    <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Débitos</p>
                      <p className="text-2xl font-bold text-destructive">{formatCurrency(totalDebits)}</p>
                    </div>
                    <Scale className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Máx. Compensável</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(maxCompensation)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Step 2: Allocation */}
        {step === 'allocate' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Valor da Compensação
                </CardTitle>
                <CardDescription>
                  Defina o valor a ser compensado entre os títulos selecionados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <div>
                    <Label>Data da Compensação</Label>
                    <Input 
                      type="date" 
                      value={settlementDate}
                      onChange={(e) => setSettlementDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Valor a Compensar</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={maxCompensation}
                      value={compensationAmount}
                      onChange={(e) => setCompensationAmount(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Máximo: {formatCurrency(maxCompensation)}
                    </p>
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" onClick={handleShowPreview} className="w-full">
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar Alocação
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Justificativa ou observações sobre a compensação..."
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Créditos Selecionados</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCreditsData.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-sm">
                            {c.document_number || '-'}
                          </TableCell>
                          <TableCell>{format(new Date(c.due_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(c.balance_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive">Débitos Selecionados</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDebitsData.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-sm">
                            {d.document_number || '-'}
                          </TableCell>
                          <TableCell>{format(new Date(d.due_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                            {formatCurrency(d.balance_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Step 3: Confirmation */}
        {step === 'confirm' && allocationPreview && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Resumo da Compensação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Créditos</p>
                    <p className="text-xl font-bold text-green-600">
                      {allocationPreview.credits.length} títulos
                    </p>
                    <p className="text-lg text-green-600">
                      {formatCurrency(allocationPreview.credits.reduce((s, c) => s + c.allocated_amount, 0))}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg flex flex-col items-center justify-center">
                    <ArrowLeftRight className="h-8 w-8 mb-2" />
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(allocationPreview.total_compensated)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Débitos</p>
                    <p className="text-xl font-bold text-destructive">
                      {allocationPreview.debits.length} títulos
                    </p>
                    <p className="text-lg text-destructive">
                      {formatCurrency(allocationPreview.debits.reduce((s, d) => s + d.allocated_amount, 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Alocação nos Créditos</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead className="text-right">Saldo Atual</TableHead>
                        <TableHead className="text-right">Valor Alocado</TableHead>
                        <TableHead className="text-right">Novo Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocationPreview.credits.map(c => (
                        <TableRow key={c.title.id}>
                          <TableCell className="font-mono text-sm">
                            {c.title.document_number || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(c.title.balance_amount)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-primary">
                            -{formatCurrency(c.allocated_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(c.title.balance_amount - c.allocated_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive">Alocação nos Débitos</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead className="text-right">Saldo Atual</TableHead>
                        <TableHead className="text-right">Valor Alocado</TableHead>
                        <TableHead className="text-right">Novo Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocationPreview.debits.map(d => (
                        <TableRow key={d.title.id}>
                          <TableCell className="font-mono text-sm">
                            {d.title.document_number || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(d.title.balance_amount)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-primary">
                            -{formatCurrency(d.allocated_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(d.title.balance_amount - d.allocated_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Preview Dialog */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Preview da Alocação</DialogTitle>
              <DialogDescription>
                Distribuição do valor {formatCurrency(compensationAmount)} entre os títulos (por ordem de vencimento)
              </DialogDescription>
            </DialogHeader>
            {allocationPreview && (
              <div className="grid gap-4 md:grid-cols-2 max-h-[400px] overflow-y-auto">
                <div>
                  <h4 className="font-medium text-green-600 mb-2">Créditos</h4>
                  {allocationPreview.credits.map(c => (
                    <div key={c.title.id} className="flex justify-between text-sm py-1 border-b">
                      <span>{c.title.document_number || c.title.description.slice(0, 20)}</span>
                      <span className="font-medium">{formatCurrency(c.allocated_amount)}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-medium text-destructive mb-2">Débitos</h4>
                  {allocationPreview.debits.map(d => (
                    <div key={d.title.id} className="flex justify-between text-sm py-1 border-b">
                      <span>{d.title.document_number || d.title.description.slice(0, 20)}</span>
                      <span className="font-medium">{formatCurrency(d.allocated_amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setPreviewDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5" />
                Confirmar Compensação
              </DialogTitle>
              <DialogDescription>
                Esta ação irá compensar os títulos selecionados. Caso necessário, utilize a função de Estorno.
              </DialogDescription>
            </DialogHeader>
            {allocationPreview && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Data</span>
                    <span>{format(new Date(settlementDate), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Créditos</span>
                    <span className="text-green-600">{allocationPreview.credits.length} títulos</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Débitos</span>
                    <span className="text-destructive">{allocationPreview.debits.length} títulos</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Valor Compensado</span>
                    <span className="font-bold text-xl text-primary">
                      {formatCurrency(allocationPreview.total_compensated)}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Não haverá movimento bancário. Os saldos dos títulos serão ajustados diretamente.
                  </span>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={processSettlement.isPending}>
                <Send className="mr-2 h-4 w-4" />
                {processSettlement.isPending ? 'Processando...' : 'Confirmar Compensação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
