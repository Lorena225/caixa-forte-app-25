-- =============================================================
-- MÓDULO DE GESTÃO DE PROJETOS E SERVIÇOS
-- Integrado com Contratos e Financeiro
-- =============================================================

-- 1. TABELA PROJECTS (Projetos de Entrega)
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  counterparty_id UUID REFERENCES public.counterparties(id),
  project_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES public.user_profiles(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  deadline DATE,
  budget_hours NUMERIC(10,2) DEFAULT 0,
  budget_amount NUMERIC(15,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planejamento' CHECK (status IN ('planejamento', 'em_andamento', 'pausado', 'concluido', 'cancelado')),
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. TABELA PROJECT_MILESTONES (Marcos de Entrega)
CREATE TABLE public.project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  billing_amount NUMERIC(15,2) DEFAULT 0,
  billing_percentage NUMERIC(5,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  completed_at TIMESTAMP WITH TIME ZONE,
  transaction_id UUID REFERENCES public.transactions(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. TABELA PROJECT_TASKS (Tarefas)
CREATE TABLE public.project_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.user_profiles(id),
  estimated_hours NUMERIC(8,2) DEFAULT 0,
  actual_hours NUMERIC(8,2) DEFAULT 0,
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  status TEXT NOT NULL DEFAULT 'a_fazer' CHECK (status IN ('a_fazer', 'fazendo', 'bloqueado', 'revisao', 'feito', 'arquivado')),
  due_date DATE,
  start_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. TABELA TIMESHEETS (Apontamento de Horas) - CRÍTICA PARA PERFORMANCE
CREATE TABLE public.timesheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN end_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60
      ELSE NULL 
    END
  ) STORED,
  description TEXT,
  is_billable BOOLEAN DEFAULT true,
  hourly_rate NUMERIC(10,2),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. TABELA USER_HOURLY_RATES (Custo Hora por Usuário)
CREATE TABLE public.user_hourly_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  cost_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  billing_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, user_id, effective_from)
);

-- 6. TABELA PROJECT_COMMENTS (Comentários)
CREATE TABLE public.project_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_comment_target CHECK (project_id IS NOT NULL OR task_id IS NOT NULL)
);

-- =============================================================
-- ÍNDICES DE ALTA PERFORMANCE
-- =============================================================

-- Projects
CREATE INDEX idx_projects_company_status ON public.projects(company_id, status);
CREATE INDEX idx_projects_contract ON public.projects(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX idx_projects_manager ON public.projects(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX idx_projects_deadline ON public.projects(company_id, deadline) WHERE deadline IS NOT NULL;

-- Milestones
CREATE INDEX idx_milestones_project ON public.project_milestones(project_id);
CREATE INDEX idx_milestones_status ON public.project_milestones(company_id, status);
CREATE INDEX idx_milestones_due_date ON public.project_milestones(company_id, due_date) WHERE due_date IS NOT NULL;

-- Tasks
CREATE INDEX idx_tasks_project_status ON public.project_tasks(project_id, status);
CREATE INDEX idx_tasks_assigned ON public.project_tasks(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tasks_milestone ON public.project_tasks(milestone_id) WHERE milestone_id IS NOT NULL;
CREATE INDEX idx_tasks_due_date ON public.project_tasks(company_id, due_date) WHERE due_date IS NOT NULL;

-- Timesheets (ÍNDICES CRÍTICOS para relatórios rápidos)
CREATE INDEX idx_timesheets_user_date ON public.timesheets(user_id, start_time DESC);
CREATE INDEX idx_timesheets_project_date ON public.timesheets(project_id, start_time DESC);
CREATE INDEX idx_timesheets_company_date ON public.timesheets(company_id, start_time DESC);
CREATE INDEX idx_timesheets_task ON public.timesheets(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_timesheets_billable ON public.timesheets(company_id, is_billable, start_time DESC) WHERE is_billable = true;

-- User Hourly Rates
CREATE INDEX idx_hourly_rates_user ON public.user_hourly_rates(company_id, user_id, effective_from DESC);

-- Comments
CREATE INDEX idx_comments_project ON public.project_comments(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_comments_task ON public.project_comments(task_id) WHERE task_id IS NOT NULL;

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hourly_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

-- Projects RLS
CREATE POLICY "projects_company_access" ON public.projects
  FOR ALL USING (public.user_belongs_to_company(company_id));

-- Milestones RLS
CREATE POLICY "milestones_company_access" ON public.project_milestones
  FOR ALL USING (public.user_belongs_to_company(company_id));

-- Tasks RLS
CREATE POLICY "tasks_company_access" ON public.project_tasks
  FOR ALL USING (public.user_belongs_to_company(company_id));

-- Timesheets RLS
CREATE POLICY "timesheets_company_access" ON public.timesheets
  FOR ALL USING (public.user_belongs_to_company(company_id));

-- User Hourly Rates RLS (apenas admin/finance)
CREATE POLICY "hourly_rates_company_access" ON public.user_hourly_rates
  FOR ALL USING (public.user_belongs_to_company(company_id));

-- Comments RLS
CREATE POLICY "comments_company_access" ON public.project_comments
  FOR ALL USING (public.user_belongs_to_company(company_id));

-- =============================================================
-- TRIGGERS DE ATUALIZAÇÃO
-- =============================================================

-- Trigger para updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timesheets_updated_at
  BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.project_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- FUNÇÃO: Atualizar horas reais da tarefa
-- =============================================================
CREATE OR REPLACE FUNCTION public.update_task_actual_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualiza horas reais na tarefa
  IF NEW.task_id IS NOT NULL THEN
    UPDATE public.project_tasks
    SET actual_hours = (
      SELECT COALESCE(SUM(duration_minutes) / 60.0, 0)
      FROM public.timesheets
      WHERE task_id = NEW.task_id
        AND end_time IS NOT NULL
    )
    WHERE id = NEW.task_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_task_hours
  AFTER INSERT OR UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.update_task_actual_hours();

-- =============================================================
-- FUNÇÃO: Calcular rentabilidade do projeto
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_project_profitability(p_project_id UUID)
RETURNS TABLE (
  project_id UUID,
  contract_value NUMERIC,
  total_hours NUMERIC,
  personnel_cost NUMERIC,
  contribution_margin NUMERIC,
  margin_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS project_id,
    COALESCE(c.valor_total, c.monthly_value, p.budget_amount, 0) AS contract_value,
    COALESCE(SUM(t.duration_minutes) / 60.0, 0) AS total_hours,
    COALESCE(SUM(
      (t.duration_minutes / 60.0) * COALESCE(t.hourly_rate, uhr.cost_rate, 0)
    ), 0) AS personnel_cost,
    COALESCE(c.valor_total, c.monthly_value, p.budget_amount, 0) - 
      COALESCE(SUM(
        (t.duration_minutes / 60.0) * COALESCE(t.hourly_rate, uhr.cost_rate, 0)
      ), 0) AS contribution_margin,
    CASE 
      WHEN COALESCE(c.valor_total, c.monthly_value, p.budget_amount, 0) > 0 THEN
        ((COALESCE(c.valor_total, c.monthly_value, p.budget_amount, 0) - 
          COALESCE(SUM((t.duration_minutes / 60.0) * COALESCE(t.hourly_rate, uhr.cost_rate, 0)), 0)) 
         / COALESCE(c.valor_total, c.monthly_value, p.budget_amount, 1)) * 100
      ELSE 0
    END AS margin_percentage
  FROM public.projects p
  LEFT JOIN public.contracts c ON c.id = p.contract_id
  LEFT JOIN public.timesheets t ON t.project_id = p.id AND t.end_time IS NOT NULL
  LEFT JOIN public.user_hourly_rates uhr ON uhr.user_id = t.user_id 
    AND uhr.effective_from <= CURRENT_DATE
    AND (uhr.effective_until IS NULL OR uhr.effective_until >= CURRENT_DATE)
  WHERE p.id = p_project_id
  GROUP BY p.id, c.valor_total, c.monthly_value, p.budget_amount;
END;
$$;