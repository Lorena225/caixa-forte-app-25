-- Painel Individual: Tarefas e Comunicados

CREATE TABLE IF NOT EXISTS public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'manual',
  prioridade TEXT DEFAULT 'media',
  status TEXT DEFAULT 'pendente',
  responsavel_id UUID REFERENCES auth.users(id),
  criado_por UUID REFERENCES auth.users(id),
  data_vencimento TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  origem_id UUID,
  origem_tipo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comunicados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT DEFAULT 'informativo',
  criado_por UUID REFERENCES auth.users(id),
  data_expiracao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comunicado_leituras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comunicado_id UUID REFERENCES public.comunicados(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  lido_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comunicado_id, user_id)
);

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicado_leituras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_tarefas" ON public.tarefas FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
CREATE POLICY "company_comunicados" ON public.comunicados FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
CREATE POLICY "own_leituras" ON public.comunicado_leituras FOR ALL USING (user_id = auth.uid());
