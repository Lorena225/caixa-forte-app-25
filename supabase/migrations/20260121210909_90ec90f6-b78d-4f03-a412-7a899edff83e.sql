-- =====================================================
-- MÓDULO 2.4: AUDITORIA COMPLETA E NÃO-REPUDIAÇÃO
-- Trilha imutável, assinaturas digitais, compliance
-- =====================================================

-- 1. EXPAND AUDIT_LOGS TABLE WITH NEW COLUMNS
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS user_role TEXT,
ADD COLUMN IF NOT EXISTS operation_type TEXT,
ADD COLUMN IF NOT EXISTS field_changes JSONB,
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SUCCESS',
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS is_critical_operation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_signature BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS signature_hash TEXT,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signed_by_cpf TEXT,
ADD COLUMN IF NOT EXISTS signed_by_name TEXT,
ADD COLUMN IF NOT EXISTS certificate_serial_number TEXT,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS geolocation JSONB,
ADD COLUMN IF NOT EXISTS compliance_tags TEXT[];

-- 2. CREATE DIGITAL SIGNATURES TABLE
CREATE TABLE IF NOT EXISTS public.digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  audit_log_id UUID NOT NULL,
  signer_user_id UUID REFERENCES auth.users(id),
  signer_cpf TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  certificate_serial_number TEXT,
  certificate_issuer TEXT,
  certificate_subject TEXT,
  certificate_valid_from TIMESTAMPTZ,
  certificate_valid_until TIMESTAMPTZ,
  signature_algorithm TEXT DEFAULT 'SHA256withRSA',
  signature_value TEXT NOT NULL,
  signed_data_hash TEXT NOT NULL,
  timestamp_authority TEXT,
  timestamp_token TEXT,
  timestamp_at TIMESTAMPTZ,
  is_valid BOOLEAN DEFAULT true,
  validation_errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_digital_signatures_audit_log FOREIGN KEY (audit_log_id) 
    REFERENCES public.audit_logs(id) ON DELETE RESTRICT
);

-- 3. CREATE CRITICAL OPERATIONS REGISTRY
CREATE TABLE IF NOT EXISTS public.critical_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  operation_code TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  description TEXT,
  threshold_amount NUMERIC(15,2),
  requires_signature BOOLEAN DEFAULT true,
  requires_dual_approval BOOLEAN DEFAULT false,
  signature_timeout_minutes INTEGER DEFAULT 60,
  notification_emails TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CREATE COMPLIANCE REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'draft',
  summary_json JSONB,
  findings_json JSONB,
  recommendations_json JSONB,
  file_url TEXT,
  signed_file_url TEXT,
  signature_id UUID REFERENCES public.digital_signatures(id),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CREATE AUDIT INTEGRITY VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.audit_integrity_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  checked_by UUID REFERENCES auth.users(id),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  records_checked INTEGER NOT NULL DEFAULT 0,
  is_valid BOOLEAN NOT NULL,
  first_record_id UUID,
  last_record_id UUID,
  first_record_timestamp TIMESTAMPTZ,
  last_record_timestamp TIMESTAMPTZ,
  broken_at_record_id UUID,
  broken_at_timestamp TIMESTAMPTZ,
  expected_hash TEXT,
  found_hash TEXT,
  verification_duration_ms INTEGER,
  notes TEXT
);

-- 6. CREATE PENDING SIGNATURES TABLE
CREATE TABLE IF NOT EXISTS public.pending_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  audit_log_id UUID NOT NULL REFERENCES public.audit_logs(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL,
  operation_description TEXT,
  amount NUMERIC(15,2),
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  signed_by UUID,
  signed_at TIMESTAMPTZ,
  signature_id UUID REFERENCES public.digital_signatures(id),
  rejection_reason TEXT,
  notification_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  metadata_json JSONB
);

-- 7. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_digital_signatures_company ON public.digital_signatures(company_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_audit_log ON public.digital_signatures(audit_log_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_signer ON public.digital_signatures(signer_cpf);
CREATE INDEX IF NOT EXISTS idx_critical_operations_company ON public.critical_operations(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_company ON public.compliance_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type ON public.compliance_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_audit_integrity_company ON public.audit_integrity_checks(company_id);
CREATE INDEX IF NOT EXISTS idx_pending_signatures_company ON public.pending_signatures(company_id);
CREATE INDEX IF NOT EXISTS idx_pending_signatures_status ON public.pending_signatures(status);
CREATE INDEX IF NOT EXISTS idx_pending_signatures_expires ON public.pending_signatures(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_critical ON public.audit_logs(company_id, is_critical_operation) WHERE is_critical_operation = true;
CREATE INDEX IF NOT EXISTS idx_audit_logs_signature ON public.audit_logs(company_id, requires_signature) WHERE requires_signature = true;

-- 8. ENABLE RLS ON NEW TABLES
ALTER TABLE public.digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.critical_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_integrity_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_signatures ENABLE ROW LEVEL SECURITY;

-- 9. RLS POLICIES FOR DIGITAL_SIGNATURES
DROP POLICY IF EXISTS "digital_signatures_select" ON public.digital_signatures;
DROP POLICY IF EXISTS "digital_signatures_insert" ON public.digital_signatures;

CREATE POLICY "digital_signatures_select" ON public.digital_signatures
  FOR SELECT USING (public.user_has_company_access(company_id));

CREATE POLICY "digital_signatures_insert" ON public.digital_signatures
  FOR INSERT WITH CHECK (public.user_has_company_access(company_id));

-- 10. RLS POLICIES FOR CRITICAL_OPERATIONS
DROP POLICY IF EXISTS "critical_operations_select" ON public.critical_operations;
DROP POLICY IF EXISTS "critical_operations_insert" ON public.critical_operations;
DROP POLICY IF EXISTS "critical_operations_update" ON public.critical_operations;

CREATE POLICY "critical_operations_select" ON public.critical_operations
  FOR SELECT USING (public.user_has_company_access(company_id));

CREATE POLICY "critical_operations_insert" ON public.critical_operations
  FOR INSERT WITH CHECK (public.user_has_company_access(company_id));

CREATE POLICY "critical_operations_update" ON public.critical_operations
  FOR UPDATE USING (public.user_has_company_access(company_id));

-- 11. RLS POLICIES FOR COMPLIANCE_REPORTS
DROP POLICY IF EXISTS "compliance_reports_select" ON public.compliance_reports;
DROP POLICY IF EXISTS "compliance_reports_insert" ON public.compliance_reports;
DROP POLICY IF EXISTS "compliance_reports_update" ON public.compliance_reports;

CREATE POLICY "compliance_reports_select" ON public.compliance_reports
  FOR SELECT USING (public.user_has_company_access(company_id));

CREATE POLICY "compliance_reports_insert" ON public.compliance_reports
  FOR INSERT WITH CHECK (public.user_has_company_access(company_id));

CREATE POLICY "compliance_reports_update" ON public.compliance_reports
  FOR UPDATE USING (public.user_has_company_access(company_id));

-- 12. RLS POLICIES FOR AUDIT_INTEGRITY_CHECKS
DROP POLICY IF EXISTS "audit_integrity_checks_select" ON public.audit_integrity_checks;
DROP POLICY IF EXISTS "audit_integrity_checks_insert" ON public.audit_integrity_checks;

CREATE POLICY "audit_integrity_checks_select" ON public.audit_integrity_checks
  FOR SELECT USING (public.user_has_company_access(company_id));

CREATE POLICY "audit_integrity_checks_insert" ON public.audit_integrity_checks
  FOR INSERT WITH CHECK (public.user_has_company_access(company_id));

-- 13. RLS POLICIES FOR PENDING_SIGNATURES
DROP POLICY IF EXISTS "pending_signatures_select" ON public.pending_signatures;
DROP POLICY IF EXISTS "pending_signatures_insert" ON public.pending_signatures;
DROP POLICY IF EXISTS "pending_signatures_update" ON public.pending_signatures;

CREATE POLICY "pending_signatures_select" ON public.pending_signatures
  FOR SELECT USING (public.user_has_company_access(company_id));

CREATE POLICY "pending_signatures_insert" ON public.pending_signatures
  FOR INSERT WITH CHECK (public.user_has_company_access(company_id));

CREATE POLICY "pending_signatures_update" ON public.pending_signatures
  FOR UPDATE USING (public.user_has_company_access(company_id));

-- 14. FUNCTION TO DETECT IF OPERATION IS CRITICAL
CREATE OR REPLACE FUNCTION public.is_critical_operation(
  p_company_id UUID,
  p_operation_code TEXT,
  p_amount NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold NUMERIC;
  v_requires_sig BOOLEAN;
BEGIN
  SELECT threshold_amount, requires_signature
  INTO v_threshold, v_requires_sig
  FROM public.critical_operations
  WHERE company_id = p_company_id
    AND operation_code = p_operation_code
    AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF p_operation_code IN ('PAYMENT_APPROVAL', 'CREDIT_LIMIT_CHANGE', 'DOCUMENT_DELETE', 'BUDGET_VARIANCE_APPROVAL', 'DATA_EXPORT', 'PERMISSION_CHANGE') THEN
      IF p_amount IS NOT NULL AND p_amount >= 10000 THEN
        RETURN true;
      END IF;
      RETURN p_operation_code IN ('DOCUMENT_DELETE', 'PERMISSION_CHANGE');
    END IF;
    RETURN false;
  END IF;
  
  IF v_threshold IS NOT NULL AND p_amount IS NOT NULL THEN
    RETURN p_amount >= v_threshold AND v_requires_sig;
  END IF;
  
  RETURN v_requires_sig;
END;
$$;

-- 15. FUNCTION TO CREATE PENDING SIGNATURE REQUEST
CREATE OR REPLACE FUNCTION public.request_digital_signature(
  p_audit_log_id UUID,
  p_operation_type TEXT,
  p_operation_description TEXT,
  p_amount NUMERIC DEFAULT NULL,
  p_timeout_minutes INTEGER DEFAULT 60
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_pending_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.audit_logs
  WHERE id = p_audit_log_id;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Audit log not found';
  END IF;
  
  INSERT INTO public.pending_signatures (
    company_id,
    audit_log_id,
    operation_type,
    operation_description,
    amount,
    requested_by,
    expires_at
  ) VALUES (
    v_company_id,
    p_audit_log_id,
    p_operation_type,
    p_operation_description,
    p_amount,
    auth.uid(),
    now() + (p_timeout_minutes || ' minutes')::interval
  )
  RETURNING id INTO v_pending_id;
  
  UPDATE public.audit_logs
  SET requires_signature = true,
      is_critical_operation = true
  WHERE id = p_audit_log_id;
  
  RETURN v_pending_id;
END;
$$;

-- 16. FUNCTION TO VERIFY SIGNATURE
CREATE OR REPLACE FUNCTION public.verify_digital_signature(
  p_signature_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sig RECORD;
  v_audit_hash TEXT;
BEGIN
  SELECT * INTO v_sig
  FROM public.digital_signatures
  WHERE id = p_signature_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  IF v_sig.certificate_valid_until IS NOT NULL AND v_sig.certificate_valid_until < now() THEN
    UPDATE public.digital_signatures
    SET is_valid = false,
        validation_errors = jsonb_build_object('error', 'Certificate expired')
    WHERE id = p_signature_id;
    RETURN false;
  END IF;
  
  SELECT entry_hash INTO v_audit_hash
  FROM public.audit_logs
  WHERE id = v_sig.audit_log_id;
  
  IF v_audit_hash IS NULL OR v_audit_hash != v_sig.signed_data_hash THEN
    UPDATE public.digital_signatures
    SET is_valid = false,
        validation_errors = jsonb_build_object('error', 'Hash mismatch - data may have been tampered')
    WHERE id = p_signature_id;
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 17. TRIGGER TO AUTO-DETECT CRITICAL OPERATIONS ON AUDIT INSERT
CREATE OR REPLACE FUNCTION public.audit_log_critical_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount NUMERIC;
BEGIN
  IF NEW.new_data IS NOT NULL AND NEW.new_data ? 'amount' THEN
    v_amount := (NEW.new_data->>'amount')::NUMERIC;
  ELSIF NEW.new_data IS NOT NULL AND NEW.new_data ? 'value' THEN
    v_amount := (NEW.new_data->>'value')::NUMERIC;
  ELSIF NEW.new_data IS NOT NULL AND NEW.new_data ? 'valor' THEN
    v_amount := (NEW.new_data->>'valor')::NUMERIC;
  END IF;
  
  IF NEW.table_name IN ('transactions', 'settlements', 'bank_transfers') AND NEW.action = 'UPDATE' AND v_amount >= 10000 THEN
    NEW.is_critical_operation := true;
    NEW.requires_signature := true;
  ELSIF NEW.table_name IN ('user_permissions', 'roles', 'user_roles') THEN
    NEW.is_critical_operation := true;
    NEW.requires_signature := true;
  ELSIF NEW.action = 'DELETE' AND NEW.table_name IN ('fiscal_documents', 'transactions', 'journal_entries') THEN
    NEW.is_critical_operation := true;
    NEW.requires_signature := true;
  ELSIF NEW.action = 'EXPORT' AND NEW.sensitivity_level IN ('high', 'critical') THEN
    NEW.is_critical_operation := true;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_audit_log_critical_check ON public.audit_logs;
CREATE TRIGGER tr_audit_log_critical_check
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_critical_check();

-- 18. VIEW FOR AUDIT WITH SIGNATURES (correct syntax)
DROP VIEW IF EXISTS public.v_audit_logs_complete;
CREATE VIEW public.v_audit_logs_complete AS
SELECT 
  al.id,
  al.company_id,
  al.user_id,
  al.username,
  al.user_role,
  al.table_name,
  al.record_id,
  al.action,
  al.old_data,
  al.new_data,
  al.field_changes,
  al.reason,
  al.status,
  al.error_code,
  al.ip_address,
  al.user_agent,
  al.session_id,
  al.is_critical_operation,
  al.requires_signature,
  al.signed_at,
  al.signed_by_cpf,
  al.signed_by_name,
  al.prev_hash,
  al.entry_hash,
  al.sensitivity_level,
  al.compliance_tags,
  al.created_at,
  ds.id as signature_id,
  ds.signature_value,
  ds.certificate_issuer,
  ds.timestamp_at,
  ds.is_valid as signature_valid
FROM public.audit_logs al
LEFT JOIN public.digital_signatures ds ON ds.audit_log_id = al.id;

-- Set security invoker separately
ALTER VIEW public.v_audit_logs_complete SET (security_invoker = true);

-- 19. COMPLIANCE TAGS DOCUMENTATION
COMMENT ON COLUMN public.audit_logs.compliance_tags IS 'Tags: LGPD, SOX, BASILEIA, ISO27001, RFC3161';