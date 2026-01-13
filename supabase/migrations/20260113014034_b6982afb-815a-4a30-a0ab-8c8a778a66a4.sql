
-- ============================================================
-- HARDENING MIGRATION: FINAL (Schema Correto)
-- ============================================================

-- 1. Transactions - índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_cursor 
ON public.transactions (company_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_cost_center 
ON public.transactions (company_id, cost_center_id) 
WHERE cost_center_id IS NOT NULL;

-- 2. Journal Lines - índices
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_line 
ON public.journal_lines (journal_entry_id, line_number);

-- 3. Bank Statement Lines - índices
CREATE INDEX IF NOT EXISTS idx_bsl_posted_date 
ON public.bank_statement_lines (statement_id, posted_date DESC);

-- 4. Bank Statements - índice
CREATE INDEX IF NOT EXISTS idx_bank_statements_wallet_date 
ON public.bank_statements (company_id, wallet_id, statement_date DESC);

-- 5. Audit Logs - índices
CREATE INDEX IF NOT EXISTS idx_audit_logs_cursor 
ON public.audit_logs (company_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_record 
ON public.audit_logs (company_id, table_name, record_id);

-- 6. Jobs Queue - índices
CREATE INDEX IF NOT EXISTS idx_jobs_queue_pending 
ON public.jobs_queue (company_id, status, scheduled_at) 
WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS idx_jobs_queue_cursor 
ON public.jobs_queue (company_id, created_at DESC, id DESC);

-- 7. Integration DLQ - índices
CREATE INDEX IF NOT EXISTS idx_integration_dlq_pending 
ON public.integration_dlq (company_id, resolved_at) 
WHERE resolved_at IS NULL;

-- 8. Counterparties - índices
CREATE INDEX IF NOT EXISTS idx_counterparties_document 
ON public.counterparties (company_id, document);

-- 9. Idempotency Keys - índice (usando coluna 'key')
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_lookup 
ON public.idempotency_keys (company_id, key, first_seen_at DESC);

-- 10. Função has_role segura
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.name = _role AND ur.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.name = ANY(_roles) AND ur.is_active = true
  )
$$;

-- 11. Função para validar SoD
CREATE OR REPLACE FUNCTION public.check_sod_violation(
  p_user_id uuid, p_company_id uuid, p_action text
)
RETURNS TABLE(is_violation boolean, violation_reason text, conflicting_actions text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_permissions text[]; v_rule RECORD;
BEGIN
  SELECT array_agg(DISTINCT p.code) INTO v_user_permissions
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role_id = ur.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = p_user_id AND ur.company_id = p_company_id 
    AND ur.is_active = true AND COALESCE(rp.granted, true) = true;

  FOR v_rule IN 
    SELECT * FROM sod_rules WHERE company_id = p_company_id AND is_active = true
      AND (role_a = p_action OR role_b = p_action)
  LOOP
    IF v_rule.role_a = p_action AND v_rule.role_b = ANY(v_user_permissions) THEN
      is_violation := true; violation_reason := v_rule.description;
      conflicting_actions := ARRAY[v_rule.role_a, v_rule.role_b]; RETURN NEXT;
    ELSIF v_rule.role_b = p_action AND v_rule.role_a = ANY(v_user_permissions) THEN
      is_violation := true; violation_reason := v_rule.description;
      conflicting_actions := ARRAY[v_rule.role_a, v_rule.role_b]; RETURN NEXT;
    END IF;
  END LOOP;
  IF NOT FOUND THEN 
    is_violation := false; violation_reason := NULL; conflicting_actions := NULL; RETURN NEXT; 
  END IF;
END;
$$;

-- 12. Trigger para auditoria automática
CREATE OR REPLACE FUNCTION public.audit_sensitive_changes()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_company_id uuid; v_old_data jsonb; v_new_data jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN 
    v_company_id := OLD.company_id; v_old_data := to_jsonb(OLD); v_new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN 
    v_company_id := NEW.company_id; v_old_data := NULL; v_new_data := to_jsonb(NEW);
  ELSE 
    v_company_id := COALESCE(NEW.company_id, OLD.company_id); 
    v_old_data := to_jsonb(OLD); v_new_data := to_jsonb(NEW);
  END IF;
  INSERT INTO audit_logs (company_id, table_name, record_id, action, old_data, new_data, user_id)
  VALUES (v_company_id, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, v_old_data, v_new_data, auth.uid());
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS audit_user_roles_changes ON user_roles;
CREATE TRIGGER audit_user_roles_changes AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();

DROP TRIGGER IF EXISTS audit_role_permissions_changes ON role_permissions;
CREATE TRIGGER audit_role_permissions_changes AFTER INSERT OR UPDATE OR DELETE ON role_permissions
FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();

DROP TRIGGER IF EXISTS audit_company_ai_keys_changes ON company_ai_keys;
CREATE TRIGGER audit_company_ai_keys_changes AFTER INSERT OR UPDATE OR DELETE ON company_ai_keys
FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();

DROP TRIGGER IF EXISTS audit_bank_accounts_changes ON bank_accounts;
CREATE TRIGGER audit_bank_accounts_changes AFTER INSERT OR UPDATE OR DELETE ON bank_accounts
FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();

DROP TRIGGER IF EXISTS audit_posting_rules_changes ON posting_rules;
CREATE TRIGGER audit_posting_rules_changes AFTER INSERT OR UPDATE OR DELETE ON posting_rules
FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();

-- 13. View para monitoramento de jobs
CREATE OR REPLACE VIEW public.v_jobs_status AS
SELECT 
  jq.id, jq.company_id, jq.job_type, jq.status, jq.payload_json, jq.result_json,
  jq.error_json, jq.attempts, jq.max_attempts, jq.scheduled_at, jq.started_at,
  jq.finished_at, jq.created_at, jq.idempotency_key, jq.dlq_id,
  CASE 
    WHEN jq.finished_at IS NOT NULL AND jq.started_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (jq.finished_at - jq.started_at))
    WHEN jq.started_at IS NOT NULL THEN EXTRACT(EPOCH FROM (now() - jq.started_at))
    ELSE NULL 
  END as duration_seconds,
  CASE 
    WHEN jq.status = 'failed' AND jq.attempts >= jq.max_attempts THEN 'exhausted'
    WHEN jq.status = 'failed' THEN 'retriable'
    WHEN jq.status = 'running' AND jq.started_at < now() - interval '30 minutes' THEN 'stuck'
    ELSE jq.status
  END as computed_status
FROM public.jobs_queue jq;

ALTER VIEW public.v_jobs_status SET (security_invoker = true);

-- 14. View para métricas de sistema
CREATE OR REPLACE VIEW public.v_system_metrics AS
SELECT 
  company_id,
  COUNT(*) FILTER (WHERE status = 'pending') as jobs_pending,
  COUNT(*) FILTER (WHERE status = 'running') as jobs_running,
  COUNT(*) FILTER (WHERE status = 'completed' AND finished_at > now() - interval '1 hour') as jobs_completed_1h,
  COUNT(*) FILTER (WHERE status = 'failed' AND finished_at > now() - interval '1 hour') as jobs_failed_1h,
  AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) FILTER (
    WHERE status = 'completed' AND finished_at > now() - interval '1 hour'
  ) as avg_job_duration_1h
FROM public.jobs_queue GROUP BY company_id;

ALTER VIEW public.v_system_metrics SET (security_invoker = true);

-- 15. Função para limpar dados antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_data(
  p_company_id uuid, p_days_audit integer DEFAULT 365, p_days_logs integer DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_audit_deleted integer; v_jobs_deleted integer; v_dlq_deleted integer;
BEGIN
  DELETE FROM audit_logs WHERE company_id = p_company_id 
    AND created_at < now() - (p_days_audit || ' days')::interval;
  GET DIAGNOSTICS v_audit_deleted = ROW_COUNT;

  DELETE FROM jobs_queue WHERE company_id = p_company_id AND status IN ('completed', 'failed')
    AND finished_at < now() - (p_days_logs || ' days')::interval;
  GET DIAGNOSTICS v_jobs_deleted = ROW_COUNT;

  DELETE FROM integration_dlq WHERE company_id = p_company_id AND resolved_at IS NOT NULL
    AND resolved_at < now() - (p_days_logs || ' days')::interval;
  GET DIAGNOSTICS v_dlq_deleted = ROW_COUNT;

  RETURN jsonb_build_object('audit_logs_deleted', v_audit_deleted, 'jobs_deleted', v_jobs_deleted,
    'dlq_deleted', v_dlq_deleted, 'cleanup_date', now());
END;
$$;
