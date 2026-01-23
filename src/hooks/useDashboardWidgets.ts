import { useState, useEffect, useCallback } from 'react';

export interface DashboardWidget {
  id: string;
  key: string;
  title: string;
  description: string;
  type: 'chart' | 'list' | 'kpi' | 'projection' | 'alerts' | 'actions';
  enabled: boolean;
  order: number;
  size?: 'small' | 'medium' | 'large';
  icon?: string;
}

const WIDGETS_STORAGE_KEY = 'dashboard-widgets-config';

const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'kpi-saldo',
    key: 'saldo-caixa',
    title: 'Saldo em Caixa',
    description: 'Saldo disponível em conta',
    type: 'kpi',
    enabled: true,
    order: 0,
    icon: 'Wallet',
  },
  {
    id: 'kpi-receber',
    key: 'contas-receber',
    title: 'Contas a Receber',
    description: 'Total de títulos a cobrar',
    type: 'kpi',
    enabled: true,
    order: 1,
    icon: 'ArrowDownCircle',
  },
  {
    id: 'kpi-pagar',
    key: 'contas-pagar',
    title: 'Contas a Pagar',
    description: 'Total de compromissos',
    type: 'kpi',
    enabled: true,
    order: 2,
    icon: 'ArrowUpCircle',
  },
  {
    id: 'kpi-orcamento',
    key: 'execucao-orcamentaria',
    title: 'Execução Orçamentária',
    description: 'Percentual de execução',
    type: 'kpi',
    enabled: true,
    order: 3,
    icon: 'Target',
  },
  {
    id: 'panel-alerts',
    key: 'alertas',
    title: 'Painel de Alertas',
    description: 'Avisos e notificações importantes',
    type: 'alerts',
    enabled: true,
    order: 4,
    size: 'medium',
    icon: 'AlertTriangle',
  },
  {
    id: 'panel-actions',
    key: 'acoes-rapidas',
    title: 'Ações Rápidas',
    description: 'Atalhos para operações frequentes',
    type: 'actions',
    enabled: true,
    order: 5,
    size: 'medium',
    icon: 'Zap',
  },
  {
    id: 'chart-cashflow',
    key: 'projecao-fluxo',
    title: 'Projeção de Fluxo de Caixa',
    description: 'Previsão de entradas e saídas',
    type: 'projection',
    enabled: true,
    order: 6,
    size: 'medium',
    icon: 'TrendingUp',
  },
  {
    id: 'chart-budget',
    key: 'orcado-realizado',
    title: 'Orçado vs Realizado',
    description: 'Comparativo mensal',
    type: 'chart',
    enabled: true,
    order: 7,
    size: 'large',
    icon: 'BarChart3',
  },
  {
    id: 'widget-top-clients',
    key: 'top-clientes',
    title: 'Top 5 Clientes',
    description: 'Clientes com maior faturamento',
    type: 'list',
    enabled: true,
    order: 8,
    size: 'medium',
    icon: 'Users',
  },
  {
    id: 'widget-margin',
    key: 'margem-lucro',
    title: 'Margem de Lucro',
    description: 'Indicador de margem operacional',
    type: 'kpi',
    enabled: true,
    order: 9,
    size: 'small',
    icon: 'Percent',
  },
  {
    id: 'widget-weekly-flow',
    key: 'fluxo-semanal',
    title: 'Fluxo de Caixa Semanal',
    description: 'Movimentação da semana',
    type: 'chart',
    enabled: true,
    order: 10,
    size: 'medium',
    icon: 'Activity',
  },
];

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    try {
      const saved = localStorage.getItem(WIDGETS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new widgets
        return DEFAULT_WIDGETS.map(defaultWidget => {
          const savedWidget = parsed.find((w: DashboardWidget) => w.id === defaultWidget.id);
          return savedWidget ? { ...defaultWidget, ...savedWidget } : defaultWidget;
        });
      }
    } catch (error) {
      console.error('Error loading widget config:', error);
    }
    return DEFAULT_WIDGETS;
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [undoStack, setUndoStack] = useState<DashboardWidget[][]>([]);
  const [redoStack, setRedoStack] = useState<DashboardWidget[][]>([]);

  // Save to localStorage
  const saveWidgets = useCallback((newWidgets: DashboardWidget[]) => {
    try {
      localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(newWidgets));
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving widget config:', error);
    }
  }, []);

  // Push to undo stack before making changes
  const pushToUndoStack = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-19), widgets]);
    setRedoStack([]);
  }, [widgets]);

  // Toggle widget enabled state
  const toggleWidget = useCallback((widgetId: string) => {
    pushToUndoStack();
    setWidgets(prev => 
      prev.map(w => w.id === widgetId ? { ...w, enabled: !w.enabled } : w)
    );
    setHasChanges(true);
  }, [pushToUndoStack]);

  // Reorder widgets
  const reorderWidgets = useCallback((fromIndex: number, toIndex: number) => {
    pushToUndoStack();
    setWidgets(prev => {
      const newWidgets = [...prev];
      const [moved] = newWidgets.splice(fromIndex, 1);
      newWidgets.splice(toIndex, 0, moved);
      return newWidgets.map((w, i) => ({ ...w, order: i }));
    });
    setHasChanges(true);
  }, [pushToUndoStack]);

  // Update widget
  const updateWidget = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
    pushToUndoStack();
    setWidgets(prev =>
      prev.map(w => w.id === widgetId ? { ...w, ...updates } : w)
    );
    setHasChanges(true);
  }, [pushToUndoStack]);

  // Undo
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, widgets]);
    setUndoStack(prev => prev.slice(0, -1));
    setWidgets(previous);
    setHasChanges(true);
  }, [undoStack, widgets]);

  // Redo
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, widgets]);
    setRedoStack(prev => prev.slice(0, -1));
    setWidgets(next);
    setHasChanges(true);
  }, [redoStack, widgets]);

  // Save changes
  const save = useCallback(() => {
    saveWidgets(widgets);
    setUndoStack([]);
    setRedoStack([]);
  }, [widgets, saveWidgets]);

  // Cancel changes (revert to saved)
  const cancel = useCallback(() => {
    try {
      const saved = localStorage.getItem(WIDGETS_STORAGE_KEY);
      if (saved) {
        setWidgets(JSON.parse(saved));
      } else {
        setWidgets(DEFAULT_WIDGETS);
      }
    } catch {
      setWidgets(DEFAULT_WIDGETS);
    }
    setHasChanges(false);
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    pushToUndoStack();
    setWidgets(DEFAULT_WIDGETS);
    setHasChanges(true);
  }, [pushToUndoStack]);

  // Get enabled widgets sorted by order
  const enabledWidgets = widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order);

  // Get widgets by type
  const getWidgetsByType = useCallback((type: DashboardWidget['type']) => {
    return enabledWidgets.filter(w => w.type === type);
  }, [enabledWidgets]);

  // Check if a specific widget is enabled
  const isWidgetEnabled = useCallback((key: string) => {
    return widgets.find(w => w.key === key)?.enabled ?? false;
  }, [widgets]);

  return {
    widgets,
    enabledWidgets,
    hasChanges,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    toggleWidget,
    reorderWidgets,
    updateWidget,
    undo,
    redo,
    save,
    cancel,
    resetToDefaults,
    getWidgetsByType,
    isWidgetEnabled,
  };
}
