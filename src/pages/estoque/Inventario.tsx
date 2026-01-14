import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, ClipboardCheck, AlertTriangle, CheckCircle, Clock, Play, Eye, XCircle } from 'lucide-react';
import { useInventories, useCreateInventory, useInventoryItems, useUpdateInventoryItem, useFinalizeInventory } from '@/hooks/useInventories';
import { useProducts } from '@/hooks/useProducts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pendente', color: 'bg-gray-100 text-gray-800', icon: Clock },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800', icon: Play },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function Inventario() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [newInventoryDescription, setNewInventoryDescription] = useState('');

  const { data: inventories = [], isLoading } = useInventories();
  const { data: products = [] } = useProducts();
  const createInventory = useCreateInventory();
  const { data: inventoryItems = [] } = useInventoryItems(selectedInventoryId);
  const updateItem = useUpdateInventoryItem();
  const finalizeInventory = useFinalizeInventory();

  const filteredInventories = inventories.filter(inv => {
    const matchesSearch = inv.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateInventory = async () => {
    if (!newInventoryDescription) return;
    const productIds = products.map(p => p.id);
    await createInventory.mutateAsync({
      description: newInventoryDescription,
      product_ids: productIds,
    });
    setNewInventoryDescription('');
    setIsNewModalOpen(false);
  };

  const handleUpdateCount = async (itemId: string, countedQty: number) => {
    await updateItem.mutateAsync({ id: itemId, counted_qty: countedQty });
  };

  const handleFinalize = async () => {
    if (!selectedInventoryId) return;
    await finalizeInventory.mutateAsync(selectedInventoryId);
    setSelectedInventoryId(null);
  };

  const columns = [
    {
      key: 'inventory_date',
      header: 'Data',
      cell: (row: any) => format(new Date(row.inventory_date), 'dd/MM/yyyy', { locale: ptBR }),
    },
    {
      key: 'description',
      header: 'Descrição',
      cell: (row: any) => row.description || 'Inventário',
    },
    {
      key: 'progress',
      header: 'Progresso',
      cell: (row: any) => {
        const total = row.total_items || 1;
        const counted = row.counted_items || 0;
        const percentual = Math.round((counted / total) * 100);
        return (
          <div className="w-32 space-y-1">
            <div className="flex justify-between text-xs">
              <span>{counted}/{total}</span>
              <span>{percentual}%</span>
            </div>
            <Progress value={percentual} className="h-2" />
          </div>
        );
      },
    },
    {
      key: 'divergences',
      header: 'Divergências',
      cell: (row: any) => (
        <span className={(row.divergences || 0) > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
          {row.divergences || 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row: any) => {
        const config = statusConfig[row.status] || statusConfig.pending;
        const Icon = config.icon;
        return (
          <Badge className={config.color}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      cell: (row: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setSelectedInventoryId(row.id)}>
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === 'in_progress' && (
            <Button variant="outline" size="sm" onClick={() => setSelectedInventoryId(row.id)}>
              Continuar
            </Button>
          )}
        </div>
      ),
    },
  ];

  // KPIs
  const emAndamento = inventories.filter(i => i.status === 'in_progress').length;
  const comDivergencias = inventories.filter(i => (i.divergences || 0) > 0).length;
  const concluidos = inventories.filter(i => i.status === 'completed').length;

  // Selected inventory for counting
  const selectedInventory = inventories.find(i => i.id === selectedInventoryId);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Inventário"
          description="Contagens físicas e ajustes de estoque"
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Play className="h-4 w-4" />
                Em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{emAndamento}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Com Divergências
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{comDivergencias}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Concluídos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{concluidos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Acuracidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">96.5%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição..."
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
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsNewModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Inventário
          </Button>
        </div>

        {/* Tabela */}
        <DataTable
          columns={columns}
          data={filteredInventories}
          loading={isLoading}
        />

        {/* Modal Novo Inventário */}
        <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Iniciar Novo Inventário</DialogTitle>
              <DialogDescription>
                Será criado um inventário com todos os {products.length} produtos cadastrados
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Descrição</Label>
                <Input
                  value={newInventoryDescription}
                  onChange={(e) => setNewInventoryDescription(e.target.value)}
                  placeholder="Ex: Inventário Mensal - Janeiro/2026"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateInventory} disabled={createInventory.isPending}>
                {createInventory.isPending ? 'Criando...' : 'Iniciar Inventário'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Contagem */}
        <Dialog open={!!selectedInventoryId} onOpenChange={() => setSelectedInventoryId(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Contagem de Inventário</DialogTitle>
              <DialogDescription>{selectedInventory?.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {inventoryItems.map((item) => {
                const product = products.find(p => p.id === item.product_id);
                const diff = (item.counted_qty ?? 0) - (item.expected_qty || 0);
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{product?.name || 'Produto'}</div>
                      <div className="text-sm text-muted-foreground">{product?.code}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        Sistema: <span className="font-medium">{item.expected_qty}</span>
                      </div>
                      <Input
                        type="number"
                        className="w-24"
                        placeholder="Contado"
                        value={item.counted_qty ?? ''}
                        onChange={(e) => handleUpdateCount(item.id, parseInt(e.target.value) || 0)}
                      />
                      <div className={`w-20 text-right font-medium ${diff !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInventoryId(null)}>Fechar</Button>
              {selectedInventory?.status !== 'completed' && (
                <Button onClick={handleFinalize} disabled={finalizeInventory.isPending}>
                  {finalizeInventory.isPending ? 'Finalizando...' : 'Finalizar e Ajustar Estoque'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
