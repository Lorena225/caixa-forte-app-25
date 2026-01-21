// =====================================================
// TYPES - ADVANCED REPORTS MODULE (50+ Reports)
// =====================================================

export type ReportCategory = 
  | 'financeiro'
  | 'caixa'
  | 'ar'
  | 'ap'
  | 'tributario'
  | 'gerencial'
  | 'contabil'
  | 'operacional';

export type ReportFrequency = 
  | 'once'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'powerbi' | 'gsheets';

export type ParameterType = 
  | 'date_range'
  | 'date'
  | 'company'
  | 'account'
  | 'cost_center'
  | 'counterparty'
  | 'select'
  | 'multi_select'
  | 'number'
  | 'text'
  | 'boolean';

export type ChartType = 
  | 'bar'
  | 'line'
  | 'pie'
  | 'donut'
  | 'area'
  | 'waterfall'
  | 'scatter'
  | 'heatmap'
  | 'treemap'
  | 'gauge';

export type SectionType = 'table' | 'chart' | 'kpi' | 'summary' | 'text';

// =====================================================
// PARAMETER DEFINITIONS
// =====================================================

export interface ReportParameter {
  name: string;
  label: string;
  type: ParameterType;
  required?: boolean;
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  placeholder?: string;
}

// =====================================================
// REPORT DEFINITION
// =====================================================

export interface ReportDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: ReportCategory;
  subcategory?: string;
  icon?: string;
  parameters: ReportParameter[];
  defaultPeriod?: 'current_month' | 'last_month' | 'current_year' | 'last_year' | 'custom';
  supportedFormats: ExportFormat[];
  sections: ReportSection[];
  isSystem: boolean;
  isActive: boolean;
}

export interface ReportSection {
  id: string;
  title: string;
  type: SectionType;
  dataKey?: string;
  columns?: ReportColumnDef[];
  chartConfig?: ChartConfig;
  kpiConfig?: KPIConfig[];
  groupBy?: string[];
  sortBy?: { field: string; direction: 'asc' | 'desc' }[];
}

export interface ReportColumnDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'status';
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  conditional?: ConditionalFormat[];
}

export interface ConditionalFormat {
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
  value: number | [number, number];
  className?: string;
  color?: string;
  icon?: string;
}

export interface ChartConfig {
  type: ChartType;
  xAxis?: string;
  yAxis?: string[];
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
}

export interface KPIConfig {
  key: string;
  label: string;
  format: 'currency' | 'number' | 'percentage';
  icon?: string;
  trend?: boolean;
  comparisonPeriod?: string;
}

// =====================================================
// SCHEDULE & EXECUTION
// =====================================================

export interface ReportSchedule {
  id: string;
  reportDefinitionId: string;
  reportCode: string;
  name: string;
  description?: string;
  frequency: ReportFrequency;
  scheduleConfig: {
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
    timezone?: string;
  };
  parameters: Record<string, unknown>;
  exportFormat: ExportFormat;
  recipients: Array<{ email: string; name?: string }>;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

export interface ReportExecution {
  id: string;
  reportCode: string;
  reportName: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  rowCount?: number;
  fileUrl?: string;
  fileSize?: number;
  exportFormat?: string;
  errorMessage?: string;
  executedBy?: string;
  createdAt: string;
}

// =====================================================
// REPORT DATA STRUCTURES
// =====================================================

export interface ReportData {
  metadata: ReportMetadata;
  sections: GeneratedSection[];
  summary?: Record<string, number | string>;
  generatedAt: string;
}

export interface ReportMetadata {
  reportCode: string;
  reportName: string;
  category: ReportCategory;
  period: { start: string; end: string };
  companyName?: string;
  generatedBy?: string;
  parameters: Record<string, unknown>;
}

export interface GeneratedSection {
  id: string;
  title: string;
  type: SectionType;
  data: unknown;
  columns?: ReportColumnDef[];
  chartConfig?: ChartConfig;
}

// =====================================================
// REPORT CATALOG - 50+ REPORTS
// =====================================================

export const REPORT_CATALOG: Omit<ReportDefinition, 'id'>[] = [
  // ===== FINANCEIROS (12) =====
  {
    code: 'dre',
    name: 'DRE - Demonstração de Resultado',
    description: 'Demonstração de resultado do exercício com receitas, despesas e lucro líquido',
    category: 'financeiro',
    subcategory: 'demonstracoes',
    icon: 'FileSpreadsheet',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
      { name: 'comparison', label: 'Comparar com', type: 'select', required: false, options: [
        { value: 'none', label: 'Sem comparação' },
        { value: 'previous_period', label: 'Período anterior' },
        { value: 'previous_year', label: 'Ano anterior' },
      ]},
    ],
    defaultPeriod: 'current_month',
    supportedFormats: ['pdf', 'excel', 'csv'],
    sections: [
      { id: 'receitas', title: 'Receitas', type: 'table', dataKey: 'receitas' },
      { id: 'despesas', title: 'Despesas', type: 'table', dataKey: 'despesas' },
      { id: 'resultado', title: 'Resultado', type: 'kpi', dataKey: 'resultado' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'balanco_patrimonial',
    name: 'Balanço Patrimonial',
    description: 'Balanço patrimonial com ativos, passivos e patrimônio líquido',
    category: 'financeiro',
    subcategory: 'demonstracoes',
    icon: 'Scale',
    parameters: [
      { name: 'date', label: 'Data Base', type: 'date', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'ativos', title: 'Ativos', type: 'table', dataKey: 'ativos' },
      { id: 'passivos', title: 'Passivos', type: 'table', dataKey: 'passivos' },
      { id: 'pl', title: 'Patrimônio Líquido', type: 'table', dataKey: 'patrimonio_liquido' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'fluxo_caixa_executivo',
    name: 'Fluxo de Caixa Executivo',
    description: 'Resumo executivo do fluxo de caixa com gráficos e indicadores',
    category: 'financeiro',
    subcategory: 'caixa',
    icon: 'TrendingUp',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'kpis', title: 'Indicadores', type: 'kpi' },
      { id: 'chart', title: 'Evolução', type: 'chart', chartConfig: { type: 'area', stacked: true } },
      { id: 'table', title: 'Detalhamento', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'analise_horizontal_vertical',
    name: 'Análise Horizontal e Vertical',
    description: 'Análise de evolução e composição das contas',
    category: 'financeiro',
    subcategory: 'analises',
    icon: 'BarChart3',
    parameters: [
      { name: 'periods', label: 'Períodos', type: 'multi_select', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'horizontal', title: 'Análise Horizontal', type: 'table' },
      { id: 'vertical', title: 'Análise Vertical', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'indices_financeiros',
    name: 'Índices Financeiros',
    description: 'Índices de liquidez, rentabilidade e endividamento',
    category: 'financeiro',
    subcategory: 'analises',
    icon: 'Gauge',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'liquidez', title: 'Liquidez', type: 'kpi' },
      { id: 'rentabilidade', title: 'Rentabilidade', type: 'kpi' },
      { id: 'endividamento', title: 'Endividamento', type: 'kpi' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'eva',
    name: 'EVA - Economic Value Added',
    description: 'Valor econômico agregado e criação de valor',
    category: 'financeiro',
    subcategory: 'analises',
    icon: 'DollarSign',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
      { name: 'wacc', label: 'WACC (%)', type: 'number', required: true, defaultValue: 12 },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'calculo', title: 'Cálculo do EVA', type: 'table' },
      { id: 'evolucao', title: 'Evolução', type: 'chart', chartConfig: { type: 'line' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'roi_roic',
    name: 'ROI/ROIC por Unidade',
    description: 'Retorno sobre investimento por unidade de negócio',
    category: 'financeiro',
    subcategory: 'analises',
    icon: 'Target',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
      { name: 'dimension', label: 'Dimensão', type: 'select', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'ranking', title: 'Ranking', type: 'table' },
      { id: 'chart', title: 'Comparativo', type: 'chart', chartConfig: { type: 'bar' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'projecao_financeira',
    name: 'Projeção Financeira (12 meses)',
    description: 'Projeção de receitas, despesas e caixa para os próximos 12 meses',
    category: 'financeiro',
    subcategory: 'projecoes',
    icon: 'LineChart',
    parameters: [
      { name: 'base_date', label: 'Data Base', type: 'date', required: true },
      { name: 'growth_rate', label: 'Taxa de Crescimento (%)', type: 'number', defaultValue: 5 },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'projecao', title: 'Projeção Mensal', type: 'table' },
      { id: 'chart', title: 'Gráfico de Projeção', type: 'chart', chartConfig: { type: 'area' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'analise_sensibilidade',
    name: 'Análise de Sensibilidade',
    description: 'Impacto de variáveis no resultado financeiro',
    category: 'financeiro',
    subcategory: 'analises',
    icon: 'Sliders',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
      { name: 'variables', label: 'Variáveis', type: 'multi_select', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'matrix', title: 'Matriz de Sensibilidade', type: 'table' },
      { id: 'tornado', title: 'Diagrama Tornado', type: 'chart', chartConfig: { type: 'bar' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'simulacao_cenarios',
    name: 'Simulação de Cenários',
    description: 'Comparação entre cenários otimista, realista e pessimista',
    category: 'financeiro',
    subcategory: 'projecoes',
    icon: 'GitBranch',
    parameters: [
      { name: 'base_period', label: 'Período Base', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'comparativo', title: 'Comparativo de Cenários', type: 'table' },
      { id: 'chart', title: 'Visualização', type: 'chart', chartConfig: { type: 'bar' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'dmpl',
    name: 'DMPL - Movimento do PL',
    description: 'Demonstração das mutações do patrimônio líquido',
    category: 'financeiro',
    subcategory: 'demonstracoes',
    icon: 'RefreshCw',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'mutacoes', title: 'Mutações do PL', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'lucro_linha_negocio',
    name: 'Lucro por Linha de Negócio',
    description: 'Análise de lucratividade por linha de negócio',
    category: 'financeiro',
    subcategory: 'analises',
    icon: 'PieChart',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'ranking', title: 'Ranking de Lucratividade', type: 'table' },
      { id: 'pie', title: 'Participação', type: 'chart', chartConfig: { type: 'pie' } },
    ],
    isSystem: true,
    isActive: true,
  },

  // ===== CAIXA (10) =====
  {
    code: 'fluxo_caixa_diario',
    name: 'Fluxo de Caixa Diário',
    description: 'Movimentação de caixa dia a dia',
    category: 'caixa',
    icon: 'Calendar',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel', 'csv'],
    sections: [
      { id: 'movimentacao', title: 'Movimentação Diária', type: 'table' },
      { id: 'chart', title: 'Gráfico', type: 'chart', chartConfig: { type: 'bar' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'posicao_caixa_banco',
    name: 'Posição de Caixa por Banco',
    description: 'Saldo disponível por conta bancária',
    category: 'caixa',
    icon: 'Building',
    parameters: [
      { name: 'date', label: 'Data', type: 'date', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'saldos', title: 'Saldos por Banco', type: 'table' },
      { id: 'pie', title: 'Distribuição', type: 'chart', chartConfig: { type: 'pie' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'conciliacao_bancaria',
    name: 'Conciliação Bancária',
    description: 'Comparativo saldo contábil vs saldo bancário',
    category: 'caixa',
    icon: 'CheckSquare',
    parameters: [
      { name: 'bank_account', label: 'Conta Bancária', type: 'select', required: true },
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'resumo', title: 'Resumo', type: 'kpi' },
      { id: 'pendencias', title: 'Pendências', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'movimentacao_caixa',
    name: 'Movimentação de Caixa',
    description: 'Entradas e saídas detalhadas',
    category: 'caixa',
    icon: 'ArrowUpDown',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
      { name: 'type', label: 'Tipo', type: 'select', options: [
        { value: 'all', label: 'Todos' },
        { value: 'entrada', label: 'Entradas' },
        { value: 'saida', label: 'Saídas' },
      ]},
    ],
    supportedFormats: ['pdf', 'excel', 'csv'],
    sections: [
      { id: 'movimentos', title: 'Movimentos', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'sazonalidade_caixa',
    name: 'Análise de Sazonalidade',
    description: 'Padrões sazonais do fluxo de caixa',
    category: 'caixa',
    icon: 'Waves',
    parameters: [
      { name: 'years', label: 'Anos', type: 'multi_select', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'mensal', title: 'Sazonalidade Mensal', type: 'chart', chartConfig: { type: 'line' } },
      { id: 'semanal', title: 'Sazonalidade Semanal', type: 'chart', chartConfig: { type: 'bar' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'projecao_caixa',
    name: 'Projeção de Caixa',
    description: 'Projeção de caixa para 30/60/90/180 dias',
    category: 'caixa',
    icon: 'TrendingUp',
    parameters: [
      { name: 'horizon', label: 'Horizonte', type: 'select', required: true, options: [
        { value: '30', label: '30 dias' },
        { value: '60', label: '60 dias' },
        { value: '90', label: '90 dias' },
        { value: '180', label: '180 dias' },
      ]},
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'projecao', title: 'Projeção', type: 'table' },
      { id: 'chart', title: 'Gráfico', type: 'chart', chartConfig: { type: 'area' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'cobertura_caixa',
    name: 'Cobertura de Caixa',
    description: 'Dias de funcionamento com caixa atual',
    category: 'caixa',
    icon: 'Shield',
    parameters: [
      { name: 'date', label: 'Data', type: 'date', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'indicadores', title: 'Indicadores', type: 'kpi' },
      { id: 'evolucao', title: 'Evolução', type: 'chart', chartConfig: { type: 'line' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'excedente_deficit',
    name: 'Excedente/Déficit de Caixa',
    description: 'Análise de sobra ou falta de caixa',
    category: 'caixa',
    icon: 'AlertTriangle',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'analise', title: 'Análise', type: 'table' },
      { id: 'waterfall', title: 'Waterfall', type: 'chart', chartConfig: { type: 'waterfall' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'caixa_centro_custo',
    name: 'Caixa por Centro de Custo',
    description: 'Fluxo de caixa segmentado por centro de custo',
    category: 'caixa',
    icon: 'FolderTree',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'por_cc', title: 'Por Centro de Custo', type: 'table' },
      { id: 'treemap', title: 'Treemap', type: 'chart', chartConfig: { type: 'treemap' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'caixa_projeto',
    name: 'Caixa por Projeto/Contrato',
    description: 'Fluxo de caixa por projeto ou contrato',
    category: 'caixa',
    icon: 'Briefcase',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
      { name: 'project', label: 'Projeto', type: 'select', required: false },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'projetos', title: 'Por Projeto', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },

  // ===== CONTAS A RECEBER (10) =====
  {
    code: 'ar_a_vencer',
    name: 'Contas a Receber por Vencer',
    description: 'Títulos a receber por data de vencimento',
    category: 'ar',
    icon: 'CalendarClock',
    parameters: [
      { name: 'horizon', label: 'Horizonte', type: 'select', required: true, options: [
        { value: '7', label: '7 dias' },
        { value: '15', label: '15 dias' },
        { value: '30', label: '30 dias' },
        { value: '60', label: '60 dias' },
      ]},
    ],
    supportedFormats: ['pdf', 'excel', 'csv'],
    sections: [
      { id: 'titulos', title: 'Títulos a Vencer', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ar_aging',
    name: 'Aging de Contas a Receber',
    description: 'Aging por faixas de vencimento (0-30, 31-60, 61-90, 90+)',
    category: 'ar',
    icon: 'Clock',
    parameters: [
      { name: 'date', label: 'Data Base', type: 'date', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'aging', title: 'Aging', type: 'table' },
      { id: 'chart', title: 'Por Faixa', type: 'chart', chartConfig: { type: 'bar' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ar_vencidas',
    name: 'Contas Vencidas',
    description: 'Títulos vencidos e dias em atraso',
    category: 'ar',
    icon: 'AlertCircle',
    parameters: [
      { name: 'date', label: 'Data Base', type: 'date', required: true },
      { name: 'min_days', label: 'Mínimo de Dias', type: 'number', defaultValue: 1 },
    ],
    supportedFormats: ['pdf', 'excel', 'csv'],
    sections: [
      { id: 'vencidas', title: 'Títulos Vencidos', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ar_abc_clientes',
    name: 'Análise ABC de Clientes',
    description: 'Classificação ABC de clientes por valor',
    category: 'ar',
    icon: 'Users',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'ranking', title: 'Ranking ABC', type: 'table' },
      { id: 'pareto', title: 'Curva de Pareto', type: 'chart', chartConfig: { type: 'line' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ar_curva_recebimento',
    name: 'Curva de Recebimento Esperado',
    description: 'Projeção de recebimentos por data',
    category: 'ar',
    icon: 'TrendingUp',
    parameters: [
      { name: 'horizon', label: 'Horizonte (dias)', type: 'number', required: true, defaultValue: 90 },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'curva', title: 'Curva de Recebimento', type: 'chart', chartConfig: { type: 'area' } },
      { id: 'tabela', title: 'Detalhamento', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ar_inadimplencia',
    name: 'Taxa de Inadimplência',
    description: 'Indicadores de inadimplência',
    category: 'ar',
    icon: 'TrendingDown',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'indicadores', title: 'Indicadores', type: 'kpi' },
      { id: 'evolucao', title: 'Evolução', type: 'chart', chartConfig: { type: 'line' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ar_dso',
    name: 'Dias Médios de Recebimento (DSO)',
    description: 'Days Sales Outstanding por período',
    category: 'ar',
    icon: 'Timer',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'dso', title: 'DSO', type: 'kpi' },
      { id: 'evolucao', title: 'Evolução', type: 'chart', chartConfig: { type: 'line' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ar_duplicatas_aberto',
    name: 'Duplicatas em Aberto',
    description: 'Valor total de duplicatas em aberto',
    category: 'ar',
    icon: 'FileText',
    parameters: [
      { name: 'date', label: 'Data Base', type: 'date', required: true },
    ],
    supportedFormats: ['pdf', 'excel', 'csv'],
    sections: [
      { id: 'resumo', title: 'Resumo', type: 'kpi' },
      { id: 'detalhes', title: 'Detalhes', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ar_top_devedores',
    name: 'Top 10 Maiores Devedores',
    description: 'Maiores devedores por valor em aberto',
    category: 'ar',
    icon: 'Award',
    parameters: [
      { name: 'date', label: 'Data Base', type: 'date', required: true },
      { name: 'limit', label: 'Quantidade', type: 'number', defaultValue: 10 },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'ranking', title: 'Ranking', type: 'table' },
      { id: 'chart', title: 'Gráfico', type: 'chart', chartConfig: { type: 'bar' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ar_concentracao',
    name: 'Análise de Concentração (Pareto)',
    description: 'Concentração de recebíveis por cliente',
    category: 'ar',
    icon: 'PieChart',
    parameters: [
      { name: 'date', label: 'Data Base', type: 'date', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'pareto', title: 'Curva de Pareto', type: 'chart', chartConfig: { type: 'line' } },
      { id: 'tabela', title: 'Detalhamento', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },

  // ===== CONTAS A PAGAR (10) =====
  {
    code: 'ap_a_vencer',
    name: 'Contas a Pagar por Vencer',
    description: 'Títulos a pagar por data de vencimento',
    category: 'ap',
    icon: 'CalendarClock',
    parameters: [
      { name: 'horizon', label: 'Horizonte', type: 'select', required: true, options: [
        { value: '7', label: '7 dias' },
        { value: '15', label: '15 dias' },
        { value: '30', label: '30 dias' },
        { value: '60', label: '60 dias' },
      ]},
    ],
    supportedFormats: ['pdf', 'excel', 'csv'],
    sections: [
      { id: 'titulos', title: 'Títulos a Vencer', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ap_aging',
    name: 'Aging de Contas a Pagar',
    description: 'Aging por faixas de vencimento',
    category: 'ap',
    icon: 'Clock',
    parameters: [
      { name: 'date', label: 'Data Base', type: 'date', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'aging', title: 'Aging', type: 'table' },
      { id: 'chart', title: 'Por Faixa', type: 'chart', chartConfig: { type: 'bar' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ap_oportunidades_desconto',
    name: 'Oportunidades de Desconto',
    description: 'Títulos com desconto para pagamento antecipado',
    category: 'ap',
    icon: 'BadgePercent',
    parameters: [
      { name: 'min_discount', label: 'Desconto Mínimo (%)', type: 'number', defaultValue: 1 },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'oportunidades', title: 'Oportunidades', type: 'table' },
      { id: 'economia', title: 'Economia Potencial', type: 'kpi' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ap_abc_fornecedores',
    name: 'Análise ABC de Fornecedores',
    description: 'Classificação ABC de fornecedores por valor',
    category: 'ap',
    icon: 'Truck',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'ranking', title: 'Ranking ABC', type: 'table' },
      { id: 'pareto', title: 'Curva de Pareto', type: 'chart', chartConfig: { type: 'line' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ap_dpo',
    name: 'Dias Médios de Pagamento (DPO)',
    description: 'Days Payable Outstanding por período',
    category: 'ap',
    icon: 'Timer',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'dpo', title: 'DPO', type: 'kpi' },
      { id: 'evolucao', title: 'Evolução', type: 'chart', chartConfig: { type: 'line' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ap_fluxo_programado',
    name: 'Fluxo de Pagamentos Programado',
    description: 'Pagamentos programados por data',
    category: 'ap',
    icon: 'CalendarCheck',
    parameters: [
      { name: 'horizon', label: 'Horizonte (dias)', type: 'number', required: true, defaultValue: 30 },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'programado', title: 'Pagamentos Programados', type: 'table' },
      { id: 'chart', title: 'Por Data', type: 'chart', chartConfig: { type: 'bar' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ap_top_fornecedores',
    name: 'Top 10 Maiores Fornecedores',
    description: 'Maiores fornecedores por valor',
    category: 'ap',
    icon: 'Award',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
      { name: 'limit', label: 'Quantidade', type: 'number', defaultValue: 10 },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'ranking', title: 'Ranking', type: 'table' },
      { id: 'chart', title: 'Gráfico', type: 'chart', chartConfig: { type: 'bar' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ap_custos_fornecedor',
    name: 'Custos por Fornecedor/Categoria',
    description: 'Análise de custos por fornecedor e categoria',
    category: 'ap',
    icon: 'FolderOpen',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'por_fornecedor', title: 'Por Fornecedor', type: 'table' },
      { id: 'por_categoria', title: 'Por Categoria', type: 'chart', chartConfig: { type: 'pie' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ap_precos_produto',
    name: 'Análise de Preços por Produto',
    description: 'Comparativo de preços por produto/fornecedor',
    category: 'ap',
    icon: 'Package',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
      { name: 'product', label: 'Produto', type: 'select', required: false },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'comparativo', title: 'Comparativo de Preços', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'ap_economia_desconto',
    name: 'Economia de Desconto (Histórico)',
    description: 'Economia obtida com descontos por pagamento antecipado',
    category: 'ap',
    icon: 'Sparkles',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'economia', title: 'Economia Obtida', type: 'kpi' },
      { id: 'evolucao', title: 'Evolução', type: 'chart', chartConfig: { type: 'bar' } },
    ],
    isSystem: true,
    isActive: true,
  },

  // ===== TRIBUTÁRIOS (8) =====
  {
    code: 'tax_a_recolher',
    name: 'Impostos a Recolher',
    description: 'Impostos pendentes de recolhimento',
    category: 'tributario',
    icon: 'Receipt',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'impostos', title: 'Impostos a Recolher', type: 'table' },
      { id: 'total', title: 'Total', type: 'kpi' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'tax_recolhidos',
    name: 'Impostos Recolhidos',
    description: 'Histórico de impostos recolhidos',
    category: 'tributario',
    icon: 'CheckCircle',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel', 'csv'],
    sections: [
      { id: 'recolhidos', title: 'Impostos Recolhidos', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'tax_pis_cofins_icms',
    name: 'PIS/COFINS/ICMS/ISS Projetado',
    description: 'Projeção de impostos sobre faturamento',
    category: 'tributario',
    icon: 'Calculator',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'projecao', title: 'Projeção', type: 'table' },
      { id: 'chart', title: 'Por Tipo', type: 'chart', chartConfig: { type: 'bar' } },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'tax_simples_nacional',
    name: 'Simples Nacional',
    description: 'Faturamento e impostos do Simples Nacional',
    category: 'tributario',
    icon: 'Building2',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'faturamento', title: 'Faturamento', type: 'table' },
      { id: 'impostos', title: 'Impostos', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'tax_irpj_csll',
    name: 'IRPJ/CSLL Estimado',
    description: 'Estimativa de IRPJ e CSLL',
    category: 'tributario',
    icon: 'FileText',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'calculo', title: 'Cálculo', type: 'table' },
      { id: 'total', title: 'Total', type: 'kpi' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'tax_irrf',
    name: 'Imposto de Renda Retido na Fonte',
    description: 'IRRF sobre pagamentos',
    category: 'tributario',
    icon: 'Percent',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel', 'csv'],
    sections: [
      { id: 'retencoes', title: 'Retenções', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'tax_obrigacoes_acessorias',
    name: 'Obrigações Acessórias',
    description: 'Calendário de obrigações fiscais',
    category: 'tributario',
    icon: 'CalendarDays',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'calendario', title: 'Calendário', type: 'table' },
      { id: 'pendentes', title: 'Pendentes', type: 'table' },
    ],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'tax_carga_tributaria',
    name: 'Análise de Carga Tributária',
    description: 'Análise da carga tributária sobre faturamento',
    category: 'tributario',
    icon: 'BarChart3',
    parameters: [
      { name: 'period', label: 'Período', type: 'date_range', required: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    sections: [
      { id: 'carga', title: 'Carga Tributária', type: 'kpi' },
      { id: 'composicao', title: 'Composição', type: 'chart', chartConfig: { type: 'pie' } },
      { id: 'evolucao', title: 'Evolução', type: 'chart', chartConfig: { type: 'line' } },
    ],
    isSystem: true,
    isActive: true,
  },
];

// Categories metadata
export const REPORT_CATEGORIES: Record<ReportCategory, { name: string; icon: string; color: string }> = {
  financeiro: { name: 'Financeiros', icon: 'TrendingUp', color: 'blue' },
  caixa: { name: 'Caixa', icon: 'Wallet', color: 'green' },
  ar: { name: 'Contas a Receber', icon: 'ArrowDownCircle', color: 'emerald' },
  ap: { name: 'Contas a Pagar', icon: 'ArrowUpCircle', color: 'orange' },
  tributario: { name: 'Tributários', icon: 'Receipt', color: 'purple' },
  gerencial: { name: 'Gerenciais', icon: 'BarChart3', color: 'indigo' },
  contabil: { name: 'Contábeis', icon: 'BookOpen', color: 'slate' },
  operacional: { name: 'Operacionais', icon: 'Settings', color: 'gray' },
};
