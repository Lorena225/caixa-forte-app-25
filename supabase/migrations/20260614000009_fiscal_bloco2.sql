-- BLOCO 2 FISCAL: provisões + conciliação contábil×financeira + fechamento contábil
CREATE TABLE IF NOT EXISTS public.accounting_provisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('ferias','decimo_terceiro','irpj_csll','contingencia','outras')),
  description TEXT NOT NULL, amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
  competence DATE NOT NULL, status TEXT NOT NULL DEFAULT 'provisionado' CHECK (status IN ('provisionado','revertido','realizado')),
  account_id UUID REFERENCES public.accounts(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prov_company ON public.accounting_provisions(company_id, competence DESC);
ALTER TABLE public.accounting_provisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prov_all ON public.accounting_provisions;
CREATE POLICY prov_all ON public.accounting_provisions FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
-- RPCs: ai_accounting_reconciliation, ai_accounting_closing_check (aplicadas no prod)
