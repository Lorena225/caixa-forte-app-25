-- =====================================================
-- MÓDULO EMPRÉSTIMOS & FINANCIAMENTOS
-- VirtruvIA · Blueprint Sistema Financeiro v1.0
-- =====================================================

-- 1. Contratos de empréstimo
CREATE TABLE IF NOT EXISTS public.loan_contracts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  counterparty_id   UUID REFERENCES public.counterparties(id),
  description       TEXT NOT NULL,
  contract_number   TEXT,
  modality          TEXT NOT NULL DEFAULT 'term_loan'
    CHECK (modality IN ('term_loan','revolving','leasing','debenture','cri_cra','other')),
  amortization_system TEXT NOT NULL DEFAULT 'price'
    CHECK (amortization_system IN ('price','sac','bullet','misto','custom')),
  direction         TEXT NOT NULL DEFAULT 'payable'
    CHECK (direction IN ('payable','receivable')),
  -- Valores
  principal_amount  NUMERIC(15,2) NOT NULL,
  outstanding_balance NUMERIC(15,2) NOT NULL,
  -- Taxa
  interest_rate     NUMERIC(8,6) NOT NULL,
  rate_period       TEXT NOT NULL DEFAULT 'monthly'
    CHECK (rate_period IN ('daily','monthly','annual')),
  indexer           TEXT DEFAULT 'prefixed'
    CHECK (indexer IN ('prefixed','cdi','ipca','igpm','selic','tjlp','tr','other')),
  indexer_spread    NUMERIC(8,6) DEFAULT 0,
  -- Datas
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  first_payment_date DATE NOT NULL,
  -- IOF e tarifas
  iof_amount        NUMERIC(15,2) DEFAULT 0,
  origination_fee   NUMERIC(15,2) DEFAULT 0,
  -- Garantias
  collateral_type   TEXT,
  collateral_value  NUMERIC(15,2),
  collateral_notes  TEXT,
  -- Covenants
  covenants_json    JSONB DEFAULT '[]',
  -- Status
  status            TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','settled','defaulted','renegotiated','cancelled')),
  -- Contas contábeis
  account_principal UUID REFERENCES public.accounts(id),
  account_interest  UUID REFERENCES public.accounts(id),
  account_cost_center TEXT,
  -- Metadados
  notes             TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_contracts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_loan_contracts_company ON public.loan_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_status  ON public.loan_contracts(company_id, status);

DROP POLICY IF EXISTS "loan_contracts_select" ON public.loan_contracts;
CREATE POLICY "loan_contracts_select" ON public.loan_contracts
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "loan_contracts_all" ON public.loan_contracts;
CREATE POLICY "loan_contracts_all" ON public.loan_contracts
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND role IN ('admin','gestor')
    )
  );

-- 2. Cronograma de parcelas
CREATE TABLE IF NOT EXISTS public.loan_schedule (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID NOT NULL REFERENCES public.loan_contracts(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  installment_num INTEGER NOT NULL,
  due_date        DATE NOT NULL,
  -- Composição da parcela
  principal       NUMERIC(15,2) NOT NULL DEFAULT 0,
  interest        NUMERIC(15,2) NOT NULL DEFAULT 0,
  iof             NUMERIC(15,2) NOT NULL DEFAULT 0,
  fees            NUMERIC(15,2) NOT NULL DEFAULT 0,
  total           NUMERIC(15,2) NOT NULL,
  -- Saldo devedor após parcela
  outstanding_after NUMERIC(15,2) NOT NULL,
  -- Pagamento
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','paid','partial','overdue','waived')),
  paid_date       DATE,
  paid_amount     NUMERIC(15,2),
  late_fee        NUMERIC(15,2) DEFAULT 0,
  late_interest   NUMERIC(15,2) DEFAULT 0,
  transaction_id  UUID REFERENCES public.transactions(id),
  -- Atualização por indexador
  index_rate      NUMERIC(8,6),
  index_date      DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contract_id, installment_num)
);

ALTER TABLE public.loan_schedule ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_loan_schedule_contract ON public.loan_schedule(contract_id);
CREATE INDEX IF NOT EXISTS idx_loan_schedule_due      ON public.loan_schedule(company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_loan_schedule_status   ON public.loan_schedule(company_id, status);

DROP POLICY IF EXISTS "loan_schedule_select" ON public.loan_schedule;
CREATE POLICY "loan_schedule_select" ON public.loan_schedule
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "loan_schedule_all" ON public.loan_schedule;
CREATE POLICY "loan_schedule_all" ON public.loan_schedule
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND role IN ('admin','gestor')
    )
  );

-- 3. Marcação a mercado (atualização diária por indexador)
CREATE TABLE IF NOT EXISTS public.loan_mark_to_market (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID NOT NULL REFERENCES public.loan_contracts(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reference_date  DATE NOT NULL,
  indexer_rate    NUMERIC(10,8) NOT NULL DEFAULT 0,
  indexer_value   NUMERIC(15,8),
  outstanding_mtm NUMERIC(15,2) NOT NULL,
  accrued_interest NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contract_id, reference_date)
);

ALTER TABLE public.loan_mark_to_market ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_loan_mtm_contract ON public.loan_mark_to_market(contract_id, reference_date DESC);

DROP POLICY IF EXISTS "loan_mtm_select" ON public.loan_mark_to_market;
CREATE POLICY "loan_mtm_select" ON public.loan_mark_to_market
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

-- 4. Função: gerar cronograma Price
CREATE OR REPLACE FUNCTION public.generate_price_schedule(
  p_contract_id   UUID,
  p_principal     NUMERIC,
  p_rate_monthly  NUMERIC,
  p_installments  INTEGER,
  p_first_date    DATE
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_payment      NUMERIC;
  v_balance      NUMERIC := p_principal;
  v_interest     NUMERIC;
  v_amort        NUMERIC;
  v_date         DATE    := p_first_date;
  v_company_id   UUID;
  i              INTEGER;
BEGIN
  SELECT company_id INTO v_company_id FROM public.loan_contracts WHERE id = p_contract_id;
  
  -- Fórmula Price: PMT = PV * i / (1 - (1+i)^-n)
  IF p_rate_monthly = 0 THEN
    v_payment := p_principal / p_installments;
  ELSE
    v_payment := p_principal * p_rate_monthly / (1 - POWER(1 + p_rate_monthly, -p_installments));
  END IF;

  DELETE FROM public.loan_schedule WHERE contract_id = p_contract_id;

  FOR i IN 1..p_installments LOOP
    v_interest := v_balance * p_rate_monthly;
    v_amort    := v_payment - v_interest;
    v_balance  := GREATEST(0, v_balance - v_amort);

    INSERT INTO public.loan_schedule
      (contract_id, company_id, installment_num, due_date,
       principal, interest, total, outstanding_after)
    VALUES
      (p_contract_id, v_company_id, i, v_date,
       ROUND(v_amort, 2), ROUND(v_interest, 2),
       ROUND(v_payment, 2), ROUND(v_balance, 2));

    v_date := v_date + INTERVAL '1 month';
  END LOOP;
END;
$$;

-- 5. Função: gerar cronograma SAC
CREATE OR REPLACE FUNCTION public.generate_sac_schedule(
  p_contract_id   UUID,
  p_principal     NUMERIC,
  p_rate_monthly  NUMERIC,
  p_installments  INTEGER,
  p_first_date    DATE
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_amort        NUMERIC := p_principal / p_installments;
  v_balance      NUMERIC := p_principal;
  v_interest     NUMERIC;
  v_date         DATE    := p_first_date;
  v_company_id   UUID;
  i              INTEGER;
BEGIN
  SELECT company_id INTO v_company_id FROM public.loan_contracts WHERE id = p_contract_id;
  DELETE FROM public.loan_schedule WHERE contract_id = p_contract_id;

  FOR i IN 1..p_installments LOOP
    v_interest := v_balance * p_rate_monthly;
    v_balance  := GREATEST(0, v_balance - v_amort);

    INSERT INTO public.loan_schedule
      (contract_id, company_id, installment_num, due_date,
       principal, interest, total, outstanding_after)
    VALUES
      (p_contract_id, v_company_id, i, v_date,
       ROUND(v_amort, 2), ROUND(v_interest, 2),
       ROUND(v_amort + v_interest, 2), ROUND(v_balance, 2));

    v_date := v_date + INTERVAL '1 month';
  END LOOP;
END;
$$;

-- 6. View: resumo de dívida da empresa
CREATE OR REPLACE VIEW public.v_loan_summary
WITH (security_invoker = on)
AS
SELECT
  lc.company_id,
  COUNT(DISTINCT lc.id)                                   AS total_contracts,
  SUM(lc.outstanding_balance)                             AS total_outstanding,
  SUM(CASE WHEN lc.direction='payable' THEN lc.outstanding_balance ELSE 0 END) AS total_payable,
  SUM(CASE WHEN lc.direction='receivable' THEN lc.outstanding_balance ELSE 0 END) AS total_receivable,
  COUNT(DISTINCT CASE WHEN ls.status='overdue' THEN ls.id END) AS overdue_installments,
  SUM(CASE WHEN ls.status='overdue' THEN ls.total ELSE 0 END) AS overdue_amount,
  MIN(CASE WHEN ls.status='open' THEN ls.due_date END)    AS next_payment_date,
  SUM(CASE WHEN ls.status='open' AND ls.due_date = CURRENT_DATE THEN ls.total ELSE 0 END) AS due_today
FROM public.loan_contracts lc
LEFT JOIN public.loan_schedule ls ON ls.contract_id = lc.id
WHERE lc.status = 'active'
GROUP BY lc.company_id;

GRANT SELECT ON public.v_loan_summary TO authenticated;
