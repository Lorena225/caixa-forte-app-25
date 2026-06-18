import { useState, useEffect, useCallback, useMemo } from 'react';
import { ViewMode } from '@/components/dashboard/ViewModeSelector';
import { DashboardWidgetConfig, AVAILABLE_WIDGETS } from '@/components/dashboard/widgets';

const VIEW_MODE_STORAGE_KEY = 'dashboard-view-mode';
const CUSTOM_WIDGETS_STORAGE_KEY = 'dashboard-custom-widgets';

// Preset configurations for each view mode
const EXECUTIVE_WIDGETS = [
  'vendas', 'fluxo', 'simulacao', 'ranking-vendas', 'ia-insight', 'feed-ia'
];

const OPERATIONAL_WIDGETS = [
  'vendas', 'estoque-critico', 'ranking-vendas', 'pendencias', 'fluxo'
];

const CONTROLLERSHIP_WIDGETS = [
  'compliance-fiscal', 'aging-cobranca', 'pendencias', 'fluxo', 'simulacao'
];

// CFO Virtual messages for each mode
export const VIEW_MODE_MESSAGES: Record<ViewMode, (userName: string, data?: any) => string> = {
  executive: (userName) => 
    `${userName}, sua visão executiva está pronta. Cadastre contas e lançamentos para acompanhar o fluxo de caixa em tempo real.`,
  operational: (userName, data) => 
    data?.produtosCriticos
      ? `${userName}, temos ${data.produtosCriticos} itens que pedem atenção. Deseja revisar?`
      : `${userName}, sua visão operacional está pronta.`,
  controllership: (userName, data) => 
    data?.obrigacoesPendentes
      ? `${userName}, há ${data.obrigacoesPendentes} obrigações fiscais pendentes este mês.`
      : `${userName}, sua visão de controladoria está pronta.`,
  custom: (userName) => 
    `${userName}, seu dashboard personalizado está configurado. Arraste os widgets para reorganizar conforme sua preferência.`,
};

export function useViewMode() {
  // Load saved mode from localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return (saved as ViewMode) || 'executive';
    } catch {
      return 'executive';
    }
  });

  // Load custom widgets configuration
  const [customWidgets, setCustomWidgets] = useState<DashboardWidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_WIDGETS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return AVAILABLE_WIDGETS;
  });

  // Persist mode to localStorage
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Persist custom widgets to localStorage
  const saveCustomWidgets = useCallback((widgets: DashboardWidgetConfig[]) => {
    setCustomWidgets(widgets);
    localStorage.setItem(CUSTOM_WIDGETS_STORAGE_KEY, JSON.stringify(widgets));
  }, []);

  // Get active widget keys based on current mode
  const activeWidgetKeys = useMemo(() => {
    switch (viewMode) {
      case 'executive':
        return EXECUTIVE_WIDGETS;
      case 'operational':
        return OPERATIONAL_WIDGETS;
      case 'controllership':
        return CONTROLLERSHIP_WIDGETS;
      case 'custom':
        return customWidgets.filter(w => w.enabled).map(w => w.key);
      default:
        return EXECUTIVE_WIDGETS;
    }
  }, [viewMode, customWidgets]);

  // Check if a widget is enabled for current mode
  const isWidgetEnabled = useCallback((key: string) => {
    return activeWidgetKeys.includes(key);
  }, [activeWidgetKeys]);

  // Get CFO message for current mode
  const getCFOMessage = useCallback((userName: string, data?: any) => {
    return VIEW_MODE_MESSAGES[viewMode](userName, data);
  }, [viewMode]);

  // Change view mode
  const changeViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // Update custom widgets
  const updateCustomWidgets = useCallback((widgets: DashboardWidgetConfig[]) => {
    saveCustomWidgets(widgets);
  }, [saveCustomWidgets]);

  // Get widgets for drawer/customization (only used in custom mode)
  const getWidgetsForCustomization = useCallback(() => {
    return customWidgets;
  }, [customWidgets]);

  return {
    viewMode,
    changeViewMode,
    activeWidgetKeys,
    isWidgetEnabled,
    getCFOMessage,
    customWidgets,
    updateCustomWidgets,
    getWidgetsForCustomization,
    isCustomMode: viewMode === 'custom',
  };
}
