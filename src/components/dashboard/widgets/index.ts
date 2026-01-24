// Dashboard Widgets Library
// Sistema de widgets modulares para o Dashboard

export { WidgetVendas } from './WidgetVendas';
export { WidgetFluxo } from './WidgetFluxo';
export { WidgetPendencias } from './WidgetPendencias';
export { WidgetIAInsight } from './WidgetIAInsight';
export { WidgetFeedIA } from './WidgetFeedIA';
export { WidgetMenu } from './WidgetMenu';
export { WidgetSimulacao } from './WidgetSimulacao';
export { WidgetEstoqueCritico } from './WidgetEstoqueCritico';
export { WidgetAgingCobranca } from './WidgetAgingCobranca';
export { WidgetRankingVendas } from './WidgetRankingVendas';
export { WidgetComplianceFiscal } from './WidgetComplianceFiscal';

// Types
export interface DashboardWidgetConfig {
  id: string;
  key: string;
  title: string;
  description: string;
  category: 'kpi' | 'chart' | 'list' | 'ai' | 'simulacao' | 'fiscal';
  enabled: boolean;
  order: number;
  size: 'sm' | 'md' | 'lg' | 'xl';
  icon: string;
  detailsRoute?: string;
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
    detailsRoute: '/vendas',
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
    detailsRoute: '/tesouraria/fluxo',
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
    detailsRoute: '/ar',
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
    detailsRoute: '/autopiloto/decisoes',
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
    detailsRoute: '/autopiloto/decisoes',
  },
  {
    id: 'widget-simulacao',
    key: 'simulacao',
    title: 'Widget Simulação (What-If)',
    description: 'Mini simulador de impacto de vendas no fluxo',
    category: 'simulacao',
    enabled: true,
    order: 5,
    size: 'md',
    icon: 'Calculator',
    detailsRoute: '/orcamento/projecoes',
  },
  {
    id: 'widget-estoque-critico',
    key: 'estoque-critico',
    title: 'Widget Estoque Crítico',
    description: 'Lista de produtos com estoque baixo',
    category: 'list',
    enabled: true,
    order: 6,
    size: 'md',
    icon: 'Package',
    detailsRoute: '/suprimentos/estoque',
  },
  {
    id: 'widget-aging-cobranca',
    key: 'aging-cobranca',
    title: 'Widget Aging de Cobrança',
    description: 'Gráfico de faturas vencidas por período',
    category: 'chart',
    enabled: true,
    order: 7,
    size: 'md',
    icon: 'Clock',
    detailsRoute: '/ar/aging',
  },
  {
    id: 'widget-ranking-vendas',
    key: 'ranking-vendas',
    title: 'Widget Ranking de Vendas',
    description: 'Top 5 produtos mais rentáveis do mês',
    category: 'list',
    enabled: true,
    order: 8,
    size: 'md',
    icon: 'Trophy',
    detailsRoute: '/vendas',
  },
  {
    id: 'widget-compliance-fiscal',
    key: 'compliance-fiscal',
    title: 'Widget Compliance Fiscal',
    description: 'Checklist de obrigações fiscais',
    category: 'fiscal',
    enabled: true,
    order: 9,
    size: 'md',
    icon: 'FileCheck',
    detailsRoute: '/controladoria/compliance',
  },
];
