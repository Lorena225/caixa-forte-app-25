-- =====================================================
-- MÓDULO CRM/VENDAS - Fase 1: Pipeline, Funil e Comissões
-- =====================================================

-- 1. Tabela de Vendedores
CREATE TABLE public.sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(20),
  cpf VARCHAR(14),
  hire_date DATE,
  termination_date DATE,
  base_commission_percent DECIMAL(5,2) DEFAULT 0,
  commission_type VARCHAR(20) DEFAULT 'percentage', -- percentage, fixed, tiered
  team_id UUID,
  manager_id UUID REFERENCES public.sellers(id),
  is_active BOOLEAN DEFAULT true,
  goal_monthly DECIMAL(18,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- 2. Tabela de Estágios do Pipeline
CREATE TABLE public.pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  position INTEGER NOT NULL DEFAULT 0,
  probability INTEGER DEFAULT 0, -- 0-100%
  days_expected INTEGER DEFAULT 7,
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de Leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code VARCHAR(20),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(20),
  company_name VARCHAR(200),
  position VARCHAR(100),
  source VARCHAR(50), -- website, referral, cold_call, marketing, social, event
  source_detail TEXT,
  status VARCHAR(20) DEFAULT 'new', -- new, contacted, qualified, unqualified, converted
  temperature VARCHAR(10) DEFAULT 'warm', -- cold, warm, hot
  seller_id UUID REFERENCES public.sellers(id),
  notes TEXT,
  converted_at TIMESTAMPTZ,
  converted_to_opportunity_id UUID,
  converted_to_counterparty_id UUID,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  last_contact_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de Oportunidades (Pipeline)
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code VARCHAR(20),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  counterparty_id UUID REFERENCES public.counterparties(id),
  lead_id UUID REFERENCES public.leads(id),
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id),
  seller_id UUID REFERENCES public.sellers(id),
  amount DECIMAL(18,2) DEFAULT 0,
  probability INTEGER DEFAULT 0, -- 0-100%
  expected_close_date DATE,
  actual_close_date DATE,
  status VARCHAR(20) DEFAULT 'open', -- open, won, lost
  loss_reason VARCHAR(100),
  loss_notes TEXT,
  won_venda_id UUID,
  source VARCHAR(50),
  priority VARCHAR(10) DEFAULT 'medium', -- low, medium, high
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  next_step TEXT,
  next_step_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabela de Atividades do CRM
CREATE TABLE public.crm_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES public.counterparties(id),
  seller_id UUID REFERENCES public.sellers(id),
  activity_type VARCHAR(30) NOT NULL, -- call, email, meeting, task, note, proposal, visit
  subject VARCHAR(300) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  outcome VARCHAR(50), -- positive, neutral, negative, no_answer
  next_action TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tabela de Regras de Comissão
CREATE TABLE public.commission_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  rule_type VARCHAR(30) DEFAULT 'percentage', -- percentage, fixed, tiered, goal_based
  base_percent DECIMAL(5,2) DEFAULT 0,
  fixed_amount DECIMAL(18,2) DEFAULT 0,
  applies_to VARCHAR(30) DEFAULT 'all', -- all, category, product, seller
  category_id UUID,
  product_id UUID,
  seller_id UUID REFERENCES public.sellers(id),
  min_amount DECIMAL(18,2),
  max_amount DECIMAL(18,2),
  tiers_json JSONB DEFAULT '[]', -- [{from: 0, to: 10000, percent: 5}, ...]
  goal_percent_bonus DECIMAL(5,2) DEFAULT 0, -- bonus if goal is reached
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Tabela de Comissões Calculadas
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.sellers(id),
  venda_id UUID,
  opportunity_id UUID REFERENCES public.opportunities(id),
  rule_id UUID REFERENCES public.commission_rules(id),
  reference_period VARCHAR(7), -- YYYY-MM
  sale_amount DECIMAL(18,2) NOT NULL,
  commission_percent DECIMAL(5,2),
  commission_amount DECIMAL(18,2) NOT NULL,
  bonus_amount DECIMAL(18,2) DEFAULT 0,
  total_amount DECIMAL(18,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid, cancelled
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  paid_at TIMESTAMPTZ,
  payment_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Tabela de Metas de Vendas
CREATE TABLE public.sales_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.sellers(id),
  team_id UUID,
  goal_type VARCHAR(20) DEFAULT 'revenue', -- revenue, quantity, margin, opportunities
  period_type VARCHAR(10) DEFAULT 'monthly', -- daily, weekly, monthly, quarterly, yearly
  period_year INTEGER NOT NULL,
  period_month INTEGER, -- null for yearly
  period_quarter INTEGER, -- null for monthly/yearly
  target_amount DECIMAL(18,2) NOT NULL,
  achieved_amount DECIMAL(18,2) DEFAULT 0,
  achievement_percent DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active', -- active, achieved, missed
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, seller_id, goal_type, period_type, period_year, period_month)
);

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;

-- Sellers
CREATE POLICY "sellers_select" ON public.sellers FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "sellers_insert" ON public.sellers FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "sellers_update" ON public.sellers FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "sellers_delete" ON public.sellers FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Pipeline Stages
CREATE POLICY "pipeline_stages_select" ON public.pipeline_stages FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "pipeline_stages_insert" ON public.pipeline_stages FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "pipeline_stages_update" ON public.pipeline_stages FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "pipeline_stages_delete" ON public.pipeline_stages FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Leads
CREATE POLICY "leads_select" ON public.leads FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "leads_insert" ON public.leads FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "leads_update" ON public.leads FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "leads_delete" ON public.leads FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Opportunities
CREATE POLICY "opportunities_select" ON public.opportunities FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "opportunities_insert" ON public.opportunities FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "opportunities_update" ON public.opportunities FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "opportunities_delete" ON public.opportunities FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- CRM Activities
CREATE POLICY "crm_activities_select" ON public.crm_activities FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "crm_activities_insert" ON public.crm_activities FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "crm_activities_update" ON public.crm_activities FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "crm_activities_delete" ON public.crm_activities FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Commission Rules
CREATE POLICY "commission_rules_select" ON public.commission_rules FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "commission_rules_insert" ON public.commission_rules FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "commission_rules_update" ON public.commission_rules FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "commission_rules_delete" ON public.commission_rules FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Commissions
CREATE POLICY "commissions_select" ON public.commissions FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "commissions_insert" ON public.commissions FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "commissions_update" ON public.commissions FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "commissions_delete" ON public.commissions FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Sales Goals
CREATE POLICY "sales_goals_select" ON public.sales_goals FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "sales_goals_insert" ON public.sales_goals FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "sales_goals_update" ON public.sales_goals FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "sales_goals_delete" ON public.sales_goals FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX idx_sellers_company ON public.sellers(company_id);
CREATE INDEX idx_sellers_active ON public.sellers(company_id, is_active);
CREATE INDEX idx_pipeline_stages_company ON public.pipeline_stages(company_id, position);
CREATE INDEX idx_leads_company ON public.leads(company_id);
CREATE INDEX idx_leads_status ON public.leads(company_id, status);
CREATE INDEX idx_leads_seller ON public.leads(seller_id);
CREATE INDEX idx_opportunities_company ON public.opportunities(company_id);
CREATE INDEX idx_opportunities_stage ON public.opportunities(stage_id);
CREATE INDEX idx_opportunities_seller ON public.opportunities(seller_id);
CREATE INDEX idx_opportunities_status ON public.opportunities(company_id, status);
CREATE INDEX idx_crm_activities_opportunity ON public.crm_activities(opportunity_id);
CREATE INDEX idx_crm_activities_lead ON public.crm_activities(lead_id);
CREATE INDEX idx_crm_activities_seller ON public.crm_activities(seller_id);
CREATE INDEX idx_commission_rules_company ON public.commission_rules(company_id, is_active);
CREATE INDEX idx_commissions_seller ON public.commissions(seller_id);
CREATE INDEX idx_commissions_period ON public.commissions(company_id, reference_period);
CREATE INDEX idx_commissions_status ON public.commissions(company_id, status);
CREATE INDEX idx_sales_goals_seller ON public.sales_goals(seller_id);
CREATE INDEX idx_sales_goals_period ON public.sales_goals(company_id, period_year, period_month);

-- =====================================================
-- Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sellers_updated_at BEFORE UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
CREATE TRIGGER trg_pipeline_stages_updated_at BEFORE UPDATE ON public.pipeline_stages FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
CREATE TRIGGER trg_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
CREATE TRIGGER trg_crm_activities_updated_at BEFORE UPDATE ON public.crm_activities FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
CREATE TRIGGER trg_commission_rules_updated_at BEFORE UPDATE ON public.commission_rules FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
CREATE TRIGGER trg_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
CREATE TRIGGER trg_sales_goals_updated_at BEFORE UPDATE ON public.sales_goals FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

-- =====================================================
-- Function: Auto-generate codes
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_crm_code()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix TEXT;
  v_seq INTEGER;
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    v_prefix := CASE TG_TABLE_NAME
      WHEN 'leads' THEN 'LEAD'
      WHEN 'opportunities' THEN 'OPP'
      WHEN 'sellers' THEN 'VND'
      ELSE 'CRM'
    END;
    
    EXECUTE format('SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM ''[0-9]+$'') AS INTEGER)), 0) + 1 FROM public.%I WHERE company_id = $1', TG_TABLE_NAME)
    INTO v_seq
    USING NEW.company_id;
    
    NEW.code := v_prefix || LPAD(v_seq::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_leads_generate_code BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION generate_crm_code();
CREATE TRIGGER trg_opportunities_generate_code BEFORE INSERT ON public.opportunities FOR EACH ROW EXECUTE FUNCTION generate_crm_code();
CREATE TRIGGER trg_sellers_generate_code BEFORE INSERT ON public.sellers FOR EACH ROW EXECUTE FUNCTION generate_crm_code();