-- =====================================================
-- LOAN/FINANCING CONTRACTS MODULE
-- =====================================================

-- 1. ENUMS
CREATE TYPE loan_operation_type AS ENUM ('EMPRESTIMO', 'FINANCIAMENTO', 'CONTA_GARANTIDA', 'OUTRO');
CREATE TYPE loan_contract_status AS ENUM ('EDICAO', 'ATIVO', 'ENCERRADO', 'CANCELADO');
CREATE TYPE amortization_system AS ENUM ('SAC', 'PRICE');
CREATE TYPE rate_type AS ENUM ('FIXA', 'INDEXADA');
CREATE TYPE rate_index AS ENUM ('CDI', 'IPCA', 'SELIC', 'OUTRO');
CREATE TYPE rate_period AS ENUM ('MES', 'ANO', 'DIA');
CREATE TYPE grace_type AS ENUM ('SEM_CARENCIA', 'SO_JUROS', 'TOTAL');
CREATE TYPE installment_period AS ENUM ('MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'ANUAL');
CREATE TYPE loan_installment_status AS ENUM ('PREVISTA', 'GERADA', 'BAIXADA', 'RENEGOCIADA', 'CANCELADA');
CREATE TYPE loan_run_type AS ENUM ('CALCULO', 'GERACAO_AP', 'RECALCULO');
CREATE TYPE loan_run_status AS ENUM ('OK', 'FAILED');

-- 2. LOAN CONTRACT TYPES (optional but recommended)
CREATE TABLE public.loan_contract_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  default_amortization amortization_system NOT NULL DEFAULT 'PRICE',
  default_liability_account_id UUID REFERENCES public.accounts(id),
  default_interest_expense_account_id UUID REFERENCES public.accounts(id),
  default_cost_center_id UUID REFERENCES public.cost_centers(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loan_contract_types_company ON public.loan_contract_types(company_id);
CREATE UNIQUE INDEX idx_loan_contract_types_name ON public.loan_contract_types(company_id, name) WHERE is_active = TRUE;

ALTER TABLE public.loan_contract_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view loan contract types for their company"
  ON public.loan_contract_types FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage loan contract types for their company"
  ON public.loan_contract_types FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- 3. LOAN CONTRACTS (main table)
CREATE TABLE public.loan_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_type_id UUID REFERENCES public.loan_contract_types(id),
  contract_number VARCHAR(30) NOT NULL,
  operation_type loan_operation_type NOT NULL DEFAULT 'EMPRESTIMO',
  status loan_contract_status NOT NULL DEFAULT 'EDICAO',
  
  -- Parties
  creditor_partner_id UUID NOT NULL REFERENCES public.counterparties(id),
  bank_id UUID NOT NULL REFERENCES public.banks_reference(id),
  company_bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id),
  
  -- Conditions
  principal_amount DECIMAL(18,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  amortization_system amortization_system NOT NULL DEFAULT 'PRICE',
  rate_type rate_type NOT NULL DEFAULT 'FIXA',
  rate_index rate_index,
  nominal_rate DECIMAL(12,6) NOT NULL,
  rate_period rate_period NOT NULL DEFAULT 'MES',
  grace_periods INT NOT NULL DEFAULT 0,
  grace_type grace_type NOT NULL DEFAULT 'SEM_CARENCIA',
  installments_count INT NOT NULL,
  installment_period installment_period NOT NULL DEFAULT 'MENSAL',
  
  -- Dates
  contract_date DATE NOT NULL,
  disbursement_date DATE NOT NULL,
  first_due_date DATE NOT NULL,
  
  -- Accounting Integration
  liability_account_id UUID REFERENCES public.accounts(id),
  interest_expense_account_id UUID REFERENCES public.accounts(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  
  -- AP Generation Parameters
  ap_title_type VARCHAR(10) NOT NULL DEFAULT 'EMP',
  ap_series VARCHAR(10),
  description_template VARCHAR(200) DEFAULT 'Empréstimo {bank} – Contrato {contract} – Parcela {k}/{n}',
  payment_bank_account_id UUID REFERENCES public.bank_accounts(id),
  
  -- Controls
  opening_balance DECIMAL(18,2),
  allow_recalculate BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT chk_installments_count CHECK (installments_count > 0),
  CONSTRAINT chk_principal_positive CHECK (principal_amount > 0),
  CONSTRAINT chk_rate_positive CHECK (nominal_rate >= 0),
  CONSTRAINT chk_grace_periods CHECK (grace_periods >= 0)
);

CREATE UNIQUE INDEX idx_loan_contracts_number ON public.loan_contracts(company_id, contract_number);
CREATE INDEX idx_loan_contracts_company_status ON public.loan_contracts(company_id, status);
CREATE INDEX idx_loan_contracts_disbursement ON public.loan_contracts(company_id, disbursement_date);
CREATE INDEX idx_loan_contracts_creditor ON public.loan_contracts(company_id, creditor_partner_id);

ALTER TABLE public.loan_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view loan contracts for their company"
  ON public.loan_contracts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage loan contracts for their company"
  ON public.loan_contracts FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- 4. LOAN INSTALLMENTS
CREATE TABLE public.loan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.loan_contracts(id) ON DELETE CASCADE,
  installment_no INT NOT NULL,
  due_date DATE NOT NULL,
  installment_amount DECIMAL(18,2) NOT NULL,
  interest_amount DECIMAL(18,2) NOT NULL,
  amortization_amount DECIMAL(18,2) NOT NULL,
  remaining_balance DECIMAL(18,2) NOT NULL,
  status loan_installment_status NOT NULL DEFAULT 'PREVISTA',
  ap_transaction_id UUID REFERENCES public.transactions(id),
  generated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT chk_installment_amounts CHECK (
    installment_amount >= 0 AND 
    interest_amount >= 0 AND 
    amortization_amount >= 0 AND
    remaining_balance >= 0
  )
);

CREATE UNIQUE INDEX idx_loan_installments_unique ON public.loan_installments(company_id, contract_id, installment_no);
CREATE INDEX idx_loan_installments_contract_status ON public.loan_installments(company_id, contract_id, status);
CREATE INDEX idx_loan_installments_due_date ON public.loan_installments(company_id, due_date);
CREATE INDEX idx_loan_installments_ap ON public.loan_installments(ap_transaction_id) WHERE ap_transaction_id IS NOT NULL;

ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view loan installments for their company"
  ON public.loan_installments FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage loan installments for their company"
  ON public.loan_installments FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- 5. LOAN GENERATION RUNS (idempotency control)
CREATE TABLE public.loan_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.loan_contracts(id) ON DELETE CASCADE,
  run_type loan_run_type NOT NULL,
  params_json JSONB,
  idempotency_key VARCHAR(80) NOT NULL,
  status loan_run_status NOT NULL DEFAULT 'OK',
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX idx_loan_runs_idempotency ON public.loan_generation_runs(company_id, idempotency_key);
CREATE INDEX idx_loan_runs_contract ON public.loan_generation_runs(company_id, contract_id);

ALTER TABLE public.loan_generation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view loan runs for their company"
  ON public.loan_generation_runs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage loan runs for their company"
  ON public.loan_generation_runs FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- 6. Add origin fields to transactions table for AP integration
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS origin_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS origin_contract_id UUID REFERENCES public.loan_contracts(id),
ADD COLUMN IF NOT EXISTS origin_installment_id UUID REFERENCES public.loan_installments(id);

CREATE INDEX IF NOT EXISTS idx_transactions_origin_contract 
ON public.transactions(origin_contract_id) WHERE origin_contract_id IS NOT NULL;

-- 7. Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_loan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_loan_contract_types_updated
  BEFORE UPDATE ON public.loan_contract_types
  FOR EACH ROW EXECUTE FUNCTION public.update_loan_updated_at();

CREATE TRIGGER trg_loan_contracts_updated
  BEFORE UPDATE ON public.loan_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_loan_updated_at();

CREATE TRIGGER trg_loan_installments_updated
  BEFORE UPDATE ON public.loan_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_loan_updated_at();

-- 8. Function to sync installment status when AP transaction is settled
CREATE OR REPLACE FUNCTION public.sync_loan_installment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When transaction is paid/settled
  IF NEW.paid_date IS NOT NULL AND OLD.paid_date IS NULL THEN
    UPDATE public.loan_installments
    SET status = 'BAIXADA', updated_at = now()
    WHERE ap_transaction_id = NEW.id;
  END IF;
  
  -- When transaction payment is reversed
  IF NEW.paid_date IS NULL AND OLD.paid_date IS NOT NULL THEN
    UPDATE public.loan_installments
    SET status = 'GERADA', updated_at = now()
    WHERE ap_transaction_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sync_loan_installment_on_transaction
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  WHEN (OLD.paid_date IS DISTINCT FROM NEW.paid_date)
  EXECUTE FUNCTION public.sync_loan_installment_status();