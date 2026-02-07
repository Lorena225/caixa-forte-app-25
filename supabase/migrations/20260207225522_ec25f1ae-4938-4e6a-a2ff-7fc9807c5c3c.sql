-- =====================================================
-- CONTROLADORIA & FISCAL RESTRUCTURING MIGRATION
-- =====================================================

-- 1. Add accounting_account_id to transaction_categories for automatic accounting mapping
ALTER TABLE IF EXISTS public.account_categories 
ADD COLUMN IF NOT EXISTS accounting_account_id UUID REFERENCES public.accounts(id);

-- 2. Add XML storage and enhanced fiscal document fields
ALTER TABLE IF EXISTS public.fiscal_documents
ADD COLUMN IF NOT EXISTS xml_content TEXT,
ADD COLUMN IF NOT EXISTS xml_protocol TEXT,
ADD COLUMN IF NOT EXISTS authorization_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_protocol TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production',
ADD COLUMN IF NOT EXISTS validation_errors JSONB;

-- 3. Create fiscal_operations table for nature of operation configuration
CREATE TABLE IF NOT EXISTS public.fiscal_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  document_type VARCHAR(10) NOT NULL, -- 'nfe', 'nfse', 'nfce'
  operation_type VARCHAR(20) NOT NULL, -- 'entrada', 'saida'
  cfop_default VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);

-- 4. Create fiscal_tax_rules table for conditional tax rules
CREATE TABLE IF NOT EXISTS public.fiscal_tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  -- Conditions
  condition_state_origin VARCHAR(2),
  condition_state_destination VARCHAR(2),
  condition_ncm_pattern VARCHAR(20),
  condition_product_category_id UUID,
  condition_counterparty_type VARCHAR(50),
  condition_operation_id UUID REFERENCES public.fiscal_operations(id),
  -- Results
  cfop_code VARCHAR(10),
  icms_rate DECIMAL(5,2),
  icms_reduction DECIMAL(5,2) DEFAULT 0,
  icms_st_rate DECIMAL(5,2),
  ipi_rate DECIMAL(5,2),
  pis_rate DECIMAL(5,4) DEFAULT 1.65,
  cofins_rate DECIMAL(5,4) DEFAULT 7.60,
  iss_rate DECIMAL(5,2),
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create accounting_mappings table for Category -> Account De-Para
CREATE TABLE IF NOT EXISTS public.accounting_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  financial_category_id UUID NOT NULL REFERENCES public.account_categories(id),
  debit_account_id UUID REFERENCES public.accounts(id),
  credit_account_id UUID REFERENCES public.accounts(id),
  mapping_type VARCHAR(50) NOT NULL DEFAULT 'standard', -- 'standard', 'revenue', 'expense', 'asset', 'liability'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, financial_category_id, mapping_type)
);

-- 6. Create fiscal_dashboard_cache for performance
CREATE TABLE IF NOT EXISTS public.fiscal_dashboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  total_invoices_issued INTEGER DEFAULT 0,
  total_invoices_pending INTEGER DEFAULT 0,
  total_invoices_rejected INTEGER DEFAULT 0,
  total_revenue DECIMAL(18,2) DEFAULT 0,
  estimated_icms DECIMAL(18,2) DEFAULT 0,
  estimated_iss DECIMAL(18,2) DEFAULT 0,
  estimated_pis_cofins DECIMAL(18,2) DEFAULT 0,
  compliance_score INTEGER DEFAULT 100,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, period_year, period_month)
);

-- 7. Create fiscal_inconsistencies table for compliance alerts
CREATE TABLE IF NOT EXISTS public.fiscal_inconsistencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  inconsistency_type VARCHAR(100) NOT NULL, -- 'venda_sem_nf', 'nf_sem_pagamento', 'divergencia_valores'
  severity VARCHAR(20) NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  entity_type VARCHAR(50), -- 'transaction', 'fiscal_document', 'counterparty'
  entity_id UUID,
  suggested_action TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fiscal_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_tax_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_dashboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_inconsistencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their company fiscal_operations"
  ON public.fiscal_operations FOR ALL
  USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can manage their company fiscal_tax_rules"
  ON public.fiscal_tax_rules FOR ALL
  USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can manage their company accounting_mappings"
  ON public.accounting_mappings FOR ALL
  USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can view their company fiscal_dashboard_cache"
  ON public.fiscal_dashboard_cache FOR ALL
  USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can manage their company fiscal_inconsistencies"
  ON public.fiscal_inconsistencies FOR ALL
  USING (public.user_belongs_to_company(company_id));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fiscal_operations_company ON public.fiscal_operations(company_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_tax_rules_company_priority ON public.fiscal_tax_rules(company_id, priority DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_mappings_company ON public.accounting_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_inconsistencies_company_unresolved ON public.fiscal_inconsistencies(company_id, is_resolved) WHERE NOT is_resolved;
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_status ON public.fiscal_documents(company_id, status);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_period ON public.fiscal_documents(company_id, issue_date DESC);