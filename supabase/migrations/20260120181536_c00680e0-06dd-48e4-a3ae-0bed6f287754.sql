-- =====================================================
-- MÓDULO IA / CHATGPT FINANCEIRO - ESTRUTURA COMPLETA
-- =====================================================

-- 1. Extensão da tabela ai_company_settings para configurações avançadas
ALTER TABLE public.ai_company_settings 
ADD COLUMN IF NOT EXISTS whatsapp_provider TEXT DEFAULT 'whatsapp_cloud',
ADD COLUMN IF NOT EXISTS whatsapp_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS default_ai_model TEXT DEFAULT 'google/gemini-3-flash-preview',
ADD COLUMN IF NOT EXISTS risk_tolerance TEXT DEFAULT 'medium' CHECK (risk_tolerance IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS agent_whatsapp_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS agent_monitor_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS agent_analyst_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS monitor_alert_cooldown_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS monitor_digest_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS monitor_digest_time TEXT DEFAULT '08:00';

-- 2. Tabela de logs de IA (genérica para todos os agentes)
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  agent_type TEXT NOT NULL CHECK (agent_type IN ('whatsapp', 'monitor', 'analyst')),
  origin TEXT NOT NULL DEFAULT 'system' CHECK (origin IN ('whatsapp', 'system_event', 'chat_internal', 'api', 'scheduled')),
  input_raw JSONB,
  input_text TEXT,
  interpretation JSONB,
  action_executed JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('success', 'error', 'pending_approval', 'processing', 'cancelled')),
  reference_entity_type TEXT,
  reference_entity_id UUID,
  latency_ms INTEGER,
  tokens_used INTEGER,
  cost_estimate DECIMAL(10, 6),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_logs_company ON public.ai_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_agent_type ON public.ai_logs(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_logs_status ON public.ai_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON public.ai_logs(created_at DESC);

-- RLS para ai_logs
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_logs_select" ON public.ai_logs
  FOR SELECT USING (public.user_belongs_to_company(company_id));

CREATE POLICY "ai_logs_insert" ON public.ai_logs
  FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));

-- 3. Tabela de mensagens WhatsApp do agente
CREATE TABLE IF NOT EXISTS public.ai_whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  phone_sender TEXT NOT NULL,
  phone_e164 TEXT,
  message_text TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'document', 'video')),
  attachments_json JSONB DEFAULT '[]',
  mapped_user_id UUID REFERENCES auth.users(id),
  mapped_counterparty_id UUID,
  suggested_action JSONB,
  action_status TEXT DEFAULT 'received' CHECK (action_status IN ('received', 'processing', 'suggested', 'approved', 'executed', 'rejected', 'error')),
  executed_at TIMESTAMPTZ,
  executed_by UUID REFERENCES auth.users(id),
  ai_log_id UUID REFERENCES public.ai_logs(id),
  confidence_score DECIMAL(5, 4),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_whatsapp_company ON public.ai_whatsapp_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_whatsapp_phone ON public.ai_whatsapp_messages(phone_sender);
CREATE INDEX IF NOT EXISTS idx_ai_whatsapp_status ON public.ai_whatsapp_messages(action_status);
CREATE INDEX IF NOT EXISTS idx_ai_whatsapp_created ON public.ai_whatsapp_messages(created_at DESC);

-- RLS
ALTER TABLE public.ai_whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_whatsapp_messages_select" ON public.ai_whatsapp_messages
  FOR SELECT USING (public.user_belongs_to_company(company_id));

CREATE POLICY "ai_whatsapp_messages_insert" ON public.ai_whatsapp_messages
  FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "ai_whatsapp_messages_update" ON public.ai_whatsapp_messages
  FOR UPDATE USING (public.user_belongs_to_company(company_id));

-- 4. Tabela de alertas do Monitor Financeiro
CREATE TABLE IF NOT EXISTS public.ai_monitor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'cash_flow_negative', 'cash_flow_critical',
    'overdue_increase', 'overdue_critical',
    'margin_decrease', 'margin_critical',
    'customer_concentration', 'supplier_concentration',
    'expense_increase', 'revenue_decrease',
    'budget_exceeded', 'goal_at_risk',
    'payment_due', 'collection_opportunity',
    'anomaly_detected', 'custom'
  )),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message_summary TEXT NOT NULL,
  details_json JSONB,
  suggested_actions JSONB,
  reference_entity_type TEXT,
  reference_entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  ai_log_id UUID REFERENCES public.ai_logs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_monitor_company ON public.ai_monitor_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_monitor_type ON public.ai_monitor_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_ai_monitor_severity ON public.ai_monitor_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_ai_monitor_read ON public.ai_monitor_alerts(is_read) WHERE NOT is_dismissed;
CREATE INDEX IF NOT EXISTS idx_ai_monitor_created ON public.ai_monitor_alerts(created_at DESC);

-- RLS
ALTER TABLE public.ai_monitor_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_monitor_alerts_select" ON public.ai_monitor_alerts
  FOR SELECT USING (public.user_belongs_to_company(company_id));

CREATE POLICY "ai_monitor_alerts_insert" ON public.ai_monitor_alerts
  FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "ai_monitor_alerts_update" ON public.ai_monitor_alerts
  FOR UPDATE USING (public.user_belongs_to_company(company_id));

-- 5. Tabela de conversas do Agente Analista
CREATE TABLE IF NOT EXISTS public.ai_analyst_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT,
  is_archived BOOLEAN DEFAULT false,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.ai_analyst_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_analyst_conversations_select" ON public.ai_analyst_conversations
  FOR SELECT USING (public.user_belongs_to_company(company_id));

CREATE POLICY "ai_analyst_conversations_insert" ON public.ai_analyst_conversations
  FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "ai_analyst_conversations_update" ON public.ai_analyst_conversations
  FOR UPDATE USING (public.user_belongs_to_company(company_id));

CREATE POLICY "ai_analyst_conversations_delete" ON public.ai_analyst_conversations
  FOR DELETE USING (public.user_belongs_to_company(company_id));

-- 6. Tabela de mensagens do chat do Agente Analista
CREATE TABLE IF NOT EXISTS public.ai_analyst_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_analyst_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'table', 'chart', 'link', 'mixed')),
  metadata_json JSONB,
  query_executed TEXT,
  ai_log_id UUID REFERENCES public.ai_logs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_analyst_messages_conv ON public.ai_analyst_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyst_messages_created ON public.ai_analyst_messages(created_at);

-- RLS via conversation
ALTER TABLE public.ai_analyst_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_analyst_messages_select" ON public.ai_analyst_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ai_analyst_conversations c
      WHERE c.id = conversation_id
      AND public.user_belongs_to_company(c.company_id)
    )
  );

CREATE POLICY "ai_analyst_messages_insert" ON public.ai_analyst_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_analyst_conversations c
      WHERE c.id = conversation_id
      AND public.user_belongs_to_company(c.company_id)
    )
  );

-- 7. Trigger para atualizar last_message_at na conversa
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_analyst_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.ai_analyst_messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON public.ai_analyst_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

-- 8. View para contagem de alertas não lidos por empresa
CREATE OR REPLACE VIEW public.v_ai_alerts_summary AS
SELECT 
  company_id,
  COUNT(*) FILTER (WHERE NOT is_read AND NOT is_dismissed) as unread_count,
  COUNT(*) FILTER (WHERE severity = 'critical' AND NOT is_dismissed) as critical_count,
  COUNT(*) FILTER (WHERE severity = 'warning' AND NOT is_dismissed) as warning_count,
  MAX(created_at) as latest_alert_at
FROM public.ai_monitor_alerts
GROUP BY company_id;

-- 9. Habilitar realtime para alertas
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_monitor_alerts;