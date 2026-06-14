-- BLOCO 1: orçamento por perfil + snapshots automáticos + mapa de capacidade
CREATE TABLE IF NOT EXISTS public.project_budget_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  budget_id     UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  profile_name  TEXT NOT NULL,
  hours         NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_rate     NUMERIC(15,2) NOT NULL DEFAULT 0,
  bill_rate     NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pbl_budget ON public.project_budget_lines(budget_id);
ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pbl_all ON public.project_budget_lines;
CREATE POLICY pbl_all ON public.project_budget_lines FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.ai_capture_project_snapshot(p_project_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company UUID; v_econ JSON; v_id UUID;
BEGIN
  SELECT company_id INTO v_company FROM public.projects WHERE id = p_project_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Projeto não encontrado'; END IF;
  v_econ := public.project_economics(p_project_id);
  DELETE FROM public.project_snapshots WHERE project_id = p_project_id AND snapshot_date = CURRENT_DATE;
  INSERT INTO public.project_snapshots(company_id, project_id, snapshot_date, hours_logged, cost_actual, revenue_billed, progress_pct, margin_pct)
  VALUES (v_company, p_project_id, CURRENT_DATE, (v_econ->>'hours_logged')::numeric, (v_econ->>'cost_actual')::numeric,
    (v_econ->>'revenue_billed')::numeric, (v_econ->>'progress_pct')::int, (v_econ->>'margin_real_pct')::numeric)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.ai_capture_all_snapshots(p_company_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; n INTEGER := 0;
BEGIN
  FOR r IN SELECT id FROM public.projects WHERE company_id = p_company_id AND status NOT IN ('cancelado','concluido')
  LOOP PERFORM public.ai_capture_project_snapshot(r.id); n := n + 1; END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.project_capacity_map(p_company_id UUID)
RETURNS TABLE(employee_id UUID, full_name TEXT, total_pct NUMERIC, project_count BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT a.employee_id, e.full_name, COALESCE(SUM(a.allocation_pct),0), COUNT(DISTINCT a.project_id)
    FROM public.project_allocations a JOIN public.employees_profiles e ON e.id = a.employee_id
   WHERE a.company_id = p_company_id AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
   GROUP BY a.employee_id, e.full_name ORDER BY 3 DESC;
$$;

GRANT EXECUTE ON FUNCTION public.ai_capture_project_snapshot(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_capture_all_snapshots(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.project_capacity_map(UUID) TO authenticated;
