-- =====================================================
-- PHASE 5.1: PERFORMANCE INDEXES FOR CORE TABLES
-- =====================================================

-- Index for transactions - most queried table
CREATE INDEX IF NOT EXISTS idx_transactions_company_status 
  ON public.transactions(company_id, status);
  
CREATE INDEX IF NOT EXISTS idx_transactions_company_due_date 
  ON public.transactions(company_id, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_company_direction_status 
  ON public.transactions(company_id, direction, status);

-- Partial index for open transactions
CREATE INDEX IF NOT EXISTS idx_transactions_company_open 
  ON public.transactions(company_id, due_date) 
  WHERE status IN ('rascunho', 'lancado');

-- Index for audit_logs - heavy read for compliance
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created 
  ON public.audit_logs(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_table_action 
  ON public.audit_logs(company_id, table_name, action);

-- GIN index for JSONB search in audit
CREATE INDEX IF NOT EXISTS idx_audit_logs_old_data_gin 
  ON public.audit_logs USING GIN(old_data);
  
CREATE INDEX IF NOT EXISTS idx_audit_logs_new_data_gin 
  ON public.audit_logs USING GIN(new_data);

-- Index for budget_master
CREATE INDEX IF NOT EXISTS idx_budget_master_company_status 
  ON public.budget_master(company_id, status);

CREATE INDEX IF NOT EXISTS idx_budget_master_company_year 
  ON public.budget_master(company_id, year);

-- Index for counterparties - frequent joins
CREATE INDEX IF NOT EXISTS idx_counterparties_company_type 
  ON public.counterparties(company_id, type);

CREATE INDEX IF NOT EXISTS idx_counterparties_company_active 
  ON public.counterparties(company_id) 
  WHERE is_active = true;

-- Index for wallets
CREATE INDEX IF NOT EXISTS idx_wallets_company_active 
  ON public.wallets(company_id) 
  WHERE is_active = true;

-- Index for cost_centers
CREATE INDEX IF NOT EXISTS idx_cost_centers_company_active 
  ON public.cost_centers(company_id) 
  WHERE is_active = true;

-- Index for accounts
CREATE INDEX IF NOT EXISTS idx_accounts_company_category 
  ON public.accounts(company_id, category_type);

CREATE INDEX IF NOT EXISTS idx_accounts_company_active 
  ON public.accounts(company_id) 
  WHERE is_active = true;

-- Index for user_profiles - critical for auth
CREATE INDEX IF NOT EXISTS idx_user_profiles_company 
  ON public.user_profiles(company_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_company 
  ON public.user_profiles(user_id, company_id);

-- Index for branches
CREATE INDEX IF NOT EXISTS idx_branches_company_active 
  ON public.branches(company_id) 
  WHERE is_active = true;

-- Index for backup_jobs
CREATE INDEX IF NOT EXISTS idx_backup_jobs_company_status
  ON public.backup_jobs(company_id, status);

CREATE INDEX IF NOT EXISTS idx_backup_jobs_company_created
  ON public.backup_jobs(company_id, created_at DESC);

-- Index for fiscal_documents (company and status only)
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_company_status
  ON public.fiscal_documents(company_id, status);

-- =====================================================
-- ANALYZE tables to update statistics
-- =====================================================
ANALYZE public.transactions;
ANALYZE public.audit_logs;
ANALYZE public.counterparties;
ANALYZE public.wallets;
ANALYZE public.accounts;
ANALYZE public.user_profiles;