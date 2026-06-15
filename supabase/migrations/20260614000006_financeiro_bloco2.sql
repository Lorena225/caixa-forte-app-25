-- BLOCO 2 FINANCEIRO: Fechamento mensal + Renegociação + Aging
CREATE TABLE IF NOT EXISTS public.financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','fechado')),
  closed_at TIMESTAMPTZ, closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(company_id, period_month)
);
CREATE INDEX IF NOT EXISTS idx_finper_company ON public.financial_periods(company_id, period_month DESC);
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finper_all ON public.financial_periods;
CREATE POLICY finper_all ON public.financial_periods FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- RPCs: ai_open_financial_period, ai_closing_checklist, ai_close_financial_period,
-- ai_reopen_financial_period, guard_closed_period (trigger), ai_renegotiate_title, ai_aging_report
-- (definições completas aplicadas no Supabase; ver migrations financeiro_bloco2_*)
