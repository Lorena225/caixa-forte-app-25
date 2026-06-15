// Dashboard Widgets Library
// Sistema de widgets modulares para o Dashboard

export { WidgetFluxo } from './WidgetFluxo';
export { WidgetPendencias } from './WidgetPendencias';
export { WidgetIAInsight } from './WidgetIAInsight';
export { WidgetFeedIA } from './WidgetFeedIA';
export { WidgetMenu } from './WidgetMenu';
export { WidgetSimulacao } from './WidgetSimulacao';
export { WidgetAgingCobranca } from './WidgetAgingCobranca';
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
    id: 'widget-fluxo', key: 'fluxo', title: 'Fluxo de Caixa',
    description: 'Receitas vs Despesas projetadas', category: 'chart',
    enabled: true, order: 0, size: 'md', icon: 'Activity',
    detailsRoute: '/financeiro/fluxo-projetado',
  },
  {
    id: 'widget-pendencias', key: 'pendencias', title: 'Pendências',
    description: 'Contas a pagar/receber vencendo', category: 'list',
    enabled: true, order: 1, size: 'md', icon: 'Clock', detailsRoute: '/ar',
  },
  {
    id: 'widget-simulacao', key: 'simulacao', title: 'Simulação What-If',
    description: 'Impacto no fluxo de caixa', category: 'simulacao',
    enabled: true, order: 2, size: 'md', icon: 'Calculator',
    detailsRoute: '/orcamento/projecoes',
  },
  {
    id: 'widget-aging-cobranca', key: 'aging-cobranca', title: 'Aging de Cobrança',
    description: 'Recebíveis vencidos por faixa', category: 'chart',
    enabled: true, order: 3, size: 'md', icon: 'Clock',
    detailsRoute: '/financeiro/renegociacao',
  },
  {
    id: 'widget-compliance-fiscal', key: 'compliance-fiscal', title: 'Compliance Fiscal',
    description: 'Obrigações fiscais a vencer', category: 'fiscal',
    enabled: true, order: 4, size: 'md', icon: 'FileCheck',
    detailsRoute: '/fiscal/apuracao',
  },
];
