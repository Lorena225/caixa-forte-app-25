-- =====================================================
-- SECURITY & RELIABILITY HARDENING PACK - COMPLETE
-- =====================================================

-- 1) WEBHOOK INGRESS TABLE (secure webhooks with HMAC, anti-replay, idempotency)
CREATE TABLE IF NOT EXISTS public.webhook_ingress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_event_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_hash TEXT NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  replay_detected BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'failed', 'rejected')),
  correlation_id UUID DEFAULT gen_random_uuid(),
  sanitized_headers_json JSONB DEFAULT '{}',
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint for replay prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_ingress_idempotency 
ON public.webhook_ingress (company_id, provider, external_event_id) 
WHERE external_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_ingress_payload_hash 
ON public.webhook_ingress (company_id, provider, payload_hash);
CREATE INDEX IF NOT EXISTS idx_webhook_ingress_status ON public.webhook_ingress (status, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_ingress_company ON public.webhook_ingress (company_id, received_at DESC);

ALTER TABLE public.webhook_ingress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company webhooks" ON public.webhook_ingress
  FOR SELECT USING (public.user_has_company_access(company_id));

-- 2) RATE LIMIT EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID,
  ip_address INET,
  action_type TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_end TIMESTAMPTZ NOT NULL,
  blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup 
ON public.rate_limit_events (action_type, ip_address, window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limit_user 
ON public.rate_limit_events (user_id, action_type, window_start) WHERE user_id IS NOT NULL;

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rate limit events" ON public.rate_limit_events
  FOR SELECT USING (
    company_id IS NULL OR 
    (public.user_has_company_access(company_id) AND public.has_role(auth.uid(), 'admin'))
  );

-- 3) LOGIN ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  lockout_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON public.login_attempts (ip_address, created_at DESC);

-- 4) ENHANCE AUDIT_LOGS TABLE
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS correlation_id UUID,
ADD COLUMN IF NOT EXISTS prev_hash TEXT,
ADD COLUMN IF NOT EXISTS entry_hash TEXT,
ADD COLUMN IF NOT EXISTS sensitivity_level TEXT DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS idx_audit_logs_hash_chain ON public.audit_logs (company_id, created_at, entry_hash);

-- 5) APPEND-ONLY POLICIES FOR AUDIT_LOGS
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Block update on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Block delete on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs are append-only insert" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs SELECT for company users" ON public.audit_logs;

CREATE POLICY "Audit logs are append-only insert" ON public.audit_logs
  FOR INSERT WITH CHECK (public.user_has_company_access(company_id));

CREATE POLICY "Audit logs SELECT for company users" ON public.audit_logs
  FOR SELECT USING (public.user_has_company_access(company_id));

CREATE POLICY "Block update on audit_logs" ON public.audit_logs
  FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Block delete on audit_logs" ON public.audit_logs
  FOR DELETE USING (false);

-- 6) AUDIT HASH GENERATION
CREATE OR REPLACE FUNCTION public.generate_audit_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_hash TEXT;
  v_content TEXT;
BEGIN
  SELECT entry_hash INTO v_prev_hash
  FROM audit_logs
  WHERE company_id = NEW.company_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;
  
  NEW.prev_hash := COALESCE(v_prev_hash, 'GENESIS');
  
  v_content := COALESCE(NEW.prev_hash, '') || '|' || 
               NEW.company_id::text || '|' ||
               COALESCE(NEW.user_id::text, '') || '|' ||
               NEW.table_name || '|' ||
               NEW.action || '|' ||
               COALESCE(NEW.record_id, '') || '|' ||
               COALESCE(NEW.old_data::text, '') || '|' ||
               COALESCE(NEW.new_data::text, '') || '|' ||
               NEW.created_at::text;
  
  NEW.entry_hash := encode(sha256(v_content::bytea), 'hex');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_hash ON public.audit_logs;
CREATE TRIGGER trg_audit_hash
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_audit_hash();

-- 7) SENSITIVE ACTION AUDIT FUNCTION
CREATE OR REPLACE FUNCTION public.audit_sensitive_action(
  p_company_id UUID,
  p_action TEXT,
  p_entity TEXT,
  p_entity_id TEXT,
  p_before_json JSONB DEFAULT NULL,
  p_after_json JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_correlation_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
  v_sensitivity TEXT := 'normal';
BEGIN
  IF p_action IN ('payment', 'reversal', 'bank_change', 'permission_change', 'key_rotation', 'period_close', 'period_reopen') THEN
    v_sensitivity := 'critical';
  ELSIF p_action IN ('import', 'export', 'reconciliation', 'cnab_return') THEN
    v_sensitivity := 'high';
  END IF;
  
  INSERT INTO audit_logs (
    company_id, table_name, record_id, action, 
    old_data, new_data, user_id,
    ip_address, user_agent, correlation_id, sensitivity_level
  ) VALUES (
    p_company_id, p_entity, p_entity_id, p_action,
    p_before_json, p_after_json, auth.uid(),
    p_ip_address, p_user_agent, COALESCE(p_correlation_id, gen_random_uuid()), v_sensitivity
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- 8) RATE LIMITING FUNCTION
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action_type TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_max_requests INTEGER DEFAULT 100,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (allowed BOOLEAN, current_count INTEGER, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ := now() - (p_window_seconds || ' seconds')::interval;
  v_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(event_count), 0) INTO v_count
  FROM rate_limit_events
  WHERE action_type = p_action_type
    AND window_start >= v_window_start
    AND ((p_ip_address IS NOT NULL AND ip_address = p_ip_address) OR
         (p_user_id IS NOT NULL AND user_id = p_user_id));
  
  IF v_count >= p_max_requests THEN
    INSERT INTO rate_limit_events (action_type, ip_address, user_id, window_start, window_end, blocked)
    VALUES (p_action_type, p_ip_address, p_user_id, now(), now() + (p_window_seconds || ' seconds')::interval, true);
    allowed := false; current_count := v_count; retry_after_seconds := p_window_seconds;
    RETURN NEXT; RETURN;
  END IF;
  
  INSERT INTO rate_limit_events (action_type, ip_address, user_id, window_start, window_end)
  VALUES (p_action_type, p_ip_address, p_user_id, now(), now() + (p_window_seconds || ' seconds')::interval);
  
  allowed := true; current_count := v_count + 1; retry_after_seconds := 0;
  RETURN NEXT;
END;
$$;

-- 9) LOGIN LOCKOUT FUNCTIONS
CREATE OR REPLACE FUNCTION public.check_login_lockout(p_email TEXT, p_ip_address INET DEFAULT NULL)
RETURNS TABLE (is_locked BOOLEAN, lockout_until TIMESTAMPTZ, failed_attempts INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_failed_count INTEGER; v_lockout TIMESTAMPTZ;
BEGIN
  SELECT la.lockout_until INTO v_lockout FROM login_attempts la
  WHERE la.email = p_email AND la.lockout_until > now()
  ORDER BY la.created_at DESC LIMIT 1;
  
  IF v_lockout IS NOT NULL THEN
    is_locked := true; lockout_until := v_lockout; failed_attempts := 0;
    RETURN NEXT; RETURN;
  END IF;
  
  SELECT COUNT(*) INTO v_failed_count FROM login_attempts la
  WHERE la.email = p_email AND la.success = false AND la.created_at > now() - interval '30 minutes';
  
  is_locked := false; lockout_until := NULL; failed_attempts := v_failed_count;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email TEXT, p_ip_address INET, p_user_agent TEXT, p_success BOOLEAN, p_failure_reason TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_failed_count INTEGER; v_lockout_minutes INTEGER; v_lockout_until TIMESTAMPTZ;
BEGIN
  IF NOT p_success THEN
    SELECT COUNT(*) INTO v_failed_count FROM login_attempts
    WHERE email = p_email AND success = false AND created_at > now() - interval '30 minutes';
    
    v_lockout_minutes := CASE
      WHEN v_failed_count >= 15 THEN 60
      WHEN v_failed_count >= 10 THEN 30
      WHEN v_failed_count >= 5 THEN 5
      WHEN v_failed_count >= 3 THEN 1
      ELSE 0 END;
    
    IF v_lockout_minutes > 0 THEN
      v_lockout_until := now() + (v_lockout_minutes || ' minutes')::interval;
    END IF;
  END IF;
  
  INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason, lockout_until)
  VALUES (p_email, p_ip_address, p_user_agent, p_success, p_failure_reason, v_lockout_until);
END;
$$;

-- 10) PII SANITIZATION FUNCTION
CREATE OR REPLACE FUNCTION public.sanitize_pii(p_data JSONB)
RETURNS JSONB LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE v_result JSONB := p_data; v_key TEXT; v_val TEXT;
BEGIN
  IF p_data IS NULL THEN RETURN NULL; END IF;
  
  FOR v_key IN SELECT * FROM jsonb_object_keys(p_data)
  LOOP
    v_val := p_data->>v_key;
    IF v_key ~* '(token|key|secret|password|auth|credential|bearer)' THEN
      v_result := jsonb_set(v_result, ARRAY[v_key], '"[REDACTED]"'::jsonb);
    ELSIF v_val ~ '^\d{11}$' OR v_val ~ '^\d{3}\.\d{3}\.\d{3}-\d{2}$' THEN
      v_result := jsonb_set(v_result, ARRAY[v_key], to_jsonb('***.' || substring(regexp_replace(v_val, '[^0-9]', '', 'g') from 4 for 3) || '.***-**'));
    ELSIF v_val ~ '^\d{14}$' OR v_val ~ '^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$' THEN
      v_result := jsonb_set(v_result, ARRAY[v_key], to_jsonb('**.' || substring(regexp_replace(v_val, '[^0-9]', '', 'g') from 3 for 3) || '.***/' || substring(regexp_replace(v_val, '[^0-9]', '', 'g') from 9 for 4) || '-**'));
    ELSIF v_key ~* '(account|conta|agencia|agency)' AND v_val ~ '^\d+' THEN
      v_result := jsonb_set(v_result, ARRAY[v_key], to_jsonb('***' || right(v_val, 3)));
    END IF;
  END LOOP;
  
  RETURN v_result;
END;
$$;

-- 11) SECURITY STATUS VIEW
CREATE OR REPLACE VIEW public.v_security_status WITH (security_invoker = true) AS
SELECT 
  c.id as company_id, c.name as company_name,
  (SELECT COUNT(*) FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE') as total_tables,
  (SELECT COUNT(*) FROM pg_tables pt JOIN pg_class pc ON pc.relname = pt.tablename WHERE pt.schemaname = 'public' AND pc.relrowsecurity = true) as rls_enabled_tables,
  (SELECT COUNT(*) FROM webhook_ingress wi WHERE wi.company_id = c.id AND wi.signature_valid = false AND wi.received_at > now() - interval '24 hours') as invalid_webhooks_24h,
  (SELECT COUNT(*) FROM webhook_ingress wi WHERE wi.company_id = c.id AND wi.replay_detected = true AND wi.received_at > now() - interval '24 hours') as replay_attempts_24h,
  (SELECT COUNT(*) FROM rate_limit_events rle WHERE rle.company_id = c.id AND rle.blocked = true AND rle.created_at > now() - interval '24 hours') as rate_limit_blocks_24h,
  (SELECT COUNT(*) FROM integration_dlq dlq WHERE dlq.company_id = c.id AND dlq.resolved_at IS NULL) as dlq_pending,
  (SELECT COUNT(*) FROM audit_logs al WHERE al.company_id = c.id AND al.sensitivity_level = 'critical' AND al.created_at > now() - interval '24 hours') as critical_events_24h
FROM companies c;

-- 12) WEBHOOK STATUS VIEW
CREATE OR REPLACE VIEW public.v_webhook_status WITH (security_invoker = true) AS
SELECT 
  wi.id, wi.company_id, wi.provider, wi.external_event_id, wi.received_at,
  wi.signature_valid, wi.replay_detected, wi.status, wi.correlation_id,
  wi.error_message, wi.processed_at,
  CASE 
    WHEN wi.signature_valid = false THEN 'invalid_signature'
    WHEN wi.replay_detected = true THEN 'replay_attempt'
    WHEN wi.status = 'failed' THEN 'processing_failed'
    WHEN wi.status = 'processed' THEN 'success'
    ELSE 'pending'
  END as health_status
FROM webhook_ingress wi ORDER BY wi.received_at DESC;

-- 13) ENVIRONMENT SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.environment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  is_secret BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(environment, setting_key)
);

ALTER TABLE public.environment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage environment settings" ON public.environment_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 14) SECURITY HEADERS CONFIG
INSERT INTO public.environment_settings (environment, setting_key, setting_value)
VALUES 
  ('production', 'csp_policy', 'default-src ''self''; script-src ''self''; style-src ''self'' ''unsafe-inline''; img-src ''self'' data: https:; font-src ''self'' data:; connect-src ''self'' https://*.supabase.co wss://*.supabase.co'),
  ('production', 'hsts_max_age', '31536000'),
  ('production', 'frame_ancestors', '''none'''),
  ('production', 'x_content_type_options', 'nosniff'),
  ('production', 'referrer_policy', 'strict-origin-when-cross-origin'),
  ('production', 'permissions_policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()')
ON CONFLICT (environment, setting_key) DO NOTHING;

-- 15) BACKUP/RESTORE LOG TABLE
CREATE TABLE IF NOT EXISTS public.backup_restore_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('backup', 'restore', 'test_restore')),
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'completed', 'failed')),
  backup_artifact_id UUID,
  restore_target TEXT,
  validation_results JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_backup_restore_logs_company ON public.backup_restore_logs (company_id, started_at DESC);

ALTER TABLE public.backup_restore_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company backup logs" ON public.backup_restore_logs
  FOR SELECT USING (public.user_has_company_access(company_id));

CREATE POLICY "Only admins can create backup logs" ON public.backup_restore_logs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 16) CLEANUP SECURITY DATA
CREATE OR REPLACE FUNCTION public.cleanup_security_data(p_days_rate_limit INTEGER DEFAULT 7, p_days_login_attempts INTEGER DEFAULT 30)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_rate_deleted INTEGER; v_login_deleted INTEGER;
BEGIN
  DELETE FROM rate_limit_events WHERE created_at < now() - (p_days_rate_limit || ' days')::interval;
  GET DIAGNOSTICS v_rate_deleted = ROW_COUNT;
  DELETE FROM login_attempts WHERE created_at < now() - (p_days_login_attempts || ' days')::interval;
  GET DIAGNOSTICS v_login_deleted = ROW_COUNT;
  RETURN jsonb_build_object('rate_limit_events_deleted', v_rate_deleted, 'login_attempts_deleted', v_login_deleted, 'cleanup_date', now());
END;
$$;