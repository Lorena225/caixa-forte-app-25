-- BLOCO 2: dependências entre tarefas (Gantt) + templates de projeto
CREATE TABLE IF NOT EXISTS public.project_task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  predecessor_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  successor_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  dep_type TEXT NOT NULL DEFAULT 'finish_start' CHECK (dep_type IN ('finish_start','start_start','finish_finish')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(predecessor_id, successor_id)
);
CREATE INDEX IF NOT EXISTS idx_ptd_project ON public.project_task_dependencies(project_id);

CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT,
  billing_type TEXT DEFAULT 'escopo_fechado', default_margin NUMERIC(5,2) DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.project_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'task' CHECK (item_type IN ('milestone','task')),
  title TEXT NOT NULL, day_offset INTEGER NOT NULL DEFAULT 0, duration_days INTEGER NOT NULL DEFAULT 1,
  estimated_hours NUMERIC(10,2) DEFAULT 0, is_billable BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pti_template ON public.project_template_items(template_id, sort_order);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['project_task_dependencies','project_templates','project_template_items'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_all" ON public.%1$s;$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s_all" ON public.%1$s FOR ALL
      USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
      WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));$p$, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.ai_apply_project_template(
  p_project_id UUID, p_template_id UUID, p_start_date DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company UUID; r RECORD; n INTEGER := 0;
BEGIN
  SELECT company_id INTO v_company FROM public.projects WHERE id = p_project_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Projeto não encontrado'; END IF;
  FOR r IN SELECT * FROM public.project_template_items WHERE template_id = p_template_id ORDER BY sort_order, day_offset
  LOOP
    IF r.item_type = 'milestone' THEN
      INSERT INTO public.project_milestones(company_id, project_id, name, due_date, status, billing_amount)
      VALUES (v_company, p_project_id, r.title, p_start_date + r.day_offset, 'pending',
        CASE WHEN r.is_billable THEN 0 ELSE NULL END);
    ELSE
      INSERT INTO public.project_tasks(company_id, project_id, title, start_date, due_date, estimated_hours, status, sort_order)
      VALUES (v_company, p_project_id, r.title, p_start_date + r.day_offset,
        p_start_date + r.day_offset + r.duration_days, r.estimated_hours, 'todo', r.sort_order);
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
GRANT EXECUTE ON FUNCTION public.ai_apply_project_template(UUID, UUID, DATE) TO authenticated;
