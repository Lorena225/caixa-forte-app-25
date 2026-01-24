import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  GripVertical,
  ShoppingCart,
  Activity,
  Clock,
  Brain,
  Radio,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Target,
  AlertTriangle,
  BarChart3,
  Users,
  Percent,
  TrendingUp,
  Zap,
  RotateCcw,
  Save,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardWidgetConfig, AVAILABLE_WIDGETS } from './widgets';

interface WidgetCustomizationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: DashboardWidgetConfig[];
  onWidgetsChange: (widgets: DashboardWidgetConfig[]) => void;
  onSave: () => void;
  onReset: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  ShoppingCart,
  Activity,
  Clock,
  Brain,
  Radio,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Target,
  AlertTriangle,
  BarChart3,
  Users,
  Percent,
  TrendingUp,
  Zap,
};

const categoryColors: Record<string, { bg: string; text: string; label: string }> = {
  kpi: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', label: 'KPI' },
  chart: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', label: 'Gráfico' },
  list: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', label: 'Lista' },
  ai: { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-600 dark:text-violet-400', label: 'IA' },
};

export const WidgetCustomizationDrawer = memo(function WidgetCustomizationDrawer({
  open,
  onOpenChange,
  widgets,
  onWidgetsChange,
  onSave,
  onReset,
}: WidgetCustomizationDrawerProps) {
  const handleToggle = useCallback((widgetId: string) => {
    onWidgetsChange(
      widgets.map(w => 
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      )
    );
  }, [widgets, onWidgetsChange]);

  const handleReorder = useCallback((newOrder: DashboardWidgetConfig[]) => {
    onWidgetsChange(newOrder.map((w, i) => ({ ...w, order: i })));
  }, [onWidgetsChange]);

  const enabledCount = widgets.filter(w => w.enabled).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-background/95 backdrop-blur-xl border-l border-border/50">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <SheetTitle className="text-xl">Personalizar Dashboard</SheetTitle>
              <SheetDescription className="text-sm">
                Arraste para reordenar • Toggle para ativar/desativar
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        {/* Stats */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-medium">
              {enabledCount} de {widgets.length} ativos
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar Padrão
          </Button>
        </div>

        {/* Widget List */}
        <ScrollArea className="h-[calc(100vh-320px)] pr-4">
          <Reorder.Group
            axis="y"
            values={widgets}
            onReorder={handleReorder}
            className="space-y-2"
          >
            <AnimatePresence>
              {widgets.map((widget) => {
                const IconComponent = iconMap[widget.icon] || Sparkles;
                const category = categoryColors[widget.category];

                return (
                  <Reorder.Item
                    key={widget.id}
                    value={widget}
                    className={cn(
                      'relative flex items-center gap-3 p-4 rounded-xl cursor-grab active:cursor-grabbing',
                      'border transition-all duration-200',
                      widget.enabled
                        ? 'bg-card border-border/50 shadow-sm'
                        : 'bg-muted/30 border-border/30 opacity-60'
                    )}
                    whileDrag={{
                      scale: 1.02,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                      cursor: 'grabbing',
                    }}
                  >
                    {/* Drag Handle */}
                    <div className="flex-shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                      <GripVertical className="w-5 h-5" />
                    </div>

                    {/* Widget Icon */}
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      widget.enabled ? category.bg : 'bg-muted'
                    )}>
                      <IconComponent className={cn(
                        'w-5 h-5',
                        widget.enabled ? category.text : 'text-muted-foreground'
                      )} />
                    </div>

                    {/* Widget Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground text-sm truncate">
                          {widget.title}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={cn('text-[10px] px-1.5 py-0', category.bg, category.text)}
                        >
                          {category.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {widget.description}
                      </p>
                    </div>

                    {/* Toggle */}
                    <Switch
                      checked={widget.enabled}
                      onCheckedChange={() => handleToggle(widget.id)}
                      className="flex-shrink-0"
                    />
                  </Reorder.Item>
                );
              })}
            </AnimatePresence>
          </Reorder.Group>
        </ScrollArea>

        <Separator className="my-4" />

        <SheetFooter className="flex-row gap-3 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-xl"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onSave();
              onOpenChange(false);
            }}
            className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});

export default WidgetCustomizationDrawer;
