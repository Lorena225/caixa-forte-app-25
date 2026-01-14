import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, Edit, XCircle, Truck, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PedidoCompraModal } from '@/components/compras/PedidoCompraModal';

const statusConfig: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
  enviado: { label: 'Enviado', color: 'bg-blue-100 text-blue-800' },
  confirmado: { label: 'Confirmado', color: 'bg-purple-100 text-purple-800' },
  parcial: { label: 'Entrega Parcial', color: 'bg-yellow-100 text-yellow-800' },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-800' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

// Mock data
const mockPedidos = [
  { id: '1', numero: 'PC-2026-0001', fornecedor: 'Distribuidora ABC', data: '2026-01-10', previsao_entrega: '2026-01-20', valor_total: 15000, status: 'confirmado', itens: 5 },
  { id: '2', numero: 'PC-2026-0002', fornecedor: 'Tech Supplies', data: '2026-01-12', previsao_entrega: '2026-01-25', valor_total: 8500, status: 'enviado', itens: 3 },
  { id: '3', numero: 'PC-2026-0003', fornecedor: 'Atacado XYZ', data: '2026-01-13', previsao_entrega: '2026-01-18', valor_total: 3200, status: 'entregue', itens: 8 },
  { id: '4', numero: 'PC-2026-0004', fornecedor: 'Import & Export', data: '2026-01-14', previsao_entrega: null, valor_total: 22000, status: 'rascunho', itens: 12 },
];

export default function PedidosCompra() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pedidos] = useState(mockPedidos);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredPedidos = pedidos.filter(pedido => {
    const matchesSearch = pedido.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.fornecedor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || pedido.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: 'numero',
      header: 'Número',
      cell: (row: any) => <div className="font-medium font-mono">{row.numero}</div>,
    },
    {
      key: 'fornecedor',
      header: 'Fornecedor',
      cell: (row: any) => row.fornecedor,
    },
    {
      key: 'data',
      header: 'Data',
      cell: (row: any) => format(new Date(row.data), 'dd/MM/yyyy', { locale: ptBR }),
    },
    {
      key: 'previsao_entrega',
      header: 'Previsão Entrega',
      cell: (row: any) => row.previsao_entrega 
        ? format(new Date(row.previsao_entrega), 'dd/MM/yyyy', { locale: ptBR })
        : '-',
    },
    {
      key: 'itens',
      header: 'Itens',
      cell: (row: any) => row.itens,
    },
    {
      key: 'valor_total',
      header: 'Valor Total',
      cell: (row: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.valor_total),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row: any) => {
        const status = statusConfig[row.status];
        return <Badge className={status.color}>{status.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      cell: (row: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" title="Visualizar">
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === 'rascunho' && (
            <>
              <Button variant="ghost" size="icon" title="Editar">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Cancelar">
                <XCircle className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
          {row.status === 'confirmado' && (
            <Button variant="ghost" size="icon" title="Registrar Entrega">
              <Truck className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // KPIs
  const totalPendente = pedidos.filter(p => ['rascunho', 'enviado', 'confirmado', 'parcial'].includes(p.status))
    .reduce((sum, p) => sum + p.valor_total, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Pedidos de Compra"
          description="Gerencie pedidos enviados a fornecedores"
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rascunhos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pedidos.filter(p => p.status === 'rascunho').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando Entrega</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {pedidos.filter(p => ['enviado', 'confirmado'].includes(p.status)).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Entregues (Mês)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {pedidos.filter(p => p.status === 'entregue').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Pendente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendente)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="entregue">Entregue</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido
          </Button>
        </div>

        <PedidoCompraModal open={modalOpen} onOpenChange={setModalOpen} />

        {/* Tabela */}
        <DataTable
          columns={columns}
          data={filteredPedidos}
          loading={false}
        />
      </div>
    </MainLayout>
  );
}
