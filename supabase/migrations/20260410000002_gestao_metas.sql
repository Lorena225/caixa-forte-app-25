-- Gestão por Metas / OKR

CREATE TABLE IF NOT EXISTS public.metas_estrategicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  codigo TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'operacional',
  perspectiva TEXT,
  ciclo TEXT DEFAULT 'anual',
  data_inicio DATE,
  data_fim DATE,
  area TEXT,
  responsavel_id UUID REFERENCES auth.users(id),
  meta_pai_id UUID REFERENCES public.metas_estrategicas(id),
  peso NUMERIC DEFAULT 1,
  prioridade TEXT DEFAULT 'media',
  status TEXT DEFAULT 'rascunho',
  indicador_nome TEXT,
  unidade_medida TEXT,
  baseline NUMERIC,
  meta_alvo NUMERIC NOT NULL DEFAULT 0,
  meta_minima NUMERIC,
  meta_ideal NUMERIC,
  valor_atual NUMERIC DEFAULT 0,
  frequencia_apuracao TEXT DEFAULT 'mensal',
  faixa_verde_min NUMERIC,
  faixa_amarela_min NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meta_apuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id UUID REFERENCES public.metas_estrategicas(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  periodo DATE NOT NULL,
  valor_realizado NUMERIC NOT NULL,
  comentario TEXT,
  registrado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meta_planos_acao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id UUID REFERENCES public.metas_estrategicas(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'corretivo',
  responsavel_id UUID REFERENCES auth.users(id),
  data_inicio DATE,
  data_fim DATE,
  prioridade TEXT DEFAULT 'media',
  status TEXT DEFAULT 'pendente',
  impacto_esperado TEXT,
  custo_previsto NUMERIC,
  custo_realizado NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.metas_estrategicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_apuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_planos_acao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_metas" ON public.metas_estrategicas FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
CREATE POLICY "company_apuracoes" ON public.meta_apuracoes FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
CREATE POLICY "company_planos_acao" ON public.meta_planos_acao FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
