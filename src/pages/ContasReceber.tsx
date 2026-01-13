import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions, useAccounts, useWallets, useCounterparties, useCostCenters } from '@/hooks/useCompanyData';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Pencil, Trash2, Check, ArrowDownCircle, FileText, Download, History, CheckCircle, Eye, Ban } from 'lucide-react';
import { QuickSettlementDialog } from '@/components/settlements/QuickSettlementDialog';
import BaixaManualAR from '@/pages/ar/BaixaManualAR';
import BaixaAutomaticaAR from '@/pages/ar/BaixaAutomaticaAR';

interface TitleForSettlement {
  id: string;
  description: string;
  counterparty_name?: string | null;
  due_date: string;
  balance_amount: number;
  updated_at?: string;
}

export default function ContasReceber() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [mainTab, setMainTab] = useState('titulos');
  const [filters, setFilters] = useState({
    month: currentMonth,
    year: currentYear,
    status: '',
  });
  
  // Quick settlement dialog state
  const [quickSettlementOpen, setQuickSettlementOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<TitleForSettlement | null>(null);
  
  const { data: transactions = [], isLoading } = useTransactions({
    direction: 'entrada',
    month: filters.month,
    year: filters.year,
    status: filters.status || undefined,
  });
  
  const { data: accounts = [] } = useAccounts();
  const { data: wallets = [] } = useWallets();
  const { data: counterparties = [] } = useCounterparties();
  const { data: costCenters = [] } = useCostCenters();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    due_date: '',
    description: '',
    original_amount: 0,
    interest_amount: 0,
    account_id: '',
    wallet_id: '',
    counterparty_id: '',
    cost_center_id: '',
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const total = (data.original_amount || 0) + (data.interest_amount || 0);
      const payload = {
        ...data,
        company_id: currentCompany?.id,
        direction: 'entrada' as const,
        status: 'lancado' as const,
        total_amount: total,
        balance_amount: total,
        counterparty_id: data.counterparty_id || null,
        cost_center_id: data.cost_center_id || null,
      };

      if (editingItem) {
        const { error } = await supabase.from('transactions').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('transactions').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDialogOpen(false);
      setEditingItem(null);
      resetForm();
      toast({ title: editingItem ? 'Lançamento atualizado!' : 'Lançamento criado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Lançamento excluído!' });
    },
  });

  const resetForm = () => {
    setFormData({
      transaction_date: new Date().toISOString().split('T')[0],
      due_date: '',
      description: '',
      original_amount: 0,
      interest_amount: 0,
      account_id: '',
      wallet_id: '',
      counterparty_id: '',
      cost_center_id: '',
    });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      transaction_date: item.transaction_date,
      due_date: item.due_date,
      description: item.description,
      original_amount: item.original_amount,
      interest_amount: item.interest_amount || 0,
      account_id: item.account_id,
      wallet_id: item.wallet_id,
      counterparty_id: item.counterparty_id || '',
      cost_center_id: item.cost_center_id || '',
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleQuickSettlement = (item: any) => {
    setSelectedTitle({
      id: item.id,
      description: item.description,
      counterparty_name: item.counterparties?.name || null,
      due_date: item.due_date,
      balance_amount: Number(item.balance_amount || item.total_amount),
      updated_at: item.updated_at,
    });
    setQuickSettlementOpen(true);
  };

  const today = new Date().toISOString().split('T')[0];
  
  const totals = transactions.reduce(
    (acc, t) => {
      const isOverdue = t.due_date < today && t.status !== 'pago';
      if (t.status === 'pago') {
        acc.received += Number(t.total_amount);
      } else if (isOverdue) {
        acc.overdue += Number(t.total_amount);
      } else {
        acc.pending += Number(t.total_amount);
      }
      acc.total += Number(t.total_amount);
      return acc;
    },
    { received: 0, pending: 0, overdue: 0, total: 0 }
  );

  // Determine status and settlement action based on business rules
  const getSettlementAction = (item: any) => {
    const balance = Number(item.balance_amount || item.total_amount);
    const isPaid = item.status === 'pago' || balance <= 0;
    const isCancelled = item.status === 'cancelado';

    if (isCancelled) {
      return {
        disabled: true,
        tooltip: 'Título cancelado',
        icon: <Ban className="h-4 w-4 text-muted-foreground" />,
      };
    }

    if (isPaid) {
      return {
        disabled: true,
        tooltip: 'Título já baixado',
        icon: <Eye className="h-4 w-4 text-muted-foreground" />,
      };
    }

    return {
      disabled: false,
      tooltip: 'Registrar baixa deste título',
      icon: <Check className="h-4 w-4 text-success" />,
    };
  };

  const columns = [
    { 
      key: 'due_date', 
      header: 'Vencimento', 
      render: (item: any) => formatDate(item.due_date),
      className: 'w-28'
    },
    { key: 'description', header: 'Descrição' },
    { 
      key: 'counterparty', 
      header: 'Cliente', 
      render: (item: any) => item.counterparties?.name || '-',
    },
    { 
      key: 'account', 
      header: 'Conta', 
      render: (item: any) => item.accounts?.name || '-',
    },
    { 
      key: 'total_amount', 
      header: 'Valor', 
      render: (item: any) => (
        <span className="value-positive font-semibold">{formatCurrency(item.total_amount)}</span>
      ),
      className: 'text-right w-32'
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => {
        // Status derived from balance and dates
        const balance = Number(item.balance_amount || item.total_amount);
        const isPaid = item.status === 'pago' || balance <= 0;
        const isOverdue = !isPaid && item.due_date < today;
        return <StatusBadge status={isPaid ? 'pago' : item.status} isOverdue={isOverdue} />;
      },
      className: 'w-28',
    },
    {
      key: 'actions',
      header: '',
      render: (item: any) => {
        const settlementAction = getSettlementAction(item);
        
        return (
          <TooltipProvider>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (!settlementAction.disabled) {
                        handleQuickSettlement(item);
                      }
                    }}
                    disabled={settlementAction.disabled}
                    className={settlementAction.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    {settlementAction.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{settlementAction.tooltip}</p>
                </TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(item.id); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TooltipProvider>
        );
      },
      className: 'w-32',
    },
  ];

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

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Contas a Receber"
          description="Gerencie suas receitas, recebimentos e baixas"
          action={mainTab === 'titulos' ? { label: 'Nova Receita', onClick: handleNew } : undefined}
        />

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="titulos" className="gap-2">
              <FileText className="h-4 w-4" />
              Títulos
            </TabsTrigger>
            <TabsTrigger value="baixa-manual" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Baixa Manual
            </TabsTrigger>
            <TabsTrigger value="baixa-automatica" className="gap-2">
              <Download className="h-4 w-4" />
              Baixa Automática
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Títulos Tab */}
          <TabsContent value="titulos" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select 
                value={filters.month.toString()} 
                onValueChange={(v) => setFilters({ ...filters, month: parseInt(v) })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={filters.year.toString()} 
                onValueChange={(v) => setFilters({ ...filters, year: parseInt(v) })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={filters.status || "__all__"} 
                onValueChange={(v) => setFilters({ ...filters, status: v === "__all__" ? "" : v })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="lancado">Pendente</SelectItem>
                  <SelectItem value="pago">Recebido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-2 bg-success/10">
                      <ArrowDownCircle className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Recebido</p>
                      <p className="text-lg font-semibold value-positive">{formatCurrency(totals.received)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-2 bg-warning/10">
                      <ArrowDownCircle className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">A Receber</p>
                      <p className="text-lg font-semibold text-warning">{formatCurrency(totals.pending)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-2 bg-destructive/10">
                      <ArrowDownCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Atrasado</p>
                      <p className="text-lg font-semibold value-negative">{formatCurrency(totals.overdue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-2 bg-primary/10">
                      <ArrowDownCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-semibold">{formatCurrency(totals.total)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DataTable
              columns={columns}
              data={transactions}
              loading={isLoading}
              emptyMessage="Nenhuma conta a receber neste período."
            />
          </TabsContent>

          {/* Baixa Manual Tab */}
          <TabsContent value="baixa-manual">
            <BaixaManualAR />
          </TabsContent>

          {/* Baixa Automática Tab */}
          <TabsContent value="baixa-automatica">
            <BaixaAutomaticaAR />
          </TabsContent>

          {/* Histórico Tab */}
          <TabsContent value="historico">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Baixas</CardTitle>
                <CardDescription>Consulte o histórico completo de baixas realizadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Consulte o histórico completo em</p>
                  <Button variant="link" asChild>
                    <a href="/tesouraria/historico-baixas">Tesouraria → Histórico de Baixas</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog for new/edit transaction */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  placeholder="Ex: Venda de produto"
                  required 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data do Lançamento</Label>
                  <Input 
                    type="date" 
                    value={formData.transaction_date} 
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input 
                    type="date" 
                    value={formData.due_date} 
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={formData.original_amount} 
                    onChange={(e) => setFormData({ ...formData, original_amount: parseFloat(e.target.value) || 0 })} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Juros/Multa (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={formData.interest_amount} 
                    onChange={(e) => setFormData({ ...formData, interest_amount: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plano de Contas</Label>
                  <Select 
                    value={formData.account_id} 
                    onValueChange={(v) => setFormData({ ...formData, account_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a) => a.category_type === 'receita')
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta/Carteira</Label>
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
                  <Label>Cliente (opcional)</Label>
                  <Select 
                    value={formData.counterparty_id || "__none__"} 
                    onValueChange={(v) => setFormData({ ...formData, counterparty_id: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {counterparties
                        .filter((c) => c.type !== 'fornecedor')
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Centro de Custo (opcional)</Label>
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

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Quick Settlement Dialog */}
        <QuickSettlementDialog
          open={quickSettlementOpen}
          onOpenChange={setQuickSettlementOpen}
          title={selectedTitle}
          titleType="RECEBER"
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
          }}
        />
      </div>
    </MainLayout>
  );
}
