-- Criar função update_updated_at_column se não existir
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tabela para armazenar chaves OpenAI criptografadas por empresa (BYOK)
CREATE TABLE public.company_ai_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'openai',
  encrypted_key TEXT NOT NULL,
  encryption_meta JSONB NOT NULL DEFAULT '{}',
  key_last4 TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rotated_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- Índice único parcial: apenas 1 chave ativa por empresa/provider
CREATE UNIQUE INDEX idx_company_ai_keys_active 
ON public.company_ai_keys (company_id, provider) 
WHERE is_active = true;

-- Índice para busca por company_id
CREATE INDEX idx_company_ai_keys_company ON public.company_ai_keys(company_id);

-- Enable RLS
ALTER TABLE public.company_ai_keys ENABLE ROW LEVEL SECURITY;

-- Política: somente service role pode acessar (Edge Functions)
CREATE POLICY "Service role only for company_ai_keys"
ON public.company_ai_keys
FOR ALL
USING (false)
WITH CHECK (false);

-- Trigger para updated_at
CREATE TRIGGER update_company_ai_keys_updated_at
BEFORE UPDATE ON public.company_ai_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de configurações do agente IA por empresa
CREATE TABLE public.ai_company_settings (
  company_id UUID NOT NULL PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  agent_profile_id UUID,
  autopilot_mode TEXT NOT NULL DEFAULT 'safe' CHECK (autopilot_mode IN ('safe', 'balanced', 'autopilot')),
  thresholds_json JSONB NOT NULL DEFAULT '{"settle": 95, "create": 85}',
  high_risk_amount_limit NUMERIC(15,2) DEFAULT 10000,
  require_pin_for_high_risk BOOLEAN NOT NULL DEFAULT true,
  allow_auto_settle BOOLEAN NOT NULL DEFAULT false,
  allow_auto_create_and_settle BOOLEAN NOT NULL DEFAULT false,
  allow_auto_create_counterparty BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_company_settings ENABLE ROW LEVEL SECURITY;

-- Política: usuários da empresa podem ler suas configurações
CREATE POLICY "Users can view their company AI settings"
ON public.ai_company_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = ai_company_settings.company_id
    AND cu.user_id = auth.uid()
  )
);

-- Política: somente admins podem atualizar configurações
CREATE POLICY "Admins can update their company AI settings"
ON public.ai_company_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = ai_company_settings.company_id
    AND cu.user_id = auth.uid()
    AND cu.role = 'admin'
  )
);

-- Política: somente admins podem inserir configurações
CREATE POLICY "Admins can insert their company AI settings"
ON public.ai_company_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = ai_company_settings.company_id
    AND cu.user_id = auth.uid()
    AND cu.role = 'admin'
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_ai_company_settings_updated_at
BEFORE UPDATE ON public.ai_company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();