-- ============================================
-- MÓDULO RH/FOLHA DE PAGAMENTO
-- ============================================

-- 1. DEPARTAMENTOS
CREATE TABLE public.departamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  responsavel_id UUID,
  centro_custo_id UUID REFERENCES public.cost_centers(id),
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CARGOS
CREATE TABLE public.cargos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  nivel INTEGER DEFAULT 1,
  salario_minimo NUMERIC(15,2),
  salario_maximo NUMERIC(15,2),
  cbo VARCHAR(10),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. FUNCIONÁRIOS
CREATE TYPE public.tipo_contrato_rh AS ENUM ('clt', 'pj', 'estagiario', 'temporario', 'autonomo');
CREATE TYPE public.status_funcionario AS ENUM ('ativo', 'ferias', 'afastado', 'demitido', 'suspenso');
CREATE TYPE public.sexo_tipo AS ENUM ('M', 'F', 'O');
CREATE TYPE public.estado_civil_tipo AS ENUM ('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel');

CREATE TABLE public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  matricula VARCHAR(20) NOT NULL,
  nome_completo VARCHAR(200) NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  rg VARCHAR(20),
  data_nascimento DATE,
  sexo public.sexo_tipo,
  estado_civil public.estado_civil_tipo,
  email VARCHAR(200),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  cep VARCHAR(10),
  logradouro VARCHAR(200),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  data_admissao DATE NOT NULL,
  data_demissao DATE,
  cargo_id UUID REFERENCES public.cargos(id),
  departamento_id UUID REFERENCES public.departamentos(id),
  centro_custo_id UUID REFERENCES public.cost_centers(id),
  superior_id UUID REFERENCES public.funcionarios(id),
  tipo_contrato public.tipo_contrato_rh DEFAULT 'clt',
  salario_base NUMERIC(15,2) NOT NULL DEFAULT 0,
  jornada_semanal INTEGER DEFAULT 44,
  banco VARCHAR(50),
  agencia VARCHAR(20),
  conta VARCHAR(30),
  pix_chave VARCHAR(100),
  pix_tipo VARCHAR(20),
  status public.status_funcionario DEFAULT 'ativo',
  foto_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT funcionarios_company_matricula_uk UNIQUE (company_id, matricula)
);

-- Adicionar FK do responsavel após criação da tabela funcionarios
ALTER TABLE public.departamentos 
ADD CONSTRAINT departamentos_responsavel_fk 
FOREIGN KEY (responsavel_id) REFERENCES public.funcionarios(id);

-- 4. RUBRICAS (Códigos de Proventos/Descontos)
CREATE TYPE public.tipo_rubrica AS ENUM ('provento', 'desconto');
CREATE TYPE public.natureza_rubrica AS ENUM ('salarial', 'nao_salarial', 'indenizatoria');

CREATE TABLE public.rubricas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  codigo VARCHAR(10) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  tipo public.tipo_rubrica NOT NULL,
  natureza public.natureza_rubrica DEFAULT 'salarial',
  incide_inss BOOLEAN DEFAULT false,
  incide_fgts BOOLEAN DEFAULT false,
  incide_irrf BOOLEAN DEFAULT false,
  formula_calculo TEXT,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT rubricas_company_codigo_uk UNIQUE (company_id, codigo)
);

-- 5. FOLHAS DE PAGAMENTO
CREATE TYPE public.tipo_folha AS ENUM ('mensal', 'decimo_terceiro', 'ferias', 'rescisao', 'adiantamento');
CREATE TYPE public.status_folha AS ENUM ('rascunho', 'processando', 'processada', 'aprovada', 'paga', 'cancelada');

CREATE TABLE public.folhas_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
  ano_referencia INTEGER NOT NULL CHECK (ano_referencia >= 2000),
  tipo public.tipo_folha DEFAULT 'mensal',
  data_processamento TIMESTAMPTZ,
  data_pagamento DATE,
  status public.status_folha DEFAULT 'rascunho',
  total_proventos NUMERIC(15,2) DEFAULT 0,
  total_descontos NUMERIC(15,2) DEFAULT 0,
  total_liquido NUMERIC(15,2) DEFAULT 0,
  total_encargos NUMERIC(15,2) DEFAULT 0,
  total_fgts NUMERIC(15,2) DEFAULT 0,
  total_inss_empresa NUMERIC(15,2) DEFAULT 0,
  quantidade_funcionarios INTEGER DEFAULT 0,
  criado_por UUID REFERENCES auth.users(id),
  aprovado_por UUID REFERENCES auth.users(id),
  aprovado_em TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT folhas_company_periodo_tipo_uk UNIQUE (company_id, mes_referencia, ano_referencia, tipo)
);

-- 6. ITENS DA FOLHA (Holerites)
CREATE TABLE public.itens_folha (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folha_id UUID NOT NULL REFERENCES public.folhas_pagamento(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id),
  rubrica_id UUID REFERENCES public.rubricas(id),
  tipo public.tipo_rubrica NOT NULL,
  codigo_rubrica VARCHAR(10) NOT NULL,
  descricao VARCHAR(100) NOT NULL,
  referencia NUMERIC(10,2),
  valor NUMERIC(15,2) NOT NULL DEFAULT 0,
  base_calculo NUMERIC(15,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. RESUMO FOLHA POR FUNCIONÁRIO
CREATE TABLE public.folha_funcionario_resumo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folha_id UUID NOT NULL REFERENCES public.folhas_pagamento(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id),
  salario_base NUMERIC(15,2) DEFAULT 0,
  total_proventos NUMERIC(15,2) DEFAULT 0,
  total_descontos NUMERIC(15,2) DEFAULT 0,
  salario_liquido NUMERIC(15,2) DEFAULT 0,
  base_inss NUMERIC(15,2) DEFAULT 0,
  valor_inss NUMERIC(15,2) DEFAULT 0,
  base_irrf NUMERIC(15,2) DEFAULT 0,
  valor_irrf NUMERIC(15,2) DEFAULT 0,
  base_fgts NUMERIC(15,2) DEFAULT 0,
  valor_fgts NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT folha_func_resumo_uk UNIQUE (folha_id, funcionario_id)
);

-- 8. PERÍODOS AQUISITIVOS (Férias)
CREATE TYPE public.status_periodo_aquisitivo AS ENUM ('em_aquisicao', 'adquirido', 'vencido', 'gozado', 'pago');

CREATE TABLE public.periodos_aquisitivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias_direito INTEGER DEFAULT 30,
  dias_gozados INTEGER DEFAULT 0,
  dias_vendidos INTEGER DEFAULT 0,
  status public.status_periodo_aquisitivo DEFAULT 'em_aquisicao',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. FÉRIAS
CREATE TYPE public.status_ferias AS ENUM ('programada', 'solicitada', 'aprovada', 'rejeitada', 'em_gozo', 'concluida', 'cancelada');
CREATE TYPE public.tipo_ferias AS ENUM ('integral', 'parcelada_1', 'parcelada_2', 'parcelada_3', 'abono_pecuniario');

CREATE TABLE public.ferias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  periodo_aquisitivo_id UUID REFERENCES public.periodos_aquisitivos(id),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias INTEGER NOT NULL,
  tipo public.tipo_ferias DEFAULT 'integral',
  abono_pecuniario BOOLEAN DEFAULT false,
  dias_abono INTEGER DEFAULT 0,
  valor_ferias NUMERIC(15,2) DEFAULT 0,
  valor_abono NUMERIC(15,2) DEFAULT 0,
  valor_terco NUMERIC(15,2) DEFAULT 0,
  valor_total NUMERIC(15,2) DEFAULT 0,
  status public.status_ferias DEFAULT 'programada',
  solicitado_em TIMESTAMPTZ,
  aprovado_por UUID REFERENCES auth.users(id),
  aprovado_em TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. REGISTROS DE PONTO
CREATE TABLE public.registros_ponto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  entrada_1 TIME,
  saida_1 TIME,
  entrada_2 TIME,
  saida_2 TIME,
  entrada_3 TIME,
  saida_3 TIME,
  horas_trabalhadas INTERVAL,
  horas_extras INTERVAL,
  horas_falta INTERVAL,
  justificativa TEXT,
  aprovado BOOLEAN DEFAULT false,
  aprovado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT ponto_func_data_uk UNIQUE (funcionario_id, data)
);

-- 11. BANCO DE HORAS
CREATE TABLE public.banco_horas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  saldo_anterior_minutos INTEGER DEFAULT 0,
  creditos_minutos INTEGER DEFAULT 0,
  debitos_minutos INTEGER DEFAULT 0,
  saldo_final_minutos INTEGER DEFAULT 0,
  fechado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT banco_horas_func_periodo_uk UNIQUE (funcionario_id, mes, ano)
);

-- 12. BENEFÍCIOS
CREATE TYPE public.tipo_beneficio AS ENUM ('vale_transporte', 'vale_refeicao', 'vale_alimentacao', 'plano_saude', 'plano_odonto', 'seguro_vida', 'auxilio_creche', 'auxilio_educacao', 'gympass', 'outro');

CREATE TABLE public.beneficios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  tipo public.tipo_beneficio DEFAULT 'outro',
  descricao TEXT,
  valor_padrao NUMERIC(15,2) DEFAULT 0,
  desconto_funcionario_percentual NUMERIC(5,2) DEFAULT 0,
  desconto_funcionario_fixo NUMERIC(15,2) DEFAULT 0,
  fornecedor VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. FUNCIONÁRIO X BENEFÍCIOS
CREATE TABLE public.funcionario_beneficios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  beneficio_id UUID NOT NULL REFERENCES public.beneficios(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  valor_beneficio NUMERIC(15,2) DEFAULT 0,
  valor_desconto NUMERIC(15,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT func_beneficio_uk UNIQUE (funcionario_id, beneficio_id)
);

-- 14. AFASTAMENTOS
CREATE TYPE public.tipo_afastamento AS ENUM ('atestado_medico', 'licenca_maternidade', 'licenca_paternidade', 'acidente_trabalho', 'auxilio_doenca', 'licenca_sem_vencimento', 'suspensao', 'outro');

CREATE TABLE public.afastamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  tipo public.tipo_afastamento NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  dias INTEGER,
  cid VARCHAR(10),
  motivo TEXT,
  documento_url TEXT,
  aprovado BOOLEAN DEFAULT false,
  aprovado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. DEPENDENTES
CREATE TYPE public.tipo_dependente AS ENUM ('conjuge', 'filho', 'enteado', 'pai_mae', 'outro');

CREATE TABLE public.dependentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  cpf VARCHAR(14),
  data_nascimento DATE,
  tipo public.tipo_dependente NOT NULL,
  para_irrf BOOLEAN DEFAULT false,
  para_salario_familia BOOLEAN DEFAULT false,
  para_plano_saude BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. HISTÓRICO SALARIAL
CREATE TABLE public.historico_salarial (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  data_alteracao DATE NOT NULL DEFAULT CURRENT_DATE,
  salario_anterior NUMERIC(15,2),
  salario_novo NUMERIC(15,2) NOT NULL,
  cargo_anterior_id UUID REFERENCES public.cargos(id),
  cargo_novo_id UUID REFERENCES public.cargos(id),
  motivo VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_funcionarios_company ON public.funcionarios(company_id);
CREATE INDEX idx_funcionarios_status ON public.funcionarios(company_id, status);
CREATE INDEX idx_funcionarios_cargo ON public.funcionarios(cargo_id);
CREATE INDEX idx_funcionarios_depto ON public.funcionarios(departamento_id);
CREATE INDEX idx_funcionarios_admissao ON public.funcionarios(data_admissao);
CREATE INDEX idx_folhas_company_periodo ON public.folhas_pagamento(company_id, ano_referencia, mes_referencia);
CREATE INDEX idx_itens_folha_folha ON public.itens_folha(folha_id);
CREATE INDEX idx_itens_folha_func ON public.itens_folha(funcionario_id);
CREATE INDEX idx_ferias_func ON public.ferias(funcionario_id);
CREATE INDEX idx_ferias_periodo ON public.ferias(data_inicio, data_fim);
CREATE INDEX idx_ponto_func_data ON public.registros_ponto(funcionario_id, data);
CREATE INDEX idx_afastamentos_func ON public.afastamentos(funcionario_id);
CREATE INDEX idx_periodos_aquisitivos_func ON public.periodos_aquisitivos(funcionario_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folhas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_folha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folha_funcionario_resumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_aquisitivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banco_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionario_beneficios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afastamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_salarial ENABLE ROW LEVEL SECURITY;

-- Policies para tabelas com company_id direto
CREATE POLICY "departamentos_company_isolation" ON public.departamentos
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "cargos_company_isolation" ON public.cargos
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "funcionarios_company_isolation" ON public.funcionarios
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "rubricas_company_isolation" ON public.rubricas
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "folhas_company_isolation" ON public.folhas_pagamento
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "beneficios_company_isolation" ON public.beneficios
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Policies para tabelas vinculadas a funcionários
CREATE POLICY "itens_folha_isolation" ON public.itens_folha
  FOR ALL USING (folha_id IN (
    SELECT id FROM public.folhas_pagamento WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "folha_resumo_isolation" ON public.folha_funcionario_resumo
  FOR ALL USING (folha_id IN (
    SELECT id FROM public.folhas_pagamento WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "periodos_aquisitivos_isolation" ON public.periodos_aquisitivos
  FOR ALL USING (funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "ferias_isolation" ON public.ferias
  FOR ALL USING (funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "ponto_isolation" ON public.registros_ponto
  FOR ALL USING (funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "banco_horas_isolation" ON public.banco_horas
  FOR ALL USING (funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "func_beneficios_isolation" ON public.funcionario_beneficios
  FOR ALL USING (funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "afastamentos_isolation" ON public.afastamentos
  FOR ALL USING (funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "dependentes_isolation" ON public.dependentes
  FOR ALL USING (funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "historico_salarial_isolation" ON public.historico_salarial
  FOR ALL USING (funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  ));

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION public.update_rh_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_departamentos_updated BEFORE UPDATE ON public.departamentos
FOR EACH ROW EXECUTE FUNCTION public.update_rh_updated_at();

CREATE TRIGGER tr_cargos_updated BEFORE UPDATE ON public.cargos
FOR EACH ROW EXECUTE FUNCTION public.update_rh_updated_at();

CREATE TRIGGER tr_funcionarios_updated BEFORE UPDATE ON public.funcionarios
FOR EACH ROW EXECUTE FUNCTION public.update_rh_updated_at();

CREATE TRIGGER tr_rubricas_updated BEFORE UPDATE ON public.rubricas
FOR EACH ROW EXECUTE FUNCTION public.update_rh_updated_at();

CREATE TRIGGER tr_folhas_updated BEFORE UPDATE ON public.folhas_pagamento
FOR EACH ROW EXECUTE FUNCTION public.update_rh_updated_at();

CREATE TRIGGER tr_ferias_updated BEFORE UPDATE ON public.ferias
FOR EACH ROW EXECUTE FUNCTION public.update_rh_updated_at();

CREATE TRIGGER tr_ponto_updated BEFORE UPDATE ON public.registros_ponto
FOR EACH ROW EXECUTE FUNCTION public.update_rh_updated_at();

CREATE TRIGGER tr_banco_horas_updated BEFORE UPDATE ON public.banco_horas
FOR EACH ROW EXECUTE FUNCTION public.update_rh_updated_at();

CREATE TRIGGER tr_beneficios_updated BEFORE UPDATE ON public.beneficios
FOR EACH ROW EXECUTE FUNCTION public.update_rh_updated_at();

CREATE TRIGGER tr_func_beneficios_updated BEFORE UPDATE ON public.funcionario_beneficios
FOR EACH ROW EXECUTE FUNCTION public.update_rh_updated_at();

CREATE TRIGGER tr_afastamentos_updated BEFORE UPDATE ON public.afastamentos
FOR EACH ROW EXECUTE FUNCTION public.update_rh_updated_at();

-- ============================================
-- FUNÇÃO AUTO-GERAR MATRÍCULA
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_matricula()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := to_char(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(matricula FROM 3) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.funcionarios
  WHERE company_id = NEW.company_id
    AND matricula LIKE year_prefix || '%';
  
  NEW.matricula := year_prefix || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_funcionarios_matricula
BEFORE INSERT ON public.funcionarios
FOR EACH ROW
WHEN (NEW.matricula IS NULL OR NEW.matricula = '')
EXECUTE FUNCTION public.generate_matricula();

-- ============================================
-- FUNÇÃO CRIAR PERÍODO AQUISITIVO NA ADMISSÃO
-- ============================================
CREATE OR REPLACE FUNCTION public.create_periodo_aquisitivo_on_hire()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.periodos_aquisitivos (funcionario_id, data_inicio, data_fim, dias_direito, status)
  VALUES (
    NEW.id,
    NEW.data_admissao,
    NEW.data_admissao + INTERVAL '1 year' - INTERVAL '1 day',
    30,
    'em_aquisicao'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_funcionarios_periodo_aquisitivo
AFTER INSERT ON public.funcionarios
FOR EACH ROW
EXECUTE FUNCTION public.create_periodo_aquisitivo_on_hire();

-- ============================================
-- RUBRICAS PADRÃO (serão inseridas via seed)
-- ============================================
-- Será feito via insert separado após aprovação