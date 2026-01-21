-- =====================================================
-- AUTOMATIONS SCHEMA
-- Sistema de automações e workflows
-- =====================================================

-- Tabela principal de automações
CREATE TABLE public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT automations_unique_name UNIQUE(company_id, name),
  CONSTRAINT automations_max_per_company CHECK (true) -- Limit enforced by trigger
);

-- Tabela de logs de execução
CREATE TABLE public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger_type TEXT NOT NULL,
  trigger_data JSONB DEFAULT '{}'::jsonb,
  actions_executed JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'running')),
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_automations_company ON public.automations(company_id);
CREATE INDEX idx_automations_active ON public.automations(company_id, is_active) WHERE is_active = true;
CREATE INDEX idx_automations_triggers ON public.automations USING GIN (triggers);
CREATE INDEX idx_automation_logs_automation ON public.automation_logs(automation_id);
CREATE INDEX idx_automation_logs_date ON public.automation_logs(triggered_at DESC);
CREATE INDEX idx_automation_logs_status ON public.automation_logs(automation_id, status);

-- Trigger para updated_at
CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para limitar automações por empresa (máximo 100)
CREATE OR REPLACE FUNCTION public.check_automation_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  automation_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO automation_count
  FROM public.automations
  WHERE company_id = NEW.company_id;
  
  IF automation_count >= 100 THEN
    RAISE EXCEPTION 'Limite máximo de 100 automações por empresa atingido';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_automation_limit_trigger
  BEFORE INSERT ON public.automations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_automation_limit();

-- Trigger para incrementar contador de execução
CREATE OR REPLACE FUNCTION public.increment_automation_execution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.automations
  SET 
    execution_count = execution_count + 1,
    last_executed_at = NEW.triggered_at
  WHERE id = NEW.automation_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER increment_automation_execution_trigger
  AFTER INSERT ON public.automation_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_automation_execution();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para automations
CREATE POLICY "automations_select" ON public.automations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND company_id = automations.company_id
      AND is_active = true
    )
  );

CREATE POLICY "automations_insert" ON public.automations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND company_id = automations.company_id
      AND is_active = true
    )
  );

CREATE POLICY "automations_update" ON public.automations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND company_id = automations.company_id
      AND is_active = true
    )
  );

CREATE POLICY "automations_delete" ON public.automations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND company_id = automations.company_id
      AND is_active = true
    )
  );

-- Políticas para automation_logs
CREATE POLICY "automation_logs_select" ON public.automation_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.automations a
      JOIN public.user_profiles up ON up.company_id = a.company_id
      WHERE a.id = automation_logs.automation_id
      AND up.user_id = auth.uid()
      AND up.is_active = true
    )
  );

CREATE POLICY "automation_logs_insert" ON public.automation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.automations a
      JOIN public.user_profiles up ON up.company_id = a.company_id
      WHERE a.id = automation_logs.automation_id
      AND up.user_id = auth.uid()
      AND up.is_active = true
    )
  );

-- Permitir service role inserir logs (para edge functions)
CREATE POLICY "automation_logs_service_insert" ON public.automation_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);