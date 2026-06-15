-- BLOCO 1 FISCAL: parâmetros tributários + motor de apuração real
CREATE TABLE IF NOT EXISTS public.tax_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tax_type TEXT NOT NULL CHECK (tax_type IN ('ISS','PIS','COFINS','IRPJ','CSLL','INSS','IRRF','PCC')),
  rate NUMERIC(7,4) NOT NULL DEFAULT 0, presumption_base NUMERIC(7,4),
  is_withholding BOOLEAN NOT NULL DEFAULT false, due_day INTEGER DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_taxparam_company ON public.tax_parameters(company_id, tax_type);
ALTER TABLE public.tax_parameters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS taxparam_all ON public.tax_parameters;
CREATE POLICY taxparam_all ON public.tax_parameters FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
ALTER TABLE public.apuracoes_impostos DROP CONSTRAINT IF EXISTS uq_apuracao_periodo;
ALTER TABLE public.apuracoes_impostos ADD CONSTRAINT uq_apuracao_periodo UNIQUE (company_id, periodo_ano, periodo_mes, tipo_imposto);
-- RPCs: ai_seed_tax_parameters, ai_run_tax_assessment, ai_get_assessment (aplicadas no prod)
