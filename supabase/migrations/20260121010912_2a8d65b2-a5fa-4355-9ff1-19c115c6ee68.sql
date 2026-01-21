-- =====================================================
-- REPORTS SYSTEM - Templates and Generated Reports
-- =====================================================

-- Table for report templates (reusable configurations)
CREATE TABLE public.report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('dre', 'fluxo_caixa', 'orcamento_realizado', 'balancete', 'aging', 'custom')),
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  columns_config JSONB DEFAULT '[]',
  filters_config JSONB DEFAULT '{}',
  grouping_config JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  schedule_cron TEXT,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Table for generated reports (history)
CREATE TABLE public.reports_generated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.report_templates(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  summary JSONB DEFAULT '{}',
  row_count INTEGER DEFAULT 0,
  file_size_bytes INTEGER DEFAULT 0,
  generation_time_ms INTEGER,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  metadata JSONB DEFAULT '{}'
);

-- Table for report exports
CREATE TABLE public.report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.reports_generated(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('csv', 'excel', 'pdf', 'json')),
  file_path TEXT,
  file_size_bytes INTEGER,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

-- Indexes for performance
CREATE INDEX idx_report_templates_company ON public.report_templates(company_id);
CREATE INDEX idx_report_templates_type ON public.report_templates(type);
CREATE INDEX idx_reports_generated_company ON public.reports_generated(company_id);
CREATE INDEX idx_reports_generated_template ON public.reports_generated(template_id);
CREATE INDEX idx_reports_generated_period ON public.reports_generated(periodo_inicio, periodo_fim);
CREATE INDEX idx_reports_generated_date ON public.reports_generated(generated_at DESC);
CREATE INDEX idx_report_exports_report ON public.report_exports(report_id);

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports_generated ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_templates
CREATE POLICY "report_templates_select" ON public.report_templates
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid())
    OR is_public = true
  );

CREATE POLICY "report_templates_insert" ON public.report_templates
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "report_templates_update" ON public.report_templates
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "report_templates_delete" ON public.report_templates
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

-- RLS Policies for reports_generated
CREATE POLICY "reports_generated_select" ON public.reports_generated
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "reports_generated_insert" ON public.reports_generated
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "reports_generated_delete" ON public.reports_generated
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid())
  );

-- RLS Policies for report_exports
CREATE POLICY "report_exports_select" ON public.report_exports
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "report_exports_insert" ON public.report_exports
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid())
  );

-- Trigger for updated_at on report_templates
CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to clean expired reports
CREATE OR REPLACE FUNCTION public.cleanup_expired_reports()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.report_exports WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  DELETE FROM public.reports_generated WHERE expires_at < now();
  deleted_count := deleted_count + ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;