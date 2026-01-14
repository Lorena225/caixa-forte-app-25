-- =====================================================
-- MÓDULO FISCAL - Emissão de Notas Fiscais Eletrônicas
-- =====================================================

-- 1. CERTIFICADOS_DIGITAIS
CREATE TABLE public.certificados_digitais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo VARCHAR(2) NOT NULL CHECK (tipo IN ('A1', 'A3')),
  arquivo_pfx TEXT, -- base64
  senha_criptografada TEXT,
  nome_titular VARCHAR(100),
  cpf_cnpj VARCHAR(14),
  validade_inicio DATE,
  validade_fim DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'expirado', 'revogado')),
  caminho_arquivo VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_certificados_digitais_empresa ON public.certificados_digitais(empresa_id);
CREATE INDEX idx_certificados_digitais_status ON public.certificados_digitais(status);
CREATE INDEX idx_certificados_digitais_validade ON public.certificados_digitais(validade_fim);

CREATE TRIGGER trg_certificados_digitais_updated_at
  BEFORE UPDATE ON public.certificados_digitais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. NOTAS_FISCAIS - Principal
CREATE TABLE public.notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Tipo e modelo
  tipo_nota VARCHAR(4) NOT NULL CHECK (tipo_nota IN ('NFE', 'NFSE', 'NFCE')),
  modelo VARCHAR(2), -- 55 NFe, 65 NFCe
  
  -- Números
  numero INTEGER NOT NULL,
  serie VARCHAR(3) NOT NULL,
  chave_acesso VARCHAR(44) UNIQUE,
  
  -- Relacionamentos
  venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.counterparties(id) ON DELETE SET NULL,
  destinatario_nome VARCHAR(100),
  destinatario_cpf_cnpj VARCHAR(14),
  
  -- Datas
  data_emissao TIMESTAMPTZ,
  data_saida TIMESTAMPTZ,
  hora_emissao TIME,
  hora_saida TIME,
  
  -- Valores
  valor_produtos DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_frete DECIMAL(15,2) DEFAULT 0,
  valor_seguro DECIMAL(15,2) DEFAULT 0,
  valor_outras DECIMAL(15,2) DEFAULT 0,
  valor_ipi DECIMAL(15,2) DEFAULT 0,
  valor_icms DECIMAL(15,2) DEFAULT 0,
  valor_pis DECIMAL(15,2) DEFAULT 0,
  valor_cofins DECIMAL(15,2) DEFAULT 0,
  valor_iss DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) NOT NULL,
  
  -- Fiscal
  natureza_operacao VARCHAR(60),
  cfop VARCHAR(4),
  finalidade INTEGER CHECK (finalidade BETWEEN 1 AND 4), -- 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  tipo_operacao INTEGER CHECK (tipo_operacao IN (0, 1)), -- 0=Entrada, 1=Saída
  
  -- Status SEFAZ
  situacao VARCHAR(20) NOT NULL DEFAULT 'digitacao' CHECK (situacao IN ('digitacao', 'transmitida', 'autorizada', 'cancelada', 'denegada', 'rejeitada')),
  status_sefaz VARCHAR(10),
  motivo_rejeicao TEXT,
  protocolo_autorizacao VARCHAR(20),
  data_autorizacao TIMESTAMPTZ,
  
  -- XMLs
  xml_envio TEXT,
  xml_retorno TEXT,
  xml_autorizado TEXT,
  xml_cancelamento TEXT,
  
  -- DANFE
  danfe_url VARCHAR(255),
  danfe_gerado BOOLEAN DEFAULT false,
  
  -- Observações
  informacoes_complementares TEXT,
  informacoes_fisco TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(empresa_id, serie, numero)
);

CREATE UNIQUE INDEX idx_notas_fiscais_chave ON public.notas_fiscais(chave_acesso) WHERE chave_acesso IS NOT NULL;
CREATE INDEX idx_notas_fiscais_empresa ON public.notas_fiscais(empresa_id);
CREATE INDEX idx_notas_fiscais_venda ON public.notas_fiscais(venda_id);
CREATE INDEX idx_notas_fiscais_cliente ON public.notas_fiscais(cliente_id);
CREATE INDEX idx_notas_fiscais_data ON public.notas_fiscais(data_emissao DESC);
CREATE INDEX idx_notas_fiscais_situacao ON public.notas_fiscais(situacao);
CREATE INDEX idx_notas_fiscais_tipo ON public.notas_fiscais(tipo_nota);
CREATE INDEX idx_notas_fiscais_numero_serie ON public.notas_fiscais(empresa_id, serie, numero);

CREATE TRIGGER trg_notas_fiscais_updated_at
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. NOTAS_FISCAIS_ITENS
CREATE TABLE public.notas_fiscais_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id UUID NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  
  -- Produto
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  codigo VARCHAR(20),
  descricao VARCHAR(100) NOT NULL,
  
  -- Quantidades
  quantidade DECIMAL(15,4) NOT NULL,
  unidade VARCHAR(6),
  
  -- Valores
  valor_unitario DECIMAL(15,4) NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  
  -- Fiscal básico
  cfop VARCHAR(4),
  ncm VARCHAR(8),
  cest VARCHAR(7),
  origem INTEGER,
  
  -- ICMS
  cst_icms VARCHAR(3),
  modalidade_bc INTEGER,
  reducao_bc DECIMAL(5,2),
  base_calculo_icms DECIMAL(15,2),
  aliquota_icms DECIMAL(5,2),
  valor_icms DECIMAL(15,2),
  
  -- IPI
  cst_ipi VARCHAR(2),
  classe_enquadramento VARCHAR(5),
  codigo_enquadramento VARCHAR(3),
  base_calculo_ipi DECIMAL(15,2),
  aliquota_ipi DECIMAL(5,2),
  valor_ipi DECIMAL(15,2),
  
  -- PIS
  cst_pis VARCHAR(2),
  base_calculo_pis DECIMAL(15,2),
  aliquota_pis DECIMAL(5,2),
  valor_pis DECIMAL(15,2),
  
  -- COFINS
  cst_cofins VARCHAR(2),
  base_calculo_cofins DECIMAL(15,2),
  aliquota_cofins DECIMAL(5,2),
  valor_cofins DECIMAL(15,2),
  
  -- ISS
  aliquota_iss DECIMAL(5,2),
  valor_iss DECIMAL(15,2),
  codigo_servico VARCHAR(10),
  item_lista_servico VARCHAR(10),
  
  informacoes_adicionais TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notas_fiscais_itens_nota ON public.notas_fiscais_itens(nota_fiscal_id);
CREATE INDEX idx_notas_fiscais_itens_produto ON public.notas_fiscais_itens(produto_id);

-- 4. NOTAS_FISCAIS_EVENTOS
CREATE TABLE public.notas_fiscais_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id UUID NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  
  tipo_evento VARCHAR(30) NOT NULL CHECK (tipo_evento IN ('cancelamento', 'carta_correcao', 'manifestacao')),
  sequencial INTEGER,
  data_evento TIMESTAMPTZ NOT NULL,
  protocolo VARCHAR(20),
  justificativa TEXT,
  correcao TEXT,
  
  status VARCHAR(20),
  xml_evento TEXT,
  xml_retorno TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_notas_fiscais_eventos_nota ON public.notas_fiscais_eventos(nota_fiscal_id);
CREATE INDEX idx_notas_fiscais_eventos_tipo ON public.notas_fiscais_eventos(tipo_evento);

-- 5. PARAMETROS_FISCAIS
CREATE TABLE public.parametros_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  uf VARCHAR(2) NOT NULL,
  
  -- NFe
  serie_nfe VARCHAR(3) DEFAULT '1',
  ultimo_numero_nfe INTEGER DEFAULT 0,
  ambiente INTEGER DEFAULT 2 CHECK (ambiente IN (1, 2)), -- 1=Produção, 2=Homologação
  email_destinatario VARCHAR(100),
  
  -- NFSe
  serie_nfse VARCHAR(3) DEFAULT '1',
  ultimo_numero_nfse INTEGER DEFAULT 0,
  codigo_municipio VARCHAR(7),
  inscricao_municipal VARCHAR(20),
  usuario_ws VARCHAR(100),
  senha_ws TEXT,
  
  -- NFCe
  serie_nfce VARCHAR(3) DEFAULT '1',
  ultimo_numero_nfce INTEGER DEFAULT 0,
  token_csc VARCHAR(50),
  id_csc VARCHAR(10),
  
  certificado_digital_id UUID REFERENCES public.certificados_digitais(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_parametros_fiscais_updated_at
  BEFORE UPDATE ON public.parametros_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. IMPOSTOS_CONFIGURACAO - Matriz tributária
CREATE TABLE public.impostos_configuracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  uf_origem VARCHAR(2),
  uf_destino VARCHAR(2),
  regime_tributario INTEGER, -- 1=Simples, 2=SN Excesso, 3=Lucro Presumido, 4=Lucro Real
  tipo_operacao VARCHAR(20) CHECK (tipo_operacao IN ('venda', 'compra')),
  cfop VARCHAR(4),
  
  -- ICMS
  aliquota_interna DECIMAL(5,2),
  aliquota_interestadual DECIMAL(5,2),
  reducao_base DECIMAL(5,2),
  modalidade_bc INTEGER,
  
  -- PIS/COFINS
  cst_pis VARCHAR(2),
  aliquota_pis DECIMAL(5,2),
  cst_cofins VARCHAR(2),
  aliquota_cofins DECIMAL(5,2),
  
  -- IPI
  cst_ipi VARCHAR(2),
  aliquota_ipi DECIMAL(5,2),
  
  -- ISS
  aliquota_iss DECIMAL(5,2),
  retencao BOOLEAN DEFAULT false,
  
  vigencia_inicio DATE,
  vigencia_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_impostos_config_empresa ON public.impostos_configuracao(empresa_id);
CREATE INDEX idx_impostos_config_busca ON public.impostos_configuracao(empresa_id, uf_origem, uf_destino, cfop, vigencia_inicio, vigencia_fim);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- 1. Calcular impostos automaticamente
CREATE OR REPLACE FUNCTION public.calcular_impostos_nfe(
  p_empresa_id UUID,
  p_uf_origem VARCHAR(2),
  p_uf_destino VARCHAR(2),
  p_cfop VARCHAR(4),
  p_valor_base DECIMAL(15,2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_config RECORD;
  v_result JSONB;
  v_icms DECIMAL(15,2) := 0;
  v_pis DECIMAL(15,2) := 0;
  v_cofins DECIMAL(15,2) := 0;
  v_ipi DECIMAL(15,2) := 0;
  v_aliquota_icms DECIMAL(5,2);
BEGIN
  -- Buscar configuração vigente
  SELECT * INTO v_config
  FROM impostos_configuracao
  WHERE empresa_id = p_empresa_id
    AND (uf_origem = p_uf_origem OR uf_origem IS NULL)
    AND (uf_destino = p_uf_destino OR uf_destino IS NULL)
    AND (cfop = p_cfop OR cfop IS NULL)
    AND (vigencia_inicio IS NULL OR vigencia_inicio <= CURRENT_DATE)
    AND (vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE)
  ORDER BY 
    CASE WHEN uf_origem IS NOT NULL THEN 0 ELSE 1 END,
    CASE WHEN uf_destino IS NOT NULL THEN 0 ELSE 1 END,
    CASE WHEN cfop IS NOT NULL THEN 0 ELSE 1 END
  LIMIT 1;
  
  IF FOUND THEN
    -- Determinar alíquota ICMS (interna ou interestadual)
    IF p_uf_origem = p_uf_destino THEN
      v_aliquota_icms := COALESCE(v_config.aliquota_interna, 0);
    ELSE
      v_aliquota_icms := COALESCE(v_config.aliquota_interestadual, 0);
    END IF;
    
    -- Calcular base com redução
    IF v_config.reducao_base IS NOT NULL AND v_config.reducao_base > 0 THEN
      v_icms := ROUND(p_valor_base * (1 - v_config.reducao_base / 100) * v_aliquota_icms / 100, 2);
    ELSE
      v_icms := ROUND(p_valor_base * v_aliquota_icms / 100, 2);
    END IF;
    
    v_pis := ROUND(p_valor_base * COALESCE(v_config.aliquota_pis, 0) / 100, 2);
    v_cofins := ROUND(p_valor_base * COALESCE(v_config.aliquota_cofins, 0) / 100, 2);
    v_ipi := ROUND(p_valor_base * COALESCE(v_config.aliquota_ipi, 0) / 100, 2);
    
    v_result := jsonb_build_object(
      'icms', v_icms,
      'aliquota_icms', v_aliquota_icms,
      'reducao_base', v_config.reducao_base,
      'cst_icms', '00',
      'pis', v_pis,
      'aliquota_pis', v_config.aliquota_pis,
      'cst_pis', v_config.cst_pis,
      'cofins', v_cofins,
      'aliquota_cofins', v_config.aliquota_cofins,
      'cst_cofins', v_config.cst_cofins,
      'ipi', v_ipi,
      'aliquota_ipi', v_config.aliquota_ipi,
      'cst_ipi', v_config.cst_ipi
    );
  ELSE
    v_result := jsonb_build_object(
      'icms', 0, 'pis', 0, 'cofins', 0, 'ipi', 0,
      'warning', 'Configuração tributária não encontrada'
    );
  END IF;
  
  RETURN v_result;
END;
$$;

-- 2. Gerar chave de acesso NFe (44 dígitos)
CREATE OR REPLACE FUNCTION public.gerar_chave_acesso_nfe(
  p_uf VARCHAR(2),
  p_ano_mes VARCHAR(4), -- AAMM
  p_cnpj VARCHAR(14),
  p_modelo VARCHAR(2),
  p_serie VARCHAR(3),
  p_numero INTEGER,
  p_tipo_emissao INTEGER DEFAULT 1,
  p_codigo_numerico INTEGER DEFAULT NULL
)
RETURNS VARCHAR(44)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uf_codigo VARCHAR(2);
  v_codigo_numerico VARCHAR(8);
  v_chave VARCHAR(43);
  v_dv INTEGER;
  v_soma INTEGER := 0;
  v_peso INTEGER := 2;
  i INTEGER;
BEGIN
  -- Código UF
  v_uf_codigo := CASE p_uf
    WHEN 'AC' THEN '12' WHEN 'AL' THEN '27' WHEN 'AP' THEN '16' WHEN 'AM' THEN '13'
    WHEN 'BA' THEN '29' WHEN 'CE' THEN '23' WHEN 'DF' THEN '53' WHEN 'ES' THEN '32'
    WHEN 'GO' THEN '52' WHEN 'MA' THEN '21' WHEN 'MT' THEN '51' WHEN 'MS' THEN '50'
    WHEN 'MG' THEN '31' WHEN 'PA' THEN '15' WHEN 'PB' THEN '25' WHEN 'PR' THEN '41'
    WHEN 'PE' THEN '26' WHEN 'PI' THEN '22' WHEN 'RJ' THEN '33' WHEN 'RN' THEN '24'
    WHEN 'RS' THEN '43' WHEN 'RO' THEN '11' WHEN 'RR' THEN '14' WHEN 'SC' THEN '42'
    WHEN 'SP' THEN '35' WHEN 'SE' THEN '28' WHEN 'TO' THEN '17'
    ELSE '00'
  END;
  
  -- Código numérico aleatório
  IF p_codigo_numerico IS NULL THEN
    v_codigo_numerico := LPAD(FLOOR(RANDOM() * 99999999)::TEXT, 8, '0');
  ELSE
    v_codigo_numerico := LPAD(p_codigo_numerico::TEXT, 8, '0');
  END IF;
  
  -- Montar chave sem DV
  v_chave := v_uf_codigo || p_ano_mes || p_cnpj || p_modelo || 
             LPAD(p_serie, 3, '0') || LPAD(p_numero::TEXT, 9, '0') || 
             p_tipo_emissao::TEXT || v_codigo_numerico;
  
  -- Calcular DV (módulo 11)
  FOR i IN REVERSE 43..1 LOOP
    v_soma := v_soma + (SUBSTRING(v_chave FROM i FOR 1)::INTEGER * v_peso);
    v_peso := v_peso + 1;
    IF v_peso > 9 THEN v_peso := 2; END IF;
  END LOOP;
  
  v_dv := 11 - (v_soma % 11);
  IF v_dv >= 10 THEN v_dv := 0; END IF;
  
  RETURN v_chave || v_dv::TEXT;
END;
$$;

-- 3. Gerar próximo número de nota por série
CREATE OR REPLACE FUNCTION public.gerar_proximo_numero_nfe(
  p_empresa_id UUID,
  p_tipo_nota VARCHAR(4),
  p_serie VARCHAR(3)
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_proximo INTEGER;
  v_campo_serie TEXT;
  v_campo_numero TEXT;
BEGIN
  -- Determinar campos baseado no tipo
  CASE p_tipo_nota
    WHEN 'NFE' THEN
      v_campo_serie := 'serie_nfe';
      v_campo_numero := 'ultimo_numero_nfe';
    WHEN 'NFSE' THEN
      v_campo_serie := 'serie_nfse';
      v_campo_numero := 'ultimo_numero_nfse';
    WHEN 'NFCE' THEN
      v_campo_serie := 'serie_nfce';
      v_campo_numero := 'ultimo_numero_nfce';
    ELSE
      RAISE EXCEPTION 'Tipo de nota inválido: %', p_tipo_nota;
  END CASE;
  
  -- Obter e incrementar número atômico
  UPDATE parametros_fiscais
  SET 
    ultimo_numero_nfe = CASE WHEN p_tipo_nota = 'NFE' THEN ultimo_numero_nfe + 1 ELSE ultimo_numero_nfe END,
    ultimo_numero_nfse = CASE WHEN p_tipo_nota = 'NFSE' THEN ultimo_numero_nfse + 1 ELSE ultimo_numero_nfse END,
    ultimo_numero_nfce = CASE WHEN p_tipo_nota = 'NFCE' THEN ultimo_numero_nfce + 1 ELSE ultimo_numero_nfce END,
    updated_at = now()
  WHERE empresa_id = p_empresa_id
  RETURNING 
    CASE p_tipo_nota
      WHEN 'NFE' THEN ultimo_numero_nfe
      WHEN 'NFSE' THEN ultimo_numero_nfse
      WHEN 'NFCE' THEN ultimo_numero_nfce
    END INTO v_proximo;
  
  IF NOT FOUND THEN
    -- Criar parâmetros se não existir
    INSERT INTO parametros_fiscais (empresa_id, uf, ultimo_numero_nfe, ultimo_numero_nfse, ultimo_numero_nfce)
    VALUES (p_empresa_id, 'SP', 
      CASE WHEN p_tipo_nota = 'NFE' THEN 1 ELSE 0 END,
      CASE WHEN p_tipo_nota = 'NFSE' THEN 1 ELSE 0 END,
      CASE WHEN p_tipo_nota = 'NFCE' THEN 1 ELSE 0 END
    )
    RETURNING 
      CASE p_tipo_nota
        WHEN 'NFE' THEN ultimo_numero_nfe
        WHEN 'NFSE' THEN ultimo_numero_nfse
        WHEN 'NFCE' THEN ultimo_numero_nfce
      END INTO v_proximo;
  END IF;
  
  RETURN v_proximo;
END;
$$;

-- 4. Validar estrutura XML (básica)
CREATE OR REPLACE FUNCTION public.validar_xml_nfe(p_xml TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Validações básicas de estrutura
  IF p_xml IS NULL OR p_xml = '' THEN
    v_errors := array_append(v_errors, 'XML vazio ou nulo');
  END IF;
  
  IF p_xml NOT LIKE '%<NFe%' AND p_xml NOT LIKE '%<nfe%' THEN
    v_errors := array_append(v_errors, 'Tag NFe não encontrada');
  END IF;
  
  IF p_xml NOT LIKE '%<infNFe%' THEN
    v_errors := array_append(v_errors, 'Tag infNFe não encontrada');
  END IF;
  
  IF p_xml NOT LIKE '%<ide>%' THEN
    v_errors := array_append(v_errors, 'Tag ide (identificação) não encontrada');
  END IF;
  
  IF p_xml NOT LIKE '%<emit>%' THEN
    v_errors := array_append(v_errors, 'Tag emit (emitente) não encontrada');
  END IF;
  
  IF p_xml NOT LIKE '%<det%' THEN
    v_errors := array_append(v_errors, 'Nenhum item (det) encontrado');
  END IF;
  
  IF array_length(v_errors, 1) > 0 THEN
    RETURN jsonb_build_object('valid', false, 'errors', v_errors);
  END IF;
  
  RETURN jsonb_build_object('valid', true, 'errors', ARRAY[]::TEXT[]);
END;
$$;

-- 5. Atualizar status nota após retorno SEFAZ
CREATE OR REPLACE FUNCTION public.atualizar_status_nfe_sefaz(
  p_nota_id UUID,
  p_status_sefaz VARCHAR(10),
  p_protocolo VARCHAR(20),
  p_motivo TEXT DEFAULT NULL,
  p_xml_retorno TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_situacao VARCHAR(20);
  v_nota RECORD;
BEGIN
  -- Mapear código SEFAZ para situação
  v_situacao := CASE 
    WHEN p_status_sefaz = '100' THEN 'autorizada'
    WHEN p_status_sefaz = '101' THEN 'cancelada'
    WHEN p_status_sefaz = '110' THEN 'denegada'
    WHEN p_status_sefaz IN ('301', '302', '303') THEN 'denegada'
    WHEN p_status_sefaz::INTEGER BETWEEN 200 AND 299 THEN 'rejeitada'
    ELSE 'rejeitada'
  END;
  
  -- Buscar nota
  SELECT * INTO v_nota FROM notas_fiscais WHERE id = p_nota_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nota fiscal não encontrada: %', p_nota_id;
  END IF;
  
  -- Atualizar nota
  UPDATE notas_fiscais
  SET 
    situacao = v_situacao,
    status_sefaz = p_status_sefaz,
    protocolo_autorizacao = CASE WHEN v_situacao = 'autorizada' THEN p_protocolo ELSE protocolo_autorizacao END,
    data_autorizacao = CASE WHEN v_situacao = 'autorizada' THEN now() ELSE data_autorizacao END,
    motivo_rejeicao = CASE WHEN v_situacao IN ('rejeitada', 'denegada') THEN p_motivo ELSE motivo_rejeicao END,
    xml_retorno = COALESCE(p_xml_retorno, xml_retorno),
    xml_autorizado = CASE WHEN v_situacao = 'autorizada' THEN COALESCE(p_xml_retorno, xml_autorizado) ELSE xml_autorizado END,
    updated_at = now()
  WHERE id = p_nota_id;
  
  -- Atualizar venda se autorizada
  IF v_situacao = 'autorizada' AND v_nota.venda_id IS NOT NULL THEN
    UPDATE vendas
    SET 
      nfe_id = p_nota_id,
      nfe_chave = v_nota.chave_acesso,
      updated_at = now()
    WHERE id = v_nota.venda_id;
  END IF;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- 1. Gerar número sequencial automático por série
CREATE OR REPLACE FUNCTION public.trg_notas_fiscais_gerar_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Gerar número se não fornecido
  IF NEW.numero IS NULL OR NEW.numero = 0 THEN
    NEW.numero := gerar_proximo_numero_nfe(NEW.empresa_id, NEW.tipo_nota, NEW.serie);
  END IF;
  
  -- Definir modelo baseado no tipo
  IF NEW.modelo IS NULL THEN
    NEW.modelo := CASE NEW.tipo_nota
      WHEN 'NFE' THEN '55'
      WHEN 'NFCE' THEN '65'
      ELSE NULL
    END;
  END IF;
  
  -- Definir data emissão se não fornecida
  IF NEW.data_emissao IS NULL THEN
    NEW.data_emissao := now();
  END IF;
  
  -- Definir hora emissão
  IF NEW.hora_emissao IS NULL THEN
    NEW.hora_emissao := CURRENT_TIME;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notas_fiscais_numero
  BEFORE INSERT ON public.notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.trg_notas_fiscais_gerar_numero();

-- 2. Impedir alteração de nota autorizada
CREATE OR REPLACE FUNCTION public.trg_notas_fiscais_proteger_autorizada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Permitir apenas mudanças de status específicas
  IF OLD.situacao = 'autorizada' THEN
    -- Permitir apenas cancelamento ou atualização de campos não críticos
    IF NEW.situacao NOT IN ('autorizada', 'cancelada') THEN
      RAISE EXCEPTION 'Não é possível alterar o status de uma nota autorizada para %', NEW.situacao;
    END IF;
    
    -- Bloquear alteração de valores
    IF OLD.valor_total IS DISTINCT FROM NEW.valor_total OR
       OLD.numero IS DISTINCT FROM NEW.numero OR
       OLD.serie IS DISTINCT FROM NEW.serie OR
       OLD.chave_acesso IS DISTINCT FROM NEW.chave_acesso THEN
      RAISE EXCEPTION 'Não é permitido alterar valores de uma nota fiscal autorizada';
    END IF;
  END IF;
  
  -- Impedir exclusão de nota autorizada
  IF TG_OP = 'DELETE' AND OLD.situacao = 'autorizada' THEN
    RAISE EXCEPTION 'Não é permitido excluir uma nota fiscal autorizada';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notas_fiscais_proteger
  BEFORE UPDATE OR DELETE ON public.notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.trg_notas_fiscais_proteger_autorizada();

-- 3. Validar soma dos valores dos itens
CREATE OR REPLACE FUNCTION public.trg_notas_fiscais_itens_atualizar_totais()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nota_id UUID;
  v_totais RECORD;
BEGIN
  v_nota_id := COALESCE(NEW.nota_fiscal_id, OLD.nota_fiscal_id);
  
  -- Calcular totais
  SELECT 
    COALESCE(SUM(valor_total), 0) as valor_produtos,
    COALESCE(SUM(valor_desconto), 0) as valor_desconto,
    COALESCE(SUM(valor_icms), 0) as valor_icms,
    COALESCE(SUM(valor_ipi), 0) as valor_ipi,
    COALESCE(SUM(valor_pis), 0) as valor_pis,
    COALESCE(SUM(valor_cofins), 0) as valor_cofins,
    COALESCE(SUM(valor_iss), 0) as valor_iss
  INTO v_totais
  FROM notas_fiscais_itens
  WHERE nota_fiscal_id = v_nota_id;
  
  -- Atualizar nota fiscal
  UPDATE notas_fiscais
  SET 
    valor_produtos = v_totais.valor_produtos,
    valor_icms = v_totais.valor_icms,
    valor_ipi = v_totais.valor_ipi,
    valor_pis = v_totais.valor_pis,
    valor_cofins = v_totais.valor_cofins,
    valor_iss = v_totais.valor_iss,
    valor_total = v_totais.valor_produtos - v_totais.valor_desconto + 
                  COALESCE(valor_frete, 0) + COALESCE(valor_seguro, 0) + 
                  COALESCE(valor_outras, 0) + v_totais.valor_ipi,
    updated_at = now()
  WHERE id = v_nota_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_notas_fiscais_itens_totais
  AFTER INSERT OR UPDATE OR DELETE ON public.notas_fiscais_itens
  FOR EACH ROW EXECUTE FUNCTION public.trg_notas_fiscais_itens_atualizar_totais();

-- 4. Atualizar venda.nfe_id quando nota autorizada
CREATE OR REPLACE FUNCTION public.trg_notas_fiscais_vincular_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Quando nota for autorizada, vincular à venda
  IF NEW.situacao = 'autorizada' AND OLD.situacao != 'autorizada' AND NEW.venda_id IS NOT NULL THEN
    UPDATE vendas
    SET 
      nfe_id = NEW.id,
      nfe_chave = NEW.chave_acesso,
      updated_at = now()
    WHERE id = NEW.venda_id;
  END IF;
  
  -- Quando nota for cancelada, desvincular da venda
  IF NEW.situacao = 'cancelada' AND OLD.situacao = 'autorizada' AND NEW.venda_id IS NOT NULL THEN
    UPDATE vendas
    SET 
      nfe_id = NULL,
      nfe_chave = NULL,
      updated_at = now()
    WHERE id = NEW.venda_id AND nfe_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notas_fiscais_venda
  AFTER UPDATE ON public.notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.trg_notas_fiscais_vincular_venda();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.certificados_digitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impostos_configuracao ENABLE ROW LEVEL SECURITY;

-- Certificados Digitais
CREATE POLICY "certificados_digitais_select" ON public.certificados_digitais
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

CREATE POLICY "certificados_digitais_insert" ON public.certificados_digitais
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

CREATE POLICY "certificados_digitais_update" ON public.certificados_digitais
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

CREATE POLICY "certificados_digitais_delete" ON public.certificados_digitais
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

-- Notas Fiscais
CREATE POLICY "notas_fiscais_select" ON public.notas_fiscais
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

CREATE POLICY "notas_fiscais_insert" ON public.notas_fiscais
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

CREATE POLICY "notas_fiscais_update" ON public.notas_fiscais
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

CREATE POLICY "notas_fiscais_delete" ON public.notas_fiscais
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

-- Notas Fiscais Itens
CREATE POLICY "notas_fiscais_itens_select" ON public.notas_fiscais_itens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notas_fiscais nf
      JOIN public.company_users cu ON cu.company_id = nf.empresa_id
      WHERE nf.id = nota_fiscal_id AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "notas_fiscais_itens_insert" ON public.notas_fiscais_itens
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notas_fiscais nf
      JOIN public.company_users cu ON cu.company_id = nf.empresa_id
      WHERE nf.id = nota_fiscal_id AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "notas_fiscais_itens_update" ON public.notas_fiscais_itens
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.notas_fiscais nf
      JOIN public.company_users cu ON cu.company_id = nf.empresa_id
      WHERE nf.id = nota_fiscal_id AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "notas_fiscais_itens_delete" ON public.notas_fiscais_itens
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.notas_fiscais nf
      JOIN public.company_users cu ON cu.company_id = nf.empresa_id
      WHERE nf.id = nota_fiscal_id AND cu.user_id = auth.uid()
    )
  );

-- Notas Fiscais Eventos
CREATE POLICY "notas_fiscais_eventos_select" ON public.notas_fiscais_eventos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notas_fiscais nf
      JOIN public.company_users cu ON cu.company_id = nf.empresa_id
      WHERE nf.id = nota_fiscal_id AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "notas_fiscais_eventos_insert" ON public.notas_fiscais_eventos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notas_fiscais nf
      JOIN public.company_users cu ON cu.company_id = nf.empresa_id
      WHERE nf.id = nota_fiscal_id AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "notas_fiscais_eventos_update" ON public.notas_fiscais_eventos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.notas_fiscais nf
      JOIN public.company_users cu ON cu.company_id = nf.empresa_id
      WHERE nf.id = nota_fiscal_id AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "notas_fiscais_eventos_delete" ON public.notas_fiscais_eventos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.notas_fiscais nf
      JOIN public.company_users cu ON cu.company_id = nf.empresa_id
      WHERE nf.id = nota_fiscal_id AND cu.user_id = auth.uid()
    )
  );

-- Parâmetros Fiscais
CREATE POLICY "parametros_fiscais_select" ON public.parametros_fiscais
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

CREATE POLICY "parametros_fiscais_insert" ON public.parametros_fiscais
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

CREATE POLICY "parametros_fiscais_update" ON public.parametros_fiscais
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

CREATE POLICY "parametros_fiscais_delete" ON public.parametros_fiscais
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

-- Impostos Configuração
CREATE POLICY "impostos_configuracao_select" ON public.impostos_configuracao
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

CREATE POLICY "impostos_configuracao_insert" ON public.impostos_configuracao
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

CREATE POLICY "impostos_configuracao_update" ON public.impostos_configuracao
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );

CREATE POLICY "impostos_configuracao_delete" ON public.impostos_configuracao
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = empresa_id AND user_id = auth.uid())
  );