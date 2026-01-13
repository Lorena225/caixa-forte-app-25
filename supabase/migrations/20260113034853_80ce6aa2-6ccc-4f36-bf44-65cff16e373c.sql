-- =====================================================
-- SISTEMA DE NÍVEIS (TIERS) E FEATURE FLAGS POR EMPRESA
-- =====================================================

-- 1. Enum para os níveis do sistema
CREATE TYPE public.system_tier AS ENUM (
  'FINANCEIRO_ESSENCIAL',
  'FINANCEIRO_CONTABIL',
  'FINANCEIRO_CONTABIL_FISCAL'
);

-- 2. Tabela de feature flags por empresa
CREATE TABLE public.company_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, feature_key)
);

-- 3. Tabela de templates de módulos (para auditoria e versionamento)
CREATE TABLE public.company_module_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key system_tier NOT NULL,
  template_version INTEGER NOT NULL DEFAULT 1,
  flags_json JSONB NOT NULL,
  nav_profile_key TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_key, template_version)
);

-- 4. Tabela de configurações de tier por empresa
CREATE TABLE public.company_tier_settings (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  system_tier system_tier NOT NULL DEFAULT 'FINANCEIRO_ESSENCIAL',
  accounting_enabled BOOLEAN GENERATED ALWAYS AS (
    system_tier IN ('FINANCEIRO_CONTABIL', 'FINANCEIRO_CONTABIL_FISCAL')
  ) STORED,
  fiscal_enabled BOOLEAN GENERATED ALWAYS AS (
    system_tier = 'FINANCEIRO_CONTABIL_FISCAL'
  ) STORED,
  accounting_start_date DATE,
  fiscal_start_date DATE,
  tier_changed_at TIMESTAMPTZ,
  tier_changed_by UUID REFERENCES auth.users(id),
  previous_tier system_tier,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Histórico de mudanças de tier (auditoria)
CREATE TABLE public.company_tier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_tier system_tier,
  to_tier system_tier NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  accounting_start_date DATE,
  fiscal_start_date DATE,
  retroactive_processing BOOLEAN DEFAULT false,
  job_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. RLS
ALTER TABLE public.company_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_module_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_tier_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_tier_history ENABLE ROW LEVEL SECURITY;

-- Policies para company_feature_flags
CREATE POLICY "Users can view feature flags of their companies"
ON public.company_feature_flags FOR SELECT
USING (public.user_has_company_access(company_id));

CREATE POLICY "Admins can manage feature flags"
ON public.company_feature_flags FOR ALL
USING (public.user_has_company_access(company_id) AND public.has_any_role(auth.uid(), ARRAY['admin', 'Admin']));

-- Policies para templates (leitura pública para autenticados)
CREATE POLICY "Authenticated users can view templates"
ON public.company_module_templates FOR SELECT
TO authenticated
USING (true);

-- Policies para tier settings
CREATE POLICY "Users can view tier settings of their companies"
ON public.company_tier_settings FOR SELECT
USING (public.user_has_company_access(company_id));

CREATE POLICY "Admins can manage tier settings"
ON public.company_tier_settings FOR ALL
USING (public.user_has_company_access(company_id) AND public.has_any_role(auth.uid(), ARRAY['admin', 'Admin']));

-- Policies para histórico
CREATE POLICY "Users can view tier history of their companies"
ON public.company_tier_history FOR SELECT
USING (public.user_has_company_access(company_id));

CREATE POLICY "System can insert tier history"
ON public.company_tier_history FOR INSERT
WITH CHECK (public.user_has_company_access(company_id));

-- 7. Função helper para verificar feature flag
CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_company_id UUID, p_feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.company_feature_flags 
     WHERE company_id = p_company_id AND feature_key = p_feature_key),
    false
  )
$$;

-- 8. Função para obter tier da empresa
CREATE OR REPLACE FUNCTION public.get_company_tier(p_company_id UUID)
RETURNS system_tier
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT system_tier FROM public.company_tier_settings WHERE company_id = p_company_id),
    'FINANCEIRO_ESSENCIAL'::system_tier
  )
$$;

-- 9. Função para aplicar template de tier
CREATE OR REPLACE FUNCTION public.apply_tier_template(
  p_company_id UUID,
  p_tier system_tier,
  p_accounting_start_date DATE DEFAULT NULL,
  p_fiscal_start_date DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_flag RECORD;
  v_old_tier system_tier;
BEGIN
  -- Obter tier atual
  SELECT system_tier INTO v_old_tier FROM company_tier_settings WHERE company_id = p_company_id;
  
  -- Obter template mais recente
  SELECT * INTO v_template FROM company_module_templates 
  WHERE template_key = p_tier 
  ORDER BY template_version DESC LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template não encontrado para tier: %', p_tier;
  END IF;
  
  -- Limpar flags existentes e aplicar novas
  DELETE FROM company_feature_flags WHERE company_id = p_company_id;
  
  FOR v_flag IN SELECT * FROM jsonb_each(v_template.flags_json)
  LOOP
    INSERT INTO company_feature_flags (company_id, feature_key, enabled, config_json)
    VALUES (
      p_company_id, 
      v_flag.key, 
      (v_flag.value->>'enabled')::boolean,
      COALESCE(v_flag.value->'config', '{}'::jsonb)
    );
  END LOOP;
  
  -- Atualizar ou inserir tier settings
  INSERT INTO company_tier_settings (company_id, system_tier, accounting_start_date, fiscal_start_date, tier_changed_at, tier_changed_by, previous_tier)
  VALUES (p_company_id, p_tier, p_accounting_start_date, p_fiscal_start_date, now(), auth.uid(), v_old_tier)
  ON CONFLICT (company_id) DO UPDATE SET
    system_tier = EXCLUDED.system_tier,
    accounting_start_date = COALESCE(EXCLUDED.accounting_start_date, company_tier_settings.accounting_start_date),
    fiscal_start_date = COALESCE(EXCLUDED.fiscal_start_date, company_tier_settings.fiscal_start_date),
    tier_changed_at = now(),
    tier_changed_by = auth.uid(),
    previous_tier = v_old_tier,
    updated_at = now();
  
  -- Registrar histórico
  INSERT INTO company_tier_history (company_id, from_tier, to_tier, changed_by, accounting_start_date, fiscal_start_date)
  VALUES (p_company_id, v_old_tier, p_tier, auth.uid(), p_accounting_start_date, p_fiscal_start_date);
END;
$$;

-- 10. Triggers
CREATE TRIGGER update_company_feature_flags_updated_at
BEFORE UPDATE ON public.company_feature_flags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_tier_settings_updated_at
BEFORE UPDATE ON public.company_tier_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Índices
CREATE INDEX idx_company_feature_flags_company ON public.company_feature_flags(company_id);
CREATE INDEX idx_company_feature_flags_key ON public.company_feature_flags(feature_key);
CREATE INDEX idx_company_tier_history_company ON public.company_tier_history(company_id);

-- 12. Inserir templates padrão
INSERT INTO public.company_module_templates (template_key, template_version, flags_json, nav_profile_key, description) VALUES
-- FINANCEIRO_ESSENCIAL
('FINANCEIRO_ESSENCIAL', 1, '{
  "finance.core": {"enabled": true, "config": {}},
  "finance.ap": {"enabled": true, "config": {}},
  "finance.ar": {"enabled": true, "config": {}},
  "treasury.core": {"enabled": true, "config": {}},
  "treasury.reconciliation": {"enabled": true, "config": {}},
  "treasury.cashflow": {"enabled": true, "config": {}},
  "reports.financial": {"enabled": true, "config": {}},
  "reports.aging": {"enabled": true, "config": {}},
  "reports.dre_financial": {"enabled": true, "config": {}},
  "integrations.cnab": {"enabled": true, "config": {}},
  "integrations.pix": {"enabled": true, "config": {}},
  "integrations.boleto": {"enabled": true, "config": {}},
  "cadastros.counterparties": {"enabled": true, "config": {}},
  "cadastros.categories": {"enabled": true, "config": {}},
  "cadastros.wallets": {"enabled": true, "config": {}},
  "cadastros.cost_centers": {"enabled": true, "config": {}},
  "gl.enabled": {"enabled": false, "config": {}},
  "gl.posting_rules": {"enabled": false, "config": {}},
  "gl.period_close": {"enabled": false, "config": {}},
  "gl.journal_entries": {"enabled": false, "config": {}},
  "reports.accounting": {"enabled": false, "config": {}},
  "reports.trial_balance": {"enabled": false, "config": {}},
  "reports.balance_sheet": {"enabled": false, "config": {}},
  "reports.dre_accounting": {"enabled": false, "config": {}},
  "fiscal.masterdata": {"enabled": false, "config": {}},
  "fiscal.nfe": {"enabled": false, "config": {}},
  "fiscal.nfse": {"enabled": false, "config": {}},
  "fiscal.sped": {"enabled": false, "config": {}},
  "ai.autopilot": {"enabled": true, "config": {}}
}'::jsonb, 'financeiro', 'Gestão financeira completa: AP/AR, Tesouraria, Conciliação, CNAB, PIX. Sem contabilidade ou fiscal.'),

-- FINANCEIRO_CONTABIL
('FINANCEIRO_CONTABIL', 1, '{
  "finance.core": {"enabled": true, "config": {}},
  "finance.ap": {"enabled": true, "config": {}},
  "finance.ar": {"enabled": true, "config": {}},
  "treasury.core": {"enabled": true, "config": {}},
  "treasury.reconciliation": {"enabled": true, "config": {}},
  "treasury.cashflow": {"enabled": true, "config": {}},
  "reports.financial": {"enabled": true, "config": {}},
  "reports.aging": {"enabled": true, "config": {}},
  "reports.dre_financial": {"enabled": true, "config": {}},
  "integrations.cnab": {"enabled": true, "config": {}},
  "integrations.pix": {"enabled": true, "config": {}},
  "integrations.boleto": {"enabled": true, "config": {}},
  "cadastros.counterparties": {"enabled": true, "config": {}},
  "cadastros.categories": {"enabled": true, "config": {}},
  "cadastros.wallets": {"enabled": true, "config": {}},
  "cadastros.cost_centers": {"enabled": true, "config": {}},
  "cadastros.chart_of_accounts": {"enabled": true, "config": {}},
  "gl.enabled": {"enabled": true, "config": {}},
  "gl.posting_rules": {"enabled": true, "config": {}},
  "gl.period_close": {"enabled": true, "config": {}},
  "gl.journal_entries": {"enabled": true, "config": {}},
  "reports.accounting": {"enabled": true, "config": {}},
  "reports.trial_balance": {"enabled": true, "config": {}},
  "reports.balance_sheet": {"enabled": true, "config": {}},
  "reports.dre_accounting": {"enabled": true, "config": {}},
  "fiscal.masterdata": {"enabled": false, "config": {}},
  "fiscal.nfe": {"enabled": false, "config": {}},
  "fiscal.nfse": {"enabled": false, "config": {}},
  "fiscal.sped": {"enabled": false, "config": {}},
  "ai.autopilot": {"enabled": true, "config": {}}
}'::jsonb, 'gestao', 'Financeiro + Contabilidade completa: GL, Posting Rules, Fechamento, Razão, Diário, Balancete, BP, DRE Contábil.'),

-- FINANCEIRO_CONTABIL_FISCAL
('FINANCEIRO_CONTABIL_FISCAL', 1, '{
  "finance.core": {"enabled": true, "config": {}},
  "finance.ap": {"enabled": true, "config": {}},
  "finance.ar": {"enabled": true, "config": {}},
  "treasury.core": {"enabled": true, "config": {}},
  "treasury.reconciliation": {"enabled": true, "config": {}},
  "treasury.cashflow": {"enabled": true, "config": {}},
  "reports.financial": {"enabled": true, "config": {}},
  "reports.aging": {"enabled": true, "config": {}},
  "reports.dre_financial": {"enabled": true, "config": {}},
  "integrations.cnab": {"enabled": true, "config": {}},
  "integrations.pix": {"enabled": true, "config": {}},
  "integrations.boleto": {"enabled": true, "config": {}},
  "cadastros.counterparties": {"enabled": true, "config": {}},
  "cadastros.categories": {"enabled": true, "config": {}},
  "cadastros.wallets": {"enabled": true, "config": {}},
  "cadastros.cost_centers": {"enabled": true, "config": {}},
  "cadastros.chart_of_accounts": {"enabled": true, "config": {}},
  "gl.enabled": {"enabled": true, "config": {}},
  "gl.posting_rules": {"enabled": true, "config": {}},
  "gl.period_close": {"enabled": true, "config": {}},
  "gl.journal_entries": {"enabled": true, "config": {}},
  "reports.accounting": {"enabled": true, "config": {}},
  "reports.trial_balance": {"enabled": true, "config": {}},
  "reports.balance_sheet": {"enabled": true, "config": {}},
  "reports.dre_accounting": {"enabled": true, "config": {}},
  "fiscal.masterdata": {"enabled": true, "config": {}},
  "fiscal.nfe": {"enabled": true, "config": {}},
  "fiscal.nfse": {"enabled": true, "config": {}},
  "fiscal.sped": {"enabled": true, "config": {}},
  "ai.autopilot": {"enabled": true, "config": {}}
}'::jsonb, 'admin', 'Solução completa: Financeiro + Contabilidade + Fiscal (NF-e, NFS-e, SPED, cadastros fiscais).');