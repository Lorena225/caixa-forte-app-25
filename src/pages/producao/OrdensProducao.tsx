import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { usePCP, useProductionOrderDetails } from "@/hooks/usePCP";
import { useProducts } from "@/hooks/useProducts";
import { 
  Plus, 
  Search, 
  Factory, 
  Play, 
  Pause, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  Package,
  ArrowRight,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusColors: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-800',
  released: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  on_hold: 'bg-orange-100 text-orange-800',
};

const statusLabels: Record<string, string> = {
  planned: 'Planejada',
  released: 'Liberada',
  in_progress: 'Em Produção',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  on_hold: 'Suspensa',
};

export default function OrdensProducao() {
  const { productionOrders, productionOrdersLoading, boms, createProductionOrder, updateProductionOrderStatus, closeProductionOrder } = usePCP();
  const { products } = useProducts();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeQty, setCloseQty] = useState('');

  const { data: orderDetails, isLoading: detailsLoading } = useProductionOrderDetails(selectedOrderId);

  const [newOrder, setNewOrder] = useState({
    product_id: '',
    quantity_planned: '',
    planned_start_date: new Date().toISOString().slice(0, 16),
    priority: '5',
    notes: '',
  });

  const filteredOrders = productionOrders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.products?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateOrder = () => {
    const selectedProduct = products.find(p => p.id === newOrder.product_id);
    const activeBom = boms.find(b => b.product_id === newOrder.product_id && b.status === 'active');

    createProductionOrder.mutate({
      product_id: newOrder.product_id,
      bom_id: activeBom?.id,
      quantity_planned: Number(newOrder.quantity_planned),
      planned_start_date: newOrder.planned_start_date,
      priority: Number(newOrder.priority),
      notes: newOrder.notes,
    }, {
      onSuccess: () => {
        setShowNewDialog(false);
        setNewOrder({
          product_id: '',
          quantity_planned: '',
          planned_start_date: new Date().toISOString().slice(0, 16),
          priority: '5',
          notes: '',
        });
      },
    });
  };

  const handleCloseOrder = () => {
    if (selectedOrderId && closeQty) {
      closeProductionOrder.mutate({
        orderId: selectedOrderId,
        quantityCompleted: Number(closeQty),
      }, {
        onSuccess: () => {
          setShowCloseDialog(false);
          setCloseQty('');
        },
      });
    }
  };

  const getProgress = (order: typeof productionOrders[0]) => {
    if (order.quantity_planned === 0) return 0;
    return (order.quantity_completed / order.quantity_planned) * 100;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Ordens de Produção"
            description="Gerencie e acompanhe as OPs do chão de fábrica"
          />
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova OP
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Ordem de Produção</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Produto</Label>
                  <Select value={newOrder.product_id} onValueChange={(v) => setNewOrder({ ...newOrder, product_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      value={newOrder.quantity_planned}
                      onChange={(e) => setNewOrder({ ...newOrder, quantity_planned: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Prioridade (1-10)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={newOrder.priority}
                      onChange={(e) => setNewOrder({ ...newOrder, priority: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Data Início Planejada</Label>
                  <Input
                    type="datetime-local"
                    value={newOrder.planned_start_date}
                    onChange={(e) => setNewOrder({ ...newOrder, planned_start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Input
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
                <Button onClick={handleCreateOrder} disabled={createProductionOrder.isPending}>
                  Criar OP
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar OP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="planned">Planejadas</SelectItem>
              <SelectItem value="released">Liberadas</SelectItem>
              <SelectItem value="in_progress">Em Produção</SelectItem>
              <SelectItem value="completed">Concluídas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid de OPs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Lista de OPs */}
          <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
            {productionOrdersLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhuma OP encontrada</div>
            ) : (
              filteredOrders.map((order) => (
                <Card
                  key={order.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedOrderId === order.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">{order.products?.name}</p>
                      </div>
                      <Badge className={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progresso</span>
                        <span>{order.quantity_completed}/{order.quantity_planned}</span>
                      </div>
                      <Progress value={getProgress(order)} className="h-2" />
                    </div>
                    {order.planned_start_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(order.planned_start_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Detalhes da OP */}
          <div className="lg:col-span-2">
            {selectedOrderId && orderDetails ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-5 w-5" />
                      {orderDetails.order_number}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{orderDetails.products?.name}</p>
                  </div>
                  <div className="flex gap-2">
                    {orderDetails.status === 'planned' && (
                      <Button
                        size="sm"
                        onClick={() => updateProductionOrderStatus.mutate({ id: orderDetails.id, status: 'released' })}
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Liberar
                      </Button>
                    )}
                    {orderDetails.status === 'released' && (
                      <Button
                        size="sm"
                        onClick={() => updateProductionOrderStatus.mutate({ id: orderDetails.id, status: 'in_progress' })}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Iniciar
                      </Button>
                    )}
                    {orderDetails.status === 'in_progress' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateProductionOrderStatus.mutate({ id: orderDetails.id, status: 'on_hold' })}
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pausar
                        </Button>
                        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="default">
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Fechar OP
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Fechar Ordem de Produção</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm text-muted-foreground">
                                Ao fechar a OP, o sistema irá consumir automaticamente os materiais do estoque (backflushing)
                                e dar entrada no produto acabado.
                              </p>
                              <div>
                                <Label>Quantidade Produzida</Label>
                                <Input
                                  type="number"
                                  value={closeQty}
                                  onChange={(e) => setCloseQty(e.target.value)}
                                  placeholder={`Planejado: ${orderDetails.quantity_planned}`}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancelar</Button>
                              <Button onClick={handleCloseOrder} disabled={closeProductionOrder.isPending}>
                                Confirmar Fechamento
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="info">
                    <TabsList>
                      <TabsTrigger value="info">Informações</TabsTrigger>
                      <TabsTrigger value="operations">Operações</TabsTrigger>
                      <TabsTrigger value="materials">Materiais</TabsTrigger>
                      <TabsTrigger value="costs">Custos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">Qtd Planejada</p>
                          <p className="text-lg font-semibold">{orderDetails.quantity_planned}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">Qtd Produzida</p>
                          <p className="text-lg font-semibold">{orderDetails.quantity_completed}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">Refugo</p>
                          <p className="text-lg font-semibold">{orderDetails.quantity_scrapped}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">Prioridade</p>
                          <p className="text-lg font-semibold">{orderDetails.priority}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Progresso Geral</p>
                        <Progress value={getProgress(orderDetails)} className="h-3" />
                        <p className="text-xs text-muted-foreground text-right">
                          {getProgress(orderDetails).toFixed(1)}% concluído
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="operations" className="pt-4">
                      <div className="space-y-2">
                        {orderDetails.operations?.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">Nenhuma operação cadastrada</p>
                        ) : (
                          orderDetails.operations?.map((op, idx) => (
                            <div key={op.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                                {op.operation_number}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{op.operation_name}</p>
                                <p className="text-xs text-muted-foreground">{op.work_centers?.name}</p>
                              </div>
                              <div className="text-right text-sm">
                                <p>Setup: {op.planned_setup_time}min</p>
                                <p>Execução: {op.planned_run_time}min</p>
                              </div>
                              <Badge className={statusColors[op.status]}>
                                {statusLabels[op.status] || op.status}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="materials" className="pt-4">
                      <div className="space-y-2">
                        {orderDetails.materials?.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">Nenhum material vinculado</p>
                        ) : (
                          orderDetails.materials?.map((mat) => (
                            <div key={mat.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                              <Package className="h-5 w-5 text-muted-foreground" />
                              <div className="flex-1">
                                <p className="font-medium">{mat.products?.name}</p>
                                <p className="text-xs text-muted-foreground">Código: {mat.products?.code}</p>
                              </div>
                              <div className="text-right text-sm">
                                <p>Planejado: {mat.planned_quantity}</p>
                                <p>Consumido: {mat.consumed_quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  R$ {(mat.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="costs" className="pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Custo Padrão</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Material</span>
                                <span>R$ {(orderDetails.standard_material_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Mão de Obra</span>
                                <span>R$ {(orderDetails.standard_labor_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between font-semibold border-t pt-2">
                                <span>Total</span>
                                <span>R$ {((orderDetails.standard_material_cost || 0) + (orderDetails.standard_labor_cost || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Custo Real</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Material</span>
                                <span>R$ {(orderDetails.actual_material_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Mão de Obra</span>
                                <span>R$ {(orderDetails.actual_labor_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between font-semibold border-t pt-2">
                                <span>Total</span>
                                <span>R$ {((orderDetails.actual_material_cost || 0) + (orderDetails.actual_labor_cost || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {orderDetails.variance_amount !== 0 && (
                          <Card className="col-span-2">
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {orderDetails.variance_amount > 0 ? (
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                  ) : (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  )}
                                  <span className="font-medium">Variação</span>
                                </div>
                                <span className={`text-lg font-bold ${orderDetails.variance_amount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                  {orderDetails.variance_amount > 0 ? '+' : ''}
                                  R$ {(orderDetails.variance_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <Factory className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Selecione uma OP para ver os detalhes</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
