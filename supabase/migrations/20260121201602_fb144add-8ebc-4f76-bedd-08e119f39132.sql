
-- =====================================================
-- MÓDULO 2.1: ORÇAMENTOS AVANÇADOS - TABELAS ADICIONAIS
-- =====================================================

-- 1. Budget Approval Workflows (níveis de aprovação)
CREATE TABLE IF NOT EXISTS public.budget_approval_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  level_order INTEGER NOT NULL,
  level_name TEXT NOT NULL, -- 'Gerente', 'Diretor', 'CFO'
  min_amount NUMERIC(18,2) DEFAULT 0,
  max_amount NUMERIC(18,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Budget Approval Requests (solicitações de aprovação)
CREATE TABLE IF NOT EXISTS public.budget_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budget_master(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'cancelled')),
  current_level INTEGER DEFAULT 1,
  total_levels INTEGER DEFAULT 1,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Budget Approval Steps (passos individuais de aprovação)
CREATE TABLE IF NOT EXISTS public.budget_approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.budget_approval_requests(id) ON DELETE CASCADE,
  level_id UUID REFERENCES public.budget_approval_levels(id) ON DELETE SET NULL,
  level_order INTEGER NOT NULL,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  decision_at TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Budget Scenarios (cenários customizados)
CREATE TABLE IF NOT EXISTS public.budget_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.budget_master(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scenario_type TEXT NOT NULL DEFAULT 'custom' CHECK (scenario_type IN ('pessimista', 'realista', 'otimista', 'custom')),
  description TEXT,
  probability NUMERIC(5,4) DEFAULT 0.5 CHECK (probability >= 0 AND probability <= 1),
  adjustment_rules JSONB NOT NULL DEFAULT '[]',
  is_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Budget Scenario Lines (linhas ajustadas por cenário)
CREATE TABLE IF NOT EXISTS public.budget_scenario_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.budget_scenarios(id) ON DELETE CASCADE,
  source_line_id UUID REFERENCES public.budget_lines(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  original_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  adjusted_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  adjustment_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Budget Version Comparisons (comparações salvas)
CREATE TABLE IF NOT EXISTS public.budget_version_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version_a_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  version_b_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  comparison_data JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Budget Reclassifications (reclassificações orçamentárias)
CREATE TABLE IF NOT EXISTS public.budget_reclassifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budget_master(id) ON DELETE CASCADE,
  from_line_id UUID REFERENCES public.budget_lines(id) ON DELETE SET NULL,
  to_line_id UUID REFERENCES public.budget_lines(id) ON DELETE SET NULL,
  from_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  amount NUMERIC(18,2) NOT NULL,
  month INTEGER CHECK (month BETWEEN 1 AND 12),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Budget Variance Alerts (alertas de desvio)
CREATE TABLE IF NOT EXISTS public.budget_variance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.budget_master(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  year INTEGER NOT NULL,
  month INTEGER CHECK (month BETWEEN 1 AND 12),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('over_budget', 'under_budget', 'critical', 'warning', 'info')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  budget_amount NUMERIC(18,2) NOT NULL,
  actual_amount NUMERIC(18,2) NOT NULL,
  variance_amount NUMERIC(18,2) NOT NULL,
  variance_percent NUMERIC(10,4) NOT NULL,
  message TEXT NOT NULL,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_budget_approval_requests_budget ON public.budget_approval_requests(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_approval_requests_status ON public.budget_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_budget_approval_steps_request ON public.budget_approval_steps(request_id);
CREATE INDEX IF NOT EXISTS idx_budget_scenarios_company ON public.budget_scenarios(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_scenarios_budget ON public.budget_scenarios(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_scenario_lines_scenario ON public.budget_scenario_lines(scenario_id);
CREATE INDEX IF NOT EXISTS idx_budget_reclassifications_budget ON public.budget_reclassifications(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_variance_alerts_company_year ON public.budget_variance_alerts(company_id, year);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.budget_approval_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_scenario_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_version_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_reclassifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_variance_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for budget_approval_levels
CREATE POLICY "Users can view approval levels of their company" ON public.budget_approval_levels
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage approval levels of their company" ON public.budget_approval_levels
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Policies for budget_approval_requests
CREATE POLICY "Users can view approval requests of their budgets" ON public.budget_approval_requests
  FOR SELECT USING (budget_id IN (
    SELECT id FROM public.budget_master WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage approval requests of their budgets" ON public.budget_approval_requests
  FOR ALL USING (budget_id IN (
    SELECT id FROM public.budget_master WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

-- Policies for budget_approval_steps
CREATE POLICY "Users can view approval steps" ON public.budget_approval_steps
  FOR SELECT USING (request_id IN (
    SELECT id FROM public.budget_approval_requests WHERE budget_id IN (
      SELECT id FROM public.budget_master WHERE company_id IN (
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can manage approval steps" ON public.budget_approval_steps
  FOR ALL USING (request_id IN (
    SELECT id FROM public.budget_approval_requests WHERE budget_id IN (
      SELECT id FROM public.budget_master WHERE company_id IN (
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      )
    )
  ));

-- Policies for budget_scenarios
CREATE POLICY "Users can view scenarios of their company" ON public.budget_scenarios
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage scenarios of their company" ON public.budget_scenarios
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Policies for budget_scenario_lines
CREATE POLICY "Users can view scenario lines" ON public.budget_scenario_lines
  FOR SELECT USING (scenario_id IN (
    SELECT id FROM public.budget_scenarios WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage scenario lines" ON public.budget_scenario_lines
  FOR ALL USING (scenario_id IN (
    SELECT id FROM public.budget_scenarios WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

-- Policies for budget_version_comparisons
CREATE POLICY "Users can view version comparisons of their company" ON public.budget_version_comparisons
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage version comparisons of their company" ON public.budget_version_comparisons
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Policies for budget_reclassifications
CREATE POLICY "Users can view reclassifications of their budgets" ON public.budget_reclassifications
  FOR SELECT USING (budget_id IN (
    SELECT id FROM public.budget_master WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage reclassifications of their budgets" ON public.budget_reclassifications
  FOR ALL USING (budget_id IN (
    SELECT id FROM public.budget_master WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

-- Policies for budget_variance_alerts
CREATE POLICY "Users can view variance alerts of their company" ON public.budget_variance_alerts
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage variance alerts of their company" ON public.budget_variance_alerts
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- =====================================================
-- VIEW: Comparação detalhada Budget vs Actual
-- =====================================================

CREATE OR REPLACE VIEW public.v_budget_variance_analysis AS
WITH budget_data AS (
  SELECT 
    bm.id as budget_id,
    bm.company_id,
    bm.year,
    bm.name as budget_name,
    bm.scenario_type,
    bm.version,
    bm.is_active,
    bl.account_id,
    bl.cost_center_id,
    bl.month,
    bl.planned_amount
  FROM public.budget_master bm
  JOIN public.budget_lines bl ON bl.budget_id = bm.id
),
actual_data AS (
  SELECT 
    company_id,
    account_id,
    cost_center_id,
    EXTRACT(YEAR FROM transaction_date)::integer as year,
    EXTRACT(MONTH FROM transaction_date)::integer as month,
    SUM(CASE WHEN direction = 'entrada' THEN total_amount ELSE -total_amount END) as actual_amount
  FROM public.transactions
  WHERE status = 'pago'
  GROUP BY company_id, account_id, cost_center_id, 
    EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date)
)
SELECT 
  bd.budget_id,
  bd.company_id,
  bd.year,
  bd.budget_name,
  bd.scenario_type,
  bd.version,
  bd.is_active,
  bd.account_id,
  a.account_code,
  a.account_name,
  a.category_type,
  bd.cost_center_id,
  cc.name as cost_center_name,
  bd.month,
  COALESCE(bd.planned_amount, 0) as budget_amount,
  COALESCE(ad.actual_amount, 0) as actual_amount,
  COALESCE(ad.actual_amount, 0) - COALESCE(bd.planned_amount, 0) as variance_amount,
  CASE 
    WHEN COALESCE(bd.planned_amount, 0) = 0 THEN 0
    ELSE ((COALESCE(ad.actual_amount, 0) - COALESCE(bd.planned_amount, 0)) / bd.planned_amount * 100)
  END as variance_percent,
  CASE 
    WHEN a.category_type = 'receita' THEN
      CASE WHEN COALESCE(ad.actual_amount, 0) >= COALESCE(bd.planned_amount, 0) THEN 'favorable' ELSE 'unfavorable' END
    ELSE
      CASE WHEN COALESCE(ad.actual_amount, 0) <= COALESCE(bd.planned_amount, 0) THEN 'favorable' ELSE 'unfavorable' END
  END as variance_status
FROM budget_data bd
LEFT JOIN actual_data ad ON ad.company_id = bd.company_id 
  AND ad.account_id = bd.account_id 
  AND COALESCE(ad.cost_center_id::text, '') = COALESCE(bd.cost_center_id::text, '')
  AND ad.year = bd.year 
  AND ad.month = bd.month
LEFT JOIN public.accounts a ON a.id = bd.account_id
LEFT JOIN public.cost_centers cc ON cc.id = bd.cost_center_id;

-- =====================================================
-- VIEW: Resumo de aprovações pendentes
-- =====================================================

CREATE OR REPLACE VIEW public.v_pending_budget_approvals AS
SELECT 
  bar.id as request_id,
  bar.budget_id,
  bm.name as budget_name,
  bm.year,
  bm.company_id,
  bar.status as request_status,
  bar.current_level,
  bar.total_levels,
  bar.requested_at,
  bas.id as step_id,
  bas.level_order,
  bas.approver_id,
  bas.status as step_status,
  bal.level_name
FROM public.budget_approval_requests bar
JOIN public.budget_master bm ON bm.id = bar.budget_id
LEFT JOIN public.budget_approval_steps bas ON bas.request_id = bar.id AND bas.level_order = bar.current_level
LEFT JOIN public.budget_approval_levels bal ON bal.id = bas.level_id
WHERE bar.status IN ('pending', 'in_review');
