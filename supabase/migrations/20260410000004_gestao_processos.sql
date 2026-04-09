-- Gestão de Processos (BPM)

CREATE TABLE IF NOT EXISTS public.processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  codigo TEXT,
  nome TEXT NOT NULL,
  nome_curto TEXT,
  area TEXT,
  subarea TEXT,
  tipo TEXT DEFAULT 'operacional',
  objetivo TEXT,
  descricao TEXT,
  frequencia TEXT DEFAULT 'continuo',
  criticidade TEXT DEFAULT 'media',
  dono_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'rascunho',
  versao INTEGER DEFAULT 1,
  versao_publicada INTEGER DEFAULT 0,
  sla_global_horas INTEGER,
  exige_aprovacao_final BOOLEAN DEFAULT false,
  exige_evidencia_final BOOLEAN DEFAULT false,
  permite_reabertura BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.processo_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID REFERENCES public.processos(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  codigo TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'atividade',
  ordem INTEGER NOT NULL DEFAULT 1,
  responsavel_papel TEXT,
  sla_horas INTEGER,
  exige_checklist BOOLEAN DEFAULT false,
  exige_aprovacao BOOLEAN DEFAULT false,
  exige_anexo BOOLEAN DEFAULT false,
  exige_comentario BOOLEAN DEFAULT false,
  cor TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.processo_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID REFERENCES public.processos(id) ON DELETE CASCADE,
  etapa_id UUID REFERENCES public.processo_etapas(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  nome TEXT NOT NULL,
  item TEXT NOT NULL,
  ordem INTEGER DEFAULT 1,
  obrigatorio BOOLEAN DEFAULT true,
  exige_anexo BOOLEAN DEFAULT false,
  exige_observacao BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.processo_instancias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID REFERENCES public.processos(id),
  company_id UUID NOT NULL,
  numero TEXT,
  solicitante_id UUID REFERENCES auth.users(id),
  responsavel_atual_id UUID REFERENCES auth.users(id),
  etapa_atual_id UUID REFERENCES public.processo_etapas(id),
  status TEXT DEFAULT 'aberta',
  prioridade TEXT DEFAULT 'media',
  data_abertura TIMESTAMPTZ DEFAULT now(),
  previsao_conclusao TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  atrasado BOOLEAN DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processo_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processo_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processo_instancias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_processos" ON public.processos FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
CREATE POLICY "company_etapas" ON public.processo_etapas FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
CREATE POLICY "company_checklists_proc" ON public.processo_checklists FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
CREATE POLICY "company_instancias" ON public.processo_instancias FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
