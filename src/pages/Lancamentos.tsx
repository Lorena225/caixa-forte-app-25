import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAccounts, useCostCenters, useCounterparties, useWallets, useTransactions } from '@/hooks/useCompanyData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
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

interface TransactionFormData {
  description: string;
  direction: TransactionDirection;
  original_amount: string;
  total_amount: string;
  transaction_date: Date | undefined;
  due_date: Date | undefined;
  paid_date: Date | undefined;
  account_id: string;
  wallet_id: string;
  counterparty_id: string;
  cost_center_id: string;
  status: TransactionStatus;
  notes: string;
}

const initialFormData: TransactionFormData = {
  description: '',
  direction: 'entrada',
  original_amount: '',
  total_amount: '',
  transaction_date: new Date(),
  due_date: new Date(),
  paid_date: undefined,
  account_id: '',
  wallet_id: '',
  counterparty_id: '',
  cost_center_id: '',
  status: 'lancado',
  notes: '',
};

export default function Lancamentos() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [formData, setFormData] = useState<TransactionFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState<string>('todos');
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  const { data: transactions = [], isLoading } = useTransactions({
    month: filterMonth,
    year: filterYear,
    direction: activeTab === 'todos' ? undefined : activeTab as TransactionDirection,
  });
  const { data: accounts = [] } = useAccounts();
  const { data: wallets = [] } = useWallets();
  const { data: counterparties = [] } = useCounterparties();
  const { data: costCenters = [] } = useCostCenters();

  const openNewDialog = (direction: TransactionDirection = 'entrada') => {
    setEditingTransaction(null);
    setFormData({ ...initialFormData, direction });
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
      account_id: transaction.account_id,
      wallet_id: transaction.wallet_id,
      counterparty_id: transaction.counterparty_id || '',
      cost_center_id: transaction.cost_center_id || '',
      status: transaction.status,
      notes: transaction.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!currentCompany) return;

    const amount = parseFloat(formData.original_amount.replace(',', '.'));
    const totalAmount = parseFloat(formData.total_amount.replace(',', '.')) || amount;

    if (!formData.description || isNaN(amount) || !formData.account_id || !formData.wallet_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const payload = {
      company_id: currentCompany.id,
      description: formData.description,
      direction: formData.direction,
      original_amount: amount,
      total_amount: totalAmount,
      transaction_date: formData.transaction_date ? format(formData.transaction_date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      paid_date: formData.paid_date ? format(formData.paid_date, 'yyyy-MM-dd') : null,
      account_id: formData.account_id,
      wallet_id: formData.wallet_id,
      counterparty_id: formData.counterparty_id || null,
      cost_center_id: formData.cost_center_id || null,
      status: formData.status,
      notes: formData.notes || null,
    };

    let error;
    if (editingTransaction) {
      ({ error } = await supabase.from('transactions').update(payload).eq('id', editingTransaction.id));
    } else {
      ({ error } = await supabase.from('transactions').insert(payload));
    }

    if (error) {
      toast.error('Erro ao salvar lançamento');
      console.error(error);
      return;
    }

    toast.success(editingTransaction ? 'Lançamento atualizado' : 'Lançamento criado');
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    setIsDialogOpen(false);
    setFormData(initialFormData);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir lançamento');
      return;
    }
    toast.success('Lançamento excluído');
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
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

  const filteredAccounts = accounts.filter((a) =>
    formData.direction === 'entrada'
      ? a.category_type === 'receita'
      : ['custo', 'despesa'].includes(a.category_type)
  );

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
                        <TableCell colSpan={8} className="text-center py-8">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                          <TableCell className="font-medium">{t.description}</TableCell>
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
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(t.id)}>
                                      Excluir
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
                  onValueChange={(v) => setFormData({ ...formData, direction: v as TransactionDirection, account_id: '' })}
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
              <Label>Descrição *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Venda de produto, Pagamento de aluguel..."
              />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conta Contábil *</Label>
                <Select
                  value={formData.account_id}
                  onValueChange={(v) => setFormData({ ...formData, account_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Carteira *</Label>
                <Select
                  value={formData.wallet_id}
                  onValueChange={(v) => setFormData({ ...formData, wallet_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingTransaction ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
