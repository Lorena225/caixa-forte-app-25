-- =====================================================
-- BLOCO G/H: TABELAS FALTANTES
-- =====================================================

-- G1) FACT_CASHFLOW_DAY
CREATE TABLE public.fact_cashflow_day (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position_date DATE NOT NULL,
  wallet_id UUID REFERENCES public.wallets(id),
  branch_id UUID REFERENCES public.branches(id),
  opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_inflows NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_outflows NUMERIC(18,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  projected_inflows NUMERIC(18,2) NOT NULL DEFAULT 0,
  projected_outflows NUMERIC(18,2) NOT NULL DEFAULT 0,
  projected_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  transaction_count INT NOT NULL DEFAULT 0,
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_fact_cashflow_unique ON public.fact_cashflow_day(
  company_id, position_date, 
  COALESCE(wallet_id, '00000000-0000-0000-0000-000000000000'::uuid), 
  COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- G1) FACT_DRE_MONTH
CREATE TABLE public.fact_dre_month (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  account_id UUID REFERENCES public.accounts(id),
  account_code TEXT,
  account_name TEXT,
  category_type TEXT,
  financial_classification_code TEXT,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  budget_amount NUMERIC(18,2),
  variance_amount NUMERIC(18,2),
  variance_percent NUMERIC(5,2),
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- G1) FACT_AR_AGING
CREATE TABLE public.fact_ar_aging (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  counterparty_id UUID REFERENCES public.counterparties(id),
  current_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  overdue_1_30 NUMERIC(18,2) NOT NULL DEFAULT 0,
  overdue_31_60 NUMERIC(18,2) NOT NULL DEFAULT 0,
  overdue_61_90 NUMERIC(18,2) NOT NULL DEFAULT 0,
  overdue_91_plus NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_overdue NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_open NUMERIC(18,2) NOT NULL DEFAULT 0,
  transaction_count INT NOT NULL DEFAULT 0,
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- G1) FACT_AP_AGING
CREATE TABLE public.fact_ap_aging (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  counterparty_id UUID REFERENCES public.counterparties(id),
  current_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  overdue_1_30 NUMERIC(18,2) NOT NULL DEFAULT 0,
  overdue_31_60 NUMERIC(18,2) NOT NULL DEFAULT 0,
  overdue_61_90 NUMERIC(18,2) NOT NULL DEFAULT 0,
  overdue_91_plus NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_overdue NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_open NUMERIC(18,2) NOT NULL DEFAULT 0,
  transaction_count INT NOT NULL DEFAULT 0,
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- G1) FACT_BUDGET_VS_ACTUAL
CREATE TABLE public.fact_budget_vs_actual (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  budget_revenue NUMERIC(18,2) NOT NULL DEFAULT 0,
  actual_revenue NUMERIC(18,2) NOT NULL DEFAULT 0,
  budget_expense NUMERIC(18,2) NOT NULL DEFAULT 0,
  actual_expense NUMERIC(18,2) NOT NULL DEFAULT 0,
  budget_profit NUMERIC(18,2) NOT NULL DEFAULT 0,
  actual_profit NUMERIC(18,2) NOT NULL DEFAULT 0,
  revenue_variance NUMERIC(18,2) NOT NULL DEFAULT 0,
  expense_variance NUMERIC(18,2) NOT NULL DEFAULT 0,
  profit_variance NUMERIC(18,2) NOT NULL DEFAULT 0,
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_fact_budget_unique ON public.fact_budget_vs_actual(
  company_id, period_year, period_month, 
  COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), 
  COALESCE(cost_center_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- G1) FACT_LIQUIDITY_INDICATORS
CREATE TABLE public.fact_liquidity_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  cash_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  ar_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  ap_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  working_capital NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_ratio NUMERIC(10,4),
  quick_ratio NUMERIC(10,4),
  dso_days NUMERIC(10,2),
  dpo_days NUMERIC(10,2),
  cash_conversion_cycle NUMERIC(10,2),
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, snapshot_date)
);

-- G3) Melhorar jobs_queue e integration_dlq
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs_queue' AND column_name = 'idempotency_key') THEN
    ALTER TABLE public.jobs_queue ADD COLUMN idempotency_key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs_queue' AND column_name = 'dlq_id') THEN
    ALTER TABLE public.jobs_queue ADD COLUMN dlq_id UUID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_idempotency ON public.jobs_queue(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- H1) SOD_RULES
CREATE TABLE public.sod_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('conflicting_permissions', 'conflicting_roles', 'amount_limit', 'approval_required')),
  permission_a TEXT,
  permission_b TEXT,
  role_a UUID REFERENCES public.roles(id),
  role_b UUID REFERENCES public.roles(id),
  amount_threshold NUMERIC(18,2),
  entity_type TEXT,
  enforcement_mode TEXT NOT NULL DEFAULT 'block' CHECK (enforcement_mode IN ('block', 'warn', 'log_only')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- H1) SOD_VIOLATIONS
CREATE TABLE public.sod_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.sod_rules(id),
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action_attempted TEXT NOT NULL,
  violation_details JSONB,
  enforcement_result TEXT NOT NULL,
  override_by UUID,
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- H2) USER_AMOUNT_LIMITS
CREATE TABLE public.user_amount_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  single_limit NUMERIC(18,2),
  daily_limit NUMERIC(18,2),
  monthly_limit NUMERIC(18,2),
  requires_approval_above NUMERIC(18,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id, entity_type)
);

-- H3) Campos workflow em transactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'requires_workflow') THEN
    ALTER TABLE public.transactions ADD COLUMN requires_workflow BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'workflow_status') THEN
    ALTER TABLE public.transactions ADD COLUMN workflow_status TEXT;
  END IF;
END $$;

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_fact_cashflow_day_lookup ON public.fact_cashflow_day(company_id, position_date);
CREATE INDEX idx_fact_dre_month_lookup ON public.fact_dre_month(company_id, period_year, period_month);
CREATE INDEX idx_fact_ar_aging_lookup ON public.fact_ar_aging(company_id, snapshot_date);
CREATE INDEX idx_fact_ap_aging_lookup ON public.fact_ap_aging(company_id, snapshot_date);
CREATE INDEX idx_sod_violations_user ON public.sod_violations(company_id, user_id, created_at);

-- =====================================================
-- RLS + POLICIES
-- =====================================================

ALTER TABLE public.fact_cashflow_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_dre_month ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_ar_aging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_ap_aging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_budget_vs_actual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_liquidity_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sod_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sod_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_amount_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_access" ON public.fact_cashflow_day FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.fact_dre_month FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.fact_ar_aging FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.fact_ap_aging FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.fact_budget_vs_actual FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.fact_liquidity_indicators FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.sod_rules FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.sod_violations FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.user_amount_limits FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Triggers
CREATE TRIGGER update_sod_rules_updated_at BEFORE UPDATE ON public.sod_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_amount_limits_updated_at BEFORE UPDATE ON public.user_amount_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();