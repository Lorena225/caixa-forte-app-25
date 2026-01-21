// =====================================================
// REPORTS SYSTEM - Type Definitions
// =====================================================

export type ReportType = 'dre' | 'fluxo_caixa' | 'orcamento_realizado' | 'balancete' | 'aging' | 'custom';
export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

export interface ReportPeriod {
  inicio: string; // YYYY-MM-DD
  fim: string;    // YYYY-MM-DD
}

export interface ReportColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'percentage';
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';
  value: unknown;
}

export interface ReportGrouping {
  field: string;
  label: string;
  showSubtotals?: boolean;
}

export interface ReportConfig {
  columns: ReportColumn[];
  filters: ReportFilter[];
  grouping?: ReportGrouping[];
  sortBy?: { field: string; direction: 'asc' | 'desc' }[];
  pagination?: { page: number; limit: number };
  includeSubtotals?: boolean;
  includeTotals?: boolean;
}

export interface ReportTemplate {
  id: string;
  company_id: string;
  name: string;
  type: ReportType;
  description?: string;
  config: ReportConfig;
  columns_config: ReportColumn[];
  filters_config: Record<string, unknown>;
  grouping_config: Record<string, unknown>;
  created_by?: string;
  is_public: boolean;
  is_favorite: boolean;
  schedule_cron?: string;
  last_generated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportRow {
  id: string;
  level?: number;
  isGroup?: boolean;
  isSubtotal?: boolean;
  isTotal?: boolean;
  parentId?: string;
  children?: ReportRow[];
  [key: string]: unknown;
}

export interface ReportSummary {
  totalReceitas?: number;
  totalDespesas?: number;
  resultado?: number;
  saldoInicial?: number;
  saldoFinal?: number;
  variacao?: number;
  variacaoPercentual?: number;
  [key: string]: unknown;
}

export interface ReportMetadata {
  companyName: string;
  reportName: string;
  reportType: ReportType;
  periodo: ReportPeriod;
  generatedAt: string;
  generatedBy?: string;
  locale: 'pt-BR' | 'en-US' | 'es-ES';
  currency: string;
  timezone: string;
}

export interface ReportData {
  metadata: ReportMetadata;
  columns: ReportColumn[];
  rows: ReportRow[];
  summary: ReportSummary;
  totals?: Record<string, number>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ReportGenerated {
  id: string;
  company_id: string;
  template_id?: string;
  report_type: ReportType;
  report_name: string;
  periodo_inicio: string;
  periodo_fim: string;
  data: ReportData;
  summary: ReportSummary;
  row_count: number;
  file_size_bytes: number;
  generation_time_ms?: number;
  generated_at: string;
  generated_by?: string;
  expires_at: string;
  metadata: Record<string, unknown>;
}

export interface ReportExport {
  id: string;
  company_id: string;
  report_id: string;
  format: ExportFormat;
  file_path?: string;
  file_size_bytes?: number;
  download_count: number;
  created_at: string;
  expires_at: string;
}

// DRE specific types
export interface DRELine {
  codigo: string;
  descricao: string;
  natureza: 'receita' | 'despesa' | 'resultado';
  valor: number;
  percentual?: number;
  nivel: number;
  isSubtotal?: boolean;
}

// Cash Flow specific types
export interface FluxoCaixaLine {
  data: string;
  descricao: string;
  tipo: 'entrada' | 'saida';
  categoria: string;
  valor: number;
  saldoAcumulado: number;
  contraparte?: string;
}

// Budget vs Actual specific types
export interface OrcamentoRealizadoLine {
  conta: string;
  descricao: string;
  orcado: number;
  realizado: number;
  variacao: number;
  variacaoPercentual: number;
  status: 'dentro' | 'atencao' | 'excedido';
}

// Aging specific types
export interface AgingLine {
  contraparte: string;
  documento?: string;
  vencimento: string;
  valor: number;
  diasAtraso: number;
  faixa: 'a_vencer' | '1_30' | '31_60' | '61_90' | '90_mais';
}

// Default templates
export const DEFAULT_REPORT_TEMPLATES: Partial<ReportTemplate>[] = [
  {
    name: 'DRE Mensal',
    type: 'dre',
    description: 'Demonstração de Resultado do Exercício mensal',
    is_public: true,
  },
  {
    name: 'Fluxo de Caixa Diário',
    type: 'fluxo_caixa',
    description: 'Movimentação de caixa dia a dia',
    is_public: true,
  },
  {
    name: 'Orçado x Realizado',
    type: 'orcamento_realizado',
    description: 'Comparativo entre orçamento planejado e valores realizados',
    is_public: true,
  },
  {
    name: 'Aging de Recebíveis',
    type: 'aging',
    description: 'Análise de vencimentos de contas a receber',
    is_public: true,
  },
];

// Translations
export const REPORT_TRANSLATIONS = {
  'pt-BR': {
    dre: 'Demonstração de Resultado',
    fluxo_caixa: 'Fluxo de Caixa',
    orcamento_realizado: 'Orçado x Realizado',
    balancete: 'Balancete',
    aging: 'Aging',
    custom: 'Personalizado',
    receita: 'Receita',
    despesa: 'Despesa',
    resultado: 'Resultado',
    total: 'Total',
    subtotal: 'Subtotal',
  },
  'en-US': {
    dre: 'Income Statement',
    fluxo_caixa: 'Cash Flow',
    orcamento_realizado: 'Budget vs Actual',
    balancete: 'Trial Balance',
    aging: 'Aging',
    custom: 'Custom',
    receita: 'Revenue',
    despesa: 'Expense',
    resultado: 'Result',
    total: 'Total',
    subtotal: 'Subtotal',
  },
  'es-ES': {
    dre: 'Estado de Resultados',
    fluxo_caixa: 'Flujo de Caja',
    orcamento_realizado: 'Presupuesto vs Real',
    balancete: 'Balance de Comprobación',
    aging: 'Antigüedad',
    custom: 'Personalizado',
    receita: 'Ingreso',
    despesa: 'Gasto',
    resultado: 'Resultado',
    total: 'Total',
    subtotal: 'Subtotal',
  },
};
