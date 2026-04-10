import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  Truck,
  Plus,
  RefreshCw,
  DollarSign,
  CheckCircle2,
  Clock,
  Building2,
  Loader2,
  Search,
} from 'lucide-react';

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  lancado: { label: 'Lançado', color: 'bg-blue-100 text-blue-700' },
  pago: { label: 'Pago', color: 'bg-emerald-100 text-emerald-700' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
};

export default function SupplyChainIndex() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pedidos');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [search, setSearch] = useState('');
  const [orderForm, setOrderForm] = useState({
    description: '',
    total_amount: '',
    due_date: '',
    counterparty_id: '',
    notes: '',
  });

  // ─── Pedidos de compra (saída) ───────────────────────────────────────
  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ['supply_orders', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, description, total_amount, due_date, paid_date, status,
          counterparty_id,
          counterparty:counterparty_id(name)
        `)
        .eq('company_id', companyId)
        .eq('direction', 'saida')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // ─── Fornecedores ────────────────────────────────────────────────────
  const { data: suppliersData, isLoading: loadingSuppliers } = useQuery({
    queryKey: ['supply_suppliers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('counterparties')
        .select('id, name, email, phone, document_number, type')
        .eq('company_id', companyId)
        .in('type', ['fornecedor', 'ambos'])
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // ─── KPIs ─────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const orders = ordersData || [];
  const openOrders = orders.filter(o => ['rascunho', 'lancado'].includes(o.status));
  const overdueOrders = openOrders.filter(o => o.due_date && o.due_date < today);
  const paidThisMonth = orders.filter(
    o => o.status === 'pago' && o.paid_date && o.paid_date >= firstOfMonth
  );
  const paidAmount = paidThisMonth.reduce((s, o) => s + (o.total_amount || 0), 0);
  const suppliers = suppliersData || [];

  // ─── Criar pedido ─────────────────────────────────────────────────────
  const createOrder = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Empresa não selecionada');
      const { error } = await supabase.from('transactions').insert({
        company_id: companyId,
        direction: 'saida',
        description: orderForm.description,
        total_amount: parseFloat(orderForm.total_amount) || 0,
        due_date: orderForm.due_date || null,
        counterparty_id: orderForm.counterparty_id || null,
        notes: orderForm.notes || null,
        status: 'rascunho',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply_orders', companyId] });
      toast({ title: 'Pedido criado!', description: orderForm.description });
      setShowNewOrder(false);
      setOrderForm({ description: '', total_amount: '', due_date: '', counterparty_id: '', notes: '' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar pedido', description: err.message, variant: 'destructive' });
    },
  });

  // ─── Avançar status ───────────────────────────────────────────────────
  const advanceStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const next: Record<string, string> = { rascunho: 'lancado', lancado: 'pago' };
      const newStatus = next[currentStatus];
      if (!newStatus) return;
      const extra = newStatus === 'pago' ? { paid_date: today } : {};
      const { error } = await supabase
        .from('transactions')
        .update({ status: newStatus, ...extra })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply_orders', companyId] });
      toast({ title: 'Status atualizado!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const filteredOrders = orders.filter(o =>
    !search ||
    o.description?.toLowerCase().includes(search.toLowerCase()) ||
    (o.counterparty as any)?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Supply Chain"
          description="Pedidos de compra, fornecedores e gestão de suprimentos"
          action={{
            label: 'Novo Pedido',
            onClick: () => setShowNewOrder(true),
            icon: <Plus className="h-4 w-4" />,
          }}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos Abertos</p>
                  <p className="text-2xl font-bold">{openOrders.length}</p>
                  <p className="text-xs text-muted-foreground">em andamento</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vencidos</p>
                  <p className="text-2xl font-bold text-destructive">{overdueOrders.length}</p>
                  <p className="text-xs text-destructive">requer ação</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pago este Mês</p>
                  <p className="text-2xl font-bold">{fmt(paidAmount)}</p>
                  <p className="text-xs text-muted-foreground">{paidThisMonth.length} pedidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fornecedores</p>
                  <p className="text-2xl font-bold">{suppliers.length}</p>
                  <p className="text-xs text-muted-foreground">ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pedido ou fornecedor..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pedidos">Pedidos de Compra</TabsTrigger>
            <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          </TabsList>

          {/* ── Pedidos ── */}
          <TabsContent value="pedidos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Pedidos de Compra
                </CardTitle>
                <CardDescription>Gerencie e acompanhe seus pedidos junto aos fornecedores</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum pedido encontrado</p>
                    <Button variant="outline" className="mt-4" onClick={() => setShowNewOrder(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Pedido
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-3 font-medium">Descrição</th>
                          <th className="pb-3 font-medium">Fornecedor</th>
                          <th className="pb-3 font-medium">Vencimento</th>
                          <th className="pb-3 font-medium text-right">Valor</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map(order => {
                          const isOverdue =
                            ['rascunho', 'lancado'].includes(order.status) &&
                            order.due_date &&
                            order.due_date < today;
                          const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.rascunho;
                          const nextLabel: Record<string, string> = {
                            rascunho: 'Lançar',
                            lancado: 'Confirmar Pagamento',
                          };
                          return (
                            <tr key={order.id} className="border-b border-border/50">
                              <td className="py-3 font-medium text-foreground max-w-[200px] truncate">
                                {order.description || '—'}
                              </td>
                              <td className="py-3 text-muted-foreground">
                                {(order.counterparty as any)?.name || '—'}
                              </td>
                              <td className="py-3">
                                <span className={isOverdue ? 'text-destructive font-medium' : 'text-foreground'}>
                                  {order.due_date
                                    ? new Date(order.due_date + 'T12:00:00').toLocaleDateString('pt-BR')
                                    : '—'}
                                </span>
                                {isOverdue && (
                                  <span className="ml-1 text-xs text-destructive">vencido</span>
                                )}
                              </td>
                              <td className="py-3 text-right font-medium">
                                {fmt(order.total_amount || 0)}
                              </td>
                              <td className="py-3">
                                <Badge className={cfg.color}>{cfg.label}</Badge>
                              </td>
                              <td className="py-3">
                                {nextLabel[order.status] && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      advanceStatus.mutate({
                                        id: order.id,
                                        currentStatus: order.status,
                                      })
                                    }
                                    disabled={advanceStatus.isPending}
                                  >
                                    {order.status === 'lancado' ? (
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                    ) : (
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                    )}
                                    {nextLabel[order.status]}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Fornecedores ── */}
          <TabsContent value="fornecedores" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Fornecedores
                </CardTitle>
                <CardDescription>
                  Fornecedores cadastrados. Para adicionar, use Cadastros → Clientes/Fornecedores.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSuppliers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredSuppliers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum fornecedor cadastrado</p>
                    <p className="text-xs mt-1">
                      Cadastre fornecedores em Cadastros → Clientes/Fornecedores
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-3 font-medium">Nome</th>
                          <th className="pb-3 font-medium">CNPJ/CPF</th>
                          <th className="pb-3 font-medium">E-mail</th>
                          <th className="pb-3 font-medium">Telefone</th>
                          <th className="pb-3 font-medium">Tipo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSuppliers.map(s => (
                          <tr key={s.id} className="border-b border-border/50">
                            <td className="py-3 font-medium text-foreground">{s.name}</td>
                            <td className="py-3 text-muted-foreground font-mono text-xs">
                              {s.document_number || '—'}
                            </td>
                            <td className="py-3 text-muted-foreground">{s.email || '—'}</td>
                            <td className="py-3 text-muted-foreground">{s.phone || '—'}</td>
                            <td className="py-3">
                              <Badge variant="outline" className="capitalize">
                                {s.type}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialog Novo Pedido ── */}
      <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Novo Pedido de Compra
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sc-desc">Descrição *</Label>
              <Input
                id="sc-desc"
                placeholder="Ex: Material de escritório"
                value={orderForm.description}
                onChange={e => setOrderForm({ ...orderForm, description: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-valor">Valor (R$) *</Label>
              <Input
                id="sc-valor"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={orderForm.total_amount}
                onChange={e => setOrderForm({ ...orderForm, total_amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-due">Data de Vencimento</Label>
              <Input
                id="sc-due"
                type="date"
                value={orderForm.due_date}
                onChange={e => setOrderForm({ ...orderForm, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-supplier">Fornecedor</Label>
              <Select
                value={orderForm.counterparty_id}
                onValueChange={v => setOrderForm({ ...orderForm, counterparty_id: v })}
              >
                <SelectTrigger id="sc-supplier">
                  <SelectValue placeholder="Selecionar fornecedor..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-notes">Observações</Label>
              <Input
                id="sc-notes"
                placeholder="Detalhes adicionais..."
                value={orderForm.notes}
                onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewOrder(false)}
              disabled={createOrder.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => createOrder.mutate()}
              disabled={!orderForm.description.trim() || !orderForm.total_amount || createOrder.isPending}
            >
              {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
