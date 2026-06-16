-- ============================================================
-- MÓDULO GESTÃO DA AGÊNCIA — DDL completo (reconciliação de versionamento)
-- 7 tabelas que estendem projects/counterparties/contracts.
-- A conta de agência é extensão 1:1 de um project.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agency_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  counterparty_id UUID REFERENCES public.counterparties(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  account_name TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'full_service'
    CHECK (service_type IN ('branding','social_media','trafego','conteudo','landing_page','consultoria','full_service')),
  status TEXT NOT NULL DEFAULT 'onboarding'
    CHECK (status IN ('onboarding','ativa','em_risco','pausada','encerrada')),
  health TEXT NOT NULL DEFAULT 'verde' CHECK (health IN ('verde','amarelo','vermelho')),
  account_manager_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  monthly_value NUMERIC(15,2) DEFAULT 0,
  objectives TEXT, kpis JSONB DEFAULT '[]', brand_guidelines TEXT,
  active_channels TEXT[] DEFAULT '{}', important_links JSONB DEFAULT '[]',
  approval_routine TEXT, sla_days INTEGER DEFAULT 2,
  churn_risk INTEGER DEFAULT 0 CHECK (churn_risk BETWEEN 0 AND 100),
  upsell_potential INTEGER DEFAULT 0 CHECK (upsell_potential BETWEEN 0 AND 100),
  onboarded_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_accounts_company ON public.agency_accounts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_agency_accounts_project ON public.agency_accounts(project_id);

CREATE TABLE IF NOT EXISTS public.agency_onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.agency_accounts(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral' CHECK (category IN ('briefing','acessos','materiais','responsaveis','cronograma','geral')),
  is_done BOOLEAN NOT NULL DEFAULT false, is_blocking BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0, done_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_onboarding_account ON public.agency_onboarding_steps(account_id);

CREATE TABLE IF NOT EXISTS public.agency_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.agency_accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT,
  kind TEXT NOT NULL DEFAULT 'recorrente' CHECK (kind IN ('recorrente','pontual','extra')),
  discipline TEXT DEFAULT 'conteudo' CHECK (discipline IN ('copy','design','video','trafego','estrategia','conteudo','outro')),
  stage TEXT NOT NULL DEFAULT 'pauta' CHECK (stage IN ('pauta','copy','design','revisao','aprovacao_interna','aprovacao_cliente','publicacao','concluido')),
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa','media','alta','urgente')),
  assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  due_date DATE, is_blocked BOOLEAN NOT NULL DEFAULT false, block_reason TEXT,
  rework_count INTEGER NOT NULL DEFAULT 0,
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_deliv_account ON public.agency_deliverables(account_id, stage);
CREATE INDEX IF NOT EXISTS idx_agency_deliv_due ON public.agency_deliverables(company_id, due_date);

CREATE TABLE IF NOT EXISTS public.agency_calendar_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.agency_accounts(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES public.agency_deliverables(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  channel TEXT DEFAULT 'instagram' CHECK (channel IN ('instagram','facebook','linkedin','tiktok','youtube','blog','email','outro')),
  format TEXT, scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado','producao','aprovacao','agendado','publicado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_calendar_account ON public.agency_calendar_posts(account_id, scheduled_for);

CREATE TABLE IF NOT EXISTS public.agency_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.agency_accounts(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES public.agency_deliverables(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'interna' CHECK (level IN ('interna','estrategica','lideranca','cliente')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','ajustes','rejeitado')),
  version INTEGER NOT NULL DEFAULT 1, requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ, responded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  feedback TEXT, sla_due TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_approvals_account ON public.agency_approvals(account_id, status);

CREATE TABLE IF NOT EXISTS public.agency_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.agency_accounts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'alinhamento' CHECK (kind IN ('kickoff','alinhamento','estrategica','mensal','resultados','followup')),
  title TEXT NOT NULL, scheduled_for TIMESTAMPTZ, minutes TEXT, ai_summary TEXT,
  status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada','realizada','cancelada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_meetings_account ON public.agency_meetings(account_id, scheduled_for);

CREATE TABLE IF NOT EXISTS public.agency_media_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.agency_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'meta' CHECK (platform IN ('meta','google','tiktok','linkedin','outro')),
  campaign_name TEXT NOT NULL, budget_month NUMERIC(15,2) DEFAULT 0, spend_month NUMERIC(15,2) DEFAULT 0,
  objective TEXT, status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('rascunho','ativa','pausada','encerrada')),
  start_date DATE, end_date DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_media_account ON public.agency_media_campaigns(account_id, status);

-- RLS multiempresa em todas
DO $$
DECLARE t TEXT;
  tabelas TEXT[] := ARRAY['agency_accounts','agency_onboarding_steps','agency_deliverables',
    'agency_calendar_posts','agency_approvals','agency_meetings','agency_media_campaigns'];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_all ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY %I_all ON public.%I FOR ALL TO authenticated
      USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
      WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))$p$, t, t);
  END LOOP;
END $$;
