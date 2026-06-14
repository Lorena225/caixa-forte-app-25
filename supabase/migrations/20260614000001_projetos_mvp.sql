-- ============================================================================
-- VITRIO ERP — MÓDULO DE GESTÃO DE PROJETOS (MVP)
-- Espinha econômica: hora apontada -> custo -> faturamento -> título AR -> margem
-- Reutiliza: companies, company_users, counterparties, employees_profiles,
--            cost_centers, transactions, RPC ai_create_title
-- ============================================================================

-- Helper de escopo por empresa (mesmo padrão das demais migrations)
-- company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())

-- ─── 0. EXTENSÃO DA TABELA projects (campos econômicos do MVP) ───────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cost_center_id   UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_type     TEXT NOT NULL DEFAULT 'escopo_fechado'
      CHECK (billing_type IN ('escopo_fechado','time_materials','retainer','sucesso')),
  ADD COLUMN IF NOT EXISTS target_margin    NUMERIC(5,2) DEFAULT 30,
  ADD COLUMN IF NOT EXISTS currency         TEXT NOT NULL DEFAULT 'BRL';

-- ─── 1. ALOCAÇÕES (pessoa x projeto x período) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES public.employees_profiles(id) ON DELETE CASCADE,
  allocation_pct  NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (allocation_pct > 0 AND allocation_pct <= 100),
  bill_rate       NUMERIC(15,2) DEFAULT 0,     -- taxa-hora de VENDA neste projeto
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_palloc_project ON public.project_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_palloc_employee ON public.project_allocations(employee_id, start_date);

-- ─── 2. CUSTO-HORA DO COLABORADOR (com vigência histórica) ──────────────────
CREATE TABLE IF NOT EXISTS public.employee_cost_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES public.employees_profiles(id) ON DELETE CASCADE,
  cost_per_hour   NUMERIC(15,2) NOT NULL DEFAULT 0,   -- custo carregado (salário+encargos+benefícios)/horas
  valid_from      DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_costrate_employee ON public.employee_cost_rates(employee_id, valid_from DESC);

-- ─── 3. TIMESHEET / APONTAMENTO DE HORAS DE PROJETO ─────────────────────────
-- (separado de time_entries de ponto/RH, que tem outra semântica)
CREATE TABLE IF NOT EXISTS public.project_time_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id         UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  employee_id     UUID NOT NULL REFERENCES public.employees_profiles(id) ON DELETE CASCADE,
  entry_date      DATE NOT NULL,
  hours           NUMERIC(6,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  billable        BOOLEAN NOT NULL DEFAULT true,
  description     TEXT,
  -- snapshot das taxas vigentes no momento da aprovação (congela o histórico)
  cost_rate_snapshot  NUMERIC(15,2) DEFAULT 0,
  bill_rate_snapshot  NUMERIC(15,2) DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'rascunho'
      CHECK (status IN ('rascunho','enviado','aprovado','rejeitado')),
  approved_by     UUID REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  reject_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pte_project ON public.project_time_entries(project_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_pte_employee ON public.project_time_entries(employee_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_pte_status ON public.project_time_entries(company_id, status);

-- ─── 4. ORÇAMENTO DO PROJETO (versões: baseline + aditivos) ──────────────────
CREATE TABLE IF NOT EXISTS public.project_budgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL DEFAULT 1,
  label           TEXT NOT NULL DEFAULT 'Baseline',
  budget_hours    NUMERIC(12,2) NOT NULL DEFAULT 0,
  budget_cost     NUMERIC(15,2) NOT NULL DEFAULT 0,   -- custo previsto
  budget_revenue  NUMERIC(15,2) NOT NULL DEFAULT 0,   -- receita contratada
  is_active       BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pbudget_project ON public.project_budgets(project_id, version DESC);

-- ─── 5. DESPESAS / REEMBOLSOS VINCULADOS AO PROJETO ─────────────────────────
CREATE TABLE IF NOT EXISTS public.project_expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES public.employees_profiles(id) ON DELETE SET NULL,
  category        TEXT,
  description     TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  reimbursable    BOOLEAN NOT NULL DEFAULT false,   -- repassável ao cliente?
  receipt_url     TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente'
      CHECK (status IN ('pendente','aprovado','rejeitado','faturado')),
  approved_by     UUID REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  transaction_id  UUID REFERENCES public.transactions(id),  -- título AP gerado
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pexp_project ON public.project_expenses(project_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_pexp_status ON public.project_expenses(company_id, status);

-- ─── 6. EVENTOS DE FATURAMENTO (a ponte projeto -> AR) ──────────────────────
CREATE TABLE IF NOT EXISTS public.project_billing_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id    UUID REFERENCES public.project_milestones(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL DEFAULT 'milestone'
      CHECK (event_type IN ('milestone','medicao','retainer','reembolso')),
  description     TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  reference_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'previsto'
      CHECK (status IN ('previsto','aprovado','faturado','cancelado')),
  approved_by     UUID REFERENCES auth.users(id),
  transaction_id  UUID REFERENCES public.transactions(id),  -- título AR gerado
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pbill_project ON public.project_billing_events(project_id, reference_date);
CREATE INDEX IF NOT EXISTS idx_pbill_status ON public.project_billing_events(company_id, status);

-- ─── 7. RISCOS E IMPEDIMENTOS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_risks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  severity        TEXT NOT NULL DEFAULT 'media' CHECK (severity IN ('baixa','media','alta','critica')),
  kind            TEXT NOT NULL DEFAULT 'risco' CHECK (kind IN ('risco','impedimento','dependencia')),
  owner_id        UUID REFERENCES public.employees_profiles(id) ON DELETE SET NULL,
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','mitigando','resolvido')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prisk_project ON public.project_risks(project_id, status);

-- ─── 8. SNAPSHOTS SEMANAIS (histórico de margem / burn / EAC) ───────────────
CREATE TABLE IF NOT EXISTS public.project_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  hours_logged    NUMERIC(12,2) DEFAULT 0,
  cost_actual     NUMERIC(15,2) DEFAULT 0,
  revenue_billed  NUMERIC(15,2) DEFAULT 0,
  progress_pct    INTEGER DEFAULT 0,
  margin_pct      NUMERIC(6,2) DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_psnap_project ON public.project_snapshots(project_id, snapshot_date DESC);

-- ============================================================================
-- RLS — escopo multiempresa em todas as tabelas
-- ============================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'project_allocations','employee_cost_rates','project_time_entries',
    'project_budgets','project_expenses','project_billing_events',
    'project_risks','project_snapshots'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_select" ON public.%1$s;$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s_select" ON public.%1$s FOR SELECT
      USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));$p$, t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_insert" ON public.%1$s;$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s_insert" ON public.%1$s FOR INSERT
      WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));$p$, t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_update" ON public.%1$s;$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s_update" ON public.%1$s FOR UPDATE
      USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));$p$, t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_delete" ON public.%1$s;$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s_delete" ON public.%1$s FOR DELETE
      USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));$p$, t);
  END LOOP;
END $$;

-- ============================================================================
-- RPC 1 — Aprovar apontamento de horas (congela snapshot de custo/venda)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ai_approve_time_entry(
  p_entry_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entry   public.project_time_entries%ROWTYPE;
  v_cost    NUMERIC(15,2);
  v_bill    NUMERIC(15,2);
BEGIN
  SELECT * INTO v_entry FROM public.project_time_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Apontamento não encontrado'; END IF;

  -- custo-hora vigente na DATA do apontamento (nunca a taxa atual)
  SELECT cost_per_hour INTO v_cost FROM public.employee_cost_rates
   WHERE employee_id = v_entry.employee_id
     AND valid_from <= v_entry.entry_date
     AND (valid_to IS NULL OR valid_to >= v_entry.entry_date)
   ORDER BY valid_from DESC LIMIT 1;

  -- taxa de venda da alocação vigente
  SELECT bill_rate INTO v_bill FROM public.project_allocations
   WHERE project_id = v_entry.project_id AND employee_id = v_entry.employee_id
     AND start_date <= v_entry.entry_date
     AND (end_date IS NULL OR end_date >= v_entry.entry_date)
   ORDER BY start_date DESC LIMIT 1;

  UPDATE public.project_time_entries SET
    status = 'aprovado',
    approved_by = auth.uid(),
    approved_at = now(),
    cost_rate_snapshot = COALESCE(v_cost, 0),
    bill_rate_snapshot = COALESCE(v_bill, 0),
    updated_at = now()
  WHERE id = p_entry_id;

  RETURN p_entry_id;
END $$;

-- ============================================================================
-- RPC 2 — Resumo econômico do projeto (orçado x realizado x margem x burn)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.project_economics(
  p_project_id UUID
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_budget       public.project_budgets%ROWTYPE;
  v_hours        NUMERIC;
  v_cost_actual  NUMERIC;
  v_rev_billed   NUMERIC;
  v_rev_billed_paid NUMERIC;
  v_progress     INTEGER;
  v_margin_plan  NUMERIC;
  v_margin_real  NUMERIC;
  v_burn         NUMERIC;
BEGIN
  SELECT * INTO v_budget FROM public.project_budgets
   WHERE project_id = p_project_id AND is_active ORDER BY version DESC LIMIT 1;

  SELECT COALESCE(SUM(hours),0),
         COALESCE(SUM(hours * cost_rate_snapshot),0)
    INTO v_hours, v_cost_actual
    FROM public.project_time_entries
   WHERE project_id = p_project_id AND status = 'aprovado';

  -- soma despesas aprovadas ao custo realizado
  v_cost_actual := v_cost_actual + COALESCE((
    SELECT SUM(amount) FROM public.project_expenses
     WHERE project_id = p_project_id AND status IN ('aprovado','faturado')), 0);

  SELECT COALESCE(SUM(amount),0) INTO v_rev_billed
    FROM public.project_billing_events
   WHERE project_id = p_project_id AND status IN ('aprovado','faturado');

  SELECT progress_percentage INTO v_progress FROM public.projects WHERE id = p_project_id;

  v_margin_plan := CASE WHEN COALESCE(v_budget.budget_revenue,0) > 0
       THEN ((v_budget.budget_revenue - v_budget.budget_cost) / v_budget.budget_revenue) * 100 ELSE 0 END;
  v_margin_real := CASE WHEN v_rev_billed > 0
       THEN ((v_rev_billed - v_cost_actual) / v_rev_billed) * 100 ELSE 0 END;
  -- burn: % do custo orçado já consumido
  v_burn := CASE WHEN COALESCE(v_budget.budget_cost,0) > 0
       THEN (v_cost_actual / v_budget.budget_cost) * 100 ELSE 0 END;

  RETURN json_build_object(
    'budget_hours',   COALESCE(v_budget.budget_hours,0),
    'budget_cost',    COALESCE(v_budget.budget_cost,0),
    'budget_revenue', COALESCE(v_budget.budget_revenue,0),
    'hours_logged',   v_hours,
    'cost_actual',    v_cost_actual,
    'revenue_billed', v_rev_billed,
    'wip',            GREATEST(v_cost_actual - 0, 0),
    'progress_pct',   COALESCE(v_progress,0),
    'margin_plan_pct',ROUND(v_margin_plan,1),
    'margin_real_pct',ROUND(v_margin_real,1),
    'burn_pct',       ROUND(v_burn,1)
  );
END $$;

-- ============================================================================
-- RPC 3 — Faturar evento: gera título AR via ai_create_title e vincula
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ai_invoice_billing_event(
  p_event_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event   public.project_billing_events%ROWTYPE;
  v_proj    public.projects%ROWTYPE;
  v_txid    UUID;
BEGIN
  SELECT * INTO v_event FROM public.project_billing_events WHERE id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Evento de faturamento não encontrado'; END IF;
  IF v_event.status = 'faturado' THEN RAISE EXCEPTION 'Evento já faturado'; END IF;

  SELECT * INTO v_proj FROM public.projects WHERE id = v_event.project_id;

  v_txid := public.ai_create_title(
    p_company_id      => v_event.company_id,
    p_direction       => 'entrada',
    p_description     => 'Faturamento projeto ' || COALESCE(v_proj.name,'') || ' — ' || v_event.description,
    p_amount          => v_event.amount,
    p_due_date        => COALESCE(v_event.due_date, CURRENT_DATE + 30),
    p_counterparty_id => v_proj.counterparty_id,
    p_notes           => json_build_object('project_id', v_event.project_id, 'billing_event_id', v_event.id)::text,
    p_agent_type      => 'PROJETOS',
    p_action_key      => 'faturar_evento',
    p_action_label    => 'Faturamento de etapa do projeto',
    p_reason          => 'Evento ' || v_event.event_type || ' aprovado para faturamento',
    p_autonomy_level  => 'N1_approval'
  );

  UPDATE public.project_billing_events SET
    status = 'faturado', transaction_id = v_txid, updated_at = now()
  WHERE id = p_event_id;

  RETURN v_txid;
END $$;

GRANT EXECUTE ON FUNCTION public.ai_approve_time_entry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.project_economics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_invoice_billing_event(UUID) TO authenticated;
