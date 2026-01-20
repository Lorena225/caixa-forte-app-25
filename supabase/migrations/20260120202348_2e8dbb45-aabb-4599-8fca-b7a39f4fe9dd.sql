
-- =====================================================
-- AUDITORIA DE SEGURANÇA E ESCALABILIDADE - HARDENING v4
-- =====================================================

-- 1. VIEWS COM security_invoker
-- =====================================================

DROP VIEW IF EXISTS v_security_status;
CREATE VIEW v_security_status
WITH (security_invoker = on) AS
SELECT 
  id AS company_id, name AS company_name,
  (SELECT count(*) FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE') AS total_tables,
  (SELECT count(*) FROM pg_tables pt JOIN pg_class pc ON pc.relname = pt.tablename WHERE pt.schemaname = 'public' AND pc.relrowsecurity = true) AS rls_enabled_tables,
  (SELECT count(*) FROM webhook_ingress wi WHERE wi.company_id = c.id AND wi.signature_valid = false AND wi.received_at > now() - interval '24 hours') AS invalid_webhooks_24h,
  (SELECT count(*) FROM webhook_ingress wi WHERE wi.company_id = c.id AND wi.replay_detected = true AND wi.received_at > now() - interval '24 hours') AS replay_attempts_24h,
  (SELECT count(*) FROM rate_limit_events rle WHERE rle.company_id = c.id AND rle.blocked = true AND rle.created_at > now() - interval '24 hours') AS rate_limit_blocks_24h,
  (SELECT count(*) FROM integration_dlq dlq WHERE dlq.company_id = c.id AND dlq.resolved_at IS NULL) AS dlq_pending,
  (SELECT count(*) FROM audit_logs al WHERE al.company_id = c.id AND al.sensitivity_level = 'critical' AND al.created_at > now() - interval '24 hours') AS critical_events_24h
FROM companies c;

DROP VIEW IF EXISTS audit_logs_safe;
CREATE VIEW audit_logs_safe
WITH (security_invoker = on) AS
SELECT id, company_id, table_name, record_id, action,
  CASE WHEN sensitivity_level = 'high' AND NOT has_role(auth.uid(), 'admin') 
    THEN '{"masked": "Access restricted to administrators"}'::jsonb ELSE old_data END AS old_data,
  CASE WHEN sensitivity_level = 'high' AND NOT has_role(auth.uid(), 'admin') 
    THEN '{"masked": "Access restricted to administrators"}'::jsonb ELSE new_data END AS new_data,
  user_id, sensitivity_level, created_at
FROM audit_logs;

DROP VIEW IF EXISTS counterparties_safe;
CREATE VIEW counterparties_safe
WITH (security_invoker = on) AS
SELECT id, company_id, type, name, document, email, phone, is_active, created_at, updated_at,
  is_client, is_supplier, person_type, legal_name, trade_name, ie, ie_is_exempt, im,
  address_street, address_number, address_complement, address_neighborhood, 
  address_city, address_state, address_zip, delivery_address_street, delivery_address_number, 
  delivery_address_complement, delivery_address_neighborhood, delivery_address_city, 
  delivery_address_state, delivery_address_zip, delivery_same_as_billing,
  contact_name, contact_phone, contact_email, finance_contact_name, finance_contact_phone, 
  finance_contact_email, nf_email, payment_terms_payable, payment_terms_receivable, credit_limit,
  supplier_notes, client_notes, fiscal_ready, payment_ready, collection_ready,
  missing_fields_json, tax_regime, state_registration, state_registration_exempt,
  municipal_registration, suframa, operation_nature, bank_name AS bank_name_display,
  CASE WHEN bank_account IS NOT NULL THEN 'XXXX' || right(bank_account, 4) ELSE NULL END AS bank_account_masked,
  CASE WHEN pix_key IS NOT NULL THEN pix_key_type || ': ***' ELSE NULL END AS pix_key_masked,
  (bank_code IS NOT NULL) AS has_bank_info, (pix_key IS NOT NULL) AS has_pix_key
FROM counterparties;

-- 2. RESTRINGIR TABELAS DE REFERÊNCIA
-- =====================================================

DROP POLICY IF EXISTS "cfop_read" ON fiscal_cfop;
CREATE POLICY "fiscal_cfop_authenticated_read" ON fiscal_cfop FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "cst_read" ON fiscal_cst_csosn;
CREATE POLICY "fiscal_cst_csosn_authenticated_read" ON fiscal_cst_csosn FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "cnab_occ_read" ON cnab_occurrence_map;
CREATE POLICY "cnab_occurrence_map_authenticated_read" ON cnab_occurrence_map FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Todos podem ver templates ativos" ON import_templates;

DROP POLICY IF EXISTS "Navigation items for company users" ON navigation_items;
CREATE POLICY "navigation_items_authenticated_read" ON navigation_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Navigation profiles for company users" ON navigation_profiles;
CREATE POLICY "navigation_profiles_authenticated_read" ON navigation_profiles FOR SELECT TO authenticated USING (true);

-- 3. ÍNDICES CORE PARA ESCALABILIDADE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_customer_invoices_company_status ON customer_invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_company_due_date ON customer_invoices(company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_company_status ON vendor_bills(company_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_company_due_date ON vendor_bills(company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_settlements_company_date ON settlements(company_id, settlement_date DESC);
CREATE INDEX IF NOT EXISTS idx_boletos_company_status ON boletos(company_id, status);
CREATE INDEX IF NOT EXISTS idx_boletos_company_due_date ON boletos(company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_situacao ON produtos(empresa_id, situacao);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_date ON stock_movements(company_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_folhas_pagamento_company_periodo ON folhas_pagamento(company_id, ano_referencia DESC, mes_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_sales_orders_company_status ON sales_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_status ON purchase_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_logs_company_created ON ai_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_company_status ON ai_decisions(company_id, status);

-- 4. TABELA DE EVENTOS DE SEGURANÇA
-- =====================================================

CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent text,
  details_json jsonb DEFAULT '{}',
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_company_created ON security_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_unresolved ON security_events(company_id, resolved) WHERE resolved = false;

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "security_events_select_admin" ON security_events;
CREATE POLICY "security_events_select_admin" ON security_events FOR SELECT TO authenticated 
  USING (user_belongs_to_company(company_id) AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "security_events_insert_system" ON security_events;
CREATE POLICY "security_events_insert_system" ON security_events FOR INSERT TO authenticated 
  WITH CHECK (user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "security_events_update_admin" ON security_events;
CREATE POLICY "security_events_update_admin" ON security_events FOR UPDATE TO authenticated 
  USING (user_belongs_to_company(company_id) AND has_role(auth.uid(), 'admin'));

-- 5. FUNÇÃO PARA REGISTRAR EVENTOS
-- =====================================================

CREATE OR REPLACE FUNCTION log_security_event(
  p_company_id uuid, p_event_type text, p_severity text DEFAULT 'medium',
  p_user_id uuid DEFAULT NULL, p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL, p_details jsonb DEFAULT '{}'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event_id uuid;
BEGIN
  INSERT INTO security_events (company_id, event_type, severity, user_id, ip_address, user_agent, details_json)
  VALUES (p_company_id, p_event_type, p_severity, COALESCE(p_user_id, auth.uid()), p_ip_address, p_user_agent, p_details)
  RETURNING id INTO v_event_id;
  RETURN v_event_id;
END; $$;

-- 6. TABELA DE SESSÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  session_token_hash text NOT NULL,
  ip_address inet,
  user_agent text,
  device_info jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_company ON user_sessions(company_id, is_active);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_sessions_select_own" ON user_sessions;
CREATE POLICY "user_sessions_select_own" ON user_sessions FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR (user_belongs_to_company(company_id) AND has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "user_sessions_insert" ON user_sessions;
CREATE POLICY "user_sessions_insert" ON user_sessions FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid() AND user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "user_sessions_update_own" ON user_sessions;
CREATE POLICY "user_sessions_update_own" ON user_sessions FOR UPDATE TO authenticated 
  USING (user_id = auth.uid() OR (user_belongs_to_company(company_id) AND has_role(auth.uid(), 'admin')));

-- 7. MATERIALIZED VIEW PARA DASHBOARD DE SEGURANÇA
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS mv_security_dashboard;
CREATE MATERIALIZED VIEW mv_security_dashboard AS
SELECT c.id AS company_id, c.name AS company_name,
  (SELECT count(*) FROM user_sessions us WHERE us.company_id = c.id AND us.is_active = true) AS active_sessions,
  (SELECT count(*) FROM security_events se WHERE se.company_id = c.id AND se.created_at > now() - interval '24 hours') AS security_events_24h,
  (SELECT count(*) FROM security_events se WHERE se.company_id = c.id AND se.severity = 'critical' AND se.resolved = false) AS critical_unresolved,
  (SELECT count(*) FROM audit_logs al WHERE al.company_id = c.id AND al.created_at > now() - interval '24 hours') AS audit_events_24h,
  (SELECT count(*) FROM api_logs apl WHERE apl.company_id = c.id AND apl.status_code >= 400 AND apl.created_at > now() - interval '24 hours') AS api_errors_24h,
  (SELECT count(*) FROM rate_limit_events rle WHERE rle.company_id = c.id AND rle.blocked = true AND rle.created_at > now() - interval '24 hours') AS rate_limits_24h,
  now() AS refreshed_at
FROM companies c;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_security_dashboard_company ON mv_security_dashboard(company_id);

CREATE OR REPLACE FUNCTION refresh_security_dashboard() RETURNS void 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_security_dashboard; END; $$;

-- 8. SOFT DELETE COLUMNS
-- =====================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='company_users' AND column_name='is_active') THEN
    ALTER TABLE company_users ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_roles' AND column_name='is_active') THEN
    ALTER TABLE user_roles ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- 9. FUNÇÃO DE MASCARAMENTO
-- =====================================================

CREATE OR REPLACE FUNCTION mask_sensitive_audit_data(data jsonb) RETURNS jsonb 
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  sensitive_keys text[] := ARRAY['password', 'password_hash', 'api_key', 'secret', 'token', 'pix_key', 'bank_account', 'credit_card'];
  k text; result jsonb := data;
BEGIN
  IF data IS NULL THEN RETURN NULL; END IF;
  FOREACH k IN ARRAY sensitive_keys LOOP
    IF result ? k THEN result := jsonb_set(result, ARRAY[k], '"***MASKED***"'::jsonb); END IF;
  END LOOP;
  RETURN result;
END; $$;

-- 10. DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE security_events IS 'Registro centralizado de eventos de segurança para auditoria e compliance';
COMMENT ON TABLE user_sessions IS 'Rastreamento de sessões de usuário para gestão de acessos e segurança';
COMMENT ON MATERIALIZED VIEW mv_security_dashboard IS 'Dashboard de segurança consolidado';
