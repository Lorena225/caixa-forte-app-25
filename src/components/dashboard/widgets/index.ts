// Dashboard Widgets Library
// Sistema de widgets modulares para o Dashboard

export { WidgetVendas } from './WidgetVendas';
export { WidgetFluxo } from './WidgetFluxo';
export { WidgetPendencias } from './WidgetPendencias';
export { WidgetIAInsight } from './WidgetIAInsight';
export { WidgetFeedIA } from './WidgetFeedIA';

// Types
export interface DashboardWidgetConfig {
  id: string;
  key: string;
  title: string;
  description: string;
  category: 'kpi' | 'chart' | 'list' | 'ai';
  enabled: boolean;
  order: number;
  size: 'sm' | 'md' | 'lg' | 'xl';
  icon: string;
}

export const AVAILABLE_WIDGETS: DashboardWidgetConfig[] = [
  {
    id: 'widget-vendas',
    key: 'vendas',
    title: 'Widget Vendas',
    description: 'KPI de vendas total e ticket médio',
    category: 'kpi',
    enabled: true,
    order: 0,
    size: 'sm',
    icon: 'ShoppingCart',
  },
  {
    id: 'widget-fluxo',
    key: 'fluxo',
    title: 'Widget Fluxo',
    description: 'Gráfico de área (Receitas vs Despesas)',
    category: 'chart',
    enabled: true,
    order: 1,
    size: 'md',
    icon: 'Activity',
  },
  {
    id: 'widget-pendencias',
    key: 'pendencias',
    title: 'Widget Pendências',
    description: 'Lista de Contas a Pagar/Receber vencendo hoje',
    category: 'list',
    enabled: true,
    order: 2,
    size: 'md',
    icon: 'Clock',
  },
  {
    id: 'widget-ia-insight',
    key: 'ia-insight',
    title: 'Widget IA Insight',
    description: 'Recomendações dinâmicas da IA',
    category: 'ai',
    enabled: true,
    order: 3,
    size: 'lg',
    icon: 'Brain',
  },
  {
    id: 'widget-feed-ia',
    key: 'feed-ia',
    title: 'Widget Feed de IA',
    description: 'Notificações em tempo real sobre anomalias',
    category: 'ai',
    enabled: true,
    order: 4,
    size: 'md',
    icon: 'Radio',
  },
];
