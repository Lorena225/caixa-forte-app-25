-- =============================================
-- SPED GENERATION AND CONTROL
-- =============================================

-- SPED Generation Jobs
CREATE TABLE IF NOT EXISTS public.sped_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  
  sped_type TEXT NOT NULL CHECK (sped_type IN ('efd_icms_ipi', 'efd_contribuicoes', 'ecf', 'ecd')),
  reference_year INTEGER NOT NULL,
  reference_month INTEGER, -- NULL for annual
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error', 'transmitted')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  transmitted_at TIMESTAMPTZ,
  
  file_path TEXT,
  file_size_bytes BIGINT,
  record_count INTEGER,
  hash TEXT,
  
  validation_errors_json JSONB,
  receipt_number TEXT,
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- =============================================
-- BUDGET BY ACCOUNT (Orçamento por Conta)
-- =============================================

-- Account-level budgets
CREATE TABLE IF NOT EXISTS public.budget_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  
  target_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, account_id, year, month)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_sped_jobs_company_type ON public.sped_jobs(company_id, sped_type);
CREATE INDEX IF NOT EXISTS idx_sped_jobs_reference ON public.sped_jobs(company_id, reference_year, reference_month);

CREATE INDEX IF NOT EXISTS idx_budget_accounts_company_year ON public.budget_accounts(company_id, year, month);
CREATE INDEX IF NOT EXISTS idx_budget_accounts_account ON public.budget_accounts(account_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.sped_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_accounts ENABLE ROW LEVEL SECURITY;

-- SPED Jobs policies (using company_users table)
CREATE POLICY "Users can view SPED jobs of their company"
  ON public.sped_jobs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert SPED jobs in their company"
  ON public.sped_jobs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update SPED jobs of their company"
  ON public.sped_jobs FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Budget Accounts policies (using company_users table)
CREATE POLICY "Users can view budget accounts of their company"
  ON public.budget_accounts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert budget accounts in their company"
  ON public.budget_accounts FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update budget accounts of their company"
  ON public.budget_accounts FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete budget accounts of their company"
  ON public.budget_accounts FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- =============================================
-- VIEW: Budget vs Actual by Account
-- =============================================

CREATE OR REPLACE VIEW public.v_budget_by_account WITH (security_invoker = on) AS
SELECT 
  ba.id,
  ba.company_id,
  ba.account_id,
  a.account_code,
  a.account_name,
  a.category_type,
  ba.year,
  ba.month,
  ba.target_amount,
  COALESCE(
    (SELECT SUM(CASE WHEN t.direction = 'entrada' THEN t.total_amount ELSE -t.total_amount END)
     FROM public.transactions t
     WHERE t.account_id = ba.account_id
       AND t.company_id = ba.company_id
       AND EXTRACT(YEAR FROM t.transaction_date) = ba.year
       AND EXTRACT(MONTH FROM t.transaction_date) = ba.month
       AND t.status NOT IN ('cancelado', 'rascunho')
    ), 0
  ) as actual_amount,
  ba.target_amount - COALESCE(
    (SELECT SUM(CASE WHEN t.direction = 'entrada' THEN t.total_amount ELSE -t.total_amount END)
     FROM public.transactions t
     WHERE t.account_id = ba.account_id
       AND t.company_id = ba.company_id
       AND EXTRACT(YEAR FROM t.transaction_date) = ba.year
       AND EXTRACT(MONTH FROM t.transaction_date) = ba.month
       AND t.status NOT IN ('cancelado', 'rascunho')
    ), 0
  ) as variance
FROM public.budget_accounts ba
JOIN public.accounts a ON a.id = ba.account_id;

-- =============================================
-- TRIGGER
-- =============================================

CREATE TRIGGER update_budget_accounts_updated_at
  BEFORE UPDATE ON public.budget_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();