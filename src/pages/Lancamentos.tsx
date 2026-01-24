import { useState, useMemo, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAccounts, useCostCenters, useCounterparties, useWallets, useTransactions, useAccountCategories } from '@/hooks/useCompanyData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, Filter, FileText, Sparkles, Loader2, Upload } from 'lucide-react';
import { CSVImportDialog } from '@/components/transactions/CSVImportDialog';
import { useAICategorySuggestion } from '@/hooks/useAICategorySuggestion';
import { AISuggestionBadge } from '@/components/transactions/AISuggestionBadge';
import { ReceiptUpload } from '@/components/transactions/ReceiptUpload';
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type TransactionDirection = Database['public']['Enums']['transaction_direction'];
type TransactionStatus = Database['public']['Enums']['transaction_status'];
type DocumentType = Database['public']['Enums']['document_type'];

interface TransactionFormData {
  description: string;
  direction: TransactionDirection;
  original_amount: string;
  total_amount: string;
  transaction_date: Date | undefined;
  due_date: Date | undefined;
  paid_date: Date | undefined;
  category_id: string;
  account_id: string;
  wallet_id: string;
  counterparty_id: string;
  cost_center_id: string;
  status: TransactionStatus;
  notes: string;
  document_number: string;
  document_type: DocumentType | '';
  document_series: string;
}

const initialFormData: TransactionFormData = {
  description: '',
  direction: 'entrada',
  original_amount: '',
  total_amount: '',
  transaction_date: new Date(),
  due_date: new Date(),
  paid_date: undefined,
  category_id: '',
  account_id: '',
  wallet_id: '',
  counterparty_id: '',
  cost_center_id: '',
  status: 'lancado',
  notes: '',
  document_number: '',
  document_type: '',
  document_series: '',
};

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'nf', label: 'Nota Fiscal' },
  { value: 'nfe', label: 'NF-e' },
  { value: 'fatura', label: 'Fatura' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'outro', label: 'Outro' },
];

export default function Lancamentos() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [formData, setFormData] = useState<TransactionFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState<string>('todos');
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  
  // AI suggestion state
  const [aiSuggestion, setAiSuggestion] = useState<{ categoryId: string; confidence: number; reason: string; isLearned?: boolean } | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  
  // Loading and submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Enable realtime sync for transactions
  useRealtimeTransactions();

  const { data: transactions = [], isLoading } = useTransactions({
    month: filterMonth,
    year: filterYear,
    direction: activeTab === 'todos' ? undefined : activeTab as TransactionDirection,
  });
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useAccountCategories();
  const { data: wallets = [] } = useWallets();
  const { data: counterparties = [] } = useCounterparties();
  const { data: costCenters = [] } = useCostCenters();
  
  // AI Category suggestion hook with learning capability
  const { suggestCategory, learnFromSelection } = useAICategorySuggestion(categories, formData.direction);

  // Filter categories based on direction
  const filteredCategories = useMemo(() => {
    if (formData.direction === 'entrada') {
      return categories.filter((c: any) => c.category_type === 'receita');
    } else {
      return categories.filter((c: any) => ['custo', 'despesa'].includes(c.category_type));
    }
  }, [categories, formData.direction]);

  // Filter accounts based on selected category or direction
  const filteredAccounts = useMemo(() => {
    if (formData.category_id) {
      return accounts.filter((a: any) => a.category_id === formData.category_id);
    }
    if (formData.direction === 'entrada') {
      return accounts.filter((a: any) => a.category_type === 'receita');
    }
    return accounts.filter((a: any) => ['custo', 'despesa'].includes(a.category_type));
  }, [accounts, formData.category_id, formData.direction]);

  // Auto-fill category when account is selected
  useEffect(() => {
    if (formData.account_id && !formData.category_id) {
      const selectedAccount = accounts.find((a: any) => a.id === formData.account_id);
      if (selectedAccount?.category_id) {
        setFormData(prev => ({ ...prev, category_id: selectedAccount.category_id }));
      }
    }
  }, [formData.account_id, formData.category_id, accounts]);
  
  // AI-powered category suggestion based on description with debounce
  const handleDescriptionChange = useCallback((description: string) => {
    setFormData(prev => ({ ...prev, description }));
    
    // Only suggest if category not already selected and description is meaningful
    if (!formData.category_id && description.length >= 3) {
      const suggestion = suggestCategory(description);
      if (suggestion) {
        setAiSuggestion(suggestion);
        // Auto-apply the suggestion
        setFormData(prev => ({ ...prev, category_id: suggestion.categoryId }));
        toast.info(suggestion.isLearned ? '✨ Categoria aprendida aplicada' : '✨ Categoria sugerida pela IA', {
          description: suggestion.reason,
          icon: <Sparkles className="h-4 w-4" />,
          duration: 3000,
        });
      } else {
        // Clear suggestion if no match found
        setAiSuggestion(null);
      }
    }
  }, [formData.category_id, suggestCategory]);
  
  // Handle manual category change and learn from it
  const handleCategoryChange = useCallback((newCategoryId: string) => {
    const actualCategoryId = newCategoryId === "__none__" ? "" : newCategoryId;
    
    // Learn from manual selection if user changed from AI suggestion
    if (actualCategoryId && formData.description.length >= 3) {
      if (!aiSuggestion || aiSuggestion.categoryId !== actualCategoryId) {
        learnFromSelection(formData.description, actualCategoryId);
      }
    }
    
    setFormData(prev => ({ 
      ...prev, 
      category_id: actualCategoryId,
      account_id: '' // Reset account when category changes
    }));
    
    // Clear AI suggestion if user manually changes to different category
    if (aiSuggestion && actualCategoryId !== aiSuggestion.categoryId) {
      setAiSuggestion(null);
    }
  }, [aiSuggestion, formData.description, learnFromSelection]);

  const openNewDialog = (direction: TransactionDirection = 'entrada') => {
    setEditingTransaction(null);
    setFormData({ ...initialFormData, direction });
    setAiSuggestion(null);
    setReceiptFile(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (transaction: any) => {
    setEditingTransaction(transaction);
    setFormData({
      description: transaction.description,
      direction: transaction.direction,
      original_amount: transaction.original_amount.toString(),
      total_amount: transaction.total_amount.toString(),
      transaction_date: new Date(transaction.transaction_date),
      due_date: new Date(transaction.due_date),
      paid_date: transaction.paid_date ? new Date(transaction.paid_date) : undefined,
      category_id: transaction.category_id || '',
      account_id: transaction.account_id,
      wallet_id: transaction.wallet_id,
      counterparty_id: transaction.counterparty_id || '',
      cost_center_id: transaction.cost_center_id || '',
      status: transaction.status,
      notes: transaction.notes || '',
      document_number: transaction.document_number || '',
      document_type: transaction.document_type || '',
      document_series: transaction.document_series || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!currentCompany) {
      toast.error('Empresa não selecionada', {
        description: 'Por favor, selecione uma empresa para continuar',
      });
      return;
    }

    const amount = parseFloat(formData.original_amount.replace(',', '.'));
    const totalAmount = parseFloat(formData.total_amount.replace(',', '.')) || amount;

    if (!formData.description || isNaN(amount) || !formData.account_id || !formData.wallet_id) {
      toast.error('Campos obrigatórios', {
        description: 'Preencha descrição, valor, conta e carteira',
      });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      company_id: currentCompany.id,
      description: formData.description,
      direction: formData.direction,
      original_amount: amount,
      total_amount: totalAmount,
      transaction_date: formData.transaction_date ? format(formData.transaction_date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      paid_date: formData.paid_date ? format(formData.paid_date, 'yyyy-MM-dd') : null,
      category_id: formData.category_id || null,
      account_id: formData.account_id,
      wallet_id: formData.wallet_id,
      counterparty_id: formData.counterparty_id || null,
      cost_center_id: formData.cost_center_id || null,
      status: formData.status,
      notes: formData.notes || null,
      document_number: formData.document_number || null,
      document_type: formData.document_type || null,
      document_series: formData.document_series || null,
    };

    try {
      let error;
      if (editingTransaction) {
        ({ error } = await supabase.from('transactions').update(payload).eq('id', editingTransaction.id));
      } else {
        ({ error } = await supabase.from('transactions').insert(payload));
      }

      if (error) {
        throw error;
      }

      toast.success(editingTransaction ? 'Lançamento atualizado' : 'Lançamento criado', {
        description: 'Os dados foram salvos com sucesso pela IA ✨',
        icon: <Sparkles className="h-4 w-4" />,
      });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setEditingTransaction(null);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      
      // Tratamento de erros específicos
      if (error.code === 'PGRST301') {
        toast.error('Erro de autenticação', {
          description: 'Sua sessão expirou. Faça login novamente.',
        });
      } else if (error.code === '23503') {
        toast.error('Dados inválidos', {
          description: 'Verifique se a conta e carteira selecionadas existem.',
        });
      } else if (error.message?.includes('network')) {
        toast.error('Erro de conexão', {
          description: 'Verifique sua internet e tente novamente.',
        });
      } else {
        toast.error('Erro ao salvar lançamento', {
          description: error.message || 'Tente novamente em alguns instantes.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      
      if (error) {
        throw error;
      }
      
      toast.success('Lançamento excluído', {
        description: 'O registro foi removido permanentemente.',
      });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      
      if (error.code === '42501') {
        toast.error('Sem permissão', {
          description: 'Você não tem permissão para excluir este lançamento.',
        });
      } else {
        toast.error('Erro ao excluir lançamento', {
          description: error.message || 'Tente novamente.',
        });
      }
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    const variants: Record<TransactionStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      rascunho: { variant: 'secondary', label: 'Rascunho' },
      lancado: { variant: 'outline', label: 'Lançado' },
      pago: { variant: 'default', label: 'Pago' },
      cancelado: { variant: 'destructive', label: 'Cancelado' },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.direction === 'entrada') {
        acc.receitas += t.total_amount;
      } else {
        acc.despesas += t.total_amount;
      }
      return acc;
    },
    { receitas: 0, despesas: 0 }
  );

  return (
    <MainLayout>
      <PageHeader
        title="Lançamentos"
        description="Cadastre e gerencie receitas e despesas"
      />

      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Receitas</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {formatCurrency(totals.receitas)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Despesas</CardDescription>
              <CardTitle className="text-2xl text-red-600">
                {formatCurrency(totals.despesas)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Saldo</CardDescription>
              <CardTitle className={cn(
                "text-2xl",
                totals.receitas - totals.despesas >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(totals.receitas - totals.despesas)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterMonth.toString()} onValueChange={(v) => setFilterMonth(parseInt(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterYear.toString()} onValueChange={(v) => setFilterYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCSVImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            <Button onClick={() => openNewDialog('entrada')} className="bg-green-600 hover:bg-green-700">
              <ArrowDownCircle className="mr-2 h-4 w-4" />
              Nova Receita
            </Button>
            <Button onClick={() => openNewDialog('saida')} variant="destructive">
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              Nova Despesa
            </Button>
          </div>
        </div>
        
        <CSVImportDialog open={isCSVImportOpen} onOpenChange={setIsCSVImportOpen} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="entrada">Receitas</TabsTrigger>
            <TabsTrigger value="saida">Despesas</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Carteira</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Nenhum lançamento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>
                            {t.direction === 'entrada' ? (
                              <ArrowDownCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <ArrowUpCircle className="h-5 w-5 text-red-600" />
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(t.transaction_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div>
                              {t.description}
                              {t.document_number && (
                                <span className="block text-xs text-muted-foreground">
                                  <FileText className="inline h-3 w-3 mr-1" />
                                  {t.document_type?.toUpperCase()} {t.document_number}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {(t as any).category?.name || categories.find((c: any) => c.id === t.category_id)?.name || '-'}
                          </TableCell>
                          <TableCell>{t.accounts?.name}</TableCell>
                          <TableCell>{t.wallets?.name}</TableCell>
                          <TableCell className={cn(
                            "text-right font-medium",
                            t.direction === 'entrada' ? "text-green-600" : "text-red-600"
                          )}>
                            {t.direction === 'saida' && '-'}
                            {formatCurrency(t.total_amount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(t.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(t)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    disabled={isDeleting === t.id}
                                  >
                                    {isDeleting === t.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. O lançamento será removido permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(t.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {isDeleting === t.id ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Excluindo...
                                        </>
                                      ) : (
                                        'Excluir'
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog for Create/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction
                ? 'Editar Lançamento'
                : formData.direction === 'entrada'
                ? 'Nova Receita'
                : 'Nova Despesa'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={formData.direction}
                  onValueChange={(v) => setFormData({ 
                    ...formData, 
                    direction: v as TransactionDirection, 
                    account_id: '',
                    category_id: ''
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Receita</SelectItem>
                    <SelectItem value="saida">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v as TransactionStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="lancado">Lançado</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Descrição *</Label>
                {aiSuggestion && (
                  <AISuggestionBadge 
                    confidence={aiSuggestion.confidence} 
                    reason={aiSuggestion.reason}
                    isLearned={aiSuggestion.isLearned}
                  />
                )}
              </div>
              <Input
                value={formData.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Ex: Uber, Almoço, Aluguel, Venda de produto..."
              />
              {!aiSuggestion && formData.description.length >= 3 && !formData.category_id && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Digite mais detalhes para sugestão automática
                </p>
              )}
            </div>

            {/* Categoria e Conta */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Categoria *</Label>
                  {aiSuggestion && formData.category_id === aiSuggestion.categoryId && (
                    <AISuggestionBadge 
                      confidence={aiSuggestion.confidence} 
                      reason={aiSuggestion.reason}
                      isLearned={aiSuggestion.isLearned}
                    />
                  )}
                </div>
                <Select
                  value={formData.category_id || "__none__"}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione...</SelectItem>
                    {filteredCategories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Conta Contábil *</Label>
                <Select
                  value={formData.account_id || "__none__"}
                  onValueChange={(v) => {
                    const newAccountId = v === "__none__" ? "" : v;
                    // Auto-fill category from account
                    const selectedAccount = accounts.find((a: any) => a.id === newAccountId);
                    setFormData({ 
                      ...formData, 
                      account_id: newAccountId,
                      category_id: selectedAccount?.category_id || formData.category_id
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione...</SelectItem>
                    {filteredAccounts.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Original *</Label>
                <Input
                  value={formData.original_amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      original_amount: value,
                      total_amount: formData.total_amount || value,
                    });
                  }}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Valor Total</Label>
                <Input
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Lançamento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.transaction_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.transaction_date
                        ? format(formData.transaction_date, 'dd/MM/yyyy')
                        : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.transaction_date}
                      onSelect={(d) => setFormData({ ...formData, transaction_date: d })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.due_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.due_date
                        ? format(formData.due_date, 'dd/MM/yyyy')
                        : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.due_date}
                      onSelect={(d) => setFormData({ ...formData, due_date: d })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data Pagamento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.paid_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.paid_date
                        ? format(formData.paid_date, 'dd/MM/yyyy')
                        : 'Não pago'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.paid_date}
                      onSelect={(d) => setFormData({ ...formData, paid_date: d })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Documento */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo Documento</Label>
                <Select
                  value={formData.document_type || "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, document_type: v === "__none__" ? "" : v as DocumentType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {DOCUMENT_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Número do Documento</Label>
                <Input
                  value={formData.document_number}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                  placeholder="NF 123, FAT-001..."
                />
              </div>

              <div className="space-y-2">
                <Label>Série (opcional)</Label>
                <Input
                  value={formData.document_series}
                  onChange={(e) => setFormData({ ...formData, document_series: e.target.value })}
                  placeholder="001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Carteira *</Label>
                <Select
                  value={formData.wallet_id || "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, wallet_id: v === "__none__" ? "" : v })}
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

              <div className="space-y-2">
                <Label>Cliente/Fornecedor</Label>
                <Select
                  value={formData.counterparty_id || "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, counterparty_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {counterparties.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Centro de Custo</Label>
              <Select
                value={formData.cost_center_id || "__none__"}
                onValueChange={(v) => setFormData({ ...formData, cost_center_id: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Receipt Upload */}
            <ReceiptUpload 
              onUpload={(file) => setReceiptFile(file)}
              onRemove={() => setReceiptFile(null)}
            />

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informações adicionais..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {editingTransaction ? 'Salvar' : 'Criar'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
