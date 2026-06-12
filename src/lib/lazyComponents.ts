/**
 * Lazy Loading Components Registry
 * Centralized lazy imports for code splitting
 */

import React from 'react';

// Dashboard Charts (heavy components)
export const CashFlowChart = React.lazy(() => 
  import('@/components/dashboard/CashFlowChart').then(m => ({ default: m.CashFlowChart }))
);

export const AgingChart = React.lazy(() => 
  import('@/components/dashboard/AgingChart').then(m => ({ default: m.AgingChart }))
);

export const CashFlowProjection = React.lazy(() => 
  import('@/components/dashboard/CashFlowProjection').then(m => ({ default: m.CashFlowProjection }))
);

// Pages (route-level code splitting)
export const Dashboard = React.lazy(() => import('@/pages/DashboardModern'));
export const ContasPagar = React.lazy(() => import('@/pages/ContasPagar'));
export const ContasReceber = React.lazy(() => import('@/pages/ContasReceber'));
export const FluxoCaixa = React.lazy(() => import('@/pages/FluxoCaixa'));
export const Lancamentos = React.lazy(() => import('@/pages/Lancamentos'));

// Admin Pages
export const Permissions = React.lazy(() => import('@/pages/admin/Permissions'));
export const AuditLogs = React.lazy(() => import('@/pages/admin/AuditLogs'));
export const SecurityDashboard = React.lazy(() => import('@/pages/admin/SecurityDashboard'));

// Heavy Feature Pages
export const AutomationBuilder = React.lazy(() => 
  import('@/components/automations/AutomationBuilder').then(m => ({ default: m.AutomationBuilder }))
);

// Report Pages (PDF/Excel generation)
export const DRE = React.lazy(() => import('@/pages/DRE'));
export const Balancete = React.lazy(() => import('@/pages/relatorios/Balancete'));

// Fiscal Module
export const NFe = React.lazy(() => import('@/pages/fiscal/NFe'));
export const NFSe = React.lazy(() => import('@/pages/fiscal/NFSe'));
export const SPED = React.lazy(() => import('@/pages/fiscal/SPED'));

// Treasury Module
export const Conciliacao = React.lazy(() => import('@/pages/tesouraria/Conciliacao'));
export const Contratos = React.lazy(() => import('@/pages/tesouraria/Contratos'));

// Budget Advanced Module
export const OrcamentoCenarios = React.lazy(() => import('@/pages/financeiro/orcamento/Cenarios'));
export const OrcamentoAprovacoes = React.lazy(() => import('@/pages/financeiro/orcamento/Aprovacoes'));
export const OrcamentoVariancia = React.lazy(() => import('@/pages/financeiro/orcamento/Variancia'));
export const OrcamentoVersoes = React.lazy(() => import('@/pages/financeiro/orcamento/Versoes'));
export const OrcamentoWhatIf = React.lazy(() => import('@/pages/financeiro/orcamento/WhatIf'));

/**
 * Preload utility for anticipated navigation
 */
export const preloadComponent = (componentLoader: () => Promise<unknown>): void => {
  // Start loading the component in the background
  componentLoader().catch(() => {
    // Silently fail - component will be loaded normally when needed
  });
};

/**
 * Preload common routes on idle
 */
export function preloadCommonRoutes(): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Preload most commonly accessed pages
      preloadComponent(() => import('@/pages/DashboardModern'));
      preloadComponent(() => import('@/pages/ContasPagar'));
      preloadComponent(() => import('@/pages/ContasReceber'));
    });
  }
}

/**
 * Component loading state wrapper
 */
export interface LazyLoadConfig {
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  minLoadTime?: number;
}

/**
 * Create enhanced lazy component with error boundary
 */
export function createLazyComponent<T extends React.ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  config?: LazyLoadConfig
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const start = Date.now();
    const module = await importFn();
    
    // Ensure minimum load time to prevent flash
    if (config?.minLoadTime) {
      const elapsed = Date.now() - start;
      if (elapsed < config.minLoadTime) {
        await new Promise(r => setTimeout(r, config.minLoadTime - elapsed));
      }
    }
    
    return module;
  });
}
