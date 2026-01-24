import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardWidgetConfig, AVAILABLE_WIDGETS } from '@/components/dashboard/widgets';

const MODULAR_WIDGETS_STORAGE_KEY = 'dashboard-modular-widgets-v2';

export function useModularWidgets() {
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem(MODULAR_WIDGETS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new widgets
        return AVAILABLE_WIDGETS.map(defaultWidget => {
          const savedWidget = parsed.find((w: DashboardWidgetConfig) => w.id === defaultWidget.id);
          return savedWidget ? { ...defaultWidget, ...savedWidget } : defaultWidget;
        });
      }
    } catch (error) {
      console.error('[ModularWidgets] Error loading config:', error);
    }
    return AVAILABLE_WIDGETS;
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Save to localStorage
  const saveWidgets = useCallback(() => {
    try {
      localStorage.setItem(MODULAR_WIDGETS_STORAGE_KEY, JSON.stringify(widgets));
      setHasChanges(false);
      console.log('[ModularWidgets] Configuration saved');
    } catch (error) {
      console.error('[ModularWidgets] Error saving config:', error);
    }
  }, [widgets]);

  // Update widgets
  const updateWidgets = useCallback((newWidgets: DashboardWidgetConfig[]) => {
    setWidgets(newWidgets);
    setHasChanges(true);
  }, []);

  // Toggle widget
  const toggleWidget = useCallback((widgetId: string) => {
    setWidgets(prev => 
      prev.map(w => w.id === widgetId ? { ...w, enabled: !w.enabled } : w)
    );
    setHasChanges(true);
  }, []);

  // Reorder widgets
  const reorderWidgets = useCallback((fromIndex: number, toIndex: number) => {
    setWidgets(prev => {
      const newWidgets = [...prev];
      const [moved] = newWidgets.splice(fromIndex, 1);
      newWidgets.splice(toIndex, 0, moved);
      return newWidgets.map((w, i) => ({ ...w, order: i }));
    });
    setHasChanges(true);
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setWidgets(AVAILABLE_WIDGETS);
    setHasChanges(true);
  }, []);

  // Get enabled widgets sorted by order
  const enabledWidgets = useMemo(() => 
    widgets
      .filter(w => w.enabled)
      .sort((a, b) => a.order - b.order),
    [widgets]
  );

  // Check if widget is enabled
  const isWidgetEnabled = useCallback((key: string) => {
    return widgets.find(w => w.key === key)?.enabled ?? false;
  }, [widgets]);

  // Get widget by key
  const getWidget = useCallback((key: string) => {
    return widgets.find(w => w.key === key);
  }, [widgets]);

  return {
    widgets,
    enabledWidgets,
    hasChanges,
    updateWidgets,
    toggleWidget,
    reorderWidgets,
    saveWidgets,
    resetToDefaults,
    isWidgetEnabled,
    getWidget,
  };
}
