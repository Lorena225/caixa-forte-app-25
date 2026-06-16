-- Performance do módulo Agência (reconciliação de versionamento da auditoria)
-- 13 índices em foreign keys (advisor: unindexed_foreign_keys) +
-- RLS otimizado com (SELECT auth.uid()) para evitar reavaliação por linha
-- (advisor: auth_rls_initplan).

-- ── Índices de foreign keys ──
CREATE INDEX IF NOT EXISTS idx_agency_accounts_contract ON public.agency_accounts USING btree (contract_id);
CREATE INDEX IF NOT EXISTS idx_agency_accounts_counterparty ON public.agency_accounts USING btree (counterparty_id);
CREATE INDEX IF NOT EXISTS idx_agency_accounts_manager ON public.agency_accounts USING btree (account_manager_id);
CREATE INDEX IF NOT EXISTS idx_agency_approvals_company ON public.agency_approvals USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_agency_approvals_deliverable ON public.agency_approvals USING btree (deliverable_id);
CREATE INDEX IF NOT EXISTS idx_agency_approvals_responded_by ON public.agency_approvals USING btree (responded_by);
CREATE INDEX IF NOT EXISTS idx_agency_calendar_company ON public.agency_calendar_posts USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_agency_calendar_deliverable ON public.agency_calendar_posts USING btree (deliverable_id);
CREATE INDEX IF NOT EXISTS idx_agency_deliverables_assigned ON public.agency_deliverables USING btree (assigned_to);
CREATE INDEX IF NOT EXISTS idx_agency_deliverables_task ON public.agency_deliverables USING btree (task_id);
CREATE INDEX IF NOT EXISTS idx_agency_media_company ON public.agency_media_campaigns USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_agency_meetings_company ON public.agency_meetings USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_agency_onboarding_company ON public.agency_onboarding_steps USING btree (company_id);

-- ── RLS otimizado: (SELECT auth.uid()) avalia uma vez por query, não por linha ──
DO $$
DECLARE t TEXT;
  tabelas TEXT[] := ARRAY['agency_accounts','agency_onboarding_steps','agency_deliverables',
    'agency_calendar_posts','agency_approvals','agency_meetings','agency_media_campaigns'];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_all ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY %I_all ON public.%I FOR ALL TO authenticated
      USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = (SELECT auth.uid())))
      WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = (SELECT auth.uid())))$p$, t, t);
  END LOOP;
END $$;
