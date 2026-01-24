import { toast } from 'sonner';

/**
 * Standard feedback for features in development
 * Provides consistent UX across the entire ERP
 */
export const showDevelopmentToast = (featureName?: string) => {
  const message = featureName 
    ? `${featureName}: funcionalidade em desenvolvimento`
    : 'Funcionalidade em desenvolvimento';
  
  toast.info(message, {
    description: 'Nossa IA está preparando este módulo! 🤖✨',
    duration: 4000,
    icon: '🚧',
  });
};

/**
 * Feedback for features coming soon
 */
export const showComingSoonToast = (featureName: string) => {
  toast.info(`${featureName} em breve!`, {
    description: 'Estamos trabalhando para trazer esta funcionalidade.',
    duration: 3000,
    icon: '⏳',
  });
};

/**
 * Feedback for export features
 */
export const showExportToast = (format: string) => {
  toast.info(`Exportar para ${format}`, {
    description: 'Nossa IA está preparando este módulo de exportação! 🤖✨',
    duration: 4000,
    icon: '📄',
  });
};

/**
 * Feedback for import features
 */
export const showImportToast = (format: string) => {
  toast.info(`Importar ${format}`, {
    description: 'Nossa IA está preparando este módulo de importação! 🤖✨',
    duration: 4000,
    icon: '📥',
  });
};

/**
 * Feedback for integration features
 */
export const showIntegrationToast = (integrationName: string) => {
  toast.info(`Integração com ${integrationName}`, {
    description: 'Nossa IA está preparando esta integração! 🤖✨',
    duration: 4000,
    icon: '🔗',
  });
};

/**
 * Feedback for report generation
 */
export const showReportToast = (reportName: string) => {
  toast.info(`Relatório: ${reportName}`, {
    description: 'Nossa IA está preparando este relatório! 🤖✨',
    duration: 4000,
    icon: '📊',
  });
};

/**
 * Feedback for print features
 */
export const showPrintToast = () => {
  toast.info('Imprimir documento', {
    description: 'Nossa IA está preparando o módulo de impressão! 🤖✨',
    duration: 4000,
    icon: '🖨️',
  });
};

/**
 * Feedback for configuration features
 */
export const showConfigToast = (configName: string) => {
  toast.info(`Configuração: ${configName}`, {
    description: 'Nossa IA está preparando esta configuração! 🤖✨',
    duration: 4000,
    icon: '⚙️',
  });
};

export default {
  showDevelopmentToast,
  showComingSoonToast,
  showExportToast,
  showImportToast,
  showIntegrationToast,
  showReportToast,
  showPrintToast,
  showConfigToast,
};
