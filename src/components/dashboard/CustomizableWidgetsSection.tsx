import { memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Settings,
  X,
  GripVertical,
  BarChart3,
  Table2,
  TrendingUp,
} from 'lucide-react';

interface Widget {
  id: string;
  title: string;
  type: 'chart' | 'list' | 'kpi';
  lastUpdated?: string;
}

interface CustomizableWidgetsSectionProps {
  widgets?: Widget[];
  isEditMode?: boolean;
  onRemoveWidget?: (id: string) => void;
  onConfigureWidget?: (id: string) => void;
  className?: string;
}

const defaultWidgets: Widget[] = [
  { id: '1', title: 'Fluxo de Caixa Semanal', type: 'chart', lastUpdated: 'há 5 min' },
  { id: '2', title: 'Top 5 Clientes', type: 'list', lastUpdated: 'há 10 min' },
  { id: '3', title: 'Margem de Lucro', type: 'kpi', lastUpdated: 'há 2 min' },
];

const widgetIcons = {
  chart: BarChart3,
  list: Table2,
  kpi: TrendingUp,
};

export const CustomizableWidgetsSection = memo(function CustomizableWidgetsSection({
  widgets = defaultWidgets,
  isEditMode = false,
  onRemoveWidget,
  onConfigureWidget,
  className,
}: CustomizableWidgetsSectionProps) {
  return (
    <div className={cn(className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          Widgets Personalizados
        </h2>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map((widget) => {
          const WidgetIcon = widgetIcons[widget.type];
          
          return (
            <Card 
              key={widget.id}
              className={cn(
                'bg-card border border-border rounded-xl',
                'shadow-sm hover:shadow-md',
                'transition-all duration-200',
                'min-h-[200px] flex flex-col',
                isEditMode && 'cursor-grab ring-2 ring-primary/20 ring-offset-1'
              )}
            >
              {/* Widget Header */}
              <CardHeader className={cn(
                'flex flex-row items-center justify-between py-3 px-4 border-b border-border',
                isEditMode && 'cursor-grab'
              )}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isEditMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <h4 className="text-sm font-medium text-foreground truncate">
                    {widget.title}
                  </h4>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {onConfigureWidget && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => onConfigureWidget(widget.id)}
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isEditMode && onRemoveWidget && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveWidget(widget.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              {/* Widget Content */}
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center p-4">
                    <WidgetIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {widget.type === 'chart' && 'Gráfico'}
                      {widget.type === 'list' && 'Lista'}
                      {widget.type === 'kpi' && 'Indicador'}
                    </p>
                  </div>
                </div>

                {/* Widget Footer */}
                {widget.lastUpdated && (
                  <p className="text-[10px] text-muted-foreground pt-2 mt-auto text-right">
                    Atualizado {widget.lastUpdated}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
});

CustomizableWidgetsSection.displayName = 'CustomizableWidgetsSection';
