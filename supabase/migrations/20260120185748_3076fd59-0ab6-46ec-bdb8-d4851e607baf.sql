-- =====================================================
-- PLATFORM INNOVATION: AI + Open Finance + Embedded Finance
-- =====================================================

-- 1. FINANCIAL SIMULATIONS & SCENARIOS
CREATE TABLE public.financial_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT NOT NULL DEFAULT 'what_if' CHECK (scenario_type IN ('what_if', 'forecast', 'stress_test', 'custom')),
  base_date DATE NOT NULL DEFAULT CURRENT_DATE,
  horizon_days INTEGER NOT NULL DEFAULT 90,
  parameters_json JSONB NOT NULL DEFAULT '{}',
  results_json JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
  ai_analysis TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. ANOMALY DETECTION
CREATE TABLE public.anomaly_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  detection_type TEXT NOT NULL CHECK (detection_type IN ('value', 'pattern', 'timing', 'counterparty', 'cost_center', 'frequency')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  ai_explanation TEXT,
  details_json JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'confirmed', 'false_positive', 'resolved')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. INTELLIGENT APPROVAL WORKFLOWS
CREATE TABLE public.approval_ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('ap', 'purchase_order', 'contract', 'project', 'expense')),
  entity_id UUID NOT NULL,
  priority_suggested TEXT CHECK (priority_suggested IN ('low', 'normal', 'high', 'urgent')),
  approver_suggested UUID REFERENCES auth.users(id),
  risk_flags JSONB DEFAULT '[]',
  recommendation TEXT,
  confidence_score NUMERIC(5,2),
  ai_reasoning TEXT,
  user_followed_suggestion BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. OPEN FINANCE CONNECTIONS
CREATE TABLE public.open_finance_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  institution_id TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  institution_logo_url TEXT,
  connection_type TEXT NOT NULL DEFAULT 'data' CHECK (connection_type IN ('data', 'payment', 'both')),
  consent_id TEXT,
  consent_expires_at TIMESTAMP WITH TIME ZONE,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'expired', 'revoked', 'error')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  accounts_linked JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. OPEN FINANCE SYNC LOGS
CREATE TABLE public.open_finance_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.open_finance_connections(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('balance', 'transactions', 'statement', 'payment_status')),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'success', 'partial', 'failed')),
  records_fetched INTEGER DEFAULT 0,
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 6. PIX/OPEN FINANCE PAYMENT INSTRUCTIONS
CREATE TABLE public.payment_instructions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.open_finance_connections(id),
  transaction_id UUID REFERENCES public.transactions(id),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('pix', 'ted', 'boleto', 'debito_automatico')),
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  beneficiary_name TEXT NOT NULL,
  beneficiary_document TEXT,
  beneficiary_bank_code TEXT,
  beneficiary_agency TEXT,
  beneficiary_account TEXT,
  pix_key TEXT,
  pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'evp')),
  scheduled_date DATE,
  end_to_end_id TEXT,
  external_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'processing', 'completed', 'failed', 'cancelled')),
  status_history JSONB DEFAULT '[]',
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. EMBEDDED FINANCE - FINANCIAL SERVICES
CREATE TABLE public.financial_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('receivables_anticipation', 'credit_line', 'digital_wallet', 'insurance', 'investment')),
  provider_id TEXT,
  provider_name TEXT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'pending', 'active', 'suspended')),
  settings_json JSONB DEFAULT '{}',
  limits_json JSONB DEFAULT '{}',
  activated_at TIMESTAMP WITH TIME ZONE,
  activated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. RECEIVABLES ANTICIPATION OPERATIONS
CREATE TABLE public.anticipation_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.financial_services(id),
  operation_number TEXT,
  receivable_ids JSONB NOT NULL DEFAULT '[]',
  total_face_value NUMERIC(15,2) NOT NULL,
  total_anticipation_value NUMERIC(15,2) NOT NULL,
  discount_rate NUMERIC(8,4) NOT NULL,
  fee_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  iof_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(15,2) NOT NULL,
  settlement_date DATE,
  status TEXT NOT NULL DEFAULT 'simulated' CHECK (status IN ('simulated', 'requested', 'approved', 'disbursed', 'completed', 'cancelled')),
  simulation_expires_at TIMESTAMP WITH TIME ZONE,
  provider_response_json JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. REVENUE SHARE TRACKING (Platform Economics)
CREATE TABLE public.platform_revenue_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('anticipation', 'credit', 'payment', 'insurance', 'other')),
  operation_id UUID,
  operation_table TEXT,
  gross_amount NUMERIC(15,2) NOT NULL,
  platform_fee_percent NUMERIC(6,4),
  platform_fee_amount NUMERIC(15,2) NOT NULL,
  partner_share_percent NUMERIC(6,4),
  partner_share_amount NUMERIC(15,2) DEFAULT 0,
  net_platform_revenue NUMERIC(15,2) NOT NULL,
  billing_period_start DATE,
  billing_period_end DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'billed', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. DEMAND FORECAST (Supply Chain Predictive)
CREATE TABLE public.demand_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID,
  product_code TEXT,
  forecast_date DATE NOT NULL,
  forecast_horizon_days INTEGER NOT NULL DEFAULT 30,
  predicted_quantity NUMERIC(15,4) NOT NULL,
  confidence_interval_low NUMERIC(15,4),
  confidence_interval_high NUMERIC(15,4),
  confidence_percent NUMERIC(5,2),
  historical_data_points INTEGER,
  seasonality_factor NUMERIC(8,4),
  trend_factor NUMERIC(8,4),
  ai_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. PURCHASE RECOMMENDATIONS (MRP AI)
CREATE TABLE public.purchase_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID,
  product_code TEXT NOT NULL,
  product_name TEXT,
  current_stock NUMERIC(15,4) NOT NULL DEFAULT 0,
  min_stock NUMERIC(15,4),
  max_stock NUMERIC(15,4),
  avg_daily_demand NUMERIC(15,4),
  lead_time_days INTEGER DEFAULT 7,
  recommended_qty NUMERIC(15,4) NOT NULL,
  recommended_order_date DATE,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  ai_reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'ordered')),
  purchase_order_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12. REAL-TIME LIQUIDITY ALERTS
CREATE TABLE public.liquidity_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('negative_balance', 'low_balance', 'high_concentration', 'cash_burn', 'payment_risk')),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  alert_date DATE NOT NULL,
  projected_balance NUMERIC(15,2),
  days_until_negative INTEGER,
  affected_accounts JSONB DEFAULT '[]',
  recommended_actions JSONB DEFAULT '[]',
  ai_summary TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  dismissed_by UUID REFERENCES auth.users(id),
  dismissed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 13. CFO VIRTUAL - INSIGHTS CACHE
CREATE TABLE public.cfo_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('risk', 'opportunity', 'recommendation', 'alert', 'trend')),
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  detailed_analysis TEXT,
  data_json JSONB,
  suggested_actions JSONB DEFAULT '[]',
  valid_until TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 14. USER DASHBOARD PERSONAS
CREATE TABLE public.user_dashboard_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  persona TEXT NOT NULL DEFAULT 'general' CHECK (persona IN ('ceo', 'cfo', 'financial', 'purchasing', 'sales', 'controller', 'general')),
  widgets_config JSONB DEFAULT '[]',
  kpis_priority JSONB DEFAULT '[]',
  alert_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.financial_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_finance_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_finance_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anticipation_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_revenue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidity_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfo_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies using the existing helper function
CREATE POLICY "financial_scenarios_company_access" ON public.financial_scenarios
  FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "anomaly_detections_company_access" ON public.anomaly_detections
  FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "approval_ai_suggestions_company_access" ON public.approval_ai_suggestions
  FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "open_finance_connections_company_access" ON public.open_finance_connections
  FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "open_finance_sync_logs_company_access" ON public.open_finance_sync_logs
  FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "payment_instructions_company_access" ON public.payment_instructions
  FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "financial_services_company_access" ON public.financial_services
  FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "anticipation_operations_company_access" ON public.anticipation_operations
  FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "platform_revenue_events_company_access" ON public.platform_revenue_events
  FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "demand_forecasts_company_access" ON public.demand_forecasts
  FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "purchase_recommendations_company_access" ON public.purchase_recommendations
  FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "liquidity_alerts_company_access" ON public.liquidity_alerts
  FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "cfo_insights_company_access" ON public.cfo_insights
  FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "user_dashboard_preferences_user_access" ON public.user_dashboard_preferences
  FOR ALL USING (user_id = auth.uid() AND public.user_belongs_to_company(company_id));

-- Indexes for performance
CREATE INDEX idx_financial_scenarios_company ON public.financial_scenarios(company_id, status);
CREATE INDEX idx_anomaly_detections_company_status ON public.anomaly_detections(company_id, status, severity);
CREATE INDEX idx_open_finance_connections_company ON public.open_finance_connections(company_id, status);
CREATE INDEX idx_payment_instructions_company ON public.payment_instructions(company_id, status);
CREATE INDEX idx_anticipation_operations_company ON public.anticipation_operations(company_id, status);
CREATE INDEX idx_liquidity_alerts_company ON public.liquidity_alerts(company_id, is_dismissed, created_at DESC);
CREATE INDEX idx_cfo_insights_company ON public.cfo_insights(company_id, is_read, created_at DESC);
CREATE INDEX idx_demand_forecasts_company_product ON public.demand_forecasts(company_id, product_id, forecast_date);
CREATE INDEX idx_purchase_recommendations_company ON public.purchase_recommendations(company_id, status, urgency);