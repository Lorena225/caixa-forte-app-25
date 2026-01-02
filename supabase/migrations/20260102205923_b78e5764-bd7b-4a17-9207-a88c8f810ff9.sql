-- =====================================================
-- TABELAS FALTANTES (exceto reconciliation_matches que já existe)
-- =====================================================

-- C1) BANK_ACCOUNTS (Contas bancárias estruturadas)
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  wallet_id UUID REFERENCES public.wallets(id),
  bank_code TEXT NOT NULL,
  bank_name TEXT,
  agency TEXT NOT NULL,
  agency_digit TEXT,
  account_number TEXT NOT NULL,
  account_digit TEXT,
  account_type TEXT NOT NULL DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings', 'payment')),
  holder_name TEXT,
  holder_document TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  cnab_agreement TEXT,
  cnab_wallet TEXT,
  cnab_layout TEXT CHECK (cnab_layout IN ('240', '400')),
  cnab_variation TEXT,
  cnab_service_type TEXT,
  credentials_encrypted TEXT,
  credentials_meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- C3) RECONCILIATION_TOLERANCES
CREATE TABLE public.reconciliation_tolerances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tolerance_type TEXT NOT NULL CHECK (tolerance_type IN ('amount', 'date', 'both')),
  amount_tolerance NUMERIC(18,2),
  amount_tolerance_percent NUMERIC(5,2),
  date_tolerance_days INT,
  auto_confirm BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- D1) CNAB_AGREEMENTS
CREATE TABLE public.cnab_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  agreement_number TEXT NOT NULL,
  wallet_code TEXT,
  wallet_variation TEXT,
  layout TEXT NOT NULL CHECK (layout IN ('240', '400')),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('payment', 'collection', 'both')),
  service_type TEXT,
  transmission_code TEXT,
  config_json JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, bank_code, agreement_number)
);

-- D2) CNAB_REMITTANCES
CREATE TABLE public.cnab_remittances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES public.cnab_agreements(id),
  remittance_number SERIAL,
  file_sequence INT NOT NULL DEFAULT 1,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('payment', 'collection')),
  file_content TEXT,
  file_url TEXT,
  file_hash TEXT,
  record_count INT NOT NULL DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'confirmed', 'partial', 'rejected', 'error')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  sent_by UUID,
  confirmed_at TIMESTAMPTZ,
  error_message TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- D3) CNAB_REMITTANCE_ITEMS
CREATE TABLE public.cnab_remittance_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  remittance_id UUID NOT NULL REFERENCES public.cnab_remittances(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id),
  line_number INT,
  operation_code TEXT,
  our_number TEXT,
  your_number TEXT,
  document_number TEXT,
  due_date DATE,
  amount NUMERIC(18,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'paid', 'rejected', 'cancelled')),
  return_code TEXT,
  return_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- D4) CNAB_RETURN_FILES
CREATE TABLE public.cnab_return_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES public.cnab_agreements(id),
  file_sequence INT,
  file_content TEXT,
  file_url TEXT,
  file_hash TEXT NOT NULL,
  record_count INT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'error')),
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  error_message TEXT,
  summary_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, file_hash)
);

-- E) BOLETOS
CREATE TABLE public.boletos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id),
  agreement_id UUID REFERENCES public.cnab_agreements(id),
  our_number TEXT NOT NULL,
  your_number TEXT,
  barcode TEXT,
  digitable_line TEXT,
  amount NUMERIC(18,2) NOT NULL,
  fine_amount NUMERIC(18,2) DEFAULT 0,
  interest_amount NUMERIC(18,2) DEFAULT 0,
  discount_amount NUMERIC(18,2) DEFAULT 0,
  amount_paid NUMERIC(18,2),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registered', 'sent', 'paid', 'cancelled', 'expired', 'protested')),
  registration_status TEXT,
  pdf_url TEXT,
  pix_code TEXT,
  registered_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, our_number)
);

CREATE TABLE public.boleto_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  boleto_id UUID NOT NULL REFERENCES public.boletos(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  return_code TEXT,
  return_message TEXT,
  source TEXT,
  source_id TEXT,
  amount NUMERIC(18,2),
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- F) CARTÕES
CREATE TABLE public.card_merchants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  merchant_type TEXT NOT NULL CHECK (merchant_type IN ('acquirer', 'sub_acquirer', 'psp')),
  provider TEXT,
  merchant_id TEXT,
  credentials_encrypted TEXT,
  credentials_meta JSONB,
  settlement_wallet_id UUID REFERENCES public.wallets(id),
  default_mdr_debit NUMERIC(5,2),
  default_mdr_credit NUMERIC(5,2),
  default_mdr_installment NUMERIC(5,2),
  anticipation_rate NUMERIC(5,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.card_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.card_merchants(id),
  transaction_id UUID REFERENCES public.transactions(id),
  sale_date DATE NOT NULL,
  sale_time TIME,
  authorization_code TEXT,
  nsu TEXT,
  tid TEXT,
  card_brand TEXT NOT NULL,
  card_type TEXT NOT NULL CHECK (card_type IN ('debit', 'credit')),
  card_last4 TEXT,
  gross_amount NUMERIC(18,2) NOT NULL,
  mdr_rate NUMERIC(5,2),
  mdr_amount NUMERIC(18,2),
  net_amount NUMERIC(18,2),
  installments INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('pending', 'captured', 'cancelled', 'refunded')),
  cancelled_at TIMESTAMPTZ,
  import_batch_id TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.card_receivables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.card_sales(id) ON DELETE CASCADE,
  installment_number INT NOT NULL,
  gross_amount NUMERIC(18,2) NOT NULL,
  mdr_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(18,2) NOT NULL,
  expected_date DATE NOT NULL,
  settlement_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'anticipated', 'cancelled')),
  anticipated_at TIMESTAMPTZ,
  anticipation_rate NUMERIC(5,2),
  anticipation_cost NUMERIC(18,2),
  anticipated_amount NUMERIC(18,2),
  settled_at TIMESTAMPTZ,
  settlement_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.card_settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.card_merchants(id),
  wallet_id UUID REFERENCES public.wallets(id),
  settlement_date DATE NOT NULL,
  reference_date DATE,
  gross_amount NUMERIC(18,2) NOT NULL,
  mdr_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  fee_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  anticipation_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
  adjustment_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(18,2) NOT NULL,
  receivable_count INT NOT NULL DEFAULT 0,
  statement_line_id UUID REFERENCES public.bank_statement_lines(id),
  is_reconciled BOOLEAN NOT NULL DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'reconciled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, merchant_id, settlement_date)
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_bank_accounts_company ON public.bank_accounts(company_id);
CREATE INDEX idx_cnab_remittances_status ON public.cnab_remittances(company_id, status);
CREATE INDEX idx_cnab_return_files_hash ON public.cnab_return_files(file_hash);
CREATE INDEX idx_boletos_status ON public.boletos(company_id, status);
CREATE INDEX idx_boletos_due_date ON public.boletos(company_id, due_date);
CREATE INDEX idx_card_sales_date ON public.card_sales(company_id, sale_date);
CREATE INDEX idx_card_receivables_expected ON public.card_receivables(company_id, expected_date, status);
CREATE INDEX idx_card_settlements_date ON public.card_settlements(company_id, settlement_date);

-- =====================================================
-- RLS + POLICIES
-- =====================================================

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_tolerances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnab_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnab_remittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnab_remittance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnab_return_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boleto_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_settlements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "company_access" ON public.bank_accounts FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.reconciliation_tolerances FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.cnab_agreements FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.cnab_remittances FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.cnab_remittance_items FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.cnab_return_files FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.boletos FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.boleto_events FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.card_merchants FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.card_sales FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.card_receivables FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "company_access" ON public.card_settlements FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Triggers
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cnab_agreements_updated_at BEFORE UPDATE ON public.cnab_agreements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_boletos_updated_at BEFORE UPDATE ON public.boletos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_card_merchants_updated_at BEFORE UPDATE ON public.card_merchants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();