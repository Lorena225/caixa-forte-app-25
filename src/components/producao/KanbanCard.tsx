import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Calendar, 
  MoreVertical, 
  ArrowRight,
  AlertTriangle,
  Package
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KanbanCardProps {
  order: {
    id: string;
    order_number: string;
    product_id: string;
    quantity_planned?: number;
    planned_quantity?: number;
    quantity_completed?: number;
    produced_quantity?: number;
    planned_end_date?: string;
    priority?: number | string;
    status: string;
    products?: { name: string; code?: string };
  };
  onStatusChange: (orderId: string, newStatus: string) => void;
  currentStatus: string;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  planned: ['released', 'cancelled'],
  released: ['in_progress', 'planned', 'cancelled'],
  in_progress: ['completed', 'released'],
  completed: [],
  cancelled: ['planned'],
};

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planejada',
  released: 'Liberada',
  in_progress: 'Em Produção',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export function KanbanCard({ order, onStatusChange, currentStatus }: KanbanCardProps) {
  const plannedQty = order.quantity_planned || order.planned_quantity || 0;
  const completedQty = order.quantity_completed || order.produced_quantity || 0;
  const progress = plannedQty > 0 ? Math.round((completedQty / plannedQty) * 100) : 0;
  
  const endDate = order.planned_end_date ? new Date(order.planned_end_date) : null;
  const isLate = endDate && isPast(endDate) && currentStatus !== 'completed';
  const isDueToday = endDate && isToday(endDate);
  const isHighPriority = order.priority === 'high' || order.priority === 1;

  const availableTransitions = STATUS_TRANSITIONS[currentStatus] || [];

  return (
    <Card className={`shadow-sm hover:shadow-md transition-shadow cursor-pointer ${isLate ? 'border-amber-500' : ''}`}>
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-mono font-bold text-sm truncate">
              {order.order_number}
            </div>
            <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Package className="h-3 w-3" />
              {order.products?.name || 'Produto'}
            </div>
          </div>
          {availableTransitions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableTransitions.map(status => (
                  <DropdownMenuItem 
                    key={status}
                    onClick={() => onStatusChange(order.id, status)}
                    className="gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Mover para {STATUS_LABELS[status]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Quantidade */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Qtd:</span>
          <span className="font-mono font-medium">
            {completedQty} / {plannedQty}
          </span>
        </div>

        {/* Progress bar */}
        {currentStatus === 'in_progress' && (
          <div className="w-full bg-muted rounded-full h-1.5">
            <div 
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          {endDate && (
            <div className={`flex items-center gap-1 text-xs ${isLate ? 'text-amber-600' : isDueToday ? 'text-blue-600' : 'text-muted-foreground'}`}>
              {isLate && <AlertTriangle className="h-3 w-3" />}
              <Calendar className="h-3 w-3" />
              {format(endDate, 'dd/MM', { locale: ptBR })}
            </div>
          )}
          <div className="flex gap-1">
            {isHighPriority && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                Alta
              </Badge>
            )}
            {currentStatus === 'in_progress' && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                {progress}%
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
