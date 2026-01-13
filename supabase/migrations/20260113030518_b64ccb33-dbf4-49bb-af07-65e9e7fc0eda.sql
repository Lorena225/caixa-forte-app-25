-- =====================================================
-- GO-LIVE FINAL CORRECTIONS (v3) - Simplified
-- =====================================================

-- 1. Índices para transactions
CREATE INDEX IF NOT EXISTS idx_transactions_company_direction_due ON transactions(company_id, direction, due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_company_status_due ON transactions(company_id, status, due_date);

-- 2. Índices para journal_entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON journal_entries(company_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_status_posting ON journal_entries(company_id, status, posting_date);

-- 3. Índice para keyset pagination em audit_logs  
CREATE INDEX IF NOT EXISTS idx_audit_logs_keyset ON audit_logs(company_id, created_at DESC, id DESC);

-- 4. Índice para correlação em audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON audit_logs(correlation_id) WHERE correlation_id IS NOT NULL;

-- 5. Índices para bank_statement_lines
CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_statement_date ON bank_statement_lines(statement_id, posted_date);

-- 6. Função para validar RBAC por ação
CREATE OR REPLACE FUNCTION check_rbac_action(
  p_user_id uuid,
  p_company_id uuid,
  p_action text
) RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_role user_role;
  v_allowed boolean := false;
BEGIN
  SELECT role INTO v_user_role
  FROM company_users
  WHERE user_id = p_user_id AND company_id = p_company_id;
  
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;
  
  CASE p_action
    WHEN 'delete_company', 'manage_users', 'manage_roles', 'close_period', 'reopen_period' THEN
      v_allowed := (v_user_role = 'admin');
    WHEN 'approve_payment', 'reverse_transaction', 'export_data', 'import_data' THEN
      v_allowed := (v_user_role IN ('admin', 'gestor'));
    WHEN 'view_dashboard', 'view_reports', 'create_transaction' THEN
      v_allowed := true;
    ELSE
      SELECT EXISTS(
        SELECT 1 FROM permissions p
        JOIN custom_roles cr ON cr.id = p.role_id
        JOIN company_users cu ON cu.custom_role_id = cr.id
        WHERE cu.user_id = p_user_id 
          AND cu.company_id = p_company_id
          AND p.permission_code = p_action
      ) INTO v_allowed;
  END CASE;
  
  RETURN v_allowed;
END;
$$;

-- 7. Função para refresh de facts incremental
CREATE OR REPLACE FUNCTION trigger_refresh_facts()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO jobs_queue (company_id, job_type, payload, priority, status)
  VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    'refresh_facts',
    jsonb_build_object(
      'source_table', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id)
    ),
    5,
    'pending'
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;