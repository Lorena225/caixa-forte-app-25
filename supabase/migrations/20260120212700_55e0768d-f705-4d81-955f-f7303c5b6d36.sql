-- =============================================
-- ADVANCED BUDGETING MODULE - COMPLETE SCHEMA
-- =============================================

-- 1. Budget Master (versioned budgets with scenarios)
CREATE TABLE IF NOT EXISTS public.budget_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'mensal' CHECK (period_type IN ('mensal', 'trimestral', 'anual')),
  scenario_type TEXT NOT NULL DEFAULT 'original' CHECK (scenario_type IN ('original', 'otimista', 'realista', 'pessimista')),
  version INTEGER NOT NULL DEFAULT 1,
  parent_budget_id UUID REFERENCES public.budget_master(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'pendente_aprovacao', 'aprovado', 'ativo', 'fechado', 'arquivado')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Budget Lines (detailed monthly targets per account/cost center)
CREATE TABLE IF NOT EXISTS public.budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budget_master(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  planned_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (budget_id, account_id, cost_center_id, month)
);

-- 3. Budget Revisions History (audit trail for changes)
CREATE TABLE IF NOT EXISTS public.budget_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budget_master(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  revision_name TEXT,
  reason TEXT,
  snapshot_data JSONB NOT NULL, -- Complete snapshot of budget_lines at revision time
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (budget_id, revision_number)
);

-- 4. Rolling Forecast entries
CREATE TABLE IF NOT EXISTS public.budget_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.budget_master(id) ON DELETE SET NULL,
  year INTEGER NOT NULL,
  cutoff_month INTEGER NOT NULL CHECK (cutoff_month BETWEEN 1 AND 12),
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  forecast_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_actual BOOLEAN NOT NULL DEFAULT false, -- True if based on actual data (before cutoff)
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. What-If Simulations
CREATE TABLE IF NOT EXISTS public.budget_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.budget_master(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL DEFAULT '{}', -- e.g., {"revenue_adjustment_pct": 10, "expense_adjustment_pct": -5}
  results JSONB NOT NULL DEFAULT '{}', -- Calculated results
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Budget Report Schedules
CREATE TABLE IF NOT EXISTS public.budget_report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.budget_master(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('executivo', 'detalhado', 'aprovacao')),
  frequency TEXT NOT NULL CHECK (frequency IN ('semanal', 'mensal', 'trimestral')),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 28),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  recipients JSONB NOT NULL DEFAULT '[]', -- Array of email addresses
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.budget_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_report_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budget_master
CREATE POLICY "Users can view budgets from their company" ON public.budget_master
  FOR SELECT USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can insert budgets to their company" ON public.budget_master
  FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can update budgets from their company" ON public.budget_master
  FOR UPDATE USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can delete budgets from their company" ON public.budget_master
  FOR DELETE USING (public.user_belongs_to_company(company_id));

-- RLS Policies for budget_lines
CREATE POLICY "Users can view budget lines" ON public.budget_lines
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.budget_master bm 
    WHERE bm.id = budget_id AND public.user_belongs_to_company(bm.company_id)
  ));

CREATE POLICY "Users can insert budget lines" ON public.budget_lines
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.budget_master bm 
    WHERE bm.id = budget_id AND public.user_belongs_to_company(bm.company_id)
  ));

CREATE POLICY "Users can update budget lines" ON public.budget_lines
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.budget_master bm 
    WHERE bm.id = budget_id AND public.user_belongs_to_company(bm.company_id)
  ));

CREATE POLICY "Users can delete budget lines" ON public.budget_lines
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.budget_master bm 
    WHERE bm.id = budget_id AND public.user_belongs_to_company(bm.company_id)
  ));

-- RLS Policies for budget_revisions
CREATE POLICY "Users can view budget revisions" ON public.budget_revisions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.budget_master bm 
    WHERE bm.id = budget_id AND public.user_belongs_to_company(bm.company_id)
  ));

CREATE POLICY "Users can insert budget revisions" ON public.budget_revisions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.budget_master bm 
    WHERE bm.id = budget_id AND public.user_belongs_to_company(bm.company_id)
  ));

-- RLS Policies for budget_forecasts
CREATE POLICY "Users can view budget forecasts" ON public.budget_forecasts
  FOR SELECT USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can insert budget forecasts" ON public.budget_forecasts
  FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can update budget forecasts" ON public.budget_forecasts
  FOR UPDATE USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can delete budget forecasts" ON public.budget_forecasts
  FOR DELETE USING (public.user_belongs_to_company(company_id));

-- RLS Policies for budget_simulations
CREATE POLICY "Users can view budget simulations" ON public.budget_simulations
  FOR SELECT USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can insert budget simulations" ON public.budget_simulations
  FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can delete budget simulations" ON public.budget_simulations
  FOR DELETE USING (public.user_belongs_to_company(company_id));

-- RLS Policies for budget_report_schedules
CREATE POLICY "Users can view budget report schedules" ON public.budget_report_schedules
  FOR SELECT USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can manage budget report schedules" ON public.budget_report_schedules
  FOR ALL USING (public.user_belongs_to_company(company_id));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_master_company_year ON public.budget_master(company_id, year);
CREATE INDEX IF NOT EXISTS idx_budget_master_scenario ON public.budget_master(company_id, year, scenario_type);
CREATE INDEX IF NOT EXISTS idx_budget_master_parent ON public.budget_master(parent_budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON public.budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_account ON public.budget_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_budget_revisions_budget ON public.budget_revisions(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_forecasts_company_year ON public.budget_forecasts(company_id, year, cutoff_month);
CREATE INDEX IF NOT EXISTS idx_budget_simulations_company ON public.budget_simulations(company_id);

-- Comprehensive view for budget vs actual analysis with multiple comparisons
CREATE OR REPLACE VIEW public.v_budget_master_analysis AS
SELECT
  bm.id,
  bm.company_id,
  bm.name,
  bm.year,
  bm.period_type,
  bm.scenario_type,
  bm.version,
  bm.parent_budget_id,
  bm.status,
  bm.is_active,
  bm.approved_at,
  bm.created_at,
  COALESCE(SUM(bl.planned_amount) FILTER (WHERE a.category_type = 'receita'), 0) as total_revenue_planned,
  COALESCE(SUM(bl.planned_amount) FILTER (WHERE a.category_type = 'despesa'), 0) as total_expense_planned,
  COALESCE(SUM(bl.planned_amount) FILTER (WHERE a.category_type = 'receita'), 0) - 
  COALESCE(SUM(bl.planned_amount) FILTER (WHERE a.category_type = 'despesa'), 0) as total_profit_planned,
  COUNT(DISTINCT bl.account_id) as accounts_count,
  COUNT(DISTINCT bl.cost_center_id) FILTER (WHERE bl.cost_center_id IS NOT NULL) as cost_centers_count,
  (SELECT COUNT(*) FROM public.budget_revisions br WHERE br.budget_id = bm.id) as revisions_count
FROM public.budget_master bm
LEFT JOIN public.budget_lines bl ON bl.budget_id = bm.id
LEFT JOIN public.accounts a ON a.id = bl.account_id
GROUP BY bm.id;

ALTER VIEW public.v_budget_master_analysis SET (security_invoker = on);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_budget_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_budget_master_updated_at
  BEFORE UPDATE ON public.budget_master
  FOR EACH ROW EXECUTE FUNCTION public.update_budget_updated_at();

CREATE TRIGGER trg_budget_lines_updated_at
  BEFORE UPDATE ON public.budget_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_budget_updated_at();

CREATE TRIGGER trg_budget_forecasts_updated_at
  BEFORE UPDATE ON public.budget_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.update_budget_updated_at();