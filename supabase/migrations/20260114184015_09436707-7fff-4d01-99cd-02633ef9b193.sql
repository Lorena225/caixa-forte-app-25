-- ============================================
-- MÓDULO FISCAL AVANÇADO - FASE 2 (CORRIGIDO)
-- ============================================

-- 1. SPED Fiscal Movements - Movimentos fiscais para SPED
CREATE TABLE IF NOT EXISTS public.sped_fiscal_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.fiscal_periods(id),
  document_type VARCHAR(20) NOT NULL,
  document_number VARCHAR(20) NOT NULL,
  document_date DATE NOT NULL,
  counterparty_id UUID REFERENCES public.counterparties(id),
  operation_type VARCHAR(10) NOT NULL CHECK (operation_type IN ('entrada', 'saida')),
  cfop_code VARCHAR(4) NOT NULL,
  ncm_code VARCHAR(8),
  cst_icms VARCHAR(3),
  cst_pis VARCHAR(2),
  cst_cofins VARCHAR(2),
  icms_base DECIMAL(18,2) DEFAULT 0,
  icms_value DECIMAL(18,2) DEFAULT 0,
  icms_rate DECIMAL(5,2) DEFAULT 0,
  ipi_base DECIMAL(18,2) DEFAULT 0,
  ipi_value DECIMAL(18,2) DEFAULT 0,
  ipi_rate DECIMAL(5,2) DEFAULT 0,
  pis_base DECIMAL(18,2) DEFAULT 0,
  pis_value DECIMAL(18,2) DEFAULT 0,
  pis_rate DECIMAL(5,4) DEFAULT 0,
  cofins_base DECIMAL(18,2) DEFAULT 0,
  cofins_value DECIMAL(18,2) DEFAULT 0,
  cofins_rate DECIMAL(5,4) DEFAULT 0,
  total_value DECIMAL(18,2) NOT NULL DEFAULT 0,
  observation TEXT,
  xml_key VARCHAR(44),
  source_document_id UUID,
  is_validated BOOLEAN DEFAULT FALSE,
  validation_errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. SPED Accounting Entries - Lançamentos contábeis SPED
CREATE TABLE IF NOT EXISTS public.sped_accounting_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.fiscal_periods(id),
  entry_date DATE NOT NULL,
  entry_number INTEGER NOT NULL,
  account_code VARCHAR(20) NOT NULL,
  account_id UUID REFERENCES public.accounts(id),
  debit_value DECIMAL(18,2) DEFAULT 0,
  credit_value DECIMAL(18,2) DEFAULT 0,
  history TEXT NOT NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id),
  document_type VARCHAR(20),
  document_number VARCHAR(30),
  counterparty_id UUID REFERENCES public.counterparties(id),
  is_validated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tax Calculations - Apurações de impostos
DROP TABLE IF EXISTS public.tax_calculations CASCADE;
CREATE TABLE public.tax_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.fiscal_periods(id),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  tax_type VARCHAR(20) NOT NULL CHECK (tax_type IN ('ICMS', 'PIS', 'COFINS', 'IPI', 'ISS', 'IRPJ', 'CSLL')),
  total_debits DECIMAL(18,2) DEFAULT 0,
  total_credits DECIMAL(18,2) DEFAULT 0,
  balance DECIMAL(18,2) DEFAULT 0,
  previous_balance DECIMAL(18,2) DEFAULT 0,
  payment_value DECIMAL(18,2) DEFAULT 0,
  payment_due_date DATE,
  payment_date DATE,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'apurado', 'pago', 'compensado')),
  darf_code VARCHAR(10),
  notes TEXT,
  calculated_by UUID,
  calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, period_year, period_month, tax_type)
);

-- 4. Digital Tax Books - Livros fiscais digitais
CREATE TABLE IF NOT EXISTS public.digital_tax_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.fiscal_periods(id),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  book_type VARCHAR(30) NOT NULL CHECK (book_type IN ('entrada', 'saida', 'inventario', 'apuracao_icms', 'apuracao_ipi', 'servicos_prestados', 'servicos_tomados')),
  file_path TEXT,
  file_name VARCHAR(255),
  file_hash VARCHAR(64),
  file_size_bytes INTEGER,
  generated_at TIMESTAMPTZ,
  generated_by UUID,
  is_signed BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMPTZ,
  signed_by UUID,
  certificate_info JSONB,
  is_validated BOOLEAN DEFAULT FALSE,
  validation_errors JSONB,
  is_transmitted BOOLEAN DEFAULT FALSE,
  transmitted_at TIMESTAMPTZ,
  protocol_number VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'gerado', 'assinado', 'transmitido', 'aceito', 'rejeitado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tax Obligations - Obrigações fiscais
CREATE TABLE IF NOT EXISTS public.tax_obligations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  obligation_type VARCHAR(50) NOT NULL,
  obligation_name VARCHAR(100) NOT NULL,
  reference_year INTEGER NOT NULL,
  reference_month INTEGER CHECK (reference_month BETWEEN 1 AND 12),
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_elaboracao', 'gerada', 'transmitida', 'aceita', 'rejeitada', 'retificada')),
  file_path TEXT,
  file_name VARCHAR(255),
  file_hash VARCHAR(64),
  protocol_number VARCHAR(50),
  receipt_number VARCHAR(50),
  transmission_date TIMESTAMPTZ,
  reception_date TIMESTAMPTZ,
  rejection_reason TEXT,
  rectification_of UUID REFERENCES public.tax_obligations(id),
  notes TEXT,
  responsible_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sped_fiscal_company_date ON public.sped_fiscal_movements(company_id, document_date);
CREATE INDEX IF NOT EXISTS idx_sped_fiscal_cfop ON public.sped_fiscal_movements(cfop_code);
CREATE INDEX IF NOT EXISTS idx_sped_accounting_company_date ON public.sped_accounting_entries(company_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_tax_calc_company_period ON public.tax_calculations(company_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_digital_books_company ON public.digital_tax_books(company_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_tax_oblig_company_due ON public.tax_obligations(company_id, due_date);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.sped_fiscal_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sped_accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_tax_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_obligations ENABLE ROW LEVEL SECURITY;

-- SPED Fiscal Movements policies
CREATE POLICY "sped_fiscal_select" ON public.sped_fiscal_movements
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "sped_fiscal_insert" ON public.sped_fiscal_movements
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "sped_fiscal_update" ON public.sped_fiscal_movements
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "sped_fiscal_delete" ON public.sped_fiscal_movements
  FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- SPED Accounting Entries policies
CREATE POLICY "sped_accounting_select" ON public.sped_accounting_entries
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "sped_accounting_insert" ON public.sped_accounting_entries
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "sped_accounting_update" ON public.sped_accounting_entries
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "sped_accounting_delete" ON public.sped_accounting_entries
  FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Tax Calculations policies
CREATE POLICY "tax_calc_select" ON public.tax_calculations
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "tax_calc_insert" ON public.tax_calculations
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "tax_calc_update" ON public.tax_calculations
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "tax_calc_delete" ON public.tax_calculations
  FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Digital Tax Books policies
CREATE POLICY "digital_books_select" ON public.digital_tax_books
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "digital_books_insert" ON public.digital_tax_books
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "digital_books_update" ON public.digital_tax_books
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "digital_books_delete" ON public.digital_tax_books
  FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Tax Obligations policies
CREATE POLICY "tax_oblig_select" ON public.tax_obligations
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "tax_oblig_insert" ON public.tax_obligations
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "tax_oblig_update" ON public.tax_obligations
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "tax_oblig_delete" ON public.tax_obligations
  FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER trg_sped_fiscal_updated_at
  BEFORE UPDATE ON public.sped_fiscal_movements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_tax_calc_updated_at
  BEFORE UPDATE ON public.tax_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_digital_books_updated_at
  BEFORE UPDATE ON public.digital_tax_books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_tax_oblig_updated_at
  BEFORE UPDATE ON public.tax_obligations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();