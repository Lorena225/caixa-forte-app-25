import { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DashboardWidget } from '@/hooks/useDashboardWidgets';
import {
  GripVertical,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Target,
  AlertTriangle,
  Zap,
  TrendingUp,
  BarChart3,
  Users,
  Percent,
  Activity,
  RotateCcw,
  Eye,
  EyeOff,
  LayoutGrid,
  X,
  LucideIcon,
} from 'lucide-react';

interface WidgetManagementPanelProps {
  widgets: DashboardWidget[];
  onToggle: (widgetId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onResetToDefaults: () => void;
  onClose: () => void;
  className?: string;
}

const iconMap: Record<string, LucideIcon> = {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Target,
  AlertTriangle,
  Zap,
  TrendingUp,
  BarChart3,
  Users,
  Percent,
  Activity,
};

const typeLabels: Record<string, { label: string; color: string }> = {
  kpi: { label: 'KPI', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  chart: { label: 'Gráfico', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  list: { label: 'Lista', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  projection: { label: 'Projeção', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  alerts: { label: 'Alertas', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  actions: { label: 'Ações', color: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
};

export const WidgetManagementPanel = memo(function WidgetManagementPanel({
  widgets,
  onToggle,
  onReorder,
  onResetToDefaults,
  onClose,
  className,
}: WidgetManagementPanelProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const enabledCount = widgets.filter(w => w.enabled).length;
  const totalCount = widgets.length;

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      onReorder(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, onReorder]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  return (
    <Card className={cn(
      'fixed right-4 top-20 w-[380px] max-h-[calc(100vh-6rem)]',
      'bg-card border border-border shadow-2xl rounded-xl z-[100]',
      'animate-in slide-in-from-right-4 fade-in duration-300',
      className
    )}>
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <LayoutGrid className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Gerenciar Widgets
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {enabledCount} de {totalCount} ativos
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="max-h-[calc(100vh-14rem)]">
        <CardContent className="p-3 space-y-1.5">
          {widgets.map((widget, index) => {
            const Icon = widget.icon ? iconMap[widget.icon] : LayoutGrid;
            const typeConfig = typeLabels[widget.type] || typeLabels.kpi;
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={widget.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
                className={cn(
                  'group flex items-center gap-3 p-3 rounded-lg',
                  'border border-transparent',
                  'transition-all duration-200',
                  'hover:bg-muted/50',
                  widget.enabled ? 'bg-background' : 'bg-muted/30 opacity-60',
                  isDragging && 'opacity-50 scale-95',
                  isDragOver && 'border-primary bg-primary/5',
                  'cursor-grab active:cursor-grabbing'
                )}
              >
                {/* Drag Handle */}
                <div className="flex-shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Widget Icon */}
                <div className={cn(
                  'flex-shrink-0 p-2 rounded-lg',
                  widget.enabled ? 'bg-primary/10' : 'bg-muted'
                )}>
                  <Icon className={cn(
                    'h-4 w-4',
                    widget.enabled ? 'text-primary' : 'text-muted-foreground'
                  )} />
                </div>

                {/* Widget Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={cn(
                      'text-sm font-medium truncate',
                      widget.enabled ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {widget.title}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={cn('text-[10px] px-1.5 py-0 h-4 font-normal', typeConfig.color)}
                    >
                      {typeConfig.label}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {widget.description}
                  </p>
                </div>

                {/* Toggle Switch */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {widget.enabled ? (
                    <Eye className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Switch
                    checked={widget.enabled}
                    onCheckedChange={() => onToggle(widget.id)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </ScrollArea>

      <Separator />

      <div className="p-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
          onClick={onResetToDefaults}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Restaurar Padrão
        </Button>
        <p className="text-[10px] text-muted-foreground">
          Arraste para reordenar
        </p>
      </div>
    </Card>
  );
});

WidgetManagementPanel.displayName = 'WidgetManagementPanel';
