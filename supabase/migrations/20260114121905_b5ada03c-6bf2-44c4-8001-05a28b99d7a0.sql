-- =============================================
-- MÓDULO ESTOQUE - CONTROLE COMPLETO
-- =============================================

-- 1. ESTOQUE - Tabela de saldos
CREATE TABLE public.estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  produto_variacao_id UUID REFERENCES public.produtos_variacoes(id) ON DELETE SET NULL,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Quantidades
  quantidade_atual DECIMAL(15,4) NOT NULL DEFAULT 0,
  quantidade_reservada DECIMAL(15,4) NOT NULL DEFAULT 0,
  quantidade_disponivel DECIMAL(15,4) GENERATED ALWAYS AS (quantidade_atual - quantidade_reservada) STORED,
  quantidade_transito DECIMAL(15,4) NOT NULL DEFAULT 0,
  
  -- Custos
  custo_medio DECIMAL(15,4) NOT NULL DEFAULT 0,
  custo_ultima_compra DECIMAL(15,4),
  valor_total_estoque DECIMAL(15,2) GENERATED ALWAYS AS (quantidade_atual * custo_medio) STORED,
  
  -- Localização
  deposito VARCHAR(50),
  localizacao VARCHAR(50),
  corredor VARCHAR(20),
  prateleira VARCHAR(20),
  
  -- Controle
  estoque_minimo DECIMAL(15,4),
  estoque_maximo DECIMAL(15,4),
  lote VARCHAR(50),
  data_fabricacao DATE,
  data_validade DATE,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT estoque_quantidade_atual_check CHECK (quantidade_atual >= 0),
  CONSTRAINT estoque_quantidade_reservada_check CHECK (quantidade_reservada >= 0)
);

-- Índices únicos para garantir unicidade (produto + variação + empresa)
CREATE UNIQUE INDEX idx_estoque_unique_com_variacao 
  ON public.estoque(produto_id, produto_variacao_id, empresa_id) 
  WHERE produto_variacao_id IS NOT NULL;

CREATE UNIQUE INDEX idx_estoque_unique_sem_variacao 
  ON public.estoque(produto_id, empresa_id) 
  WHERE produto_variacao_id IS NULL;

CREATE INDEX idx_estoque_produto ON public.estoque(produto_id);
CREATE INDEX idx_estoque_variacao ON public.estoque(produto_variacao_id) WHERE produto_variacao_id IS NOT NULL;
CREATE INDEX idx_estoque_empresa ON public.estoque(empresa_id);
CREATE INDEX idx_estoque_disponivel ON public.estoque(quantidade_disponivel);

-- 2. MOVIMENTACOES_ESTOQUE
CREATE TABLE public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_movimentacao VARCHAR(20) NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida', 'ajuste', 'transferencia', 'inventario')),
  documento_tipo VARCHAR(20) CHECK (documento_tipo IN ('venda', 'compra', 'ajuste', 'inventario', 'transferencia', 'devolucao')),
  documento_id UUID,
  documento_numero VARCHAR(20),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  produto_variacao_id UUID REFERENCES public.produtos_variacoes(id) ON DELETE SET NULL,
  codigo VARCHAR(20),
  descricao VARCHAR(100),
  quantidade DECIMAL(15,4) NOT NULL,
  quantidade_anterior DECIMAL(15,4),
  quantidade_nova DECIMAL(15,4),
  custo_unitario DECIMAL(15,4),
  custo_medio_anterior DECIMAL(15,4),
  custo_medio_novo DECIMAL(15,4),
  valor_total DECIMAL(15,2),
  deposito_origem VARCHAR(50),
  deposito_destino VARCHAR(50),
  localizacao VARCHAR(50),
  numero_lote VARCHAR(50),
  data_fabricacao DATE,
  data_validade DATE,
  cfop VARCHAR(4),
  nfe_chave VARCHAR(44),
  motivo VARCHAR(100),
  observacoes TEXT,
  data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_movimentacao TIME NOT NULL DEFAULT CURRENT_TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_mov_estoque_produto ON public.movimentacoes_estoque(produto_id);
CREATE INDEX idx_mov_estoque_tipo ON public.movimentacoes_estoque(tipo_movimentacao);
CREATE INDEX idx_mov_estoque_data ON public.movimentacoes_estoque(data_movimentacao DESC);
CREATE INDEX idx_mov_estoque_documento ON public.movimentacoes_estoque(documento_id) WHERE documento_id IS NOT NULL;
CREATE INDEX idx_mov_estoque_empresa ON public.movimentacoes_estoque(empresa_id);

-- 3. INVENTARIOS
CREATE TABLE public.inventarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) UNIQUE,
  descricao VARCHAR(200),
  data_inventario DATE NOT NULL,
  hora_inicio TIME,
  hora_fim TIME,
  status VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_contagem', 'fechado', 'cancelado')),
  tipo VARCHAR(20) NOT NULL DEFAULT 'geral' CHECK (tipo IN ('geral', 'categoria', 'produto')),
  categoria_id UUID REFERENCES public.categorias_produto(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_inventarios_empresa ON public.inventarios(empresa_id);
CREATE INDEX idx_inventarios_status ON public.inventarios(status);
CREATE INDEX idx_inventarios_data ON public.inventarios(data_inventario DESC);

-- 4. INVENTARIOS_ITENS
CREATE TABLE public.inventarios_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_id UUID NOT NULL REFERENCES public.inventarios(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  produto_variacao_id UUID REFERENCES public.produtos_variacoes(id) ON DELETE SET NULL,
  quantidade_sistema DECIMAL(15,4) NOT NULL,
  quantidade_contada DECIMAL(15,4),
  diferenca DECIMAL(15,4) GENERATED ALWAYS AS (COALESCE(quantidade_contada, 0) - quantidade_sistema) STORED,
  percentual_diferenca DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN quantidade_sistema > 0 THEN ((COALESCE(quantidade_contada, 0) - quantidade_sistema) / quantidade_sistema * 100) ELSE 0 END
  ) STORED,
  custo_unitario DECIMAL(15,4),
  valor_diferenca DECIMAL(15,2) GENERATED ALWAYS AS (
    (COALESCE(quantidade_contada, 0) - quantidade_sistema) * COALESCE(custo_unitario, 0)
  ) STORED,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'contado', 'ajustado')),
  ajuste_aplicado BOOLEAN NOT NULL DEFAULT false,
  movimentacao_id UUID,
  observacoes TEXT,
  contado_por UUID REFERENCES auth.users(id),
  data_contagem TIMESTAMPTZ,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_inv_itens_inventario ON public.inventarios_itens(inventario_id);
CREATE INDEX idx_inv_itens_produto ON public.inventarios_itens(produto_id);
CREATE INDEX idx_inv_itens_status ON public.inventarios_itens(status);

-- 5. LOTES
CREATE TABLE public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  numero_lote VARCHAR(50) NOT NULL,
  quantidade_inicial DECIMAL(15,4) NOT NULL,
  quantidade_atual DECIMAL(15,4) NOT NULL,
  data_fabricacao DATE,
  data_validade DATE,
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  custo_unitario DECIMAL(15,4),
  valor_total DECIMAL(15,2) GENERATED ALWAYS AS (quantidade_atual * COALESCE(custo_unitario, 0)) STORED,
  fornecedor_id UUID REFERENCES public.counterparties(id),
  nota_fiscal VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'vencido', 'bloqueado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT lotes_unique UNIQUE (produto_id, numero_lote, empresa_id),
  CONSTRAINT lotes_quantidade_check CHECK (quantidade_atual >= 0)
);

CREATE INDEX idx_lotes_produto ON public.lotes(produto_id);
CREATE INDEX idx_lotes_numero ON public.lotes(numero_lote);
CREATE INDEX idx_lotes_validade ON public.lotes(data_validade);
CREATE INDEX idx_lotes_status ON public.lotes(status);
CREATE INDEX idx_lotes_empresa ON public.lotes(empresa_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- 1. Atualizar saldo de estoque
CREATE OR REPLACE FUNCTION public.atualizar_saldo_estoque(
  p_produto_id UUID, p_variacao_id UUID, p_empresa_id UUID,
  p_quantidade DECIMAL(15,4), p_tipo VARCHAR(20), p_custo_unitario DECIMAL(15,4) DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_estoque RECORD; v_novo_custo_medio DECIMAL(15,4); v_nova_quantidade DECIMAL(15,4);
BEGIN
  IF p_variacao_id IS NULL THEN
    SELECT * INTO v_estoque FROM estoque WHERE produto_id = p_produto_id AND produto_variacao_id IS NULL AND empresa_id = p_empresa_id FOR UPDATE;
  ELSE
    SELECT * INTO v_estoque FROM estoque WHERE produto_id = p_produto_id AND produto_variacao_id = p_variacao_id AND empresa_id = p_empresa_id FOR UPDATE;
  END IF;
  
  IF NOT FOUND THEN
    INSERT INTO estoque (produto_id, produto_variacao_id, empresa_id, quantidade_atual, custo_medio)
    VALUES (p_produto_id, p_variacao_id, p_empresa_id, 0, 0) RETURNING * INTO v_estoque;
  END IF;
  
  IF p_tipo IN ('entrada', 'ajuste') THEN v_nova_quantidade := v_estoque.quantidade_atual + p_quantidade;
  ELSIF p_tipo = 'saida' THEN v_nova_quantidade := v_estoque.quantidade_atual - p_quantidade;
  ELSIF p_tipo = 'inventario' THEN v_nova_quantidade := p_quantidade;
  ELSE v_nova_quantidade := v_estoque.quantidade_atual; END IF;
  
  IF p_tipo = 'entrada' AND p_custo_unitario IS NOT NULL AND p_custo_unitario > 0 THEN
    IF v_estoque.quantidade_atual > 0 THEN
      v_novo_custo_medio := ((v_estoque.quantidade_atual * v_estoque.custo_medio) + (p_quantidade * p_custo_unitario)) / (v_estoque.quantidade_atual + p_quantidade);
    ELSE v_novo_custo_medio := p_custo_unitario; END IF;
  ELSE v_novo_custo_medio := v_estoque.custo_medio; END IF;
  
  UPDATE estoque SET quantidade_atual = GREATEST(v_nova_quantidade, 0), custo_medio = v_novo_custo_medio,
    custo_ultima_compra = CASE WHEN p_tipo = 'entrada' AND p_custo_unitario IS NOT NULL THEN p_custo_unitario ELSE custo_ultima_compra END,
    updated_at = now() WHERE id = v_estoque.id;
  
  RETURN jsonb_build_object('quantidade_anterior', v_estoque.quantidade_atual, 'quantidade_nova', GREATEST(v_nova_quantidade, 0),
    'custo_medio_anterior', v_estoque.custo_medio, 'custo_medio_novo', v_novo_custo_medio);
END; $$;

-- 2. Reservar estoque
CREATE OR REPLACE FUNCTION public.reservar_estoque(p_produto_id UUID, p_variacao_id UUID, p_empresa_id UUID, p_quantidade DECIMAL(15,4))
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_disponivel DECIMAL(15,4); v_estoque_id UUID;
BEGIN
  IF p_variacao_id IS NULL THEN
    SELECT id, quantidade_disponivel INTO v_estoque_id, v_disponivel FROM estoque WHERE produto_id = p_produto_id AND produto_variacao_id IS NULL AND empresa_id = p_empresa_id FOR UPDATE;
  ELSE
    SELECT id, quantidade_disponivel INTO v_estoque_id, v_disponivel FROM estoque WHERE produto_id = p_produto_id AND produto_variacao_id = p_variacao_id AND empresa_id = p_empresa_id FOR UPDATE;
  END IF;
  IF v_disponivel IS NULL OR v_disponivel < p_quantidade THEN RETURN FALSE; END IF;
  UPDATE estoque SET quantidade_reservada = quantidade_reservada + p_quantidade, updated_at = now() WHERE id = v_estoque_id;
  RETURN TRUE;
END; $$;

-- 3. Liberar estoque
CREATE OR REPLACE FUNCTION public.liberar_estoque(p_produto_id UUID, p_variacao_id UUID, p_empresa_id UUID, p_quantidade DECIMAL(15,4))
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF p_variacao_id IS NULL THEN
    UPDATE estoque SET quantidade_reservada = GREATEST(quantidade_reservada - p_quantidade, 0), updated_at = now()
    WHERE produto_id = p_produto_id AND produto_variacao_id IS NULL AND empresa_id = p_empresa_id;
  ELSE
    UPDATE estoque SET quantidade_reservada = GREATEST(quantidade_reservada - p_quantidade, 0), updated_at = now()
    WHERE produto_id = p_produto_id AND produto_variacao_id = p_variacao_id AND empresa_id = p_empresa_id;
  END IF;
  RETURN FOUND;
END; $$;

-- 4. Validar estoque disponível
CREATE OR REPLACE FUNCTION public.validar_estoque_disponivel(p_produto_id UUID, p_variacao_id UUID, p_empresa_id UUID, p_quantidade DECIMAL(15,4))
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_estoque RECORD;
BEGIN
  IF p_variacao_id IS NULL THEN SELECT * INTO v_estoque FROM estoque WHERE produto_id = p_produto_id AND produto_variacao_id IS NULL AND empresa_id = p_empresa_id;
  ELSE SELECT * INTO v_estoque FROM estoque WHERE produto_id = p_produto_id AND produto_variacao_id = p_variacao_id AND empresa_id = p_empresa_id; END IF;
  
  IF NOT FOUND THEN RETURN jsonb_build_object('disponivel', FALSE, 'quantidade_atual', 0, 'quantidade_disponivel', 0, 'quantidade_solicitada', p_quantidade, 'mensagem', 'Produto sem registro de estoque'); END IF;
  
  RETURN jsonb_build_object('disponivel', v_estoque.quantidade_disponivel >= p_quantidade, 'quantidade_atual', v_estoque.quantidade_atual, 'quantidade_disponivel', v_estoque.quantidade_disponivel, 'quantidade_solicitada', p_quantidade,
    'mensagem', CASE WHEN v_estoque.quantidade_disponivel >= p_quantidade THEN 'Estoque disponível' ELSE 'Estoque insuficiente. Disponível: ' || v_estoque.quantidade_disponivel::TEXT END);
END; $$;

-- 5. Gerar código de inventário
CREATE OR REPLACE FUNCTION public.inventarios_generate_codigo() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_seq INTEGER; v_ano TEXT;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    v_ano := EXTRACT(YEAR FROM COALESCE(NEW.data_inventario, CURRENT_DATE))::TEXT;
    SELECT COUNT(*) + 1 INTO v_seq FROM inventarios WHERE empresa_id = NEW.empresa_id AND EXTRACT(YEAR FROM data_inventario) = EXTRACT(YEAR FROM COALESCE(NEW.data_inventario, CURRENT_DATE));
    NEW.codigo := 'INV' || v_ano || '-' || LPAD(v_seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_inventarios_codigo BEFORE INSERT ON public.inventarios FOR EACH ROW EXECUTE FUNCTION public.inventarios_generate_codigo();

-- =============================================
-- TRIGGERS
-- =============================================

-- 1. Atualizar estoque.updated_at
CREATE OR REPLACE FUNCTION public.trg_estoque_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_estoque_updated BEFORE UPDATE ON public.estoque FOR EACH ROW EXECUTE FUNCTION public.trg_estoque_updated_at();

-- 2. Processar movimentação
CREATE OR REPLACE FUNCTION public.trg_movimentacao_processar() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_resultado JSONB; v_estoque RECORD;
BEGIN
  IF NEW.produto_variacao_id IS NULL THEN SELECT quantidade_atual, custo_medio INTO v_estoque FROM estoque WHERE produto_id = NEW.produto_id AND produto_variacao_id IS NULL AND empresa_id = NEW.empresa_id;
  ELSE SELECT quantidade_atual, custo_medio INTO v_estoque FROM estoque WHERE produto_id = NEW.produto_id AND produto_variacao_id = NEW.produto_variacao_id AND empresa_id = NEW.empresa_id; END IF;
  
  NEW.quantidade_anterior := COALESCE(v_estoque.quantidade_atual, 0);
  NEW.custo_medio_anterior := COALESCE(v_estoque.custo_medio, 0);
  
  IF NEW.tipo_movimentacao = 'saida' AND COALESCE(v_estoque.quantidade_atual, 0) < NEW.quantidade THEN
    RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', COALESCE(v_estoque.quantidade_atual, 0), NEW.quantidade;
  END IF;
  
  v_resultado := atualizar_saldo_estoque(NEW.produto_id, NEW.produto_variacao_id, NEW.empresa_id, NEW.quantidade, NEW.tipo_movimentacao, NEW.custo_unitario);
  NEW.quantidade_nova := (v_resultado->>'quantidade_nova')::DECIMAL;
  NEW.custo_medio_novo := (v_resultado->>'custo_medio_novo')::DECIMAL;
  NEW.valor_total := NEW.quantidade * COALESCE(NEW.custo_unitario, NEW.custo_medio_novo);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_movimentacao_processar BEFORE INSERT ON public.movimentacoes_estoque FOR EACH ROW EXECUTE FUNCTION public.trg_movimentacao_processar();

-- 3. Bloquear lotes vencidos
CREATE OR REPLACE FUNCTION public.trg_lotes_verificar_validade() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.data_validade IS NOT NULL AND NEW.data_validade < CURRENT_DATE AND NEW.status = 'ativo' THEN NEW.status := 'vencido'; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_lotes_validade BEFORE INSERT OR UPDATE ON public.lotes FOR EACH ROW EXECUTE FUNCTION public.trg_lotes_verificar_validade();

-- 4. Atualizar inventário updated_at
CREATE TRIGGER trg_inventarios_updated BEFORE UPDATE ON public.inventarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- VIEWS PARA ALERTAS (usando 'descricao' da tabela produtos)
-- =============================================

CREATE OR REPLACE VIEW public.v_produtos_estoque_minimo AS
SELECT e.id, e.produto_id, p.codigo, p.descricao as produto_nome, e.quantidade_atual, e.quantidade_disponivel, e.estoque_minimo, e.estoque_maximo,
  (e.estoque_minimo - e.quantidade_atual) as quantidade_repor, e.custo_medio, (e.estoque_minimo - e.quantidade_atual) * e.custo_medio as valor_reposicao, e.deposito, e.empresa_id
FROM public.estoque e JOIN public.produtos p ON p.id = e.produto_id
WHERE e.estoque_minimo IS NOT NULL AND e.quantidade_atual < e.estoque_minimo;

CREATE OR REPLACE VIEW public.v_produtos_giro_estoque AS
SELECT e.produto_id, p.codigo, p.descricao as produto_nome, e.quantidade_atual, e.custo_medio, e.valor_total_estoque,
  COALESCE(mov.total_saidas, 0) as total_saidas_12m, COALESCE(mov.total_entradas, 0) as total_entradas_12m, COALESCE(mov.qtd_movimentacoes, 0) as qtd_movimentacoes,
  CASE WHEN e.quantidade_atual > 0 AND COALESCE(mov.total_saidas, 0) > 0 THEN ROUND((COALESCE(mov.total_saidas, 0) / e.quantidade_atual)::NUMERIC, 2) ELSE 0 END as giro_estoque,
  CASE WHEN COALESCE(mov.total_saidas, 0) > 0 THEN ROUND((e.quantidade_atual / (COALESCE(mov.total_saidas, 0) / 12))::NUMERIC, 0) ELSE NULL END as cobertura_meses, e.empresa_id
FROM public.estoque e JOIN public.produtos p ON p.id = e.produto_id
LEFT JOIN (SELECT produto_id, empresa_id, SUM(CASE WHEN tipo_movimentacao = 'saida' THEN quantidade ELSE 0 END) as total_saidas,
  SUM(CASE WHEN tipo_movimentacao = 'entrada' THEN quantidade ELSE 0 END) as total_entradas, COUNT(*) as qtd_movimentacoes
  FROM public.movimentacoes_estoque WHERE data_movimentacao >= CURRENT_DATE - INTERVAL '12 months' GROUP BY produto_id, empresa_id
) mov ON mov.produto_id = e.produto_id AND mov.empresa_id = e.empresa_id;

CREATE OR REPLACE VIEW public.v_produtos_curva_abc AS
WITH valores_movimentados AS (
  SELECT m.produto_id, m.empresa_id, SUM(ABS(m.valor_total)) as valor_total_movimentado FROM public.movimentacoes_estoque m
  WHERE m.data_movimentacao >= CURRENT_DATE - INTERVAL '12 months' GROUP BY m.produto_id, m.empresa_id
),
ranking AS (
  SELECT v.*, SUM(v.valor_total_movimentado) OVER (PARTITION BY v.empresa_id ORDER BY v.valor_total_movimentado DESC) as acumulado,
    SUM(v.valor_total_movimentado) OVER (PARTITION BY v.empresa_id) as total_geral FROM valores_movimentados v
)
SELECT r.produto_id, p.codigo, p.descricao as produto_nome, r.valor_total_movimentado,
  ROUND((r.acumulado / NULLIF(r.total_geral, 0) * 100)::NUMERIC, 2) as percentual_acumulado,
  CASE WHEN (r.acumulado / NULLIF(r.total_geral, 0) * 100) <= 80 THEN 'A' WHEN (r.acumulado / NULLIF(r.total_geral, 0) * 100) <= 95 THEN 'B' ELSE 'C' END as curva,
  e.quantidade_atual, e.valor_total_estoque, r.empresa_id
FROM ranking r JOIN public.produtos p ON p.id = r.produto_id
LEFT JOIN public.estoque e ON e.produto_id = r.produto_id AND e.empresa_id = r.empresa_id ORDER BY r.empresa_id, r.valor_total_movimentado DESC;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventarios_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_select" ON public.estoque FOR SELECT USING (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "estoque_insert" ON public.estoque FOR INSERT WITH CHECK (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "estoque_update" ON public.estoque FOR UPDATE USING (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "estoque_delete" ON public.estoque FOR DELETE USING (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "mov_estoque_select" ON public.movimentacoes_estoque FOR SELECT USING (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "mov_estoque_insert" ON public.movimentacoes_estoque FOR INSERT WITH CHECK (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "inventarios_select" ON public.inventarios FOR SELECT USING (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "inventarios_insert" ON public.inventarios FOR INSERT WITH CHECK (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "inventarios_update" ON public.inventarios FOR UPDATE USING (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "inventarios_delete" ON public.inventarios FOR DELETE USING (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "inv_itens_select" ON public.inventarios_itens FOR SELECT USING (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "inv_itens_insert" ON public.inventarios_itens FOR INSERT WITH CHECK (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "inv_itens_update" ON public.inventarios_itens FOR UPDATE USING (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "inv_itens_delete" ON public.inventarios_itens FOR DELETE USING (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "lotes_select" ON public.lotes FOR SELECT USING (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "lotes_insert" ON public.lotes FOR INSERT WITH CHECK (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "lotes_update" ON public.lotes FOR UPDATE USING (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "lotes_delete" ON public.lotes FOR DELETE USING (empresa_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));