import { useState, useCallback, useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions, useAccounts, useWallets, useCounterparties, useCostCenters } from '@/hooks/useCompanyData';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { BackButton } from '@/components/common/BackButton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Pencil, Trash2, Check, ArrowUpCircle, FileText, Upload, History, Eye, Ban, Calendar, FolderKanban, FileSpreadsheet, XCircle, CheckCircle } from 'lucide-react';
import { QuickSettlementDialog } from '@/components/settlements/QuickSettlementDialog';
import { BulkActionsBar, BulkEditModal, BulkSelectionCheckbox } from '@/components/bulk';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useBulkActions } from '@/hooks/useBulkActions';
import BaixaManualAP from './ap/BaixaManualAP';
import BaixaAutomaticaAP from './ap/BaixaAutomaticaAP';
import { cn } from '@/lib/utils';

interface TitleForSettlement {
  id: string;
  description: string;
  counterparty_name?: string | null;
  due_date: string;
  balance_amount: number;
  updated_at?: string;
}

export default function ContasPagar() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [activeTab, setActiveTab] = useState('titulos');
  const [filters, setFilters] = useState({ month: currentMonth, year: currentYear, status: '' });
  
  // Quick settlement dialog state
  const [quickSettlementOpen, setQuickSettlementOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<TitleForSettlement | null>(null);

  // Bulk edit modal state
  const [bulkEditModal, setBulkEditModal] = useState<{
    open: boolean;
    type: 'due_date' | 'cost_center' | 'account' | 'notes' | 'cancel' | 'delete' | null;
  }>({ open: false, type: null });
  
  const { data: transactions = [], isLoading } = useTransactions({
    direction: 'saida',
    month: filters.month,
    year: filters.year,
    status: filters.status || undefined,
  });
  
  const { data: accounts = [] } = useAccounts();
  const { data: wallets = [] } = useWallets();
  const { data: counterparties = [] } = useCounterparties();
  const { data: costCenters = [] } = useCostCenters();

  // Bulk selection
  const canSelectItem = useCallback((item: any) => {
    const balance = Number(item.balance_amount || item.total_amount);
    return item.status !== 'pago' && item.status !== 'cancelado' && balance > 0;
  }, []);

  const bulkSelection = useBulkSelection({
    data: transactions,
    canSelect: canSelectItem,
  });

  const bulkActions = useBulkActions({
    tableName: 'transactions',
    queryKey: ['transactions'],
    onSuccess: () => {
      bulkSelection.deselectAll();
    },
  });
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    due_date: '', description: '', original_amount: 0, interest_amount: 0,
    account_id: '', wallet_id: '', counterparty_id: '', cost_center_id: '',
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const total = (data.original_amount || 0) + (data.interest_amount || 0);
      const payload = { 
        ...data, 
        company_id: currentCompany?.id, 
        direction: 'saida' as const, 
        status: 'lancado' as const, 
        total_amount: total, 
        balance_amount: total,
        counterparty_id: data.counterparty_id || null, 
        cost_center_id: data.cost_center_id || null 
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
      due_date: '', description: '', original_amount: 0, interest_amount: 0, 
      account_id: '', wallet_id: '', counterparty_id: '', cost_center_id: '' 
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
      cost_center_id: item.cost_center_id || '' 
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

  // Bulk action handlers
  const handleBulkAction = async (type: typeof bulkEditModal.type, value: string) => {
    const ids = Array.from(bulkSelection.selectedIds);
    
    try {
      switch (type) {
        case 'due_date':
          await bulkActions.bulkUpdate(ids, { due_date: value });
          break;
        case 'cost_center':
          await bulkActions.bulkUpdate(ids, { cost_center_id: value || null });
          break;
        case 'account':
          await bulkActions.bulkUpdate(ids, { account_id: value });
          break;
        case 'notes':
          for (const item of bulkSelection.selectedItems) {
            const currentNotes = (item as any).notes || '';
            await supabase.from('transactions').update({ 
              notes: currentNotes ? `${currentNotes}\n${value}` : value 
            }).eq('id', item.id);
          }
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          toast({ title: `${ids.length} itens atualizados com sucesso` });
          bulkSelection.deselectAll();
          break;
        case 'cancel':
          await bulkActions.bulkUpdate(ids, { status: 'cancelado' });
          break;
        case 'delete':
          await bulkActions.bulkDelete(ids);
          break;
      }
      setBulkEditModal({ open: false, type: null });
    } catch (error) {
      console.error('Bulk action error:', error);
    }
  };

  const handleBulkExport = () => {
    const exportData = bulkSelection.selectedItems.map((item: any) => ({
      description: item.description,
      due_date: item.due_date,
      counterparty: item.counterparties?.name || '-',
      total_amount: item.total_amount,
      status: item.status,
    }));

    bulkActions.bulkExport(
      exportData,
      [
        { key: 'description', header: 'Descrição' },
        { key: 'due_date', header: 'Vencimento', formatter: formatDate },
        { key: 'counterparty', header: 'Fornecedor' },
        { key: 'total_amount', header: 'Valor', formatter: (v: number) => formatCurrency(v) },
        { key: 'status', header: 'Status' },
      ],
      `ContasPagar_Selecionados_${new Date().toISOString().split('T')[0]}`
    );
  };

  const bulkActionsList = useMemo(() => [
    {
      id: 'settle',
      label: 'Baixar em lote',
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: () => setActiveTab('baixa-manual'),
    },
    {
      id: 'due_date',
      label: 'Alterar vencimento',
      icon: <Calendar className="h-4 w-4" />,
      onClick: () => setBulkEditModal({ open: true, type: 'due_date' }),
    },
    {
      id: 'cost_center',
      label: 'Alterar centro de custo',
      icon: <FolderKanban className="h-4 w-4" />,
      onClick: () => setBulkEditModal({ open: true, type: 'cost_center' }),
    },
    {
      id: 'export',
      label: 'Exportar selecionados',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      onClick: handleBulkExport,
    },
    {
      id: 'cancel',
      label: 'Cancelar títulos',
      icon: <XCircle className="h-4 w-4" />,
      onClick: () => setBulkEditModal({ open: true, type: 'cancel' }),
      variant: 'destructive' as const,
    },
    {
      id: 'delete',
      label: 'Excluir títulos',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => setBulkEditModal({ open: true, type: 'delete' }),
      variant: 'destructive' as const,
    },
  ], []);

  const today = new Date().toISOString().split('T')[0];
  const totals = transactions.reduce((acc, t) => { 
    const isOverdue = t.due_date < today && t.status !== 'pago'; 
    if (t.status === 'pago') acc.paid += Number(t.total_amount); 
    else if (isOverdue) acc.overdue += Number(t.total_amount); 
    else acc.pending += Number(t.total_amount); 
    acc.total += Number(t.total_amount); 
    return acc; 
  }, { paid: 0, pending: 0, overdue: 0, total: 0 });

  const selectedTotal = useMemo(() => {
    return bulkSelection.selectedItems.reduce((sum, item: any) => sum + Number(item.total_amount || 0), 0);
  }, [bulkSelection.selectedItems]);

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

  const months = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' }, 
    { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' }, 
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' }, 
    { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
  ];

  // Build bulk edit modal items
  const bulkEditItems = bulkSelection.selectedItems.map((item: any) => ({
    id: item.id,
    label: item.description,
    sublabel: item.counterparties?.name,
    currentValue: bulkEditModal.type === 'due_date' ? formatDate(item.due_date) : undefined,
  }));

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start gap-4">
          <BackButton />
          <div className="flex-1">
            <PageHeader 
              title="Contas a Pagar" 
              description="Gerencie suas despesas, pagamentos e baixas" 
              action={activeTab === 'titulos' ? { label: 'Nova Despesa', onClick: handleNew } : undefined} 
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="titulos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /><span className="hidden sm:inline">Títulos</span>
            </TabsTrigger>
            <TabsTrigger value="baixa-manual" className="flex items-center gap-2">
              <Check className="h-4 w-4" /><span className="hidden sm:inline">Baixa Manual</span>
            </TabsTrigger>
            <TabsTrigger value="baixa-automatica" className="flex items-center gap-2">
              <Upload className="h-4 w-4" /><span className="hidden sm:inline">Baixa Automática</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="h-4 w-4" /><span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="titulos" className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filters.month.toString()} onValueChange={(v) => setFilters({ ...filters, month: parseInt(v) })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{months.map((m) => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.year.toString()} onValueChange={(v) => setFilters({ ...filters, year: parseInt(v) })}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{[currentYear - 1, currentYear, currentYear + 1].map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.status || "__all__"} onValueChange={(v) => setFilters({ ...filters, status: v === "__all__" ? "" : v })}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="lancado">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-4 md:grid-cols-4">
              <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-full p-2 bg-success/10"><ArrowUpCircle className="h-5 w-5 text-success" /></div><div><p className="text-xs text-muted-foreground">Pago</p><p className="text-lg font-semibold">{formatCurrency(totals.paid)}</p></div></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-full p-2 bg-warning/10"><ArrowUpCircle className="h-5 w-5 text-warning" /></div><div><p className="text-xs text-muted-foreground">A Pagar</p><p className="text-lg font-semibold text-warning">{formatCurrency(totals.pending)}</p></div></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-full p-2 bg-destructive/10"><ArrowUpCircle className="h-5 w-5 text-destructive" /></div><div><p className="text-xs text-muted-foreground">Atrasado</p><p className="text-lg font-semibold value-negative">{formatCurrency(totals.overdue)}</p></div></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-full p-2 bg-primary/10"><ArrowUpCircle className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-semibold">{formatCurrency(totals.total)}</p></div></div></CardContent></Card>
            </div>

            {/* Table with bulk selection */}
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <BulkSelectionCheckbox
                        checked={bulkSelection.isAllSelected}
                        indeterminate={bulkSelection.isPartialSelected}
                        onChange={bulkSelection.toggleAll}
                        isHeader
                      />
                    </TableHead>
                    <TableHead className="w-28">Vencimento</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right w-32">Valor</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Nenhuma conta a pagar neste período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((item) => {
                      const settlementAction = getSettlementAction(item);
                      const isSelectable = canSelectItem(item);
                      const isSelected = bulkSelection.isSelected(item.id);
                      const balance = Number(item.balance_amount || item.total_amount);
                      const isPaid = item.status === 'pago' || balance <= 0;
                      const isOverdue = !isPaid && item.due_date < today;

                      return (
                        <TableRow 
                          key={item.id}
                          className={cn(
                            isSelected && 'bg-primary/5',
                            'hover:bg-muted/50'
                          )}
                        >
                          <TableCell>
                            <BulkSelectionCheckbox
                              checked={isSelected}
                              onChange={() => bulkSelection.toggleItem(item.id)}
                              disabled={!isSelectable}
                              tooltip={!isSelectable ? (item.status === 'pago' ? 'Título já baixado' : 'Título cancelado') : undefined}
                            />
                          </TableCell>
                          <TableCell>{formatDate(item.due_date)}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.counterparties?.name || '-'}</TableCell>
                          <TableCell className="text-right">
                            <span className="value-negative font-semibold">{formatCurrency(item.total_amount)}</span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={isPaid ? 'pago' : item.status} isOverdue={isOverdue} />
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Bulk Actions Bar */}
            <BulkActionsBar
              selectedCount={bulkSelection.count}
              onClearSelection={bulkSelection.deselectAll}
              actions={bulkActionsList}
              totalAmount={selectedTotal}
              isProcessing={bulkActions.isProcessing}
              progress={bulkActions.progress}
            />
          </TabsContent>

          <TabsContent value="baixa-manual"><BaixaManualAP /></TabsContent>
          <TabsContent value="baixa-automatica"><BaixaAutomaticaAP /></TabsContent>
          <TabsContent value="historico">
            <Card>
              <CardContent className="py-10 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Histórico de Baixas</h3>
                <p className="text-muted-foreground">
                  Consulte o histórico completo em{' '}
                  <a href="/tesouraria/historico-baixas" className="text-primary hover:underline">
                    Tesouraria → Histórico de Baixas
                  </a>
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit/Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingItem ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
              <div className="space-y-2"><Label>Descrição</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Ex: Aluguel" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data do Lançamento</Label><Input type="date" value={formData.transaction_date} onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" min="0" value={formData.original_amount} onChange={(e) => setFormData({ ...formData, original_amount: parseFloat(e.target.value) || 0 })} required /></div>
                <div className="space-y-2"><Label>Juros/Multa (R$)</Label><Input type="number" step="0.01" min="0" value={formData.interest_amount} onChange={(e) => setFormData({ ...formData, interest_amount: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plano de Contas</Label>
                  <Select value={formData.account_id} onValueChange={(v) => setFormData({ ...formData, account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{accounts.filter(a => ['despesa', 'custo'].includes(a.category_type)).map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta/Carteira</Label>
                  <Select value={formData.wallet_id} onValueChange={(v) => setFormData({ ...formData, wallet_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fornecedor (opcional)</Label>
                  <Select value={formData.counterparty_id || "__none__"} onValueChange={(v) => setFormData({ ...formData, counterparty_id: v === "__none__" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {counterparties.filter((c) => c.type !== 'cliente').map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Centro de Custo (opcional)</Label>
                  <Select value={formData.cost_center_id || "__none__"} onValueChange={(v) => setFormData({ ...formData, cost_center_id: v === "__none__" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {costCenters.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Quick Settlement Dialog */}
        <QuickSettlementDialog
          open={quickSettlementOpen}
          onOpenChange={setQuickSettlementOpen}
          title={selectedTitle}
          titleType="PAGAR"
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
          }}
        />

        {/* Bulk Edit Modals */}
        {bulkEditModal.type === 'due_date' && (
          <BulkEditModal
            open={bulkEditModal.open}
            onOpenChange={(open) => setBulkEditModal({ open, type: open ? 'due_date' : null })}
            title={`Alterar Vencimento de ${bulkSelection.count} títulos`}
            items={bulkEditItems}
            inputType="date"
            inputLabel="Nova data de vencimento"
            onConfirm={(value) => handleBulkAction('due_date', value)}
            isLoading={bulkActions.isPending}
          />
        )}

        {bulkEditModal.type === 'cost_center' && (
          <BulkEditModal
            open={bulkEditModal.open}
            onOpenChange={(open) => setBulkEditModal({ open, type: open ? 'cost_center' : null })}
            title={`Alterar Centro de Custo de ${bulkSelection.count} títulos`}
            items={bulkEditItems}
            inputType="select"
            inputLabel="Novo centro de custo"
            options={costCenters.map((cc) => ({ value: cc.id, label: `${cc.code} - ${cc.name}` }))}
            onConfirm={(value) => handleBulkAction('cost_center', value)}
            isLoading={bulkActions.isPending}
          />
        )}

        {bulkEditModal.type === 'cancel' && (
          <BulkEditModal
            open={bulkEditModal.open}
            onOpenChange={(open) => setBulkEditModal({ open, type: open ? 'cancel' : null })}
            title={`Cancelar ${bulkSelection.count} títulos`}
            items={bulkEditItems}
            inputType="confirm"
            confirmMessage={`Tem certeza que deseja cancelar ${bulkSelection.count} títulos? Esta ação não pode ser desfeita.`}
            onConfirm={() => handleBulkAction('cancel', '')}
            isLoading={bulkActions.isPending}
            isDestructive
          />
        )}

        {bulkEditModal.type === 'delete' && (
          <BulkEditModal
            open={bulkEditModal.open}
            onOpenChange={(open) => setBulkEditModal({ open, type: open ? 'delete' : null })}
            title={`Excluir ${bulkSelection.count} títulos`}
            items={bulkEditItems}
            inputType="confirm"
            confirmMessage={`Tem certeza que deseja EXCLUIR PERMANENTEMENTE ${bulkSelection.count} títulos? Esta ação não pode ser desfeita.`}
            onConfirm={() => handleBulkAction('delete', '')}
            isLoading={bulkActions.isPending}
            isDestructive
          />
        )}
      </div>
    </MainLayout>
  );
}
