-- =====================================================
-- BANK INTEGRATION - Create remaining tables
-- =====================================================

-- Bank Transactions table
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  external_ref TEXT,
  transaction_date DATE NOT NULL,
  posting_date DATE,
  amount NUMERIC(18,2) NOT NULL,
  direction TEXT NOT NULL,
  description TEXT,
  memo TEXT,
  category_code TEXT,
  category_name TEXT,
  counterparty_name TEXT,
  counterparty_cpf_cnpj TEXT,
  counterparty_bank_code TEXT,
  counterparty_agency TEXT,
  counterparty_account TEXT,
  pix_key TEXT,
  pix_end_to_end_id TEXT,
  reconciliation_status TEXT DEFAULT 'pending',
  matched_transaction_id UUID,
  matched_at TIMESTAMPTZ,
  matched_by UUID,
  match_confidence INTEGER,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bank Sync Jobs table
CREATE TABLE IF NOT EXISTS public.bank_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL DEFAULT 'incremental',
  date_from DATE,
  date_to DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  transactions_fetched INTEGER DEFAULT 0,
  transactions_created INTEGER DEFAULT 0,
  transactions_updated INTEGER DEFAULT 0,
  transactions_skipped INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reconciliation Rules table
CREATE TABLE IF NOT EXISTS public.reconciliation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  match_criteria JSONB NOT NULL DEFAULT '{}',
  action JSONB NOT NULL DEFAULT '{}',
  matches_count INTEGER DEFAULT 0,
  last_match_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON public.bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON public.bank_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciliation ON public.bank_transactions(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_bank_sync_jobs_account ON public.bank_sync_jobs(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_sync_jobs_status ON public.bank_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_rules_company ON public.reconciliation_rules(company_id);

-- Enable RLS
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bank_transactions
DROP POLICY IF EXISTS "bank_transactions_select" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_insert" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_update" ON public.bank_transactions;
CREATE POLICY "bank_transactions_select" ON public.bank_transactions FOR SELECT USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "bank_transactions_insert" ON public.bank_transactions FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "bank_transactions_update" ON public.bank_transactions FOR UPDATE USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));

-- RLS Policies for bank_sync_jobs
DROP POLICY IF EXISTS "bank_sync_jobs_select" ON public.bank_sync_jobs;
DROP POLICY IF EXISTS "bank_sync_jobs_insert" ON public.bank_sync_jobs;
CREATE POLICY "bank_sync_jobs_select" ON public.bank_sync_jobs FOR SELECT USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "bank_sync_jobs_insert" ON public.bank_sync_jobs FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));

-- RLS Policies for reconciliation_rules
DROP POLICY IF EXISTS "reconciliation_rules_select" ON public.reconciliation_rules;
DROP POLICY IF EXISTS "reconciliation_rules_insert" ON public.reconciliation_rules;
DROP POLICY IF EXISTS "reconciliation_rules_update" ON public.reconciliation_rules;
DROP POLICY IF EXISTS "reconciliation_rules_delete" ON public.reconciliation_rules;
CREATE POLICY "reconciliation_rules_select" ON public.reconciliation_rules FOR SELECT USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "reconciliation_rules_insert" ON public.reconciliation_rules FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "reconciliation_rules_update" ON public.reconciliation_rules FOR UPDATE USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "reconciliation_rules_delete" ON public.reconciliation_rules FOR DELETE USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));