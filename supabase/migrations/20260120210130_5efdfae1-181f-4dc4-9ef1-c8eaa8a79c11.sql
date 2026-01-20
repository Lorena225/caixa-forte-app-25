-- =============================================
-- BACKUP & RECOVERY MANAGEMENT - COMPLETE STRUCTURE
-- =============================================

-- Add missing columns to existing backup_jobs table
ALTER TABLE public.backup_jobs 
ADD COLUMN IF NOT EXISTS nome_job TEXT,
ADD COLUMN IF NOT EXISTS tipo TEXT,
ADD COLUMN IF NOT EXISTS frequencia TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS alvo TEXT DEFAULT 'principal',
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS configuracao_json JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS descricao TEXT,
ADD COLUMN IF NOT EXISTS proximo_agendamento TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create backup_executions if not exists
CREATE TABLE IF NOT EXISTS public.backup_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_job_id UUID NOT NULL REFERENCES public.backup_jobs(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  detalhes JSONB DEFAULT '{}',
  local_armazenamento TEXT DEFAULT 'supabase_internal',
  tamanho_bytes BIGINT,
  arquivos_processados INTEGER,
  erro_mensagem TEXT,
  triggered_by UUID REFERENCES auth.users(id),
  trigger_type TEXT DEFAULT 'manual'
);

-- Create backup_config_critical if not exists
CREATE TABLE IF NOT EXISTS public.backup_config_critical (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  ultima_versao_backup_em TIMESTAMPTZ,
  detalhes JSONB DEFAULT '{}',
  snapshot_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create backup_policy_settings if not exists
CREATE TABLE IF NOT EXISTS public.backup_policy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  rpo_minutos INTEGER NOT NULL DEFAULT 60,
  rto_minutos INTEGER NOT NULL DEFAULT 240,
  retencao_dias INTEGER NOT NULL DEFAULT 30,
  backup_db_enabled BOOLEAN DEFAULT true,
  backup_arquivos_enabled BOOLEAN DEFAULT true,
  backup_configs_enabled BOOLEAN DEFAULT true,
  offsite_enabled BOOLEAN DEFAULT false,
  notificar_falhas BOOLEAN DEFAULT true,
  emails_notificacao TEXT[],
  configuracao_extra JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id)
);

-- Create dr_test_checklist if not exists
CREATE TABLE IF NOT EXISTS public.dr_test_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ultimo_teste_em TIMESTAMPTZ,
  proximo_teste_planejado TIMESTAMPTZ,
  responsavel_nome TEXT,
  responsavel_email TEXT,
  ambiente_teste TEXT DEFAULT 'homologacao',
  resultado_ultimo_teste TEXT,
  observacoes TEXT,
  checklist_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_backup_executions_job_status ON public.backup_executions(backup_job_id, status);
CREATE INDEX IF NOT EXISTS idx_backup_executions_company_date ON public.backup_executions(company_id, iniciado_em DESC);
CREATE INDEX IF NOT EXISTS idx_backup_executions_status ON public.backup_executions(status) WHERE status = 'em_andamento';
CREATE INDEX IF NOT EXISTS idx_backup_config_critical_company ON public.backup_config_critical(company_id, tipo);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE public.backup_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_config_critical ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_policy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dr_test_checklist ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - Using user_belongs_to_company only (admin check done in app)
-- =============================================

-- Drop if exists and recreate for backup_executions
DROP POLICY IF EXISTS "Admin can manage backup_executions" ON public.backup_executions;
CREATE POLICY "Admin can manage backup_executions" ON public.backup_executions
  FOR ALL USING (
    company_id IS NULL OR user_belongs_to_company(company_id)
  );

-- Drop if exists and recreate for backup_config_critical
DROP POLICY IF EXISTS "Admin can manage backup_config_critical" ON public.backup_config_critical;
CREATE POLICY "Admin can manage backup_config_critical" ON public.backup_config_critical
  FOR ALL USING (
    company_id IS NULL OR user_belongs_to_company(company_id)
  );

-- Drop if exists and recreate for backup_policy_settings
DROP POLICY IF EXISTS "Admin can manage backup_policy_settings" ON public.backup_policy_settings;
CREATE POLICY "Admin can manage backup_policy_settings" ON public.backup_policy_settings
  FOR ALL USING (
    company_id IS NULL OR user_belongs_to_company(company_id)
  );

-- Drop if exists and recreate for dr_test_checklist
DROP POLICY IF EXISTS "Admin can manage dr_test_checklist" ON public.dr_test_checklist;
CREATE POLICY "Admin can manage dr_test_checklist" ON public.dr_test_checklist
  FOR ALL USING (
    company_id IS NULL OR user_belongs_to_company(company_id)
  );

-- =============================================
-- TRIGGERS
-- =============================================
DROP TRIGGER IF EXISTS set_backup_config_critical_updated_at ON public.backup_config_critical;
CREATE TRIGGER set_backup_config_critical_updated_at
  BEFORE UPDATE ON public.backup_config_critical
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_backup_policy_settings_updated_at ON public.backup_policy_settings;
CREATE TRIGGER set_backup_policy_settings_updated_at
  BEFORE UPDATE ON public.backup_policy_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_dr_test_checklist_updated_at ON public.dr_test_checklist;
CREATE TRIGGER set_dr_test_checklist_updated_at
  BEFORE UPDATE ON public.dr_test_checklist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();