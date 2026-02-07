-- ============================================
-- AI INSIGHTS TABLE (Proactive Intelligence Feed)
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('anomaly', 'suggestion', 'pattern', 'forecast', 'alert')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  data_json JSONB DEFAULT '{}',
  entity_type TEXT, -- 'transaction', 'counterparty', 'category', etc.
  entity_id UUID,
  z_score NUMERIC(10,4), -- For anomaly detection
  confidence_score NUMERIC(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  suggested_action TEXT,
  action_taken BOOLEAN DEFAULT FALSE,
  action_taken_at TIMESTAMPTZ,
  action_taken_by UUID,
  is_dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company insights"
  ON public.ai_insights FOR SELECT
  USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can update their company insights"
  ON public.ai_insights FOR UPDATE
  USING (public.user_belongs_to_company(company_id));

CREATE POLICY "System can insert insights"
  ON public.ai_insights FOR INSERT
  WITH CHECK (public.user_belongs_to_company(company_id));

-- Indexes for performance
CREATE INDEX idx_ai_insights_company_created ON public.ai_insights(company_id, created_at DESC);
CREATE INDEX idx_ai_insights_type_severity ON public.ai_insights(insight_type, severity);
CREATE INDEX idx_ai_insights_entity ON public.ai_insights(entity_type, entity_id);
CREATE INDEX idx_ai_insights_active ON public.ai_insights(company_id) WHERE is_dismissed = FALSE AND action_taken = FALSE;

-- ============================================
-- AI PERSONALITY SETTINGS (Add to ai_company_settings)
-- ============================================

ALTER TABLE public.ai_company_settings 
  ADD COLUMN IF NOT EXISTS personality_mode TEXT DEFAULT 'balanced' CHECK (personality_mode IN ('conservative', 'balanced', 'aggressive')),
  ADD COLUMN IF NOT EXISTS proactive_suggestions BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS anomaly_detection_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS anomaly_z_score_threshold NUMERIC(4,2) DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS auto_categorization_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ocr_enabled BOOLEAN DEFAULT TRUE;

-- ============================================
-- WHATSAPP OCR TRANSACTIONS (Pre-approval staging)
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_staged_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  whatsapp_message_id UUID REFERENCES public.whatsapp_inbox(id),
  source TEXT NOT NULL DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'chat', 'ocr', 'voice')),
  raw_input TEXT,
  ocr_confidence NUMERIC(5,2),
  parsed_data JSONB NOT NULL DEFAULT '{}',
  suggested_type TEXT CHECK (suggested_type IN ('income', 'expense')),
  suggested_amount NUMERIC(15,2),
  suggested_category_id UUID,
  suggested_description TEXT,
  suggested_counterparty_id UUID,
  suggested_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'modified')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_transaction_id UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_staged_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company staged transactions"
  ON public.ai_staged_transactions FOR SELECT
  USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can update their company staged transactions"
  ON public.ai_staged_transactions FOR UPDATE
  USING (public.user_belongs_to_company(company_id));

CREATE POLICY "System can insert staged transactions"
  ON public.ai_staged_transactions FOR INSERT
  WITH CHECK (public.user_belongs_to_company(company_id));

-- Indexes
CREATE INDEX idx_ai_staged_company_status ON public.ai_staged_transactions(company_id, status);
CREATE INDEX idx_ai_staged_pending ON public.ai_staged_transactions(company_id) WHERE status = 'pending';

-- ============================================
-- FUNCTION: Calculate Z-Score for Anomaly Detection
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_category_z_score(
  p_company_id UUID,
  p_category_id UUID,
  p_amount NUMERIC,
  p_months_lookback INTEGER DEFAULT 6
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mean NUMERIC;
  v_stddev NUMERIC;
  v_z_score NUMERIC;
BEGIN
  -- Calculate mean and stddev for the category in the lookback period
  SELECT 
    COALESCE(AVG(ABS(amount)), 0),
    COALESCE(STDDEV(ABS(amount)), 0)
  INTO v_mean, v_stddev
  FROM transactions
  WHERE company_id = p_company_id
    AND category_id = p_category_id
    AND transaction_date >= CURRENT_DATE - (p_months_lookback * 30)
    AND status = 'paid';

  -- Avoid division by zero
  IF v_stddev = 0 OR v_stddev IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate Z-Score
  v_z_score := (ABS(p_amount) - v_mean) / v_stddev;
  
  RETURN ROUND(v_z_score, 4);
END;
$$;

-- ============================================
-- TRIGGER: Auto-detect anomalies on transaction insert
-- ============================================

CREATE OR REPLACE FUNCTION public.detect_transaction_anomaly()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_z_score NUMERIC;
  v_threshold NUMERIC;
  v_settings RECORD;
BEGIN
  -- Get company AI settings
  SELECT anomaly_detection_enabled, anomaly_z_score_threshold
  INTO v_settings
  FROM ai_company_settings
  WHERE company_id = NEW.company_id;

  -- Skip if anomaly detection is disabled
  IF NOT COALESCE(v_settings.anomaly_detection_enabled, TRUE) THEN
    RETURN NEW;
  END IF;

  v_threshold := COALESCE(v_settings.anomaly_z_score_threshold, 3.0);

  -- Calculate Z-Score for this transaction
  v_z_score := calculate_category_z_score(
    NEW.company_id,
    NEW.category_id,
    NEW.amount
  );

  -- If anomaly detected, create insight
  IF v_z_score > v_threshold THEN
    INSERT INTO ai_insights (
      company_id,
      insight_type,
      severity,
      title,
      description,
      data_json,
      entity_type,
      entity_id,
      z_score,
      confidence_score,
      suggested_action
    ) VALUES (
      NEW.company_id,
      'anomaly',
      CASE 
        WHEN v_z_score > 5 THEN 'critical'
        WHEN v_z_score > 4 THEN 'warning'
        ELSE 'info'
      END,
      'Despesa Atípica Detectada',
      format('Transação de %s está %s desvios padrão acima da média para esta categoria.', 
        to_char(ABS(NEW.amount), 'FM999G999G999D00'),
        round(v_z_score, 1)
      ),
      jsonb_build_object(
        'transaction_id', NEW.id,
        'amount', NEW.amount,
        'category_id', NEW.category_id,
        'z_score', v_z_score,
        'threshold', v_threshold
      ),
      'transaction',
      NEW.id,
      v_z_score,
      LEAST(95, 70 + (v_z_score * 5)),
      'Revisar esta transação para confirmar se está correta.'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_detect_transaction_anomaly ON transactions;
CREATE TRIGGER trg_detect_transaction_anomaly
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION detect_transaction_anomaly();