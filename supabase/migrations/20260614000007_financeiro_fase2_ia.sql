-- FASE 2 FINANCEIRO + IA: gatilho contábil, inadimplência, cashflow projetos, adiantamentos
-- (definições completas das RPCs aplicadas no Supabase prod via migrations
--  financeiro_blocoA_* e financeiro_blocoB_*)

CREATE TABLE IF NOT EXISTS public.advance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES public.counterparties(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees_profiles(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'fornecedor' CHECK (kind IN ('fornecedor','colaborador')),
  description TEXT NOT NULL, amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  balance NUMERIC(15,2) NOT NULL, advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','compensado_parcial','compensado')),
  transaction_id UUID REFERENCES public.transactions(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advance_company ON public.advance_payments(company_id, status);
ALTER TABLE public.advance_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS advance_all ON public.advance_payments;
CREATE POLICY advance_all ON public.advance_payments FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- RPCs: ai_post_accounting_entry, ai_delinquency_forecast, ai_run_delinquency_agent,
--       ai_cashflow_projection, ai_cashflow_summary, ai_compensate_advance
