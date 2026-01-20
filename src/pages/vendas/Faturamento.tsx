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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, DollarSign, Clock, CheckCircle } from "lucide-react";
import { useInvoices, useInvoicesStats } from "@/hooks/useInvoices";
import { useSalesOrders } from "@/hooks/useSalesOrders";
import { useCreateInvoiceFromOrder } from "@/hooks/useInvoices";
import { format, startOfMonth, endOfMonth } from "date-fns";

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  emitida: 'Emitida',
  cancelada: 'Cancelada',
  inutilizada: 'Inutilizada',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendente: 'outline',
  emitida: 'default',
  cancelada: 'destructive',
  inutilizada: 'secondary',
};

export default function Faturamento() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const hoje = new Date();

  const { data: invoices, isLoading: loadingInvoices } = useInvoices({ 
    status: statusFilter || undefined,
    from: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    to: format(endOfMonth(hoje), 'yyyy-MM-dd'),
  });
  const { data: stats } = useInvoicesStats({
    from: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    to: format(endOfMonth(hoje), 'yyyy-MM-dd'),
  });
  const { data: ordersToInvoice, isLoading: loadingOrders } = useSalesOrders({ 
    status: 'confirmado',
  });
  const createInvoice = useCreateInvoiceFromOrder();

  const handleFaturar = async (orderId: string) => {
    await createInvoice.mutateAsync(orderId);
  };

  const invoiceColumns = [
    { 
      key: 'invoice_number', 
      header: 'Número',
      render: (item: typeof invoices extends (infer T)[] ? T : never) => (
        <span className="font-mono text-sm">{item.invoice_number}</span>
      )
    },
    { 
      key: 'counterparty', 
      header: 'Cliente',
      render: (item: typeof invoices extends (infer T)[] ? T : never) => (
        item.counterparty?.name || '-'
      )
    },
    { 
      key: 'data_emissao', 
      header: 'Emissão',
      render: (item: typeof invoices extends (infer T)[] ? T : never) => (
        format(new Date(item.data_emissao), 'dd/MM/yyyy')
      )
    },
    { 
      key: 'sales_order', 
      header: 'Pedido',
      render: (item: typeof invoices extends (infer T)[] ? T : never) => (
        item.sales_order?.order_number || '-'
      )
    },
    { 
      key: 'valor_total', 
      header: 'Valor',
      render: (item: typeof invoices extends (infer T)[] ? T : never) => (
        (Number(item.valor_total) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: typeof invoices extends (infer T)[] ? T : never) => (
        <Badge variant={STATUS_VARIANTS[item.status]}>
          {STATUS_LABELS[item.status]}
        </Badge>
      )
    },
  ];

  const orderColumns = [
    { 
      key: 'order_number', 
      header: 'Pedido',
      render: (item: typeof ordersToInvoice extends (infer T)[] ? T : never) => (
        <span className="font-mono text-sm">{item.order_number}</span>
      )
    },
    { 
      key: 'counterparty', 
      header: 'Cliente',
      render: (item: typeof ordersToInvoice extends (infer T)[] ? T : never) => (
        item.counterparty?.name || '-'
      )
    },
    { 
      key: 'data_pedido', 
      header: 'Data',
      render: (item: typeof ordersToInvoice extends (infer T)[] ? T : never) => (
        format(new Date(item.data_pedido), 'dd/MM/yyyy')
      )
    },
    { 
      key: 'valor_total', 
      header: 'Valor',
      render: (item: typeof ordersToInvoice extends (infer T)[] ? T : never) => (
        (Number(item.valor_total) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      )
    },
    { 
      key: 'actions', 
      header: '',
      render: (item: typeof ordersToInvoice extends (infer T)[] ? T : never) => (
        <Button 
          variant="default" 
          size="sm" 
          onClick={() => handleFaturar(item.id)}
          disabled={createInvoice.isPending}
        >
          Faturar
        </Button>
      )
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton to="/vendas" />
          <PageHeader title="Faturamento" description="Gestão de notas fiscais" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Faturas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendentes || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emitidas</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.emitidas || 0}</div>
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

        <Tabs defaultValue="faturas">
          <TabsList>
            <TabsTrigger value="faturas">Faturas Emitidas</TabsTrigger>
            <TabsTrigger value="pendentes">
              Prontos para Faturar 
              {ordersToInvoice && ordersToInvoice.length > 0 && (
                <Badge variant="secondary" className="ml-2">{ordersToInvoice.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faturas" className="space-y-4">
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
            </div>

            <DataTable 
              data={invoices || []} 
              columns={invoiceColumns} 
              loading={loadingInvoices}
            />
          </TabsContent>

          <TabsContent value="pendentes" className="space-y-4">
            <DataTable 
              data={ordersToInvoice || []} 
              columns={orderColumns} 
              loading={loadingOrders}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
