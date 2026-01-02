-- Criar tabelas que podem ter falhado na migration anterior

-- 12. Export Profiles (se não existir)
CREATE TABLE IF NOT EXISTS public.export_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  name TEXT NOT NULL,
  format TEXT DEFAULT 'csv' CHECK (format IN ('csv', 'xlsx', 'pdf')),
  columns_json JSONB NOT NULL DEFAULT '[]',
  filters_json JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Integration Credentials (se não existir)
CREATE TABLE IF NOT EXISTS public.integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_key TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  encryption_meta JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, integration_key)
);

-- 14. Backup Jobs (se não existir)
CREATE TABLE IF NOT EXISTS public.backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scope_json JSONB DEFAULT '{"tables": ["all"], "include_files": false}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Backup Artifacts (se não existir)
CREATE TABLE IF NOT EXISTS public.backup_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.backup_jobs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  checksum TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. System Health Snapshots (se não existir)
CREATE TABLE IF NOT EXISTS public.system_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ DEFAULT now(),
  integrations_status_json JSONB DEFAULT '{}',
  jobs_summary_json JSONB DEFAULT '{}',
  ai_metrics_json JSONB DEFAULT '{}',
  pending_items_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. Data Retention Policies (se não existir)
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  retention_days INTEGER DEFAULT 365,
  action TEXT DEFAULT 'archive' CHECK (action IN ('archive', 'delete', 'anonymize')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, entity_type)
);

-- 18. Privacy Requests LGPD (se não existir)
CREATE TABLE IF NOT EXISTS public.privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'delete', 'rectify', 'access')),
  requester_email TEXT NOT NULL,
  target_user_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.export_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view export profiles" ON public.export_profiles FOR SELECT USING (public.user_has_company_access(company_id));
CREATE POLICY "Admins can manage export profiles" ON public.export_profiles FOR ALL USING (public.user_can_write(company_id));

CREATE POLICY "Admins can view integration credentials" ON public.integration_credentials FOR SELECT USING (public.user_can_write(company_id));
CREATE POLICY "Admins can manage integration credentials" ON public.integration_credentials FOR ALL USING (public.user_can_write(company_id));

CREATE POLICY "Admins can view backup jobs" ON public.backup_jobs FOR SELECT USING (public.user_can_write(company_id));
CREATE POLICY "Admins can manage backup jobs" ON public.backup_jobs FOR ALL USING (public.user_can_write(company_id));

CREATE POLICY "Admins can view backup artifacts" ON public.backup_artifacts FOR SELECT USING (EXISTS (SELECT 1 FROM public.backup_jobs bj WHERE bj.id = backup_artifacts.job_id AND public.user_can_write(bj.company_id)));

CREATE POLICY "Users can view health snapshots" ON public.system_health_snapshots FOR SELECT USING (public.user_has_company_access(company_id));
CREATE POLICY "System can manage health snapshots" ON public.system_health_snapshots FOR ALL USING (public.user_can_write(company_id));

CREATE POLICY "Admins can view retention policies" ON public.data_retention_policies FOR SELECT USING (public.user_can_write(company_id));
CREATE POLICY "Admins can manage retention policies" ON public.data_retention_policies FOR ALL USING (public.user_can_write(company_id));

CREATE POLICY "Admins can view privacy requests" ON public.privacy_requests FOR SELECT USING (public.user_can_write(company_id));
CREATE POLICY "Admins can manage privacy requests" ON public.privacy_requests FOR ALL USING (public.user_can_write(company_id));

-- Triggers
CREATE TRIGGER update_export_profiles_updated_at BEFORE UPDATE ON public.export_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_integration_credentials_updated_at BEFORE UPDATE ON public.integration_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_data_retention_policies_updated_at BEFORE UPDATE ON public.data_retention_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();