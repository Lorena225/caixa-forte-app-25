-- Camada de integrações — entidades complementares (DDL reconciliado do banco).
-- Delta sobre a fundação (external_entities_map, payment_events, ad_metrics, lead_sources).

-- Recorrência/assinatura (Pagar.me), vinculada a conta de agência e contrato
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'pagarme',
  external_subscription_id TEXT,
  counterparty_id UUID REFERENCES public.counterparties(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  agency_account_id UUID REFERENCES public.agency_accounts(id) ON DELETE SET NULL,
  plan_name TEXT, amount NUMERIC(15,2) DEFAULT 0,
  interval TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month','week','year')),
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','pausada','cancelada','inadimplente','encerrada')),
  current_period_start DATE, current_period_end DATE, next_billing_date DATE,
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider, external_subscription_id)
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON public.subscriptions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON public.subscriptions(company_id, next_billing_date);

-- Contas de anúncio (Meta/Google), vinculadas à conta de agência
CREATE TABLE IF NOT EXISTS public.ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'meta',
  external_account_id TEXT NOT NULL,
  account_name TEXT,
  agency_account_id UUID REFERENCES public.agency_accounts(id) ON DELETE SET NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'active',
  business_manager_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider, external_account_id)
);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_company ON public.ad_accounts(company_id, provider);

-- Campanhas (acima de ad_metrics)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'meta',
  ad_account_id UUID REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  external_campaign_id TEXT,
  name TEXT, objective TEXT, status TEXT DEFAULT 'active',
  daily_budget NUMERIC(15,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider, external_campaign_id)
);
CREATE INDEX IF NOT EXISTS idx_campaigns_account ON public.campaigns(ad_account_id);

-- Espelho do funil do CRM (Kommo)
CREATE TABLE IF NOT EXISTS public.crm_pipeline_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'kommo',
  external_deal_id TEXT,
  external_pipeline_id TEXT, pipeline_name TEXT, stage_name TEXT, stage_order INTEGER,
  deal_value NUMERIC(15,2), sales_owner TEXT,
  counterparty_id UUID REFERENCES public.counterparties(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open',
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider, external_deal_id)
);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_company ON public.crm_pipeline_sync(company_id, status);

-- Governança por empresa: sandbox/produção, limite por hora, direções permitidas
CREATE TABLE IF NOT EXISTS public.tenant_integration_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','production')),
  max_syncs_per_hour INTEGER DEFAULT 100,
  allowed_directions TEXT[] DEFAULT ARRAY['inbound','outbound'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider)
);

-- Controle de rate limit por provedor/empresa
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('hour', now()),
  request_count INTEGER DEFAULT 0,
  limited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_company ON public.rate_limit_logs(company_id, provider, window_start);

-- RLS multiempresa
DO $$
DECLARE t TEXT;
  tabelas TEXT[] := ARRAY['subscriptions','ad_accounts','campaigns','crm_pipeline_sync','tenant_integration_permissions','rate_limit_logs'];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_all ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY %I_all ON public.%I FOR ALL TO authenticated
      USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = (SELECT auth.uid())))
      WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = (SELECT auth.uid())))$p$, t, t);
  END LOOP;
END $$;

-- ── RPCs ──

-- Provisiona assinatura recorrente a partir de uma conta de agência (idempotente)
CREATE OR REPLACE FUNCTION public.ai_provision_subscription(
  p_company_id uuid, p_agency_account_id uuid, p_plan_name text DEFAULT NULL, p_amount numeric DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_sub_id UUID; v_existing UUID; v_cp UUID; v_amount NUMERIC;
BEGIN
  SELECT id INTO v_existing FROM public.subscriptions
   WHERE company_id=p_company_id AND agency_account_id=p_agency_account_id AND status='ativa';
  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('status','already_exists','subscription_id',v_existing);
  END IF;
  SELECT counterparty_id, COALESCE(p_amount, monthly_value) INTO v_cp, v_amount
    FROM public.agency_accounts WHERE id=p_agency_account_id AND company_id=p_company_id;
  INSERT INTO public.subscriptions(company_id, provider, counterparty_id, agency_account_id,
    plan_name, amount, interval, status, current_period_start, current_period_end, next_billing_date)
  VALUES (p_company_id, 'pagarme', v_cp, p_agency_account_id,
    COALESCE(p_plan_name,'Mensalidade'), COALESCE(v_amount,0), 'month', 'ativa',
    CURRENT_DATE, (CURRENT_DATE + INTERVAL '1 month')::date, (CURRENT_DATE + INTERVAL '1 month')::date)
  RETURNING id INTO v_sub_id;
  RETURN json_build_object('status','created','subscription_id',v_sub_id,'amount',v_amount);
END $function$;

-- Resumo de assinaturas: ativos, MRR normalizado, inadimplência, vencendo em 7d
CREATE OR REPLACE FUNCTION public.ai_subscriptions_summary(p_company_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_active INT; v_mrr NUMERIC; v_overdue INT; v_due_7d INT;
BEGIN
  SELECT COUNT(*) FILTER (WHERE status='ativa'),
         COALESCE(SUM(CASE interval WHEN 'month' THEN amount WHEN 'week' THEN amount*4.0
           WHEN 'year' THEN amount/12.0 ELSE amount END) FILTER (WHERE status='ativa'),0),
         COUNT(*) FILTER (WHERE status='inadimplente'),
         COUNT(*) FILTER (WHERE status='ativa' AND next_billing_date <= CURRENT_DATE + 7)
    INTO v_active, v_mrr, v_overdue, v_due_7d
    FROM public.subscriptions WHERE company_id=p_company_id;
  RETURN json_build_object('active',v_active,'mrr',ROUND(v_mrr,2),'overdue',v_overdue,'due_7d',v_due_7d);
END $function$;

REVOKE EXECUTE ON FUNCTION public.ai_provision_subscription(uuid,uuid,text,numeric) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ai_subscriptions_summary(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_provision_subscription(uuid,uuid,text,numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_subscriptions_summary(uuid) TO authenticated, service_role;
