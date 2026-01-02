
-- Tabela de conexões de integração
CREATE TABLE public.integration_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('woocommerce', 'payment_gateway', 'crm', 'custom_api', 'erp')),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disabled' CHECK (status IN ('active', 'disabled', 'error', 'testing')),
  encrypted_credentials TEXT,
  encryption_meta JSONB DEFAULT '{}',
  settings_json JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de webhooks de integração
CREATE TABLE public.integration_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  secret_hash TEXT,
  endpoint_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de jobs de integração
CREATE TABLE public.integration_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  payload_json JSONB DEFAULT '{}',
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de logs de integração
CREATE TABLE public.integration_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.integration_connections(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  endpoint TEXT NOT NULL,
  method TEXT,
  request_meta_json JSONB DEFAULT '{}',
  response_meta_json JSONB DEFAULT '{}',
  status_code INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Dead Letter Queue
CREATE TABLE public.integration_dlq (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.integration_connections(id) ON DELETE SET NULL,
  event_type TEXT,
  payload_json JSONB NOT NULL,
  error_json JSONB,
  attempts INTEGER NOT NULL DEFAULT 0,
  failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_dlq ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integration_connections
CREATE POLICY "Users can view their company connections" ON public.integration_connections
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert connections for their company" ON public.integration_connections
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company connections" ON public.integration_connections
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their company connections" ON public.integration_connections
  FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- RLS Policies for integration_webhooks
CREATE POLICY "Users can view their company webhooks" ON public.integration_webhooks
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert webhooks for their company" ON public.integration_webhooks
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company webhooks" ON public.integration_webhooks
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their company webhooks" ON public.integration_webhooks
  FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- RLS Policies for integration_jobs
CREATE POLICY "Users can view their company jobs" ON public.integration_jobs
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert jobs for their company" ON public.integration_jobs
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company jobs" ON public.integration_jobs
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- RLS Policies for integration_logs
CREATE POLICY "Users can view their company logs" ON public.integration_logs
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert logs for their company" ON public.integration_logs
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- RLS Policies for integration_dlq
CREATE POLICY "Users can view their company dlq" ON public.integration_dlq
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company dlq" ON public.integration_dlq
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert dlq for their company" ON public.integration_dlq
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_integration_connections_company ON public.integration_connections(company_id);
CREATE INDEX idx_integration_webhooks_connection ON public.integration_webhooks(connection_id);
CREATE INDEX idx_integration_jobs_connection ON public.integration_jobs(connection_id);
CREATE INDEX idx_integration_jobs_status ON public.integration_jobs(status);
CREATE INDEX idx_integration_logs_connection ON public.integration_logs(connection_id);
CREATE INDEX idx_integration_logs_created ON public.integration_logs(created_at DESC);
CREATE INDEX idx_integration_dlq_connection ON public.integration_dlq(connection_id);

-- Trigger for updated_at
CREATE TRIGGER update_integration_connections_updated_at
  BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_webhooks_updated_at
  BEFORE UPDATE ON public.integration_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
