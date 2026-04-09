-- IA Operacional: Regras, Alertas, Insights

CREATE TABLE IF NOT EXISTS public.ia_regras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_analise TEXT NOT NULL,
  modulo_monitorado TEXT NOT NULL,
  frequencia_execucao TEXT DEFAULT 'diaria',
  criterio_disparo TEXT,
  limiar NUMERIC,
  severidade_padrao TEXT DEFAULT 'media',
  canal_notificacao TEXT DEFAULT 'in_app',
  abre_tarefa_auto BOOLEAN DEFAULT false,
  abre_falha_auto BOOLEAN DEFAULT false,
  escala_automaticamente BOOLEAN DEFAULT false,
  apenas_sugere BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'ativa',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ia_alertas_gerados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  regra_id UUID REFERENCES public.ia_regras(id),
  tipo TEXT NOT NULL,
  categoria TEXT,
  titulo TEXT NOT NULL,
  resumo TEXT NOT NULL,
  causa_provavel TEXT,
  severidade TEXT DEFAULT 'media',
  confianca NUMERIC DEFAULT 0.8,
  area_impactada TEXT,
  responsavel_sugerido UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'ativo',
  acao_recomendada TEXT,
  prazo_sugerido DATE,
  escalonado BOOLEAN DEFAULT false,
  feedback TEXT,
  fonte_dados TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ia_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  contexto TEXT,
  periodo_analisado TEXT,
  tendencia TEXT,
  causa_provavel TEXT,
  impacto_estimado TEXT,
  urgencia TEXT DEFAULT 'media',
  proxima_acao TEXT,
  status TEXT DEFAULT 'novo',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ia_regras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_alertas_gerados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_ia_regras" ON public.ia_regras FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
CREATE POLICY "company_ia_alertas" ON public.ia_alertas_gerados FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
CREATE POLICY "company_ia_insights" ON public.ia_insights FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
