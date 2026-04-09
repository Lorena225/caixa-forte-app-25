-- Investigação de Falhas / Qualidade

CREATE TABLE IF NOT EXISTS public.ocorrencias_falha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  numero SERIAL,
  data_ocorrencia TIMESTAMPTZ DEFAULT now(),
  area TEXT,
  setor TEXT,
  tipo_falha TEXT NOT NULL,
  categoria TEXT,
  gravidade TEXT DEFAULT 'media',
  impacto TEXT DEFAULT 'medio',
  descricao TEXT NOT NULL,
  detectado_por UUID REFERENCES auth.users(id),
  origem_deteccao TEXT DEFAULT 'manual',
  responsavel_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'aberta',
  prazo_tratamento DATE,
  cliente_afetado TEXT,
  custo_estimado NUMERIC,
  custo_realizado NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.falha_causas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id UUID REFERENCES public.ocorrencias_falha(id) ON DELETE CASCADE,
  metodo TEXT DEFAULT '5_porques',
  problema_definido TEXT,
  causa_imediata TEXT,
  causa_raiz TEXT NOT NULL,
  categoria_causa TEXT,
  evidencia TEXT,
  investigador_id UUID REFERENCES auth.users(id),
  necessita_revisao_processo BOOLEAN DEFAULT false,
  necessita_treinamento BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.falha_acoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id UUID REFERENCES public.ocorrencias_falha(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  responsavel_id UUID REFERENCES auth.users(id),
  data_inicio DATE,
  prazo_final DATE NOT NULL,
  prioridade TEXT DEFAULT 'media',
  status TEXT DEFAULT 'pendente',
  evidencia_conclusao TEXT,
  validador_id UUID REFERENCES auth.users(id),
  data_validacao DATE,
  custo_previsto NUMERIC,
  custo_realizado NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ocorrencias_falha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.falha_causas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.falha_acoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_ocorrencias" ON public.ocorrencias_falha FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
CREATE POLICY "ocorrencia_causas_access" ON public.falha_causas FOR ALL USING (
  ocorrencia_id IN (SELECT id FROM public.ocorrencias_falha WHERE company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ))
);
CREATE POLICY "company_falha_acoes" ON public.falha_acoes FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
