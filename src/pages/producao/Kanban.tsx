import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePCP } from "@/hooks/usePCP";
import { KanbanCard } from "@/components/producao/KanbanCard";
import { 
  RefreshCw,
  Filter,
  LayoutGrid
} from "lucide-react";

type KanbanStatus = 'planned' | 'released' | 'in_progress' | 'completed' | 'cancelled';

const KANBAN_COLUMNS: { status: KanbanStatus; label: string; color: string }[] = [
  { status: 'planned', label: 'Planejada', color: 'bg-slate-100' },
  { status: 'released', label: 'Liberada', color: 'bg-blue-50' },
  { status: 'in_progress', label: 'Em Produção', color: 'bg-amber-50' },
  { status: 'completed', label: 'Concluída', color: 'bg-green-50' },
];

export default function Kanban() {
  const { productionOrders, productionOrdersLoading, updateProductionOrderStatus, workCenters } = usePCP();
  const [filterWorkCenter, setFilterWorkCenter] = useState<string>("all");

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await updateProductionOrderStatus.mutateAsync({ id: orderId, status: newStatus });
  };

  // Agrupar ordens por status
  const ordersByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.status] = productionOrders.filter(op => {
      const matchesStatus = op.status === col.status;
      // Filtro por centro de trabalho (se implementado)
      return matchesStatus;
    });
    return acc;
  }, {} as Record<KanbanStatus, typeof productionOrders>);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Kanban - Controle de Produção"
            description="Visualização e gerenciamento de Ordens de Produção"
          />
          <div className="flex items-center gap-2">
            <Select value={filterWorkCenter} onValueChange={setFilterWorkCenter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Centro de Trabalho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Centros</SelectItem>
                {workCenters.map(wc => (
                  <SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[600px]">
          {KANBAN_COLUMNS.map(column => (
            <div key={column.status} className={`rounded-lg ${column.color} p-3`}>
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{column.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {ordersByStatus[column.status]?.length || 0}
                  </Badge>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {productionOrdersLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Carregando...
                  </div>
                ) : ordersByStatus[column.status]?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    Nenhuma OP
                  </div>
                ) : (
                  ordersByStatus[column.status]?.map(order => (
                    <KanbanCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      currentStatus={column.status}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legenda */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Atrasado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>No Prazo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Alta Prioridade</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
