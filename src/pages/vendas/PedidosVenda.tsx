import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { BackButton } from "@/components/common/BackButton";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, FileText, Package, DollarSign, TrendingUp } from "lucide-react";
import { useSalesOrders, useSalesOrdersStats, useUpdateSalesOrder } from "@/hooks/useSalesOrders";
import { useCreateInvoiceFromOrder } from "@/hooks/useInvoices";
import { format, startOfMonth, endOfMonth } from "date-fns";

const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  confirmado: 'Confirmado',
  em_separacao: 'Em Separação',
  faturado: 'Faturado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  rascunho: 'secondary',
  confirmado: 'outline',
  em_separacao: 'default',
  faturado: 'default',
  entregue: 'default',
  cancelado: 'destructive',
};

export default function PedidosVenda() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const hoje = new Date();

  const { data: orders, isLoading } = useSalesOrders({ 
    status: statusFilter || undefined,
    search: search || undefined,
    from: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    to: format(endOfMonth(hoje), 'yyyy-MM-dd'),
  });
  const { data: stats } = useSalesOrdersStats({
    from: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    to: format(endOfMonth(hoje), 'yyyy-MM-dd'),
  });
  const updateOrder = useUpdateSalesOrder();
  const createInvoice = useCreateInvoiceFromOrder();

  const handleStatusChange = async (id: string, status: string) => {
    await updateOrder.mutateAsync({ id, status: status as 'rascunho' | 'confirmado' | 'em_separacao' | 'faturado' | 'entregue' | 'cancelado' });
  };

  const handleFaturar = async (id: string) => {
    await createInvoice.mutateAsync(id);
  };

  const columns = [
    { 
      key: 'order_number', 
      header: 'Número',
      render: (item: typeof orders extends (infer T)[] ? T : never) => (
        <span className="font-mono text-sm">{item.order_number}</span>
      )
    },
    { 
      key: 'counterparty', 
      header: 'Cliente',
      render: (item: typeof orders extends (infer T)[] ? T : never) => (
        item.counterparty?.name || '-'
      )
    },
    { 
      key: 'data_pedido', 
      header: 'Data',
      render: (item: typeof orders extends (infer T)[] ? T : never) => (
        format(new Date(item.data_pedido), 'dd/MM/yyyy')
      )
    },
    { 
      key: 'valor_total', 
      header: 'Valor',
      render: (item: typeof orders extends (infer T)[] ? T : never) => (
        (Number(item.valor_total) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: typeof orders extends (infer T)[] ? T : never) => (
        <Select value={item.status} onValueChange={(v) => handleStatusChange(item.id, v)}>
          <SelectTrigger className="w-[140px]">
            <Badge variant={STATUS_VARIANTS[item.status]}>{STATUS_LABELS[item.status]}</Badge>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    },
    { 
      key: 'actions', 
      header: '',
      render: (item: typeof orders extends (infer T)[] ? T : never) => (
        item.status === 'confirmado' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleFaturar(item.id)}
            disabled={createInvoice.isPending}
          >
            Faturar
          </Button>
        )
      )
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton to="/vendas" />
          <PageHeader title="Pedidos de Venda" description="Gestão de pedidos" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.confirmados || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturados</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.faturados || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats?.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido
          </Button>
        </div>

        <DataTable 
          data={orders || []} 
          columns={columns} 
          loading={isLoading}
        />
      </div>
    </MainLayout>
  );
}
