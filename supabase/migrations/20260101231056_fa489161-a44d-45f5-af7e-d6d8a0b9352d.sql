-- =====================================================
-- MÓDULO IA AUTOPILOT - TABELAS FALTANTES
-- =====================================================

-- Conexões WhatsApp por empresa
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'whatsapp_cloud', 'evolution')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'pending', 'error')),
  phone_number TEXT,
  credentials_encrypted TEXT,
  settings_json JSONB DEFAULT '{}',
  webhook_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contatos WhatsApp autorizados
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  display_name TEXT,
  role TEXT DEFAULT 'operator' CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
  is_allowed BOOLEAN DEFAULT true,
  is_blocked BOOLEAN DEFAULT false,
  daily_limits_json JSONB DEFAULT '{"max_transactions": 50, "max_amount": 100000}',
  pin_hash TEXT,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, phone_e164)
);

-- Inbox de mensagens WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id UUID,
  contact_id UUID,
  provider_msg_id TEXT,
  phone TEXT NOT NULL,
  msg_type TEXT NOT NULL CHECK (msg_type IN ('text', 'audio', 'image', 'document', 'location', 'button_reply')),
  text_body TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  raw_json JSONB,
  direction TEXT DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'failed', 'replied')),
  processed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Arquivos recebidos
CREATE TABLE IF NOT EXISTS public.received_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  inbox_id UUID,
  storage_path TEXT,
  original_filename TEXT,
  file_type TEXT CHECK (file_type IN ('ofx', 'csv', 'xlsx', 'pdf', 'image', 'audio', 'other')),
  mime_type TEXT,
  sha256 TEXT,
  size_bytes INTEGER,
  parsed_status TEXT DEFAULT 'pending' CHECK (parsed_status IN ('pending', 'parsing', 'parsed', 'failed')),
  parsed_at TIMESTAMPTZ,
  meta_json JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fila de jobs assíncrona
CREATE TABLE IF NOT EXISTS public.jobs_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_json JSONB,
  result_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Requisições à IA
CREATE TABLE IF NOT EXISTS public.ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  inbox_id UUID,
  job_id UUID,
  file_id UUID,
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  input_json JSONB NOT NULL,
  output_json JSONB,
  raw_response JSONB,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_estimate NUMERIC(10,6),
  latency_ms INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Decisões da IA
CREATE TABLE IF NOT EXISTS public.ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  inbox_id UUID,
  ai_request_id UUID,
  intent TEXT NOT NULL CHECK (intent IN (
    'create_transaction', 'settle_transaction', 'create_and_settle',
    'import_bank_statement', 'query_report', 'undo_action', 'confirm_action', 'unknown'
  )),
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  proposed_actions_json JSONB NOT NULL DEFAULT '[]',
  needs_confirmation BOOLEAN DEFAULT false,
  missing_fields_json JSONB DEFAULT '[]',
  ambiguous_matches_json JSONB DEFAULT '[]',
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_reasons_json JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_confirmation', 'approved', 'rejected', 'executed', 'failed', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 hour'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Confirmações de decisões
CREATE TABLE IF NOT EXISTS public.ai_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL,
  state TEXT DEFAULT 'awaiting' CHECK (state IN ('awaiting', 'approved', 'rejected', 'expired')),
  confirmation_type TEXT CHECK (confirmation_type IN ('button', 'text', 'pin', 'auto')),
  selected_option INTEGER,
  approved_by_phone TEXT,
  approved_by_user_id UUID,
  pin_verified BOOLEAN DEFAULT false,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Resultados de ações executadas
CREATE TABLE IF NOT EXISTS public.ai_action_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL,
  confirmation_id UUID,
  executed_actions_json JSONB NOT NULL DEFAULT '[]',
  created_ids_json JSONB DEFAULT '{}',
  affected_tables_json JSONB DEFAULT '[]',
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed', 'rolled_back')),
  error_json JSONB,
  can_rollback BOOLEAN DEFAULT true,
  rolled_back_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rollbacks de ações
CREATE TABLE IF NOT EXISTS public.action_rollbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_result_id UUID NOT NULL,
  rollback_payload_json JSONB NOT NULL,
  rollback_status TEXT DEFAULT 'pending' CHECK (rollback_status IN ('pending', 'completed', 'failed')),
  rollback_error TEXT,
  requested_by_phone TEXT,
  requested_by_user_id UUID,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Regras de automação
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('categorize', 'wallet_alias', 'counterparty_alias', 'reconcile', 'document_match', 'tax_hint')),
  pattern_type TEXT NOT NULL DEFAULT 'contains' CHECK (pattern_type IN ('contains', 'regex', 'exact')),
  pattern TEXT NOT NULL,
  conditions_json JSONB DEFAULT '{}',
  action_json JSONB NOT NULL DEFAULT '{}',
  priority INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'feedback', 'import', 'system')),
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback de correções
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  decision_id UUID,
  action_result_id UUID,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('correction', 'approval', 'rejection', 'suggestion')),
  original_json JSONB,
  correction_json JSONB,
  field_corrected TEXT,
  generated_rule_id UUID,
  rule_approved BOOLEAN,
  user_id UUID,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Importações de extratos
CREATE TABLE IF NOT EXISTS public.bank_statement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  wallet_id UUID,
  source TEXT DEFAULT 'upload' CHECK (source IN ('upload', 'whatsapp', 'api', 'open_banking')),
  file_id UUID,
  original_filename TEXT,
  file_format TEXT CHECK (file_format IN ('ofx', 'csv', 'xlsx', 'pdf', 'other')),
  period_start DATE,
  period_end DATE,
  opening_balance NUMERIC(15,2),
  closing_balance NUMERIC(15,2),
  total_credits NUMERIC(15,2),
  total_debits NUMERIC(15,2),
  line_count INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'parsing', 'parsed', 'reconciling', 'completed', 'failed')),
  summary_json JSONB DEFAULT '{}',
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sugestões de conciliação
CREATE TABLE IF NOT EXISTS public.reconciliation_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  import_id UUID,
  statement_line_id UUID NOT NULL,
  candidate_type TEXT NOT NULL CHECK (candidate_type IN ('transaction', 'ap_open', 'ar_open', 'installment')),
  candidate_id UUID NOT NULL,
  score NUMERIC(3,2) CHECK (score >= 0 AND score <= 1),
  match_reasons_json JSONB DEFAULT '[]',
  differences_json JSONB DEFAULT '{}',
  rule_id UUID,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbox_company_received ON public.whatsapp_inbox(company_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inbox_phone ON public.whatsapp_inbox(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inbox_status ON public.whatsapp_inbox(status);
CREATE INDEX IF NOT EXISTS idx_jobs_queue_status ON public.jobs_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_jobs_queue_company ON public.jobs_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_company_status ON public.ai_decisions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_inbox ON public.ai_decisions(inbox_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_company_active ON public.automation_rules(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_automation_rules_pattern ON public.automation_rules(pattern);
CREATE INDEX IF NOT EXISTS idx_bank_statement_imports_company ON public.bank_statement_imports(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliation_suggestions_line ON public.reconciliation_suggestions(statement_line_id);
CREATE INDEX IF NOT EXISTS idx_received_files_sha256 ON public.received_files(sha256);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.received_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_rollbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_suggestions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "whatsapp_connections_company_access" ON public.whatsapp_connections FOR ALL USING (public.user_has_company_access(company_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "whatsapp_contacts_company_access" ON public.whatsapp_contacts FOR ALL USING (public.user_has_company_access(company_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "whatsapp_inbox_company_access" ON public.whatsapp_inbox FOR ALL USING (public.user_has_company_access(company_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "received_files_company_access" ON public.received_files FOR ALL USING (public.user_has_company_access(company_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "jobs_queue_company_access" ON public.jobs_queue FOR ALL USING (public.user_has_company_access(company_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "ai_requests_company_access" ON public.ai_requests FOR ALL USING (public.user_has_company_access(company_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "ai_decisions_company_access" ON public.ai_decisions FOR ALL USING (public.user_has_company_access(company_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "ai_confirmations_company_access" ON public.ai_confirmations FOR ALL USING (public.user_has_company_access(company_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "ai_action_results_company_access" ON public.ai_action_results FOR ALL USING (public.user_has_company_access(company_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "action_rollbacks_company_access" ON public.action_rollbacks FOR ALL USING (public.user_has_company_access(company_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "automation_rules_company_access" ON public.automation_rules FOR ALL USING (public.user_has_company_access(company_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "ai_feedback_company_access" ON public.ai_feedback FOR ALL USING (public.user_has_company_access(company_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "bank_statement_imports_company_access" ON public.bank_statement_imports FOR ALL USING (public.user_has_company_access(company_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "reconciliation_suggestions_company_access" ON public.reconciliation_suggestions FOR ALL USING (public.user_has_company_access(company_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =====================================================
-- TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_whatsapp_connections_updated_at ON public.whatsapp_connections;
CREATE TRIGGER update_whatsapp_connections_updated_at BEFORE UPDATE ON public.whatsapp_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_whatsapp_contacts_updated_at ON public.whatsapp_contacts;
CREATE TRIGGER update_whatsapp_contacts_updated_at BEFORE UPDATE ON public.whatsapp_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_automation_rules_updated_at ON public.automation_rules;
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_bank_statement_imports_updated_at ON public.bank_statement_imports;
CREATE TRIGGER update_bank_statement_imports_updated_at BEFORE UPDATE ON public.bank_statement_imports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('whatsapp-files', 'whatsapp-files', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/x-ofx', 'audio/ogg', 'audio/mpeg'])
ON CONFLICT (id) DO NOTHING;