
-- ============================================
-- MÓDULO DE CADASTROS - MIGRATION COMPLETA
-- ============================================

-- ============================================
-- 1. FUNÇÃO GENÉRICA PARA GERAR CÓDIGO SEQUENCIAL
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_sequential_code(
  p_table_name TEXT,
  p_prefix TEXT DEFAULT '',
  p_company_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next_code INTEGER;
  v_result TEXT;
BEGIN
  -- Buscar próximo código baseado na tabela e empresa
  EXECUTE format(
    'SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace(codigo, ''[^0-9]'', '''', ''g''), '''') AS INTEGER)), 0) + 1 
     FROM %I WHERE empresa_id = $1',
    p_table_name
  ) INTO v_next_code USING p_company_id;
  
  -- Formatar com zeros à esquerda (6 dígitos)
  v_result := p_prefix || LPAD(v_next_code::TEXT, 6, '0');
  
  RETURN v_result;
END;
$$;

-- ============================================
-- 2. TABELA DE CONDIÇÕES DE PAGAMENTO
-- ============================================
CREATE TABLE IF NOT EXISTS public.condicoes_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  codigo VARCHAR(20) NOT NULL,
  descricao VARCHAR(100) NOT NULL,
  parcelas INTEGER NOT NULL DEFAULT 1,
  dias_entre_parcelas INTEGER NOT NULL DEFAULT 30,
  dias_primeira_parcela INTEGER NOT NULL DEFAULT 0,
  forma_pagamento VARCHAR(30) DEFAULT 'boleto',
  situacao CHAR(1) NOT NULL DEFAULT 'A' CHECK (situacao IN ('A', 'I')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, codigo)
);

ALTER TABLE public.condicoes_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "condicoes_pagamento_select" ON public.condicoes_pagamento
  FOR SELECT USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "condicoes_pagamento_insert" ON public.condicoes_pagamento
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "condicoes_pagamento_update" ON public.condicoes_pagamento
  FOR UPDATE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "condicoes_pagamento_delete" ON public.condicoes_pagamento
  FOR DELETE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_condicoes_pagamento_empresa ON public.condicoes_pagamento(empresa_id);

-- ============================================
-- 3. TABELA DE CLIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Identificação
  codigo VARCHAR(20) NOT NULL,
  tipo_pessoa CHAR(1) NOT NULL DEFAULT 'F' CHECK (tipo_pessoa IN ('F', 'J')),
  cpf_cnpj VARCHAR(14),
  nome_razao VARCHAR(100) NOT NULL,
  nome_fantasia VARCHAR(100),
  
  -- Inscrições
  inscricao_estadual VARCHAR(20),
  inscricao_municipal VARCHAR(20),
  
  -- Contato
  email VARCHAR(255),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  whatsapp VARCHAR(20),
  
  -- Endereço Principal
  cep VARCHAR(8),
  logradouro VARCHAR(200),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf CHAR(2),
  codigo_municipio VARCHAR(10),
  
  -- Comercial
  vendedor_id UUID REFERENCES auth.users(id),
  condicao_pagamento_id UUID REFERENCES public.condicoes_pagamento(id),
  limite_credito DECIMAL(15,2) DEFAULT 0,
  dia_vencimento INTEGER CHECK (dia_vencimento IS NULL OR (dia_vencimento >= 1 AND dia_vencimento <= 31)),
  
  -- Fiscal
  regime_tributario INTEGER CHECK (regime_tributario IS NULL OR regime_tributario IN (1, 2, 3)),
  contribuinte_icms BOOLEAN DEFAULT false,
  consumidor_final BOOLEAN DEFAULT true,
  indicador_ie INTEGER DEFAULT 9 CHECK (indicador_ie IN (1, 2, 9)),
  
  -- Controle
  situacao CHAR(1) NOT NULL DEFAULT 'A' CHECK (situacao IN ('A', 'I', 'B')),
  observacoes TEXT,
  observacoes_internas TEXT,
  tags TEXT[],
  
  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(empresa_id, codigo),
  UNIQUE(empresa_id, cpf_cnpj)
);

-- Índices para clientes
CREATE INDEX idx_clientes_empresa ON public.clientes(empresa_id);
CREATE INDEX idx_clientes_cpf_cnpj ON public.clientes(cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;
CREATE INDEX idx_clientes_situacao_empresa ON public.clientes(situacao, empresa_id);
CREATE INDEX idx_clientes_nome_search ON public.clientes USING gin(to_tsvector('portuguese', nome_razao || ' ' || COALESCE(nome_fantasia, '')));

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select" ON public.clientes
  FOR SELECT USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "clientes_insert" ON public.clientes
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "clientes_update" ON public.clientes
  FOR UPDATE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "clientes_delete" ON public.clientes
  FOR DELETE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

-- Trigger para código automático
CREATE OR REPLACE FUNCTION public.clientes_generate_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := generate_sequential_code('clientes', 'CLI', NEW.empresa_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clientes_codigo
  BEFORE INSERT ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.clientes_generate_codigo();

-- Trigger para updated_at
CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. TABELA DE ENDEREÇOS ADICIONAIS DE CLIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS public.clientes_enderecos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  tipo VARCHAR(20) NOT NULL DEFAULT 'entrega' CHECK (tipo IN ('entrega', 'cobranca', 'comercial', 'outro')),
  descricao VARCHAR(100),
  
  cep VARCHAR(8),
  logradouro VARCHAR(200),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf CHAR(2),
  codigo_municipio VARCHAR(10),
  
  padrao BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_enderecos_cliente ON public.clientes_enderecos(cliente_id);
CREATE INDEX idx_clientes_enderecos_empresa ON public.clientes_enderecos(empresa_id);

ALTER TABLE public.clientes_enderecos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_enderecos_select" ON public.clientes_enderecos
  FOR SELECT USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "clientes_enderecos_insert" ON public.clientes_enderecos
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "clientes_enderecos_update" ON public.clientes_enderecos
  FOR UPDATE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "clientes_enderecos_delete" ON public.clientes_enderecos
  FOR DELETE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

-- ============================================
-- 5. TABELA DE CONTATOS DE CLIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS public.clientes_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  nome VARCHAR(100) NOT NULL,
  cargo VARCHAR(50),
  email VARCHAR(255),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  whatsapp VARCHAR(20),
  principal BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_contatos_cliente ON public.clientes_contatos(cliente_id);
CREATE INDEX idx_clientes_contatos_empresa ON public.clientes_contatos(empresa_id);

ALTER TABLE public.clientes_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_contatos_select" ON public.clientes_contatos
  FOR SELECT USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "clientes_contatos_insert" ON public.clientes_contatos
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "clientes_contatos_update" ON public.clientes_contatos
  FOR UPDATE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "clientes_contatos_delete" ON public.clientes_contatos
  FOR DELETE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

-- ============================================
-- 6. TABELA DE FORNECEDORES
-- ============================================
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Identificação
  codigo VARCHAR(20) NOT NULL,
  tipo_pessoa CHAR(1) NOT NULL DEFAULT 'J' CHECK (tipo_pessoa IN ('F', 'J')),
  cpf_cnpj VARCHAR(14),
  nome_razao VARCHAR(100) NOT NULL,
  nome_fantasia VARCHAR(100),
  
  -- Inscrições
  inscricao_estadual VARCHAR(20),
  inscricao_municipal VARCHAR(20),
  
  -- Contato
  email VARCHAR(255),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  whatsapp VARCHAR(20),
  
  -- Endereço Principal
  cep VARCHAR(8),
  logradouro VARCHAR(200),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf CHAR(2),
  codigo_municipio VARCHAR(10),
  
  -- Comercial
  condicao_pagamento_id UUID REFERENCES public.condicoes_pagamento(id),
  prazo_entrega_dias INTEGER DEFAULT 0,
  
  -- Dados Bancários
  banco VARCHAR(10),
  agencia VARCHAR(10),
  conta VARCHAR(20),
  pix_chave VARCHAR(100),
  pix_tipo VARCHAR(20) CHECK (pix_tipo IS NULL OR pix_tipo IN ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')),
  
  -- Fiscal
  regime_tributario INTEGER CHECK (regime_tributario IS NULL OR regime_tributario IN (1, 2, 3)),
  contribuinte_icms BOOLEAN DEFAULT false,
  indicador_ie INTEGER DEFAULT 9 CHECK (indicador_ie IN (1, 2, 9)),
  
  -- Controle
  situacao CHAR(1) NOT NULL DEFAULT 'A' CHECK (situacao IN ('A', 'I', 'B')),
  observacoes TEXT,
  observacoes_internas TEXT,
  tags TEXT[],
  
  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(empresa_id, codigo),
  UNIQUE(empresa_id, cpf_cnpj)
);

-- Índices para fornecedores
CREATE INDEX idx_fornecedores_empresa ON public.fornecedores(empresa_id);
CREATE INDEX idx_fornecedores_cpf_cnpj ON public.fornecedores(cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;
CREATE INDEX idx_fornecedores_situacao_empresa ON public.fornecedores(situacao, empresa_id);
CREATE INDEX idx_fornecedores_nome_search ON public.fornecedores USING gin(to_tsvector('portuguese', nome_razao || ' ' || COALESCE(nome_fantasia, '')));

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fornecedores_select" ON public.fornecedores
  FOR SELECT USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "fornecedores_insert" ON public.fornecedores
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "fornecedores_update" ON public.fornecedores
  FOR UPDATE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "fornecedores_delete" ON public.fornecedores
  FOR DELETE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

-- Trigger para código automático
CREATE OR REPLACE FUNCTION public.fornecedores_generate_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := generate_sequential_code('fornecedores', 'FOR', NEW.empresa_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fornecedores_codigo
  BEFORE INSERT ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.fornecedores_generate_codigo();

CREATE TRIGGER trg_fornecedores_updated_at
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 7. TABELA DE ENDEREÇOS DE FORNECEDORES
-- ============================================
CREATE TABLE IF NOT EXISTS public.fornecedores_enderecos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  tipo VARCHAR(20) NOT NULL DEFAULT 'comercial' CHECK (tipo IN ('entrega', 'cobranca', 'comercial', 'outro')),
  descricao VARCHAR(100),
  
  cep VARCHAR(8),
  logradouro VARCHAR(200),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf CHAR(2),
  codigo_municipio VARCHAR(10),
  
  padrao BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fornecedores_enderecos_fornecedor ON public.fornecedores_enderecos(fornecedor_id);

ALTER TABLE public.fornecedores_enderecos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fornecedores_enderecos_select" ON public.fornecedores_enderecos
  FOR SELECT USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "fornecedores_enderecos_insert" ON public.fornecedores_enderecos
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "fornecedores_enderecos_update" ON public.fornecedores_enderecos
  FOR UPDATE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "fornecedores_enderecos_delete" ON public.fornecedores_enderecos
  FOR DELETE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

-- ============================================
-- 8. TABELA DE CONTATOS DE FORNECEDORES
-- ============================================
CREATE TABLE IF NOT EXISTS public.fornecedores_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  nome VARCHAR(100) NOT NULL,
  cargo VARCHAR(50),
  email VARCHAR(255),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  whatsapp VARCHAR(20),
  principal BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fornecedores_contatos_fornecedor ON public.fornecedores_contatos(fornecedor_id);

ALTER TABLE public.fornecedores_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fornecedores_contatos_select" ON public.fornecedores_contatos
  FOR SELECT USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "fornecedores_contatos_insert" ON public.fornecedores_contatos
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "fornecedores_contatos_update" ON public.fornecedores_contatos
  FOR UPDATE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "fornecedores_contatos_delete" ON public.fornecedores_contatos
  FOR DELETE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

-- ============================================
-- 9. TABELA DE CATEGORIAS DE PRODUTO (HIERÁRQUICA)
-- ============================================
CREATE TABLE IF NOT EXISTS public.categorias_produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  codigo VARCHAR(20) NOT NULL,
  descricao VARCHAR(100) NOT NULL,
  categoria_pai_id UUID REFERENCES public.categorias_produto(id),
  ordem INTEGER DEFAULT 0,
  nivel INTEGER DEFAULT 1,
  path TEXT,
  
  situacao CHAR(1) NOT NULL DEFAULT 'A' CHECK (situacao IN ('A', 'I')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(empresa_id, codigo)
);

CREATE INDEX idx_categorias_produto_empresa ON public.categorias_produto(empresa_id);
CREATE INDEX idx_categorias_produto_pai ON public.categorias_produto(categoria_pai_id);

ALTER TABLE public.categorias_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_produto_select" ON public.categorias_produto
  FOR SELECT USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "categorias_produto_insert" ON public.categorias_produto
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "categorias_produto_update" ON public.categorias_produto
  FOR UPDATE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "categorias_produto_delete" ON public.categorias_produto
  FOR DELETE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

-- Trigger para código e hierarquia
CREATE OR REPLACE FUNCTION public.categorias_produto_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := generate_sequential_code('categorias_produto', 'CAT', NEW.empresa_id);
  END IF;
  
  IF NEW.categoria_pai_id IS NOT NULL THEN
    SELECT nivel + 1, path || '/' || NEW.id::text
    INTO NEW.nivel, NEW.path
    FROM categorias_produto WHERE id = NEW.categoria_pai_id;
  ELSE
    NEW.nivel := 1;
    NEW.path := '/' || NEW.id::text;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_categorias_produto_before_insert
  BEFORE INSERT ON public.categorias_produto
  FOR EACH ROW
  EXECUTE FUNCTION public.categorias_produto_before_insert();

CREATE TRIGGER trg_categorias_produto_updated_at
  BEFORE UPDATE ON public.categorias_produto
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 10. TABELA DE MARCAS
-- ============================================
CREATE TABLE IF NOT EXISTS public.marcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  codigo VARCHAR(20) NOT NULL,
  descricao VARCHAR(100) NOT NULL,
  logo_url TEXT,
  
  situacao CHAR(1) NOT NULL DEFAULT 'A' CHECK (situacao IN ('A', 'I')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(empresa_id, codigo)
);

CREATE INDEX idx_marcas_empresa ON public.marcas(empresa_id);

ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marcas_select" ON public.marcas
  FOR SELECT USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "marcas_insert" ON public.marcas
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "marcas_update" ON public.marcas
  FOR UPDATE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "marcas_delete" ON public.marcas
  FOR DELETE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

-- Trigger para código automático
CREATE OR REPLACE FUNCTION public.marcas_generate_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := generate_sequential_code('marcas', 'MRC', NEW.empresa_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_marcas_codigo
  BEFORE INSERT ON public.marcas
  FOR EACH ROW
  EXECUTE FUNCTION public.marcas_generate_codigo();

CREATE TRIGGER trg_marcas_updated_at
  BEFORE UPDATE ON public.marcas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 11. TABELA DE PRODUTOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Identificação
  codigo VARCHAR(20) NOT NULL,
  ean VARCHAR(14),
  referencia VARCHAR(50),
  descricao VARCHAR(100) NOT NULL,
  descricao_completa TEXT,
  tipo CHAR(1) NOT NULL DEFAULT 'P' CHECK (tipo IN ('P', 'S', 'M')), -- Produto, Serviço, Matéria-prima
  unidade VARCHAR(6) NOT NULL DEFAULT 'UN',
  
  -- Valores
  preco_venda DECIMAL(15,4) DEFAULT 0,
  preco_custo DECIMAL(15,4) DEFAULT 0,
  markup_percentual DECIMAL(8,4) DEFAULT 0,
  margem_lucro DECIMAL(5,2) DEFAULT 0,
  
  -- Estoque
  controla_estoque BOOLEAN DEFAULT true,
  estoque_minimo DECIMAL(15,4) DEFAULT 0,
  estoque_maximo DECIMAL(15,4) DEFAULT 0,
  localizacao VARCHAR(50),
  peso_bruto DECIMAL(15,4) DEFAULT 0,
  peso_liquido DECIMAL(15,4) DEFAULT 0,
  
  -- Fiscal
  ncm VARCHAR(8),
  cest VARCHAR(7),
  origem INTEGER DEFAULT 0 CHECK (origem >= 0 AND origem <= 8),
  cfop_padrao VARCHAR(4),
  
  -- Impostos
  aliquota_icms DECIMAL(5,2) DEFAULT 0,
  aliquota_pis DECIMAL(5,2) DEFAULT 0,
  aliquota_cofins DECIMAL(5,2) DEFAULT 0,
  aliquota_ipi DECIMAL(5,2) DEFAULT 0,
  aliquota_iss DECIMAL(5,2) DEFAULT 0,
  cst_icms VARCHAR(3),
  cst_pis VARCHAR(2),
  cst_cofins VARCHAR(2),
  cst_ipi VARCHAR(2),
  
  -- Serviços
  codigo_servico VARCHAR(10),
  item_lista_servico VARCHAR(10),
  
  -- Organização
  categoria_id UUID REFERENCES public.categorias_produto(id),
  marca_id UUID REFERENCES public.marcas(id),
  fornecedor_padrao_id UUID REFERENCES public.fornecedores(id),
  imagem_url TEXT,
  imagens_adicionais TEXT[],
  
  -- Controle
  situacao CHAR(1) NOT NULL DEFAULT 'A' CHECK (situacao IN ('A', 'I')),
  destaque BOOLEAN DEFAULT false,
  observacoes TEXT,
  tags TEXT[],
  
  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(empresa_id, codigo),
  UNIQUE(empresa_id, ean)
);

-- Índices para produtos
CREATE INDEX idx_produtos_empresa ON public.produtos(empresa_id);
CREATE INDEX idx_produtos_codigo ON public.produtos(codigo);
CREATE INDEX idx_produtos_ean ON public.produtos(ean) WHERE ean IS NOT NULL;
CREATE INDEX idx_produtos_tipo_situacao_empresa ON public.produtos(tipo, situacao, empresa_id);
CREATE INDEX idx_produtos_categoria ON public.produtos(categoria_id);
CREATE INDEX idx_produtos_marca ON public.produtos(marca_id);
CREATE INDEX idx_produtos_descricao_search ON public.produtos USING gin(to_tsvector('portuguese', descricao || ' ' || COALESCE(descricao_completa, '')));

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produtos_select" ON public.produtos
  FOR SELECT USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "produtos_insert" ON public.produtos
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "produtos_update" ON public.produtos
  FOR UPDATE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "produtos_delete" ON public.produtos
  FOR DELETE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

-- Trigger para código automático e markup
CREATE OR REPLACE FUNCTION public.produtos_before_save()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.codigo IS NULL OR NEW.codigo = '') THEN
    NEW.codigo := generate_sequential_code('produtos', 'PRD', NEW.empresa_id);
  END IF;
  
  -- Calcular markup e margem automaticamente
  IF NEW.preco_custo > 0 AND NEW.preco_venda > 0 THEN
    NEW.markup_percentual := ((NEW.preco_venda - NEW.preco_custo) / NEW.preco_custo) * 100;
    NEW.margem_lucro := ((NEW.preco_venda - NEW.preco_custo) / NEW.preco_venda) * 100;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_produtos_before_save
  BEFORE INSERT OR UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.produtos_before_save();

CREATE TRIGGER trg_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 12. TABELA DE VARIAÇÕES DE PRODUTOS (GRADES)
-- ============================================
CREATE TABLE IF NOT EXISTS public.produtos_variacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  codigo VARCHAR(20) NOT NULL,
  ean VARCHAR(14),
  descricao_variacao VARCHAR(100) NOT NULL,
  atributos JSONB DEFAULT '{}',
  
  preco_venda DECIMAL(15,4) DEFAULT 0,
  preco_custo DECIMAL(15,4) DEFAULT 0,
  
  imagem_url TEXT,
  
  situacao CHAR(1) NOT NULL DEFAULT 'A' CHECK (situacao IN ('A', 'I')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(empresa_id, codigo)
);

CREATE INDEX idx_produtos_variacoes_produto ON public.produtos_variacoes(produto_id);
CREATE INDEX idx_produtos_variacoes_empresa ON public.produtos_variacoes(empresa_id);
CREATE INDEX idx_produtos_variacoes_ean ON public.produtos_variacoes(ean) WHERE ean IS NOT NULL;

ALTER TABLE public.produtos_variacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produtos_variacoes_select" ON public.produtos_variacoes
  FOR SELECT USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "produtos_variacoes_insert" ON public.produtos_variacoes
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "produtos_variacoes_update" ON public.produtos_variacoes
  FOR UPDATE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "produtos_variacoes_delete" ON public.produtos_variacoes
  FOR DELETE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

-- Trigger para código automático
CREATE OR REPLACE FUNCTION public.produtos_variacoes_generate_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_produto_codigo VARCHAR(20);
  v_seq INTEGER;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT codigo INTO v_produto_codigo FROM produtos WHERE id = NEW.produto_id;
    SELECT COUNT(*) + 1 INTO v_seq FROM produtos_variacoes WHERE produto_id = NEW.produto_id;
    NEW.codigo := v_produto_codigo || '-V' || LPAD(v_seq::TEXT, 2, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_produtos_variacoes_codigo
  BEFORE INSERT ON public.produtos_variacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.produtos_variacoes_generate_codigo();

CREATE TRIGGER trg_produtos_variacoes_updated_at
  BEFORE UPDATE ON public.produtos_variacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 13. TABELA DE UNIDADES DE MEDIDA
-- ============================================
CREATE TABLE IF NOT EXISTS public.unidades_medida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  codigo VARCHAR(6) NOT NULL,
  descricao VARCHAR(50) NOT NULL,
  
  situacao CHAR(1) NOT NULL DEFAULT 'A' CHECK (situacao IN ('A', 'I')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(empresa_id, codigo)
);

ALTER TABLE public.unidades_medida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "unidades_medida_select" ON public.unidades_medida
  FOR SELECT USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "unidades_medida_insert" ON public.unidades_medida
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "unidades_medida_update" ON public.unidades_medida
  FOR UPDATE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "unidades_medida_delete" ON public.unidades_medida
  FOR DELETE USING (empresa_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

-- Inserir unidades padrão (serão inseridas por empresa quando necessário)
-- Isso pode ser feito via seed ou trigger de criação de empresa
