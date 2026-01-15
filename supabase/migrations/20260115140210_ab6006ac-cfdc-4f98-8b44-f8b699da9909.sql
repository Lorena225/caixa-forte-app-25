-- ===========================================
-- SISTEMA DE API PÚBLICA (tabelas que faltam)
-- ===========================================

-- ========== API KEYS ==========
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  rate_limit_per_day INTEGER NOT NULL DEFAULT 10000,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== API LOGS ==========
CREATE TABLE IF NOT EXISTS public.api_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  request_body JSONB,
  response_body JSONB,
  ip_address INET,
  user_agent TEXT,
  latency_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== API RATE LIMITS ==========
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  window_type TEXT NOT NULL CHECK (window_type IN ('minute', 'day')),
  request_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(api_key_id, window_start, window_type)
);

-- ========== MARKETPLACE APPS ==========
CREATE TABLE IF NOT EXISTS public.marketplace_apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  long_description TEXT,
  category TEXT NOT NULL,
  icon_url TEXT,
  website_url TEXT,
  documentation_url TEXT,
  features TEXT[] DEFAULT '{}',
  pricing_type TEXT DEFAULT 'free' CHECK (pricing_type IN ('free', 'paid', 'freemium')),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  setup_instructions TEXT,
  required_scopes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== APP CONNECTIONS ==========
CREATE TABLE IF NOT EXISTS public.app_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES public.marketplace_apps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected', 'error')),
  credentials_encrypted TEXT,
  credentials_meta JSONB,
  settings JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  connected_by UUID REFERENCES auth.users(id),
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, app_id)
);

-- ========== INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_api_keys_company ON public.api_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_logs_company ON public.api_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON public.api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_apps_category ON public.marketplace_apps(category);
CREATE INDEX IF NOT EXISTS idx_app_connections_company ON public.app_connections(company_id);

-- ========== RLS ==========
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_connections ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their company api keys' AND tablename = 'api_keys') THEN
    CREATE POLICY "Users can view their company api keys" ON public.api_keys
      FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their company api keys' AND tablename = 'api_keys') THEN
    CREATE POLICY "Users can manage their company api keys" ON public.api_keys
      FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their company api logs' AND tablename = 'api_logs') THEN
    CREATE POLICY "Users can view their company api logs" ON public.api_logs
      FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view active marketplace apps' AND tablename = 'marketplace_apps') THEN
    CREATE POLICY "Anyone can view active marketplace apps" ON public.marketplace_apps
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their company app connections' AND tablename = 'app_connections') THEN
    CREATE POLICY "Users can view their company app connections" ON public.app_connections
      FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their company app connections' AND tablename = 'app_connections') THEN
    CREATE POLICY "Users can manage their company app connections" ON public.app_connections
      FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- ========== SEED MARKETPLACE APPS ==========
INSERT INTO public.marketplace_apps (slug, name, description, long_description, category, features, pricing_type, is_featured) VALUES
('kommo', 'Kommo CRM', 'Sincronize leads e oportunidades com o Kommo', 'Integração completa com Kommo (amoCRM) para sincronizar leads, oportunidades, contatos e atividades.', 'crm', ARRAY['Sync de leads', 'Sync de contatos', 'Webhooks bidirecionais', 'Pipeline visual'], 'freemium', true),
('woocommerce', 'WooCommerce', 'Sincronize pedidos e estoque com sua loja', 'Conecte sua loja WooCommerce para sincronizar pedidos, produtos, estoque e clientes automaticamente.', 'ecommerce', ARRAY['Sync de pedidos', 'Sync de estoque', 'Sync de produtos', 'Webhook de novos pedidos'], 'free', true),
('make', 'Make (Integromat)', 'Automatize fluxos com Make', 'Use o Make para criar automações complexas conectando o Caixa Forte a centenas de outros apps.', 'automation', ARRAY['Triggers personalizados', 'Actions completas', 'Webhooks', 'Templates prontos'], 'freemium', true),
('enotas', 'eNotas', 'Emissão automática de NF-e e NFS-e', 'Integração com eNotas para emissão automática de notas fiscais de produto e serviço.', 'fiscal', ARRAY['Emissão NF-e', 'Emissão NFS-e', 'Cancelamento', 'Consulta status'], 'paid', true),
('pix-bancario', 'PIX Bancário', 'Receba e envie PIX automaticamente', 'Integração direta com seu banco para gerar cobranças PIX e reconciliar pagamentos.', 'banking', ARRAY['Gerar QR Code', 'Webhook de pagamento', 'Reconciliação automática', 'Relatórios'], 'free', true),
('whatsapp-business', 'WhatsApp Business', 'Envie mensagens pelo WhatsApp', 'Envie notificações, cobranças e lembretes via WhatsApp Business API.', 'communication', ARRAY['Mensagens automáticas', 'Templates', 'Webhooks', 'Chatbot'], 'paid', true)
ON CONFLICT (slug) DO NOTHING;

-- ========== FUNÇÕES ==========
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT AS $$
BEGIN
  RETURN 'cf_' || encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.hash_api_key(key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(sha256(key::bytea), 'hex');
END;
$$ LANGUAGE plpgsql;