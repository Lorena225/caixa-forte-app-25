-- =====================================================
-- MÓDULO EMPRÉSTIMOS: funções e view complementares
-- Usa tabelas existentes: loan_contracts, loan_installments
-- VirtruvIA · Blueprint Sistema Financeiro v1.0
-- =====================================================

-- Tabela de marcação a mercado (não existe ainda)
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

-- Função: gerar cronograma Price (usa tabela loan_installments existente)
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
  v_pmt      NUMERIC;
  v_balance  NUMERIC := p_principal;
  v_interest NUMERIC;
  v_amort    NUMERIC;
  v_date     DATE    := p_first_date;
  v_cid      UUID;
  i          INTEGER;
BEGIN
  SELECT company_id INTO v_cid FROM public.loan_contracts WHERE id = p_contract_id;
  IF p_rate_monthly = 0 THEN
    v_pmt := p_principal / p_installments;
  ELSE
    v_pmt := p_principal * p_rate_monthly / (1 - POWER(1 + p_rate_monthly, -p_installments));
  END IF;
  DELETE FROM public.loan_installments WHERE contract_id = p_contract_id;
  FOR i IN 1..p_installments LOOP
    v_interest := ROUND(v_balance * p_rate_monthly, 2);
    v_amort    := ROUND(v_pmt - v_interest, 2);
    v_balance  := GREATEST(0, ROUND(v_balance - v_amort, 2));
    INSERT INTO public.loan_installments
      (contract_id, company_id, installment_no, due_date,
       installment_amount, interest_amount, amortization_amount, remaining_balance)
    VALUES (p_contract_id, v_cid, i, v_date,
       ROUND(v_pmt,2), v_interest, v_amort, v_balance);
    v_date := v_date + INTERVAL '1 month';
  END LOOP;
END;
$$;

-- Função: gerar cronograma SAC
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
  v_amort    NUMERIC := ROUND(p_principal / p_installments, 2);
  v_balance  NUMERIC := p_principal;
  v_interest NUMERIC;
  v_date     DATE    := p_first_date;
  v_cid      UUID;
  i          INTEGER;
BEGIN
  SELECT company_id INTO v_cid FROM public.loan_contracts WHERE id = p_contract_id;
  DELETE FROM public.loan_installments WHERE contract_id = p_contract_id;
  FOR i IN 1..p_installments LOOP
    v_interest := ROUND(v_balance * p_rate_monthly, 2);
    v_balance  := GREATEST(0, ROUND(v_balance - v_amort, 2));
    INSERT INTO public.loan_installments
      (contract_id, company_id, installment_no, due_date,
       installment_amount, interest_amount, amortization_amount, remaining_balance)
    VALUES (p_contract_id, v_cid, i, v_date,
       ROUND(v_amort + v_interest, 2), v_interest, v_amort, v_balance);
    v_date := v_date + INTERVAL '1 month';
  END LOOP;
END;
$$;

-- View resumo de dívida (usando colunas reais da tabela existente)
CREATE OR REPLACE VIEW public.v_loan_summary
WITH (security_invoker = on)
AS
SELECT
  lc.company_id,
  COUNT(DISTINCT lc.id)                                                         AS total_contracts,
  SUM(lc.opening_balance)                                                       AS total_outstanding,
  SUM(CASE WHEN lc.operation_type::text IN ('EMPRESTIMO','FINANCIAMENTO')
       THEN lc.opening_balance ELSE 0 END)                                      AS total_payable,
  SUM(CASE WHEN lc.operation_type::text = 'REPASSE'
       THEN lc.opening_balance ELSE 0 END)                                      AS total_receivable,
  COUNT(DISTINCT CASE WHEN li.status = 'GERADA' AND li.due_date < CURRENT_DATE
       THEN li.id END)                                                          AS overdue_installments,
  COALESCE(SUM(CASE WHEN li.status = 'GERADA' AND li.due_date < CURRENT_DATE
       THEN li.installment_amount ELSE 0 END), 0)                              AS overdue_amount,
  MIN(CASE WHEN li.status IN ('PREVISTA','GERADA')
       THEN li.due_date END)                                                    AS next_payment_date,
  COALESCE(SUM(CASE WHEN li.status IN ('PREVISTA','GERADA')
       AND li.due_date = CURRENT_DATE
       THEN li.installment_amount ELSE 0 END), 0)                              AS due_today
FROM public.loan_contracts lc
LEFT JOIN public.loan_installments li ON li.contract_id = lc.id
WHERE lc.status::text NOT IN ('ENCERRADO','CANCELADO')
GROUP BY lc.company_id;

GRANT SELECT ON public.v_loan_summary TO authenticated;
