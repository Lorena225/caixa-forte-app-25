-- =============================================
-- MÓDULO FISCAL AVANÇADO - FASE 2
-- =============================================

-- 1. SPED FISCAL - BLOCO K (Estoque)
CREATE TABLE IF NOT EXISTS public.sped_bloco_k (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  periodo_referencia DATE NOT NULL,
  produto_id UUID REFERENCES public.products(id),
  tipo_movimento TEXT CHECK (tipo_movimento IN ('entrada', 'saida', 'producao', 'perda')),
  quantidade NUMERIC(15,3) NOT NULL,
  valor_unitario NUMERIC(15,2),
  saldo_inicial NUMERIC(15,3),
  saldo_final NUMERIC(15,3),
  registro_tipo TEXT DEFAULT 'K200',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. APURAÇÃO DE IMPOSTOS AUTOMATIZADA
CREATE TABLE IF NOT EXISTS public.apuracoes_impostos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  periodo_mes INTEGER CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_ano INTEGER NOT NULL,
  tipo_imposto TEXT CHECK (tipo_imposto IN ('icms', 'ipi', 'pis', 'cofins')),
  debitos NUMERIC(15,2) DEFAULT 0,
  creditos NUMERIC(15,2) DEFAULT 0,
  saldo_anterior NUMERIC(15,2) DEFAULT 0,
  saldo_apurado NUMERIC(15,2),
  status TEXT DEFAULT 'em_apuracao' CHECK (status IN ('em_apuracao', 'apurado', 'transmitido')),
  data_transmissao TIMESTAMP WITH TIME ZONE,
  recibo_transmissao TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. REGRAS DE TRIBUTAÇÃO PERSONALIZADAS
CREATE TABLE IF NOT EXISTS public.regras_tributacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  produto_id UUID REFERENCES public.products(id),
  ncm TEXT,
  uf_origem TEXT,
  uf_destino TEXT,
  cfop TEXT,
  cst_icms TEXT,
  csosn TEXT,
  aliquota_icms NUMERIC(5,2),
  aliquota_ipi NUMERIC(5,2),
  aliquota_pis NUMERIC(5,2),
  aliquota_cofins NUMERIC(5,2),
  reducao_base_calc NUMERIC(5,2) DEFAULT 0,
  mva NUMERIC(5,2) DEFAULT 0,
  fcp NUMERIC(5,2) DEFAULT 0,
  difal NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  prioridade INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. OBRIGAÇÕES FISCAIS
CREATE TABLE IF NOT EXISTS public.obrigacoes_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT,
  tipo TEXT CHECK (tipo IN ('mensal', 'trimestral', 'anual', 'eventual')),
  orgao TEXT NOT NULL,
  prazo_dia INTEGER,
  prazo_regra TEXT,
  descricao TEXT,
  multa_atraso NUMERIC(5,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. CALENDÁRIO DE OBRIGAÇÕES
CREATE TABLE IF NOT EXISTS public.calendario_obrigacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  obrigacao_id UUID REFERENCES public.obrigacoes_fiscais(id) ON DELETE CASCADE,
  periodo_referencia DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'cumprida', 'atrasada')),
  responsavel_id UUID,
  observacoes TEXT,
  arquivo_comprovante TEXT,
  data_cumprimento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. SIMPLES NACIONAL - DAS
CREATE TABLE IF NOT EXISTS public.simples_nacional_das (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  periodo_mes INTEGER CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_ano INTEGER NOT NULL,
  receita_bruta_mes NUMERIC(15,2) NOT NULL,
  receita_bruta_12_meses NUMERIC(15,2) NOT NULL,
  anexo TEXT CHECK (anexo IN ('I', 'II', 'III', 'IV', 'V')),
  faixa INTEGER,
  aliquota_nominal NUMERIC(5,2),
  parcela_deduzir NUMERIC(15,2),
  aliquota_efetiva NUMERIC(5,2),
  valor_devido NUMERIC(15,2),
  valor_pago NUMERIC(15,2) DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  codigo_barras TEXT,
  numero_das TEXT,
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'atrasado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. ANÁLISE TRIBUTÁRIA (comparativos)
CREATE TABLE IF NOT EXISTS public.analise_tributaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  periodo_mes INTEGER CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_ano INTEGER NOT NULL,
  receita_bruta NUMERIC(15,2) NOT NULL,
  custos_dedutiveis NUMERIC(15,2) DEFAULT 0,
  folha_pagamento NUMERIC(15,2) DEFAULT 0,
  lucro_estimado NUMERIC(15,2),
  simples_aliquota NUMERIC(5,2),
  simples_valor NUMERIC(15,2),
  presumido_irpj NUMERIC(15,2),
  presumido_csll NUMERIC(15,2),
  presumido_pis NUMERIC(15,2),
  presumido_cofins NUMERIC(15,2),
  presumido_total NUMERIC(15,2),
  real_irpj NUMERIC(15,2),
  real_csll NUMERIC(15,2),
  real_pis NUMERIC(15,2),
  real_cofins NUMERIC(15,2),
  real_total NUMERIC(15,2),
  regime_recomendado TEXT,
  economia_potencial NUMERIC(15,2),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.sped_bloco_k ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apuracoes_impostos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_tributacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obrigacoes_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_obrigacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simples_nacional_das ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_tributaria ENABLE ROW LEVEL SECURITY;

-- RLS Policies usando company_users (pattern correto do projeto)
CREATE POLICY "company_access" ON public.sped_bloco_k FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "company_access" ON public.apuracoes_impostos FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "company_access" ON public.regras_tributacao FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "company_access" ON public.obrigacoes_fiscais FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "company_access" ON public.calendario_obrigacoes FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "company_access" ON public.simples_nacional_das FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "company_access" ON public.analise_tributaria FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sped_bloco_k_company_periodo ON public.sped_bloco_k(company_id, periodo_referencia);
CREATE INDEX IF NOT EXISTS idx_apuracoes_impostos_company_periodo ON public.apuracoes_impostos(company_id, periodo_ano, periodo_mes);
CREATE INDEX IF NOT EXISTS idx_regras_tributacao_company ON public.regras_tributacao(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_obrigacoes_fiscais_company ON public.obrigacoes_fiscais(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_calendario_obrigacoes_vencimento ON public.calendario_obrigacoes(company_id, data_vencimento, status);
CREATE INDEX IF NOT EXISTS idx_simples_nacional_das_periodo ON public.simples_nacional_das(company_id, periodo_ano, periodo_mes);
CREATE INDEX IF NOT EXISTS idx_analise_tributaria_periodo ON public.analise_tributaria(company_id, periodo_ano, periodo_mes);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_fiscal_avancado_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sped_bloco_k_updated_at BEFORE UPDATE ON public.sped_bloco_k
  FOR EACH ROW EXECUTE FUNCTION update_fiscal_avancado_updated_at();

CREATE TRIGGER update_apuracoes_impostos_updated_at BEFORE UPDATE ON public.apuracoes_impostos
  FOR EACH ROW EXECUTE FUNCTION update_fiscal_avancado_updated_at();

CREATE TRIGGER update_regras_tributacao_updated_at BEFORE UPDATE ON public.regras_tributacao
  FOR EACH ROW EXECUTE FUNCTION update_fiscal_avancado_updated_at();

CREATE TRIGGER update_obrigacoes_fiscais_updated_at BEFORE UPDATE ON public.obrigacoes_fiscais
  FOR EACH ROW EXECUTE FUNCTION update_fiscal_avancado_updated_at();

CREATE TRIGGER update_calendario_obrigacoes_updated_at BEFORE UPDATE ON public.calendario_obrigacoes
  FOR EACH ROW EXECUTE FUNCTION update_fiscal_avancado_updated_at();

CREATE TRIGGER update_simples_nacional_das_updated_at BEFORE UPDATE ON public.simples_nacional_das
  FOR EACH ROW EXECUTE FUNCTION update_fiscal_avancado_updated_at();