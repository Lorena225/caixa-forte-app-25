-- =====================================================
-- AI INBOX & DECISION LOGS FOR INVISIBLE BANKING
-- =====================================================

-- Table: ai_inbox - Manages conversation state for WhatsApp/Voice
CREATE TABLE IF NOT EXISTS public.ai_inbox (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
    phone_number TEXT NOT NULL,
    conversation_state TEXT NOT NULL DEFAULT 'idle', -- idle, awaiting_confirmation, processing, completed
    context_json JSONB DEFAULT '{}',
    pending_action JSONB, -- Stores the action awaiting confirmation
    pending_entity_type TEXT, -- 'transaction', 'counterparty', etc.
    pending_entity_data JSONB,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: ai_decision_logs - Audit trail for AI decisions
CREATE TABLE IF NOT EXISTS public.ai_decision_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    decision_type TEXT NOT NULL, -- 'categorization', 'ocr', 'voice_intent', 'anomaly'
    input_type TEXT NOT NULL, -- 'text', 'image', 'audio', 'auto'
    input_summary TEXT,
    extracted_data JSONB,
    reasoning TEXT NOT NULL, -- Why the AI made this decision
    confidence_score NUMERIC(5,2),
    rules_applied JSONB, -- Array of rules that led to this decision
    final_action TEXT,
    entity_type TEXT,
    entity_id UUID,
    user_id UUID REFERENCES auth.users(id),
    phone_number TEXT,
    was_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES auth.users(id),
    overridden BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: ai_morning_briefings - Daily digest configuration
CREATE TABLE IF NOT EXISTS public.ai_morning_briefings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    delivery_time TIME DEFAULT '08:00:00',
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    delivery_channels JSONB DEFAULT '["dashboard"]', -- dashboard, whatsapp, email
    include_balance BOOLEAN DEFAULT TRUE,
    include_bills_today BOOLEAN DEFAULT TRUE,
    include_overdue BOOLEAN DEFAULT TRUE,
    include_anomalies BOOLEAN DEFAULT TRUE,
    include_forecast BOOLEAN DEFAULT FALSE,
    last_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id)
);

-- Table: ai_briefing_history - History of sent briefings
CREATE TABLE IF NOT EXISTS public.ai_briefing_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    briefing_date DATE NOT NULL,
    content_json JSONB NOT NULL,
    balance_snapshot NUMERIC(15,2),
    bills_today_count INTEGER DEFAULT 0,
    bills_today_total NUMERIC(15,2) DEFAULT 0,
    anomalies_count INTEGER DEFAULT 0,
    delivered_to JSONB, -- Array of channels where it was delivered
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_inbox_company ON public.ai_inbox(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_inbox_phone ON public.ai_inbox(phone_number);
CREATE INDEX IF NOT EXISTS idx_ai_inbox_state ON public.ai_inbox(conversation_state) WHERE conversation_state != 'idle';
CREATE INDEX IF NOT EXISTS idx_ai_decision_logs_company ON public.ai_decision_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_decision_logs_entity ON public.ai_decision_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_briefing_history_date ON public.ai_briefing_history(company_id, briefing_date DESC);

-- Add personality settings to ai_company_settings if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_company_settings' 
        AND column_name = 'agent_tone'
    ) THEN
        ALTER TABLE public.ai_company_settings 
        ADD COLUMN agent_tone TEXT DEFAULT 'balanced'; -- formal, balanced, casual
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_company_settings' 
        AND column_name = 'voice_enabled'
    ) THEN
        ALTER TABLE public.ai_company_settings 
        ADD COLUMN voice_enabled BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_company_settings' 
        AND column_name = 'morning_briefing_enabled'
    ) THEN
        ALTER TABLE public.ai_company_settings 
        ADD COLUMN morning_briefing_enabled BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- RLS Policies
ALTER TABLE public.ai_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_decision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_morning_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_briefing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company ai_inbox"
ON public.ai_inbox FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can view their company decision logs"
ON public.ai_decision_logs FOR SELECT USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can insert decision logs for their company"
ON public.ai_decision_logs FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can manage their company briefing settings"
ON public.ai_morning_briefings FOR ALL USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can view their company briefing history"
ON public.ai_briefing_history FOR SELECT USING (public.user_belongs_to_company(company_id));

-- Enable realtime for ai_inbox
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_inbox;