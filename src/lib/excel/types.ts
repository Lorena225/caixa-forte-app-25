// Types for Excel Import/Export module

export type ImportEntityType = 
  | 'account_categories'
  | 'accounts'
  | 'counterparties'
  | 'wallets'
  | 'cost_centers'
  | 'transactions_ar'
  | 'transactions_ap'
  | 'transactions'
  | 'budgets';

export type ImportRowStatus = 
  | 'pending'
  | 'valid'
  | 'error'
  | 'imported'
  | 'updated'
  | 'duplicate'
  | 'skipped';

export interface TemplateColumn {
  name: string;
  label: string;
  type: 'text' | 'date' | 'currency' | 'decimal' | 'integer' | 'boolean' | 'enum';
  required: boolean;
  description?: string;
  options?: string[];
  default?: unknown;
}

export interface ImportTemplate {
  id: string;
  entity: ImportEntityType;
  version: number;
  name: string;
  description: string;
  columns_json: TemplateColumn[];
  sample_data_json: Record<string, unknown>[];
  instructions_json: string[];
  is_active: boolean;
}

export interface ImportRow {
  id?: string;
  batch_id: string;
  company_id: string;
  row_number: number;
  raw_json: Record<string, unknown>;
  normalized_json?: Record<string, unknown>;
  status: ImportRowStatus;
  errors_json: string[];
  record_id?: string;
}

export interface ImportBatch {
  id: string;
  company_id: string;
  integration_id: string;
  entity?: ImportEntityType;
  source_type: 'manual_upload' | 'scheduled_sync' | 'webhook';
  source_filename?: string;
  status: 'processing' | 'success' | 'partial' | 'error';
  started_at?: string;
  finished_at?: string;
  total_rows?: number;
  processed_rows?: number;
  summary_json?: {
    imported: number;
    updated: number;
    duplicates: number;
    errors: number;
    skipped: number;
  };
  error_details?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface NormalizedRow {
  data: Record<string, unknown>;
  errors: ValidationError[];
  isValid: boolean;
}

export const ENTITY_LABELS: Record<ImportEntityType, string> = {
  account_categories: 'Categorias de Conta',
  accounts: 'Plano de Contas',
  counterparties: 'Clientes/Fornecedores',
  wallets: 'Carteiras',
  cost_centers: 'Centros de Custo',
  transactions_ar: 'Contas a Receber',
  transactions_ap: 'Contas a Pagar',
  transactions: 'Lançamentos',
  budgets: 'Metas/Orçamento',
};

export const ENTITY_ICONS: Record<ImportEntityType, string> = {
  account_categories: 'Layers',
  accounts: 'FolderTree',
  counterparties: 'Users',
  wallets: 'Wallet',
  cost_centers: 'Building2',
  transactions_ar: 'ArrowDownCircle',
  transactions_ap: 'ArrowUpCircle',
  transactions: 'BookOpen',
  budgets: 'Target',
};
