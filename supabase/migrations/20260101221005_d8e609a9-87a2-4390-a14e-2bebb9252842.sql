-- =============================================
-- ERP FINANCEIRO COMPLETO - MIGRAÇÃO PRINCIPAL
-- =============================================

-- 1. GOVERNANÇA E SEGURANÇA
-- =============================================

-- Tabela de filiais/estabelecimentos
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT,
  ie TEXT, -- Inscrição Estadual
  im TEXT, -- Inscrição Municipal
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  is_active BOOLEAN DEFAULT true,
  is_headquarters BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Tabela de papéis/perfis
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Tabela de permissões
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Relacionamento papel-permissão
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Tabela de períodos contábeis
CREATE TABLE public.periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_open BOOLEAN DEFAULT true,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, year, month)
);

-- Travas de período (fechamento)
CREATE TABLE public.period_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  module TEXT NOT NULL, -- 'gl', 'ap', 'ar', 'treasury', 'fiscal'
  locked_at TIMESTAMPTZ DEFAULT now(),
  locked_by UUID,
  unlocked_at TIMESTAMPTZ,
  unlocked_by UUID,
  unlock_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period_id, module)
);

-- 2. DIMENSÕES GERENCIAIS
-- =============================================

-- Tipos de dimensão (centro de custo, projeto, unidade, etc.)
CREATE TABLE public.dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Valores de dimensão
CREATE TABLE public.dimension_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  dimension_id UUID NOT NULL REFERENCES public.dimensions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.dimension_values(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dimension_id, code)
);

-- Ligação transação-dimensões
CREATE TABLE public.transaction_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  dimension_id UUID NOT NULL REFERENCES public.dimensions(id) ON DELETE RESTRICT,
  dimension_value_id UUID NOT NULL REFERENCES public.dimension_values(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(transaction_id, dimension_id)
);

-- Regras de rateio
CREATE TABLE public.allocation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_dimension_id UUID REFERENCES public.dimensions(id),
  source_value_id UUID REFERENCES public.dimension_values(id),
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('percentage', 'fixed', 'proportional')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Itens do rateio
CREATE TABLE public.allocation_rule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.allocation_rules(id) ON DELETE CASCADE,
  target_dimension_id UUID NOT NULL REFERENCES public.dimensions(id),
  target_value_id UUID NOT NULL REFERENCES public.dimension_values(id),
  percentage DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. DADOS BANCÁRIOS DE PARCEIROS
-- =============================================

CREATE TABLE public.counterparty_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  counterparty_id UUID NOT NULL REFERENCES public.counterparties(id) ON DELETE CASCADE,
  bank_code TEXT NOT NULL,
  bank_name TEXT,
  agency TEXT NOT NULL,
  agency_digit TEXT,
  account_number TEXT NOT NULL,
  account_digit TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings', 'payment')),
  pix_key TEXT,
  pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. AP - CONTAS A PAGAR ENTERPRISE
-- =============================================

-- Documentos a pagar (NF/Fatura)
CREATE TABLE public.vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  counterparty_id UUID NOT NULL REFERENCES public.counterparties(id),
  document_type TEXT NOT NULL CHECK (document_type IN ('nf', 'nfe', 'nfse', 'fatura', 'recibo', 'boleto', 'outro')),
  document_number TEXT NOT NULL,
  document_series TEXT,
  document_date DATE NOT NULL,
  due_date DATE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(15,2) NOT NULL,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  interest_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'partial', 'paid', 'cancelled')),
  payment_method_id UUID REFERENCES public.payment_methods(id),
  wallet_id UUID REFERENCES public.wallets(id),
  notes TEXT,
  attachment_url TEXT,
  -- Campos de aprovação
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  -- Campos fiscais
  fiscal_document_id UUID,
  -- Auditoria
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Linhas do documento a pagar
CREATE TABLE public.vendor_bill_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_bill_id UUID NOT NULL REFERENCES public.vendor_bills(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.account_categories(id),
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  quantity DECIMAL(15,4) DEFAULT 1,
  unit_price DECIMAL(15,4) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Retenções de impostos
CREATE TABLE public.vendor_bill_withholdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_bill_id UUID NOT NULL REFERENCES public.vendor_bills(id) ON DELETE CASCADE,
  tax_code TEXT NOT NULL, -- 'irrf', 'inss', 'iss', 'pis', 'cofins', 'csll'
  base_amount DECIMAL(15,2) NOT NULL,
  rate DECIMAL(5,4) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. AR - CONTAS A RECEBER ENTERPRISE
-- =============================================

-- Faturas a receber
CREATE TABLE public.customer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  counterparty_id UUID NOT NULL REFERENCES public.counterparties(id),
  document_type TEXT NOT NULL CHECK (document_type IN ('nf', 'nfe', 'nfse', 'fatura', 'recibo', 'boleto', 'contrato', 'outro')),
  document_number TEXT NOT NULL,
  document_series TEXT,
  document_date DATE NOT NULL,
  due_date DATE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(15,2) NOT NULL,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  interest_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'partial', 'paid', 'overdue', 'cancelled', 'written_off')),
  payment_method_id UUID REFERENCES public.payment_methods(id),
  wallet_id UUID REFERENCES public.wallets(id),
  notes TEXT,
  attachment_url TEXT,
  -- Campos de cobrança
  collection_status TEXT DEFAULT 'none' CHECK (collection_status IN ('none', 'scheduled', 'sent', 'negotiating', 'legal')),
  last_collection_at TIMESTAMPTZ,
  collection_notes TEXT,
  -- Campos fiscais
  fiscal_document_id UUID,
  -- Auditoria
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Linhas da fatura
CREATE TABLE public.customer_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_invoice_id UUID NOT NULL REFERENCES public.customer_invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.account_categories(id),
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  quantity DECIMAL(15,4) DEFAULT 1,
  unit_price DECIMAL(15,4) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Retenções de impostos em AR
CREATE TABLE public.customer_invoice_withholdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_invoice_id UUID NOT NULL REFERENCES public.customer_invoices(id) ON DELETE CASCADE,
  tax_code TEXT NOT NULL,
  base_amount DECIMAL(15,2) NOT NULL,
  rate DECIMAL(5,4) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PAGAMENTOS E RECEBIMENTOS
-- =============================================

-- Pagamentos (baixas de AP)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_bill_id UUID REFERENCES public.vendor_bills(id),
  transaction_id UUID REFERENCES public.transactions(id),
  payment_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  interest_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) NOT NULL,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  payment_method_id UUID REFERENCES public.payment_methods(id),
  reference_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Recebimentos (baixas de AR)
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_invoice_id UUID REFERENCES public.customer_invoices(id),
  transaction_id UUID REFERENCES public.transactions(id),
  receipt_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  interest_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) NOT NULL,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  payment_method_id UUID REFERENCES public.payment_methods(id),
  reference_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TESOURARIA - CNAB E LOTES
-- =============================================

-- Extratos bancários
CREATE TABLE public.bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  statement_date DATE NOT NULL,
  opening_balance DECIMAL(15,2),
  closing_balance DECIMAL(15,2),
  source_type TEXT CHECK (source_type IN ('ofx', 'csv', 'api', 'manual')),
  source_filename TEXT,
  imported_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Linhas do extrato
CREATE TABLE public.bank_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  line_number INTEGER,
  posted_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  balance DECIMAL(15,2),
  fit_id TEXT,
  check_number TEXT,
  reference_number TEXT,
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Arquivos CNAB
CREATE TABLE public.cnab_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  file_type TEXT NOT NULL CHECK (file_type IN ('remessa', 'retorno')),
  cnab_layout TEXT NOT NULL CHECK (cnab_layout IN ('240', '400')),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('cobranca', 'pagamento')),
  file_name TEXT NOT NULL,
  file_content TEXT,
  record_count INTEGER,
  total_amount DECIMAL(15,2),
  generation_date DATE,
  processing_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'processed', 'error')),
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ocorrências CNAB
CREATE TABLE public.cnab_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnab_file_id UUID NOT NULL REFERENCES public.cnab_files(id) ON DELETE CASCADE,
  line_number INTEGER,
  occurrence_code TEXT NOT NULL,
  occurrence_description TEXT,
  document_number TEXT,
  amount DECIMAL(15,2),
  due_date DATE,
  payment_date DATE,
  counterparty_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'error')),
  related_transaction_id UUID REFERENCES public.transactions(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lotes de pagamento (borderô)
CREATE TABLE public.payment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  run_number TEXT NOT NULL,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  total_amount DECIMAL(15,2) NOT NULL,
  item_count INTEGER NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent', 'processed', 'cancelled')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  cnab_file_id UUID REFERENCES public.cnab_files(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, run_number)
);

-- Itens do lote de pagamento
CREATE TABLE public.payment_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_run_id UUID NOT NULL REFERENCES public.payment_runs(id) ON DELETE CASCADE,
  vendor_bill_id UUID NOT NULL REFERENCES public.vendor_bills(id),
  amount DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'error', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. CONTABILIDADE (GL)
-- =============================================

-- Lançamentos contábeis (cabeçalho)
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  period_id UUID REFERENCES public.periods(id),
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL,
  posting_date DATE NOT NULL,
  description TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'ap', 'ar', 'treasury', 'fiscal', 'closing', 'reversal', 'import')),
  source_id UUID,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
  total_debit DECIMAL(15,2) NOT NULL,
  total_credit DECIMAL(15,2) NOT NULL,
  reversed_by UUID REFERENCES public.journal_entries(id),
  reversal_of UUID REFERENCES public.journal_entries(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, entry_number)
);

-- Linhas do lançamento contábil (partidas)
CREATE TABLE public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  cost_center_id UUID REFERENCES public.cost_centers(id),
  counterparty_id UUID REFERENCES public.counterparties(id),
  document_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Regras de contabilização automática
CREATE TABLE public.posting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('ap_payment', 'ar_receipt', 'bank_fee', 'interest', 'discount', 'tax')),
  debit_account_id UUID NOT NULL REFERENCES public.accounts(id),
  credit_account_id UUID NOT NULL REFERENCES public.accounts(id),
  description_template TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link entre subledger e GL
CREATE TABLE public.subledger_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'vendor_bill', 'customer_invoice', 'payment', 'receipt', 'transaction'
  source_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(journal_entry_id, source_type, source_id)
);

-- 9. FISCAL BRASIL
-- =============================================

-- Documentos fiscais
CREATE TABLE public.fiscal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  document_model TEXT NOT NULL CHECK (document_model IN ('55', '65', 'nfse', 'cte', 'mdfe', 'sat', 'outro')),
  document_series TEXT,
  document_number TEXT NOT NULL,
  access_key TEXT, -- Chave de acesso NFe/NFSe
  issue_date DATE NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('entrada', 'saida')),
  counterparty_id UUID REFERENCES public.counterparties(id),
  total_products DECIMAL(15,2) DEFAULT 0,
  total_services DECIMAL(15,2) DEFAULT 0,
  total_discount DECIMAL(15,2) DEFAULT 0,
  total_freight DECIMAL(15,2) DEFAULT 0,
  total_insurance DECIMAL(15,2) DEFAULT 0,
  total_other DECIMAL(15,2) DEFAULT 0,
  total_icms DECIMAL(15,2) DEFAULT 0,
  total_icms_st DECIMAL(15,2) DEFAULT 0,
  total_ipi DECIMAL(15,2) DEFAULT 0,
  total_pis DECIMAL(15,2) DEFAULT 0,
  total_cofins DECIMAL(15,2) DEFAULT 0,
  total_iss DECIMAL(15,2) DEFAULT 0,
  total_ir DECIMAL(15,2) DEFAULT 0,
  total_inss DECIMAL(15,2) DEFAULT 0,
  total_csll DECIMAL(15,2) DEFAULT 0,
  total_nf DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'cancelled', 'denied', 'inutilized')),
  xml_content TEXT,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Itens do documento fiscal
CREATE TABLE public.fiscal_document_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_document_id UUID NOT NULL REFERENCES public.fiscal_documents(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  product_code TEXT,
  product_description TEXT NOT NULL,
  ncm TEXT,
  cfop TEXT,
  unit TEXT,
  quantity DECIMAL(15,4) NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  icms_base DECIMAL(15,2) DEFAULT 0,
  icms_rate DECIMAL(5,2) DEFAULT 0,
  icms_amount DECIMAL(15,2) DEFAULT 0,
  ipi_base DECIMAL(15,2) DEFAULT 0,
  ipi_rate DECIMAL(5,2) DEFAULT 0,
  ipi_amount DECIMAL(15,2) DEFAULT 0,
  pis_base DECIMAL(15,2) DEFAULT 0,
  pis_rate DECIMAL(5,4) DEFAULT 0,
  pis_amount DECIMAL(15,2) DEFAULT 0,
  cofins_base DECIMAL(15,2) DEFAULT 0,
  cofins_rate DECIMAL(5,4) DEFAULT 0,
  cofins_amount DECIMAL(15,2) DEFAULT 0,
  iss_base DECIMAL(15,2) DEFAULT 0,
  iss_rate DECIMAL(5,2) DEFAULT 0,
  iss_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Códigos de imposto
CREATE TABLE public.tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  tax_type TEXT NOT NULL CHECK (tax_type IN ('icms', 'icms_st', 'ipi', 'pis', 'cofins', 'iss', 'irrf', 'inss', 'csll', 'ir', 'outros')),
  rate DECIMAL(5,4) NOT NULL,
  calculation_base TEXT DEFAULT 'total' CHECK (calculation_base IN ('total', 'products', 'services', 'custom')),
  is_withholding BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Regras de impostos
CREATE TABLE public.tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tax_code_id UUID NOT NULL REFERENCES public.tax_codes(id),
  operation_type TEXT CHECK (operation_type IN ('entrada', 'saida', 'both')),
  document_type TEXT,
  cfop_pattern TEXT,
  counterparty_type TEXT, -- por tipo de parceiro
  state_origin TEXT,
  state_destination TEXT,
  city_code TEXT, -- para ISS municipal
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Regras de retenção
CREATE TABLE public.withholding_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tax_type TEXT NOT NULL CHECK (tax_type IN ('irrf', 'inss', 'iss', 'pis', 'cofins', 'csll')),
  service_code TEXT,
  minimum_amount DECIMAL(15,2) DEFAULT 0,
  rate DECIMAL(5,4) NOT NULL,
  deduction_amount DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Apuração de impostos
CREATE TABLE public.tax_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.periods(id),
  tax_type TEXT NOT NULL,
  base_amount DECIMAL(15,2) NOT NULL,
  rate DECIMAL(5,4),
  amount DECIMAL(15,2) NOT NULL,
  is_withholding BOOLEAN DEFAULT false,
  source_type TEXT, -- 'vendor_bill', 'customer_invoice', 'fiscal_document'
  source_id UUID,
  due_date DATE,
  paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Relatórios fiscais por período
CREATE TABLE public.tax_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.periods(id),
  report_type TEXT NOT NULL, -- 'iss', 'irrf', 'inss', 'pis_cofins', 'icms', 'summary'
  total_base DECIMAL(15,2) NOT NULL,
  total_tax DECIMAL(15,2) NOT NULL,
  total_withheld DECIMAL(15,2) DEFAULT 0,
  total_due DECIMAL(15,2) NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. WORKFLOW DE APROVAÇÃO
-- =============================================

CREATE TABLE public.approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vendor_bill', 'customer_invoice', 'payment_run', 'journal_entry')),
  min_amount DECIMAL(15,2),
  max_amount DECIMAL(15,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  role_id UUID REFERENCES public.roles(id),
  user_id UUID,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.approval_workflows(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by UUID,
  requested_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.approval_steps(id),
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'delegate')),
  action_by UUID NOT NULL,
  action_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  delegated_to UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. COBRANÇA E RÉGUA
-- =============================================

CREATE TABLE public.collection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days_before_due INTEGER, -- negativo = antes do vencimento
  days_after_due INTEGER,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'letter', 'phone')),
  template_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.collection_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_invoice_id UUID NOT NULL REFERENCES public.customer_invoices(id),
  rule_id UUID REFERENCES public.collection_rules(id),
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'responded', 'failed')),
  response_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. POSIÇÃO DE CAIXA
-- =============================================

CREATE TABLE public.cash_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position_date DATE NOT NULL,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  opening_balance DECIMAL(15,2) NOT NULL,
  total_inflows DECIMAL(15,2) DEFAULT 0,
  total_outflows DECIMAL(15,2) DEFAULT 0,
  closing_balance DECIMAL(15,2) NOT NULL,
  projected_inflows DECIMAL(15,2) DEFAULT 0,
  projected_outflows DECIMAL(15,2) DEFAULT 0,
  projected_balance DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, wallet_id, position_date)
);

-- Enable RLS em todas as novas tabelas
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dimension_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_rule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counterparty_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_bill_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_bill_withholdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_invoice_withholdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnab_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnab_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subledger_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_document_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withholding_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_positions ENABLE ROW LEVEL SECURITY;

-- Permissões (sistema)
INSERT INTO public.permissions (code, name, module) VALUES
('companies.read', 'Ver empresas', 'admin'),
('companies.write', 'Gerenciar empresas', 'admin'),
('users.read', 'Ver usuários', 'admin'),
('users.write', 'Gerenciar usuários', 'admin'),
('ap.read', 'Ver contas a pagar', 'ap'),
('ap.write', 'Gerenciar contas a pagar', 'ap'),
('ap.approve', 'Aprovar pagamentos', 'ap'),
('ar.read', 'Ver contas a receber', 'ar'),
('ar.write', 'Gerenciar contas a receber', 'ar'),
('treasury.read', 'Ver tesouraria', 'treasury'),
('treasury.write', 'Gerenciar tesouraria', 'treasury'),
('treasury.reconcile', 'Conciliar extratos', 'treasury'),
('gl.read', 'Ver contabilidade', 'gl'),
('gl.write', 'Lançamentos contábeis', 'gl'),
('gl.close', 'Fechar período', 'gl'),
('fiscal.read', 'Ver fiscal', 'fiscal'),
('fiscal.write', 'Gerenciar fiscal', 'fiscal'),
('reports.read', 'Ver relatórios', 'reports'),
('reports.export', 'Exportar relatórios', 'reports');