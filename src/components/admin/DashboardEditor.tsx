import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw,
  BarChart3,
  PieChart,
  LineChart,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Widget {
  id: string;
  type: 'kpi' | 'chart' | 'table';
  title: string;
  icon: string;
  enabled: boolean;
  order: number;
  size: 'small' | 'medium' | 'large';
}

const availableWidgets: Widget[] = [
  { id: 'cash_balance', type: 'kpi', title: 'Saldo em Caixa', icon: 'Wallet', enabled: true, order: 0, size: 'small' },
  { id: 'revenue', type: 'kpi', title: 'Receita do Período', icon: 'TrendingUp', enabled: true, order: 1, size: 'small' },
  { id: 'expenses', type: 'kpi', title: 'Despesas do Período', icon: 'TrendingDown', enabled: true, order: 2, size: 'small' },
  { id: 'profit', type: 'kpi', title: 'Resultado', icon: 'Target', enabled: true, order: 3, size: 'small' },
  { id: 'ar_overdue', type: 'kpi', title: 'Inadimplência', icon: 'AlertTriangle', enabled: true, order: 4, size: 'small' },
  { id: 'ar_total', type: 'kpi', title: 'A Receber', icon: 'ArrowDownCircle', enabled: true, order: 5, size: 'small' },
  { id: 'ap_total', type: 'kpi', title: 'A Pagar', icon: 'ArrowUpCircle', enabled: true, order: 6, size: 'small' },
  { id: 'cashflow_chart', type: 'chart', title: 'Fluxo de Caixa Mensal', icon: 'BarChart3', enabled: true, order: 7, size: 'large' },
  { id: 'projection_chart', type: 'chart', title: 'Projeção 13 Semanas', icon: 'LineChart', enabled: true, order: 8, size: 'large' },
  { id: 'ar_aging', type: 'chart', title: 'Aging Contas a Receber', icon: 'PieChart', enabled: true, order: 9, size: 'medium' },
  { id: 'ap_aging', type: 'chart', title: 'Aging Contas a Pagar', icon: 'PieChart', enabled: true, order: 10, size: 'medium' },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Wallet, TrendingUp, TrendingDown, AlertTriangle, Target,
  ArrowDownCircle, ArrowUpCircle, BarChart3, LineChart, PieChart,
};

interface DashboardEditorProps {
  onSave?: (widgets: Widget[]) => void;
}

export function DashboardEditor({ onSave }: DashboardEditorProps) {
  const { toast } = useToast();
  const [widgets, setWidgets] = useState<Widget[]>(availableWidgets);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleWidget = (id: string) => {
    setWidgets(widgets.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    ));
    setHasChanges(true);
  };

  const handleChangeSize = (id: string, size: Widget['size']) => {
    setWidgets(widgets.map(w => 
      w.id === id ? { ...w, size } : w
    ));
    setHasChanges(true);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newWidgets = [...widgets];
      const [draggedItem] = newWidgets.splice(dragIndex, 1);
      newWidgets.splice(dragOverIndex, 0, draggedItem);
      
      // Update order
      const reordered = newWidgets.map((w, i) => ({ ...w, order: i }));
      setWidgets(reordered);
      setHasChanges(true);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      onSave?.(widgets);
      toast({ title: 'Layout do dashboard salvo com sucesso!' });
      setHasChanges(false);
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setWidgets(availableWidgets);
    setHasChanges(false);
  };

  const enabledCount = widgets.filter(w => w.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Widgets do Dashboard</h3>
          <p className="text-sm text-muted-foreground">
            {enabledCount} de {widgets.length} widgets ativos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="mr-2">Alterações pendentes</Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      <Separator />

      {/* Instructions */}
      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Personalize seu dashboard:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Arraste para reordenar os widgets</li>
          <li>Use o toggle para mostrar/ocultar widgets</li>
          <li>Escolha o tamanho de cada widget</li>
        </ul>
      </div>

      {/* Widget List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {widgets
            .sort((a, b) => a.order - b.order)
            .map((widget, index) => {
              const Icon = iconMap[widget.icon] || BarChart3;
              
              return (
                <div
                  key={widget.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border bg-card transition-all cursor-move',
                    dragIndex === index && 'opacity-50',
                    dragOverIndex === index && 'border-primary border-2',
                    !widget.enabled && 'opacity-60 bg-muted'
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  
                  <div className="p-2 rounded-md bg-muted">
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{widget.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{widget.type}</p>
                  </div>

                  <Select 
                    value={widget.size} 
                    onValueChange={(v) => handleChangeSize(widget.id, v as Widget['size'])}
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Pequeno</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                    </SelectContent>
                  </Select>

                  <Switch
                    checked={widget.enabled}
                    onCheckedChange={() => handleToggleWidget(widget.id)}
                  />
                </div>
              );
            })}
        </div>
      </ScrollArea>

      {/* Preview Grid */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Prévia do Layout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 grid-cols-6">
            {widgets
              .filter(w => w.enabled)
              .sort((a, b) => a.order - b.order)
              .map((widget) => {
                const colSpan = widget.size === 'large' ? 3 : widget.size === 'medium' ? 2 : 1;
                return (
                  <div
                    key={widget.id}
                    className={cn(
                      'bg-muted/50 rounded p-2 text-center text-xs text-muted-foreground truncate',
                      colSpan === 3 && 'col-span-3',
                      colSpan === 2 && 'col-span-2',
                      colSpan === 1 && 'col-span-1'
                    )}
                  >
                    {widget.title}
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
