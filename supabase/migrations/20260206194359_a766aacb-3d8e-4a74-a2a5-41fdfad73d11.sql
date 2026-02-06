-- ===========================================
-- Expand contracts table for subscriptions/recurrence
-- ===========================================

-- Add new columns to existing contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'mensal' CHECK (billing_cycle IN ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
ADD COLUMN IF NOT EXISTS billing_day INTEGER DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 28),
ADD COLUMN IF NOT EXISTS auto_adjustment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS adjustment_index TEXT CHECK (adjustment_index IN ('IGPM', 'IPCA', 'INPC', 'SELIC', 'MANUAL', NULL)),
ADD COLUMN IF NOT EXISTS next_adjustment_date DATE,
ADD COLUMN IF NOT EXISTS last_adjustment_date DATE,
ADD COLUMN IF NOT EXISTS adjustment_percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS monthly_value NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_fee_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
ADD COLUMN IF NOT EXISTS auto_generate_billing BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_billing_date DATE,
ADD COLUMN IF NOT EXISTS next_billing_date DATE,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update status check constraint (drop and recreate)
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_status_check 
  CHECK (status IN ('ativo', 'suspenso', 'cancelado', 'expirado', 'rascunho', 'vigente', 'encerrado'));

-- Create contract_items table if not exists
CREATE TABLE IF NOT EXISTS public.contract_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,2) NOT NULL,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contract_billings table if not exists
CREATE TABLE IF NOT EXISTS public.contract_billings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  reference_month INTEGER NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
  reference_year INTEGER NOT NULL,
  billing_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'gerado' CHECK (status IN ('gerado', 'faturado', 'pago', 'cancelado')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_next_billing ON public.contracts(company_id, next_billing_date) WHERE status = 'ativo';
CREATE INDEX IF NOT EXISTS idx_contracts_monthly_value ON public.contracts(company_id, monthly_value) WHERE status = 'ativo';
CREATE INDEX IF NOT EXISTS idx_contract_items_contract ON public.contract_items(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_billings_contract ON public.contract_billings(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_billings_reference ON public.contract_billings(contract_id, reference_year, reference_month);

-- Enable RLS
ALTER TABLE public.contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_billings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contract_items
DROP POLICY IF EXISTS "contract_items_select" ON public.contract_items;
DROP POLICY IF EXISTS "contract_items_insert" ON public.contract_items;
DROP POLICY IF EXISTS "contract_items_update" ON public.contract_items;
DROP POLICY IF EXISTS "contract_items_delete" ON public.contract_items;

CREATE POLICY "contract_items_select" ON public.contract_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND public.user_belongs_to_company(c.company_id))
  );

CREATE POLICY "contract_items_insert" ON public.contract_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND public.user_belongs_to_company(c.company_id))
  );

CREATE POLICY "contract_items_update" ON public.contract_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND public.user_belongs_to_company(c.company_id))
  );

CREATE POLICY "contract_items_delete" ON public.contract_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND public.user_belongs_to_company(c.company_id))
  );

-- RLS Policies for contract_billings
DROP POLICY IF EXISTS "contract_billings_select" ON public.contract_billings;
DROP POLICY IF EXISTS "contract_billings_insert" ON public.contract_billings;
DROP POLICY IF EXISTS "contract_billings_update" ON public.contract_billings;
DROP POLICY IF EXISTS "contract_billings_delete" ON public.contract_billings;

CREATE POLICY "contract_billings_select" ON public.contract_billings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND public.user_belongs_to_company(c.company_id))
  );

CREATE POLICY "contract_billings_insert" ON public.contract_billings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND public.user_belongs_to_company(c.company_id))
  );

CREATE POLICY "contract_billings_update" ON public.contract_billings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND public.user_belongs_to_company(c.company_id))
  );

CREATE POLICY "contract_billings_delete" ON public.contract_billings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND public.user_belongs_to_company(c.company_id))
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_contract_items_updated_at ON public.contract_items;
CREATE TRIGGER trg_contract_items_updated_at
  BEFORE UPDATE ON public.contract_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add origin_contract_id to transactions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'origin_contract_id'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN origin_contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL;
    CREATE INDEX idx_transactions_origin_contract ON public.transactions(origin_contract_id) WHERE origin_contract_id IS NOT NULL;
  END IF;
END $$;

-- Function to calculate next billing date
CREATE OR REPLACE FUNCTION public.calculate_next_billing_date(
  p_last_date DATE,
  p_billing_cycle TEXT,
  p_billing_day INTEGER
)
RETURNS DATE AS $$
DECLARE
  v_months INTEGER;
  v_next_date DATE;
BEGIN
  CASE p_billing_cycle
    WHEN 'mensal' THEN v_months := 1;
    WHEN 'bimestral' THEN v_months := 2;
    WHEN 'trimestral' THEN v_months := 3;
    WHEN 'semestral' THEN v_months := 6;
    WHEN 'anual' THEN v_months := 12;
    ELSE v_months := 1;
  END CASE;
  
  v_next_date := (p_last_date + (v_months || ' months')::INTERVAL)::DATE;
  v_next_date := DATE_TRUNC('month', v_next_date) + (LEAST(p_billing_day, 28) - 1) * INTERVAL '1 day';
  
  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to generate contract billing
CREATE OR REPLACE FUNCTION public.generate_contract_billing(
  p_contract_id UUID,
  p_reference_month INTEGER,
  p_reference_year INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_contract RECORD;
  v_billing_id UUID;
  v_transaction_id UUID;
  v_due_date DATE;
  v_total_value NUMERIC(15,2);
BEGIN
  SELECT * INTO v_contract FROM public.contracts WHERE id = p_contract_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado';
  END IF;
  
  IF v_contract.status != 'ativo' THEN
    RAISE EXCEPTION 'Contrato não está ativo';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM public.contract_billings 
    WHERE contract_id = p_contract_id 
    AND reference_month = p_reference_month 
    AND reference_year = p_reference_year
  ) THEN
    RAISE EXCEPTION 'Faturamento já existe para este período';
  END IF;
  
  -- Calculate value from items or use monthly_value
  SELECT COALESCE(SUM(quantity * unit_price * (1 - COALESCE(discount_percentage, 0) / 100)), 0)
  INTO v_total_value
  FROM public.contract_items
  WHERE contract_id = p_contract_id AND is_active = true;
  
  IF v_total_value = 0 THEN
    v_total_value := COALESCE(v_contract.monthly_value, 0);
  END IF;
  
  IF v_total_value <= 0 THEN
    RAISE EXCEPTION 'Contrato sem valor para faturar';
  END IF;
  
  v_due_date := MAKE_DATE(p_reference_year, p_reference_month, LEAST(COALESCE(v_contract.billing_day, 1), 28));
  
  INSERT INTO public.transactions (
    company_id,
    counterparty_id,
    direction,
    transaction_date,
    due_date,
    description,
    original_amount,
    total_amount,
    status,
    is_recurring,
    origin_contract_id
  ) VALUES (
    v_contract.company_id,
    v_contract.counterparty_id,
    'entrada',
    CURRENT_DATE,
    v_due_date,
    'Mensalidade Ref. Contrato #' || COALESCE(v_contract.contract_number, v_contract.id::TEXT),
    v_total_value,
    v_total_value,
    'lancado',
    true,
    v_contract.id
  )
  RETURNING id INTO v_transaction_id;
  
  INSERT INTO public.contract_billings (
    contract_id,
    transaction_id,
    reference_month,
    reference_year,
    billing_date,
    due_date,
    amount,
    status
  ) VALUES (
    p_contract_id,
    v_transaction_id,
    p_reference_month,
    p_reference_year,
    CURRENT_DATE,
    v_due_date,
    v_total_value,
    'faturado'
  )
  RETURNING id INTO v_billing_id;
  
  UPDATE public.contracts 
  SET 
    last_billing_date = CURRENT_DATE,
    next_billing_date = public.calculate_next_billing_date(v_due_date, COALESCE(v_contract.billing_cycle, 'mensal'), COALESCE(v_contract.billing_day, 1))
  WHERE id = p_contract_id;
  
  RETURN v_billing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;