-- ========================================================
-- MVP BLOQUEANTES: SCHEMA (PIX + NF-e + NFS-e + Fiscais + Feature Flags)
-- CNAB já existe - não recriar
-- ========================================================

-- ========================================================
-- 1) FEATURE FLAGS
-- ========================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  config_json JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, feature_key)
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ff_select" ON public.feature_flags FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "ff_all" ON public.feature_flags FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND role = 'admin'));

-- ========================================================
-- 2) PIX - PROVIDERS, CHARGES, EVENTS
-- ========================================================

CREATE TABLE IF NOT EXISTS public.pix_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_key VARCHAR(50) NOT NULL,
  provider_name TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  credentials_encrypted TEXT,
  webhook_secret_encrypted TEXT,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, provider_key)
);

ALTER TABLE public.pix_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pix_prov_select" ON public.pix_providers FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "pix_prov_admin" ON public.pix_providers FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS public.pix_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.pix_providers(id),
  transaction_id UUID REFERENCES public.transactions(id),
  txid VARCHAR(35) NOT NULL,
  end_to_end_id VARCHAR(32),
  amount NUMERIC(18,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'active', 'pending', 'paid', 'expired', 'canceled', 'error')),
  payer_name TEXT,
  payer_document VARCHAR(14),
  payer_bank VARCHAR(10),
  description TEXT,
  brcode TEXT,
  qrcode_image_path TEXT,
  expiration_seconds INTEGER DEFAULT 3600,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  paid_amount NUMERIC(18,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, txid)
);

CREATE INDEX idx_pix_charges_company_status ON public.pix_charges(company_id, status);
CREATE INDEX idx_pix_charges_transaction ON public.pix_charges(transaction_id);
CREATE INDEX idx_pix_charges_txid ON public.pix_charges(txid);

ALTER TABLE public.pix_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pix_chg_select" ON public.pix_charges FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "pix_chg_all" ON public.pix_charges FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.pix_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_key VARCHAR(50) NOT NULL,
  event_id VARCHAR(100),
  txid VARCHAR(35),
  end_to_end_id VARCHAR(32),
  event_type VARCHAR(50),
  status VARCHAR(20),
  amount NUMERIC(18,2),
  raw_json_sanitized JSONB,
  signature_valid BOOLEAN,
  is_duplicate BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, provider_key, event_id)
);

CREATE INDEX idx_pix_events_company ON public.pix_events(company_id, created_at DESC);
CREATE INDEX idx_pix_events_txid ON public.pix_events(txid);

ALTER TABLE public.pix_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pix_evt_select" ON public.pix_events FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- ========================================================
-- 3) FISCAL PROVIDERS (NF-e/NFS-e)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.fiscal_provider_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_key VARCHAR(50) NOT NULL,
  provider_name TEXT,
  document_types TEXT[] DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  environment VARCHAR(20) DEFAULT 'homologacao' CHECK (environment IN ('homologacao', 'producao')),
  credentials_encrypted TEXT,
  certificate_a1_path TEXT,
  certificate_password_encrypted TEXT,
  certificate_expires_at DATE,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, provider_key)
);

ALTER TABLE public.fiscal_provider_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fpc_select" ON public.fiscal_provider_config FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "fpc_admin" ON public.fiscal_provider_config FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND role = 'admin'));

-- ========================================================
-- 4) NF-e - INVOICES, ITEMS, EVENTS
-- ========================================================

CREATE TABLE IF NOT EXISTS public.nfe_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  provider_id UUID REFERENCES public.fiscal_provider_config(id),
  number INTEGER,
  series INTEGER DEFAULT 1,
  access_key VARCHAR(44),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validating', 'signed', 'sent', 'authorized', 'denied', 'canceled', 'error')),
  operation_type VARCHAR(10) DEFAULT 'saida' CHECK (operation_type IN ('entrada', 'saida')),
  operation_nature TEXT,
  customer_id UUID REFERENCES public.counterparties(id),
  customer_data_json JSONB,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exit_date DATE,
  cfop VARCHAR(4),
  payment_type VARCHAR(20),
  total_products NUMERIC(18,2) DEFAULT 0,
  total_taxes NUMERIC(18,2) DEFAULT 0,
  total_discounts NUMERIC(18,2) DEFAULT 0,
  total_freight NUMERIC(18,2) DEFAULT 0,
  total_insurance NUMERIC(18,2) DEFAULT 0,
  total_other NUMERIC(18,2) DEFAULT 0,
  total_nf NUMERIC(18,2) DEFAULT 0,
  taxes_json JSONB DEFAULT '{}',
  xml_path TEXT,
  danfe_pdf_path TEXT,
  sefaz_protocol VARCHAR(20),
  sefaz_receipt VARCHAR(20),
  sefaz_message TEXT,
  provider_id_external VARCHAR(100),
  additional_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  authorized_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_nfe_inv_company_status ON public.nfe_invoices(company_id, status);
CREATE INDEX idx_nfe_inv_company_date ON public.nfe_invoices(company_id, issue_date DESC);
CREATE INDEX idx_nfe_inv_access_key ON public.nfe_invoices(access_key);

ALTER TABLE public.nfe_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfe_inv_select" ON public.nfe_invoices FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "nfe_inv_all" ON public.nfe_invoices FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.nfe_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.nfe_invoices(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  product_code VARCHAR(60),
  product_description TEXT NOT NULL,
  ncm VARCHAR(8),
  cest VARCHAR(7),
  cfop VARCHAR(4) NOT NULL,
  unit VARCHAR(6) NOT NULL DEFAULT 'UN',
  quantity NUMERIC(18,4) NOT NULL,
  unit_price NUMERIC(18,10) NOT NULL,
  total_price NUMERIC(18,2) NOT NULL,
  discount NUMERIC(18,2) DEFAULT 0,
  cst_icms VARCHAR(3),
  csosn VARCHAR(3),
  icms_base NUMERIC(18,2) DEFAULT 0,
  icms_rate NUMERIC(5,2) DEFAULT 0,
  icms_value NUMERIC(18,2) DEFAULT 0,
  ipi_cst VARCHAR(2),
  ipi_rate NUMERIC(5,2) DEFAULT 0,
  ipi_value NUMERIC(18,2) DEFAULT 0,
  pis_cst VARCHAR(2),
  pis_rate NUMERIC(5,4) DEFAULT 0,
  pis_value NUMERIC(18,2) DEFAULT 0,
  cofins_cst VARCHAR(2),
  cofins_rate NUMERIC(5,4) DEFAULT 0,
  cofins_value NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nfe_items_invoice ON public.nfe_items(invoice_id);

ALTER TABLE public.nfe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfe_itm_select" ON public.nfe_items FOR SELECT
  USING (invoice_id IN (SELECT id FROM public.nfe_invoices WHERE company_id IN 
    (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())));

CREATE POLICY "nfe_itm_all" ON public.nfe_items FOR ALL
  USING (invoice_id IN (SELECT id FROM public.nfe_invoices WHERE company_id IN 
    (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())));

CREATE TABLE IF NOT EXISTS public.nfe_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.nfe_invoices(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('status', 'cancel', 'cce', 'inutilizacao')),
  event_sequence INTEGER DEFAULT 1,
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  justification TEXT,
  correction_text TEXT,
  protocol VARCHAR(20),
  payload_json JSONB,
  response_json JSONB,
  status VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nfe_events_invoice ON public.nfe_events(invoice_id);

ALTER TABLE public.nfe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfe_evt_select" ON public.nfe_events FOR SELECT
  USING (invoice_id IN (SELECT id FROM public.nfe_invoices WHERE company_id IN 
    (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())));

-- ========================================================
-- 5) NFS-e - INVOICES, EVENTS
-- ========================================================

CREATE TABLE IF NOT EXISTS public.nfse_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  provider_id UUID REFERENCES public.fiscal_provider_config(id),
  number INTEGER,
  rps_number INTEGER,
  rps_series VARCHAR(10),
  verification_code VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'authorized', 'canceled', 'error', 'substituted')),
  customer_id UUID REFERENCES public.counterparties(id),
  customer_data_json JSONB,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  competence_date DATE,
  service_code VARCHAR(20),
  service_description TEXT NOT NULL,
  cnae VARCHAR(7),
  municipality_code VARCHAR(7),
  total_services NUMERIC(18,2) NOT NULL,
  deductions NUMERIC(18,2) DEFAULT 0,
  calculation_base NUMERIC(18,2),
  iss_rate NUMERIC(5,2),
  iss_value NUMERIC(18,2),
  iss_retained BOOLEAN DEFAULT false,
  pis_value NUMERIC(18,2) DEFAULT 0,
  cofins_value NUMERIC(18,2) DEFAULT 0,
  inss_value NUMERIC(18,2) DEFAULT 0,
  ir_value NUMERIC(18,2) DEFAULT 0,
  csll_value NUMERIC(18,2) DEFAULT 0,
  net_value NUMERIC(18,2),
  xml_path TEXT,
  pdf_path TEXT,
  protocol VARCHAR(50),
  provider_id_external VARCHAR(100),
  additional_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  authorized_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_nfse_inv_company_status ON public.nfse_invoices(company_id, status);
CREATE INDEX idx_nfse_inv_company_date ON public.nfse_invoices(company_id, issue_date DESC);

ALTER TABLE public.nfse_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfse_inv_select" ON public.nfse_invoices FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "nfse_inv_all" ON public.nfse_invoices FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.nfse_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.nfse_invoices(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('status', 'cancel', 'substituicao')),
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  justification TEXT,
  protocol VARCHAR(50),
  payload_json JSONB,
  response_json JSONB,
  status VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nfse_events_invoice ON public.nfse_events(invoice_id);

ALTER TABLE public.nfse_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfse_evt_select" ON public.nfse_events FOR SELECT
  USING (invoice_id IN (SELECT id FROM public.nfse_invoices WHERE company_id IN 
    (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())));

-- ========================================================
-- 6) CADASTROS FISCAIS - CST, CFOP, NCM, REGRAS
-- ========================================================

CREATE TABLE IF NOT EXISTS public.fiscal_tax_regimes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  regime_code VARCHAR(10) NOT NULL,
  regime_name TEXT NOT NULL,
  crt VARCHAR(1) NOT NULL CHECK (crt IN ('1', '2', '3')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE,
  valid_until DATE,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, regime_code)
);

ALTER TABLE public.fiscal_tax_regimes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ftr_select" ON public.fiscal_tax_regimes FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "ftr_all" ON public.fiscal_tax_regimes FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.fiscal_cst_csosn (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tax_type VARCHAR(10) NOT NULL CHECK (tax_type IN ('ICMS', 'IPI', 'PIS', 'COFINS')),
  code VARCHAR(3) NOT NULL,
  description TEXT NOT NULL,
  is_simples_nacional BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tax_type, code)
);

ALTER TABLE public.fiscal_cst_csosn ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cst_read" ON public.fiscal_cst_csosn FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.fiscal_cfop (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(4) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  operation_type VARCHAR(10) CHECK (operation_type IN ('entrada', 'saida')),
  is_interstate BOOLEAN DEFAULT false,
  generates_credit BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fiscal_cfop ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfop_read" ON public.fiscal_cfop FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.fiscal_ncm (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(8) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  unit VARCHAR(10),
  ipi_rate NUMERIC(5,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fiscal_ncm_code ON public.fiscal_ncm(code);

ALTER TABLE public.fiscal_ncm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ncm_read" ON public.fiscal_ncm FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.fiscal_tax_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tax_type VARCHAR(10) NOT NULL CHECK (tax_type IN ('ICMS', 'ICMS_ST', 'IPI', 'PIS', 'COFINS', 'ISS', 'IR', 'CSLL', 'INSS')),
  operation_type VARCHAR(10) CHECK (operation_type IN ('entrada', 'saida', 'servico')),
  origin_state VARCHAR(2),
  destination_state VARCHAR(2),
  cfop_codes TEXT[],
  ncm_codes TEXT[],
  cst_code VARCHAR(3),
  base_reduction_percent NUMERIC(5,2) DEFAULT 0,
  rate NUMERIC(5,4) NOT NULL,
  is_retained BOOLEAN DEFAULT false,
  is_exempt BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER DEFAULT 0,
  conditions_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fiscal_tax_rules_company ON public.fiscal_tax_rules(company_id);

ALTER TABLE public.fiscal_tax_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ftr_rules_select" ON public.fiscal_tax_rules FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "ftr_rules_all" ON public.fiscal_tax_rules FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.product_fiscal_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_code VARCHAR(60) NOT NULL,
  product_name TEXT,
  ncm VARCHAR(8),
  cest VARCHAR(7),
  origin VARCHAR(1) DEFAULT '0',
  default_cfop_saida VARCHAR(4),
  default_cfop_entrada VARCHAR(4),
  default_cst_icms VARCHAR(3),
  default_cst_pis VARCHAR(2),
  default_cst_cofins VARCHAR(2),
  icms_rate NUMERIC(5,2),
  pis_rate NUMERIC(5,4),
  cofins_rate NUMERIC(5,4),
  unit VARCHAR(6) DEFAULT 'UN',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, product_code)
);

CREATE INDEX idx_product_fiscal_company ON public.product_fiscal_data(company_id);

ALTER TABLE public.product_fiscal_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pfd_select" ON public.product_fiscal_data FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "pfd_all" ON public.product_fiscal_data FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- ========================================================
-- 7) CNAB - Adicionar mapa de ocorrências (complemento)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.cnab_occurrence_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_code VARCHAR(3) NOT NULL,
  occurrence_code VARCHAR(10) NOT NULL,
  occurrence_type VARCHAR(20) NOT NULL CHECK (occurrence_type IN ('entrada', 'retorno')),
  meaning TEXT NOT NULL,
  action VARCHAR(20) CHECK (action IN ('baixar', 'recusar', 'pendencia', 'tarifa', 'alterar', 'ignorar')),
  is_final BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bank_code, occurrence_code, occurrence_type)
);

ALTER TABLE public.cnab_occurrence_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cnab_occ_read" ON public.cnab_occurrence_map FOR SELECT USING (true);

-- ========================================================
-- 8) COUNTERPARTIES - Adicionar campos fiscais
-- ========================================================

ALTER TABLE public.counterparties
ADD COLUMN IF NOT EXISTS tax_regime VARCHAR(20),
ADD COLUMN IF NOT EXISTS state_registration VARCHAR(20),
ADD COLUMN IF NOT EXISTS state_registration_exempt BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS municipal_registration VARCHAR(20),
ADD COLUMN IF NOT EXISTS suframa VARCHAR(20),
ADD COLUMN IF NOT EXISTS operation_nature TEXT;