-- Bank Reconciliations table
CREATE TABLE public.bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.wallets(id),
  reconciliation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  closing_balance DECIMAL(15,2) DEFAULT 0,
  total_matched DECIMAL(15,2) DEFAULT 0,
  total_unmatched DECIMAL(15,2) DEFAULT 0,
  differences DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  reconciled_by UUID REFERENCES auth.users(id),
  reconciled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bank Matches table
CREATE TABLE public.bank_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES public.bank_reconciliations(id) ON DELETE CASCADE,
  bank_transaction_id UUID NOT NULL,
  caixa_register_id UUID REFERENCES public.transactions(id),
  match_score DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (match_score >= 0 AND match_score <= 100),
  match_type VARCHAR(30) NOT NULL DEFAULT 'NONE' CHECK (match_type IN ('EXACT', 'DATE_FUZZY', 'AMOUNT_FUZZY', 'DESCRIPTION_FUZZY', 'NONE')),
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  suggested_action VARCHAR(20) DEFAULT 'MANUAL_REVIEW' CHECK (suggested_action IN ('AUTO_MATCH', 'MANUAL_REVIEW', 'FRAUD_ALERT')),
  is_auto_matched BOOLEAN NOT NULL DEFAULT false,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bank_reconciliations using security helper
CREATE POLICY "Users can view their company reconciliations"
  ON public.bank_reconciliations FOR SELECT
  USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can create reconciliations for their company"
  ON public.bank_reconciliations FOR INSERT
  WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can update their company reconciliations"
  ON public.bank_reconciliations FOR UPDATE
  USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can delete their company reconciliations"
  ON public.bank_reconciliations FOR DELETE
  USING (public.user_belongs_to_company(company_id));

-- RLS Policies for bank_matches via parent reconciliation
CREATE POLICY "Users can view matches for their company reconciliations"
  ON public.bank_matches FOR SELECT
  USING (reconciliation_id IN (
    SELECT id FROM public.bank_reconciliations WHERE public.user_belongs_to_company(company_id)
  ));

CREATE POLICY "Users can create matches for their company reconciliations"
  ON public.bank_matches FOR INSERT
  WITH CHECK (reconciliation_id IN (
    SELECT id FROM public.bank_reconciliations WHERE public.user_belongs_to_company(company_id)
  ));

CREATE POLICY "Users can update matches for their company reconciliations"
  ON public.bank_matches FOR UPDATE
  USING (reconciliation_id IN (
    SELECT id FROM public.bank_reconciliations WHERE public.user_belongs_to_company(company_id)
  ));

CREATE POLICY "Users can delete matches for their company reconciliations"
  ON public.bank_matches FOR DELETE
  USING (reconciliation_id IN (
    SELECT id FROM public.bank_reconciliations WHERE public.user_belongs_to_company(company_id)
  ));

-- Indexes for performance
CREATE INDEX idx_bank_reconciliations_company ON public.bank_reconciliations(company_id);
CREATE INDEX idx_bank_reconciliations_status ON public.bank_reconciliations(status);
CREATE INDEX idx_bank_reconciliations_date ON public.bank_reconciliations(reconciliation_date);
CREATE INDEX idx_bank_matches_reconciliation ON public.bank_matches(reconciliation_id);
CREATE INDEX idx_bank_matches_score ON public.bank_matches(match_score);
CREATE INDEX idx_bank_matches_confirmed ON public.bank_matches(is_confirmed);

-- Trigger for updated_at
CREATE TRIGGER update_bank_reconciliations_updated_at
  BEFORE UPDATE ON public.bank_reconciliations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();