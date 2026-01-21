// =====================================================
// BANK INTEGRATION - Type Definitions
// =====================================================

// Supported banks for Open Banking integration
export type SupportedBank = 
  | 'itau'
  | 'bradesco'
  | 'santander'
  | 'bb'
  | 'caixa'
  | 'nubank'
  | 'inter'
  | 'sicoob'
  | 'sicredi'
  | 'btg'
  | 'safra'
  | 'original'
  | 'c6'
  | 'mercadopago'
  | 'pagseguro'
  | 'stone'
  | 'other';

export type BankSyncStatus = 'idle' | 'syncing' | 'error' | 'success';
export type BankConnectionStatus = 'pending' | 'connected' | 'disconnected' | 'expired' | 'error';
export type TransactionDirection = 'entrada' | 'saida';
export type ReconciliationStatus = 'pending' | 'matched' | 'unmatched' | 'ignored' | 'manual';

// Bank Account Configuration
export interface BankAccount {
  id: string;
  company_id: string;
  bank_code: string;           // FEBRABAN code (e.g., "341" for Itaú)
  bank_name: string;           // Display name
  bank_slug: SupportedBank;    // Internal identifier
  account_number: string;
  account_digit?: string;
  agency: string;
  agency_digit?: string;
  account_type: 'checking' | 'savings' | 'payment';
  cpf_cnpj: string;
  holder_name: string;
  is_active: boolean;
  is_primary: boolean;
  
  // API Integration
  connection_status: BankConnectionStatus;
  api_credentials_id?: string; // Reference to encrypted credentials
  oauth_token_id?: string;     // For OAuth-based integrations
  
  // Sync Status
  sync_status: BankSyncStatus;
  last_sync_at?: string;
  last_sync_error?: string;
  next_sync_at?: string;
  sync_frequency_hours: number;
  
  // Balance
  current_balance?: number;
  available_balance?: number;
  balance_updated_at?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Bank Transaction from external source
export interface BankTransaction {
  id: string;
  company_id: string;
  bank_account_id: string;
  
  // External identifiers
  external_id: string;         // ID from bank API
  external_ref?: string;       // Additional reference
  
  // Transaction data
  transaction_date: string;
  posting_date?: string;
  amount: number;
  direction: TransactionDirection;
  description: string;
  memo?: string;
  
  // Categorization
  category_code?: string;      // Bank's category code
  category_name?: string;      // Bank's category name
  
  // Counterparty
  counterparty_name?: string;
  counterparty_cpf_cnpj?: string;
  counterparty_bank_code?: string;
  counterparty_agency?: string;
  counterparty_account?: string;
  
  // PIX specific
  pix_key?: string;
  pix_end_to_end_id?: string;
  
  // Reconciliation
  reconciliation_status: ReconciliationStatus;
  matched_transaction_id?: string;  // Link to internal transaction
  matched_at?: string;
  matched_by?: string;
  match_confidence?: number;        // 0-100
  
  // Metadata
  raw_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Bank API Credentials (stored encrypted)
export interface BankCredentials {
  id: string;
  company_id: string;
  bank_account_id: string;
  bank_slug: SupportedBank;
  
  // Credentials type
  auth_type: 'api_key' | 'oauth2' | 'certificate' | 'user_pass';
  
  // Encrypted fields stored in vault
  credentials_ref: string;     // Reference to Supabase Vault
  
  // OAuth tokens (if applicable)
  access_token_ref?: string;
  refresh_token_ref?: string;
  token_expires_at?: string;
  
  // Certificate (if applicable)
  certificate_expires_at?: string;
  
  // Status
  is_valid: boolean;
  last_validated_at?: string;
  validation_error?: string;
  
  created_at: string;
  updated_at: string;
}

// Bank Sync Job
export interface BankSyncJob {
  id: string;
  company_id: string;
  bank_account_id: string;
  
  // Job configuration
  sync_type: 'full' | 'incremental' | 'balance_only';
  date_from?: string;
  date_to?: string;
  
  // Status
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  
  // Results
  transactions_fetched: number;
  transactions_created: number;
  transactions_updated: number;
  transactions_skipped: number;
  errors: BankSyncError[];
  
  // Metadata
  triggered_by: 'schedule' | 'manual' | 'webhook';
  created_at: string;
}

export interface BankSyncError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// Bank Statement Import (OFX/CSV)
export interface BankStatementImport {
  id: string;
  company_id: string;
  bank_account_id: string;
  
  // File info
  file_name: string;
  file_type: 'ofx' | 'csv' | 'cnab240' | 'cnab400';
  file_size_bytes: number;
  file_path?: string;
  
  // Import status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  
  // Period
  period_start?: string;
  period_end?: string;
  
  // Results
  total_transactions: number;
  imported_transactions: number;
  duplicate_transactions: number;
  error_transactions: number;
  errors: string[];
  
  // Metadata
  imported_by: string;
  created_at: string;
}

// Reconciliation Rule
export interface ReconciliationRule {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  priority: number;
  
  // Matching criteria
  match_criteria: {
    amount_tolerance?: number;           // Percentage or absolute
    amount_tolerance_type?: 'percent' | 'absolute';
    date_tolerance_days?: number;        // Days before/after
    description_contains?: string[];     // Keywords to match
    description_regex?: string;          // Regex pattern
    counterparty_name?: string;          // Exact or partial match
    min_amount?: number;
    max_amount?: number;
  };
  
  // Action on match
  action: {
    auto_match: boolean;                 // Automatically reconcile
    create_transaction: boolean;         // Create if not found
    default_account_id?: string;         // Default account for new transactions
    default_category_id?: string;        // Default category
    default_cost_center_id?: string;     // Default cost center
  };
  
  // Statistics
  matches_count: number;
  last_match_at?: string;
  
  created_at: string;
  updated_at: string;
}

// Open Banking Consent
export interface OpenBankingConsent {
  id: string;
  company_id: string;
  bank_slug: SupportedBank;
  
  // Consent details
  consent_id: string;           // From bank
  status: 'pending' | 'authorized' | 'rejected' | 'revoked' | 'expired';
  scope: string[];              // Permissions granted
  
  // Validity
  authorized_at?: string;
  expires_at?: string;
  revoked_at?: string;
  
  // Account access
  linked_accounts: string[];    // Bank account IDs with consent
  
  created_at: string;
  updated_at: string;
}

// Bank API Configuration
export interface BankApiConfig {
  slug: SupportedBank;
  name: string;
  logo_url?: string;
  
  // API endpoints
  base_url: string;
  auth_url?: string;
  token_url?: string;
  
  // Supported features
  supports_oauth: boolean;
  supports_pix: boolean;
  supports_boleto: boolean;
  supports_transfer: boolean;
  supports_statement: boolean;
  supports_balance: boolean;
  supports_webhooks: boolean;
  
  // Rate limits
  rate_limit_per_minute?: number;
  rate_limit_per_day?: number;
  
  // Documentation
  docs_url?: string;
  sandbox_available: boolean;
}

// Default bank configurations
export const BANK_CONFIGS: Record<SupportedBank, Partial<BankApiConfig>> = {
  itau: {
    slug: 'itau',
    name: 'Itaú Unibanco',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: true,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: true,
    sandbox_available: true,
  },
  bradesco: {
    slug: 'bradesco',
    name: 'Bradesco',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: true,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: true,
    sandbox_available: true,
  },
  santander: {
    slug: 'santander',
    name: 'Santander',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: true,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: false,
    sandbox_available: true,
  },
  bb: {
    slug: 'bb',
    name: 'Banco do Brasil',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: true,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: true,
    sandbox_available: true,
  },
  caixa: {
    slug: 'caixa',
    name: 'Caixa Econômica Federal',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: true,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: false,
    sandbox_available: false,
  },
  nubank: {
    slug: 'nubank',
    name: 'Nubank',
    supports_oauth: false,
    supports_pix: true,
    supports_boleto: false,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: false,
    sandbox_available: false,
  },
  inter: {
    slug: 'inter',
    name: 'Banco Inter',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: true,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: true,
    sandbox_available: true,
  },
  sicoob: {
    slug: 'sicoob',
    name: 'Sicoob',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: true,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: false,
    sandbox_available: true,
  },
  sicredi: {
    slug: 'sicredi',
    name: 'Sicredi',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: true,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: false,
    sandbox_available: true,
  },
  btg: {
    slug: 'btg',
    name: 'BTG Pactual',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: true,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: true,
    sandbox_available: true,
  },
  safra: {
    slug: 'safra',
    name: 'Banco Safra',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: true,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: false,
    sandbox_available: false,
  },
  original: {
    slug: 'original',
    name: 'Banco Original',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: true,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: true,
    sandbox_available: true,
  },
  c6: {
    slug: 'c6',
    name: 'C6 Bank',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: false,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: false,
    sandbox_available: false,
  },
  mercadopago: {
    slug: 'mercadopago',
    name: 'Mercado Pago',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: true,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: true,
    sandbox_available: true,
  },
  pagseguro: {
    slug: 'pagseguro',
    name: 'PagSeguro',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: true,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: true,
    sandbox_available: true,
  },
  stone: {
    slug: 'stone',
    name: 'Stone',
    supports_oauth: true,
    supports_pix: true,
    supports_boleto: true,
    supports_transfer: true,
    supports_statement: true,
    supports_balance: true,
    supports_webhooks: true,
    sandbox_available: true,
  },
  other: {
    slug: 'other',
    name: 'Outro',
    supports_oauth: false,
    supports_pix: false,
    supports_boleto: false,
    supports_transfer: false,
    supports_statement: false,
    supports_balance: false,
    supports_webhooks: false,
    sandbox_available: false,
  },
};

// Helper to get bank display name
export function getBankDisplayName(slug: SupportedBank): string {
  return BANK_CONFIGS[slug]?.name || slug;
}

// Helper to check if bank supports feature
export function bankSupportsFeature(slug: SupportedBank, feature: keyof BankApiConfig): boolean {
  const config = BANK_CONFIGS[slug];
  if (!config) return false;
  const value = config[feature];
  return typeof value === 'boolean' ? value : false;
}
