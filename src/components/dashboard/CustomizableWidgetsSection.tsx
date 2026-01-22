import { memo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Plus,
  RefreshCw,
  Settings,
  X,
  GripVertical,
  BarChart3,
  PieChart,
  LineChart,
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
  onAddWidget?: () => void;
  onRemoveWidget?: (id: string) => void;
  onConfigureWidget?: (id: string) => void;
  onRefreshWidget?: (id: string) => void;
  className?: string;
}

const defaultWidgets: Widget[] = [
  { id: '1', title: 'Fluxo de Caixa Semanal', type: 'chart', lastUpdated: 'há 5 minutos' },
  { id: '2', title: 'Top 5 Clientes', type: 'list', lastUpdated: 'há 10 minutos' },
  { id: '3', title: 'Margem de Lucro', type: 'kpi', lastUpdated: 'há 2 minutos' },
];

const widgetIcons = {
  chart: BarChart3,
  list: Table2,
  kpi: TrendingUp,
};

export const CustomizableWidgetsSection = memo(function CustomizableWidgetsSection({
  widgets = defaultWidgets,
  isEditMode = false,
  onAddWidget,
  onRemoveWidget,
  onConfigureWidget,
  onRefreshWidget,
  className,
}: CustomizableWidgetsSectionProps) {
  return (
    <div className={cn('mt-10', className)}>
      {/* Section Header */}
      <div className={cn(
        'flex items-center justify-between mb-5 pt-6',
        'border-t-2 border-gray-200'
      )}>
        <h2 className="text-lg font-semibold text-gray-900 leading-[26px]">
          Relatórios Personalizados
        </h2>
        {onAddWidget && (
          <Button
            onClick={onAddWidget}
            className={cn(
              'h-9 px-4 bg-[#0066CC] text-white rounded-md',
              'text-[13px] font-semibold',
              'hover:bg-[#0052A3] hover:shadow-[0_4px_8px_rgba(0,102,204,0.2)]',
              'active:bg-[#004294]',
              'transition-all duration-200'
            )}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar Widget
          </Button>
        )}
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map((widget) => {
          const WidgetIcon = widgetIcons[widget.type];
          
          return (
            <Card 
              key={widget.id}
              className={cn(
                'bg-white border border-gray-200 rounded-xl',
                'shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)]',
                'transition-all duration-200',
                'min-h-[300px] flex flex-col',
                isEditMode && 'cursor-grab border-dashed border-gray-300'
              )}
            >
              {/* Widget Header */}
              <CardHeader className={cn(
                'flex flex-row items-center justify-between pb-4 mb-4 border-b border-gray-100',
                isEditMode && 'cursor-grab'
              )}>
                {isEditMode && (
                  <GripVertical className="h-4 w-4 text-gray-400 mr-2" />
                )}
                <h4 className="text-sm font-semibold text-gray-900 flex-1">
                  {widget.title}
                </h4>
                <div className="flex items-center gap-1">
                  {onRefreshWidget && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-[#0066CC]"
                      onClick={() => onRefreshWidget(widget.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  {onConfigureWidget && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-[#0066CC]"
                      onClick={() => onConfigureWidget(widget.id)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                  {isEditMode && onRemoveWidget && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                      onClick={() => onRemoveWidget(widget.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              {/* Widget Content */}
              <CardContent className="pt-0 flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center p-6">
                    <WidgetIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      {widget.type === 'chart' && 'Gráfico em construção'}
                      {widget.type === 'list' && 'Lista em construção'}
                      {widget.type === 'kpi' && 'KPI em construção'}
                    </p>
                  </div>
                </div>

                {/* Widget Footer */}
                {widget.lastUpdated && (
                  <p className="text-[11px] text-gray-400 pt-3 border-t border-gray-100 mt-auto">
                    Última atualização: {widget.lastUpdated}
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
