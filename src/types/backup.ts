// ============================================================
// Backup & Recovery Types
// ============================================================

// ==================== BACKUP SCHEDULE ====================
export interface BackupSchedule {
  id: string;
  company_id: string;
  type: 'completo' | 'incremental' | 'configuracoes';
  frequencia: 'diario' | 'semanal' | 'mensal';
  hora_execucao: string;  // "02:00"
  dia_semana?: number;    // 0-6 para semanal (0 = domingo)
  dia_mes?: number;       // 1-31 para mensal
  retention_days: number; // Quantos dias manter
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface BackupScheduleCreate {
  type: BackupSchedule['type'];
  frequencia: BackupSchedule['frequencia'];
  hora_execucao: string;
  dia_semana?: number;
  dia_mes?: number;
  retention_days?: number;
}

// ==================== BACKUP ====================
export interface Backup {
  id: string;
  company_id: string;
  schedule_id?: string;
  type: 'completo' | 'incremental' | 'configuracoes' | 'manual';
  status: 'pendente' | 'em_andamento' | 'sucesso' | 'falha';
  size_bytes: number;
  backup_date: string;
  completed_at?: string;
  recovery_instructions?: string;
  stored_in: 's3' | 'gcs' | 'azure' | 'supabase' | 'local';
  storage_path?: string;
  checksum: string;
  is_verified: boolean;
  tables_included?: string[];
  records_count?: number;
  error_message?: string;
  triggered_by?: string;
  trigger_type: 'manual' | 'agendado' | 'api';
}

export interface BackupCreate {
  type: Backup['type'];
  tables?: string[];
}

// ==================== RESTORE ====================
export interface RestoreRequest {
  backup_id: string;
  target_tables?: string[];
  overwrite_existing?: boolean;
  dry_run?: boolean;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  restored_records?: number;
  errors?: RestoreError[];
  duration_ms?: number;
}

export interface RestoreError {
  table: string;
  record_id?: string;
  error: string;
}

// ==================== POLICY ====================
export interface BackupPolicy {
  id: string;
  company_id: string;
  rpo_minutos: number;      // Recovery Point Objective
  rto_minutos: number;      // Recovery Time Objective
  retencao_dias: number;    // Retention period
  backup_db_enabled: boolean;
  backup_arquivos_enabled: boolean;
  backup_configs_enabled: boolean;
  offsite_enabled: boolean;
  notificar_falhas: boolean;
  emails_notificacao: string[];
  created_at: string;
  updated_at: string;
}

// ==================== DR TEST ====================
export interface DRTestChecklist {
  id: string;
  company_id: string;
  ultimo_teste_em: string | null;
  proximo_teste_planejado: string | null;
  responsavel_nome: string | null;
  responsavel_email: string | null;
  ambiente_teste: 'staging' | 'sandbox' | 'production' | null;
  resultado_ultimo_teste: 'sucesso' | 'falha_parcial' | 'falha' | null;
  observacoes: string | null;
  checklist_items: DRChecklistItem[];
}

export interface DRChecklistItem {
  id: string;
  item: string;
  checked: boolean;
  checked_at?: string;
  checked_by?: string;
}

// ==================== STATS ====================
export interface BackupStats {
  total_backups: number;
  successful_backups: number;
  failed_backups: number;
  pending_backups: number;
  total_size_bytes: number;
  last_backup_at: string | null;
  last_successful_at: string | null;
  success_rate: number;
  avg_duration_ms: number;
}

// ==================== TABLES AVAILABLE FOR BACKUP ====================
export const BACKUP_TABLES = {
  // Core Financial
  transactions: { label: 'Transações', critical: true },
  settlements: { label: 'Baixas', critical: true },
  bank_accounts: { label: 'Contas Bancárias', critical: true },
  
  // Counterparties
  counterparties: { label: 'Clientes/Fornecedores', critical: true },
  
  // Products & Stock
  products: { label: 'Produtos', critical: true },
  stock_movements: { label: 'Movimentações de Estoque', critical: false },
  
  // Fiscal
  fiscal_documents: { label: 'Documentos Fiscais', critical: true },
  tax_rules: { label: 'Regras Fiscais', critical: true },
  
  // Configuration
  user_profiles: { label: 'Perfis de Usuário', critical: true },
  roles: { label: 'Papéis', critical: true },
  permissions: { label: 'Permissões', critical: true },
  
  // Accounting
  accounts: { label: 'Plano de Contas', critical: true },
  journal_entries: { label: 'Lançamentos Contábeis', critical: true },
  
  // Budgets
  budgets: { label: 'Orçamentos', critical: false },
  budget_lines: { label: 'Linhas de Orçamento', critical: false },
  
  // CRM
  leads: { label: 'Leads', critical: false },
  opportunities: { label: 'Oportunidades', critical: false },
  
  // Automation
  automation_rules: { label: 'Regras de Automação', critical: false },
} as const;

export type BackupTableName = keyof typeof BACKUP_TABLES;

// ==================== STORAGE PROVIDERS ====================
export const STORAGE_PROVIDERS = {
  supabase: { label: 'Supabase Storage', icon: 'database' },
  s3: { label: 'Amazon S3', icon: 'cloud' },
  gcs: { label: 'Google Cloud Storage', icon: 'cloud' },
  azure: { label: 'Azure Blob Storage', icon: 'cloud' },
  local: { label: 'Download Local', icon: 'download' },
} as const;

export type StorageProvider = keyof typeof STORAGE_PROVIDERS;

// ==================== BACKUP TYPES ====================
export const BACKUP_TYPES = {
  completo: { 
    label: 'Completo', 
    description: 'Backup de todas as tabelas da empresa',
    icon: 'database',
  },
  incremental: { 
    label: 'Incremental', 
    description: 'Apenas dados alterados desde o último backup',
    icon: 'git-branch',
  },
  configuracoes: { 
    label: 'Configurações', 
    description: 'Apenas configurações (usuários, permissões, regras)',
    icon: 'settings',
  },
} as const;

export type BackupType = keyof typeof BACKUP_TYPES;

// ==================== FREQUENCY ====================
export const BACKUP_FREQUENCIES = {
  diario: { label: 'Diário', cron: '0 2 * * *' },
  semanal: { label: 'Semanal', cron: '0 2 * * 0' },
  mensal: { label: 'Mensal', cron: '0 2 1 * *' },
} as const;

export type BackupFrequency = keyof typeof BACKUP_FREQUENCIES;
