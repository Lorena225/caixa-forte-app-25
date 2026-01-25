import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableWithSelection } from '@/components/common/DataTableWithSelection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, FileText, Package, CheckCircle, AlertTriangle, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EntradaModal } from '@/components/compras/EntradaModal';
import { usePurchaseReceipts } from '@/hooks/usePurchaseReceipts';
import { toast } from 'sonner';
import { BulkAction } from '@/components/bulk/BulkActionsBar';

const statusConfig: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  conferido: { label: 'Conferido', color: 'bg-blue-100 text-blue-800' },
  finalizado: { label: 'Finalizado', color: 'bg-green-100 text-green-800' },
  divergencia: { label: 'Divergência', color: 'bg-red-100 text-red-800' },
};

// Mock data for display (will be replaced by real data)
const mockEntradas = [
  { id: '1', numero: 'ENT-2026-0001', nfe: '123456', fornecedor: 'Distribuidora ABC', data: '2026-01-14', valor_total: 15000, pedido: 'PC-2026-0001', status: 'pendente', itens: 5 },
  { id: '2', numero: 'ENT-2026-0002', nfe: '654321', fornecedor: 'Tech Supplies', data: '2026-01-13', valor_total: 8500, pedido: 'PC-2026-0002', status: 'conferido', itens: 3 },
  { id: '3', numero: 'ENT-2026-0003', nfe: '789012', fornecedor: 'Atacado XYZ', data: '2026-01-12', valor_total: 3200, pedido: 'PC-2025-0125', status: 'finalizado', itens: 8 },
  { id: '4', numero: 'ENT-2026-0004', nfe: '345678', fornecedor: 'Import & Export', data: '2026-01-11', valor_total: 22000, pedido: null, status: 'divergencia', itens: 12 },
];

export default function Entradas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  
  // Using mock data for now, can integrate with usePurchaseReceipts
  const { receipts, isLoading } = usePurchaseReceipts();
  const entradas = mockEntradas; // Will switch to receipts when data available

  const filteredEntradas = entradas.filter(entrada => {
    const matchesSearch = entrada.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrada.nfe.includes(searchTerm) ||
      entrada.fornecedor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || entrada.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleBulkDelete = async (ids: string[]) => {
    toast.success(`${ids.length} entrada(s) excluída(s)`);
  };

  const handleBulkStatusChange = async (ids: string[], status: string) => {
    toast.success(`Status alterado para ${ids.length} entrada(s)`);
  };

  const bulkActions: BulkAction[] = [
    {
      id: 'delete',
      label: 'Excluir Selecionados',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => handleBulkDelete([]),
      variant: 'destructive',
    },
    {
      id: 'status-finalizado',
      label: 'Marcar como Finalizado',
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: () => handleBulkStatusChange([], 'finalizado'),
    },
    {
      id: 'status-conferido',
      label: 'Marcar como Conferido',
      icon: <Package className="h-4 w-4" />,
      onClick: () => handleBulkStatusChange([], 'conferido'),
    },
  ];

  const columns = [
    {
      key: 'numero',
      header: 'Número',
      cell: (row: any) => <div className="font-medium font-mono">{row.numero}</div>,
    },
    {
      key: 'nfe',
      header: 'NF-e',
      cell: (row: any) => (
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {row.nfe}
        </div>
      ),
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
      hideOnMobile: true,
    },
    {
      key: 'pedido',
      header: 'Pedido',
      cell: (row: any) => row.pedido ? (
        <span className="font-mono text-sm text-primary">{row.pedido}</span>
      ) : (
        <span className="text-muted-foreground">Sem pedido</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'itens',
      header: 'Itens',
      cell: (row: any) => row.itens,
      hideOnMobile: true,
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
          <Button variant="ghost" size="icon" title="Editar">
            <Edit className="h-4 w-4" />
          </Button>
          {row.status === 'pendente' && (
            <Button variant="ghost" size="icon" title="Conferir">
              <Package className="h-4 w-4" />
            </Button>
          )}
          {row.status === 'conferido' && (
            <Button variant="ghost" size="icon" title="Finalizar">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </Button>
          )}
          {row.status === 'divergencia' && (
            <Button variant="ghost" size="icon" title="Resolver">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // KPIs
  const valorRecebidoMes = entradas
    .filter(e => e.status === 'finalizado')
    .reduce((sum, e) => sum + e.valor_total, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Entradas de Mercadorias"
          description="O coração da logística: ao confirmar uma entrada, o estoque é atualizado, o custo médio é recalculado e uma conta a pagar é gerada automaticamente."
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {entradas.filter(e => e.status === 'pendente').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em Conferência</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {entradas.filter(e => e.status === 'conferido').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Com Divergência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {entradas.filter(e => e.status === 'divergencia').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Recebido (Mês)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorRecebidoMes)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, NF-e ou fornecedor..."
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
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="conferido">Conferido</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
              <SelectItem value="divergencia">Divergência</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Entrada
          </Button>
        </div>

        {/* Tabela com Seleção */}
        <DataTableWithSelection
          columns={columns}
          data={filteredEntradas}
          loading={isLoading}
          enableSelection
          bulkActions={bulkActions}
          canSelect={(item) => item.status !== 'finalizado'}
        />

        {/* Modal de Nova Entrada */}
        <EntradaModal open={modalOpen} onOpenChange={setModalOpen} />
      </div>
    </MainLayout>
  );
}
