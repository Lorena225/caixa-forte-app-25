
-- =====================================================
-- MÓDULO DE COMPRAS COMPLETO
-- =====================================================

-- 1. PEDIDOS_COMPRA
CREATE TABLE public.pedidos_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(20) NOT NULL,
  serie VARCHAR(3) DEFAULT '1',
  situacao VARCHAR(20) DEFAULT 'aberto' CHECK (situacao IN ('aberto', 'aprovado', 'parcial', 'atendido', 'cancelado')),
  
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  fornecedor_nome VARCHAR(100),
  fornecedor_cpf_cnpj VARCHAR(14),
  
  data_pedido DATE DEFAULT CURRENT_DATE,
  data_necessidade DATE,
  data_aprovacao DATE,
  prazo_entrega_dias INTEGER,
  
  valor_produtos DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_frete DECIMAL(15,2) DEFAULT 0,
  valor_outras_despesas DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  
  condicao_pagamento_id UUID REFERENCES public.condicoes_pagamento(id),
  forma_pagamento VARCHAR(20),
  
  aprovador_id UUID,
  observacoes_aprovacao TEXT,
  observacoes TEXT,
  observacoes_internas TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  UNIQUE(numero, empresa_id)
);

CREATE INDEX idx_pedidos_compra_numero ON public.pedidos_compra(numero);
CREATE INDEX idx_pedidos_compra_fornecedor ON public.pedidos_compra(fornecedor_id, empresa_id);
CREATE INDEX idx_pedidos_compra_data ON public.pedidos_compra(data_pedido DESC);
CREATE INDEX idx_pedidos_compra_situacao ON public.pedidos_compra(situacao, empresa_id);

-- 2. PEDIDOS_COMPRA_ITENS
CREATE TABLE public.pedidos_compra_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_compra_id UUID NOT NULL REFERENCES public.pedidos_compra(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  produto_variacao_id UUID,
  codigo VARCHAR(20),
  descricao VARCHAR(100) NOT NULL,
  
  quantidade_pedida DECIMAL(15,4) NOT NULL,
  quantidade_recebida DECIMAL(15,4) DEFAULT 0,
  quantidade_pendente DECIMAL(15,4) GENERATED ALWAYS AS (quantidade_pedida - quantidade_recebida) STORED,
  unidade VARCHAR(6),
  
  preco_unitario DECIMAL(15,4) NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  
  cfop VARCHAR(4),
  ncm VARCHAR(8),
  cst_icms VARCHAR(3),
  
  data_necessidade DATE,
  observacoes TEXT
);

CREATE INDEX idx_pedidos_compra_itens_pedido ON public.pedidos_compra_itens(pedido_compra_id);
CREATE INDEX idx_pedidos_compra_itens_produto ON public.pedidos_compra_itens(produto_id);

-- 3. COTACOES
CREATE TABLE public.cotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(20) NOT NULL,
  descricao VARCHAR(200),
  situacao VARCHAR(20) DEFAULT 'aberta' CHECK (situacao IN ('aberta', 'em_analise', 'aprovada', 'reprovada', 'expirada')),
  
  data_cotacao DATE DEFAULT CURRENT_DATE,
  data_validade DATE,
  data_aprovacao DATE,
  
  tipo_selecao VARCHAR(20) CHECK (tipo_selecao IN ('menor_preco', 'melhor_prazo', 'melhor_condicao', 'manual')),
  vencedor_fornecedor_id UUID REFERENCES public.fornecedores(id),
  vencedor_cotacao_fornecedor_id UUID,
  
  observacoes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  UNIQUE(numero, empresa_id)
);

CREATE INDEX idx_cotacoes_numero ON public.cotacoes(numero);
CREATE INDEX idx_cotacoes_situacao ON public.cotacoes(situacao, empresa_id);

-- 4. COTACOES_ITENS
CREATE TABLE public.cotacoes_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id UUID NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  produto_variacao_id UUID,
  codigo VARCHAR(20),
  descricao VARCHAR(100) NOT NULL,
  
  quantidade DECIMAL(15,4) NOT NULL,
  unidade VARCHAR(6),
  observacoes TEXT
);

CREATE INDEX idx_cotacoes_itens_cotacao ON public.cotacoes_itens(cotacao_id);
CREATE INDEX idx_cotacoes_itens_produto ON public.cotacoes_itens(produto_id);

-- 5. COTACOES_FORNECEDORES
CREATE TABLE public.cotacoes_fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id UUID NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  cotacao_item_id UUID NOT NULL REFERENCES public.cotacoes_itens(id) ON DELETE CASCADE,
  
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  fornecedor_nome VARCHAR(100),
  
  preco_unitario DECIMAL(15,4) NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  valor_frete DECIMAL(15,2) DEFAULT 0,
  
  prazo_entrega_dias INTEGER,
  prazo_pagamento_dias INTEGER,
  
  condicao_pagamento_id UUID REFERENCES public.condicoes_pagamento(id),
  forma_pagamento VARCHAR(20),
  
  status VARCHAR(20) DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'respondida', 'selecionada', 'rejeitada')),
  data_resposta DATE,
  observacoes TEXT
);

CREATE INDEX idx_cotacoes_fornecedores_cotacao ON public.cotacoes_fornecedores(cotacao_id);
CREATE INDEX idx_cotacoes_fornecedores_fornecedor ON public.cotacoes_fornecedores(fornecedor_id);
CREATE INDEX idx_cotacoes_fornecedores_status ON public.cotacoes_fornecedores(status);

-- 6. COMPRAS
CREATE TABLE public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(20) NOT NULL,
  tipo VARCHAR(20) DEFAULT 'compra' CHECK (tipo IN ('compra', 'devolucao')),
  situacao VARCHAR(20) DEFAULT 'aberta' CHECK (situacao IN ('aberta', 'parcial', 'atendida', 'cancelada')),
  
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  fornecedor_nome VARCHAR(100),
  fornecedor_cpf_cnpj VARCHAR(14),
  
  pedido_compra_id UUID REFERENCES public.pedidos_compra(id),
  cotacao_id UUID REFERENCES public.cotacoes(id),
  
  data_compra DATE DEFAULT CURRENT_DATE,
  data_entrega DATE,
  data_recebimento DATE,
  
  valor_produtos DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_frete DECIMAL(15,2) DEFAULT 0,
  valor_seguro DECIMAL(15,2) DEFAULT 0,
  valor_outras_despesas DECIMAL(15,2) DEFAULT 0,
  valor_ipi DECIMAL(15,2) DEFAULT 0,
  valor_icms_st DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  
  nfe_chave VARCHAR(44),
  nfe_numero VARCHAR(20),
  nfe_serie VARCHAR(3),
  xml_nfe TEXT,
  
  condicao_pagamento_id UUID REFERENCES public.condicoes_pagamento(id),
  conta_pagar_gerada BOOLEAN DEFAULT false,
  
  observacoes TEXT,
  observacoes_internas TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  UNIQUE(numero, empresa_id)
);

CREATE INDEX idx_compras_numero ON public.compras(numero);
CREATE INDEX idx_compras_fornecedor ON public.compras(fornecedor_id, empresa_id);
CREATE INDEX idx_compras_data ON public.compras(data_compra DESC);
CREATE INDEX idx_compras_situacao ON public.compras(situacao, empresa_id);
CREATE INDEX idx_compras_nfe ON public.compras(nfe_chave);

-- 7. COMPRAS_ITENS
CREATE TABLE public.compras_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  produto_variacao_id UUID,
  codigo VARCHAR(20),
  descricao VARCHAR(100) NOT NULL,
  
  quantidade DECIMAL(15,4) NOT NULL,
  unidade VARCHAR(6),
  
  preco_unitario DECIMAL(15,4) NOT NULL,
  preco_custo DECIMAL(15,4) NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  
  cfop VARCHAR(4),
  ncm VARCHAR(8),
  cst_icms VARCHAR(3),
  aliquota_icms DECIMAL(5,2) DEFAULT 0,
  valor_icms DECIMAL(15,2) DEFAULT 0,
  aliquota_ipi DECIMAL(5,2) DEFAULT 0,
  valor_ipi DECIMAL(15,2) DEFAULT 0,
  valor_icms_st DECIMAL(15,2) DEFAULT 0,
  
  movimenta_estoque BOOLEAN DEFAULT true,
  estoque_movimentado BOOLEAN DEFAULT false,
  lote VARCHAR(50),
  data_fabricacao DATE,
  data_validade DATE,
  
  observacoes TEXT
);

CREATE INDEX idx_compras_itens_compra ON public.compras_itens(compra_id);
CREATE INDEX idx_compras_itens_produto ON public.compras_itens(produto_id);

-- 8. RECEBIMENTOS_COMPRA
CREATE TABLE public.recebimentos_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  numero_recebimento VARCHAR(20),
  
  data_recebimento DATE DEFAULT CURRENT_DATE,
  hora_recebimento TIME DEFAULT CURRENT_TIME,
  
  recebido_por UUID,
  conferido_por UUID,
  
  quantidade_volumes INTEGER,
  observacoes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recebimentos_compra ON public.recebimentos_compra(compra_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.pedidos_compra_generate_numero()
RETURNS TRIGGER AS $$
DECLARE
  v_ano TEXT;
  v_seq INTEGER;
BEGIN
  v_ano := TO_CHAR(CURRENT_DATE, 'YY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 3) AS INTEGER)), 0) + 1 INTO v_seq
  FROM public.pedidos_compra WHERE empresa_id = NEW.empresa_id AND numero LIKE v_ano || '%';
  NEW.numero := v_ano || LPAD(v_seq::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.cotacoes_generate_numero()
RETURNS TRIGGER AS $$
DECLARE
  v_ano TEXT;
  v_seq INTEGER;
BEGIN
  v_ano := TO_CHAR(CURRENT_DATE, 'YY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 3) AS INTEGER)), 0) + 1 INTO v_seq
  FROM public.cotacoes WHERE empresa_id = NEW.empresa_id AND numero LIKE v_ano || '%';
  NEW.numero := v_ano || LPAD(v_seq::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.compras_generate_numero()
RETURNS TRIGGER AS $$
DECLARE
  v_ano TEXT;
  v_seq INTEGER;
BEGIN
  v_ano := TO_CHAR(CURRENT_DATE, 'YY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 3) AS INTEGER)), 0) + 1 INTO v_seq
  FROM public.compras WHERE empresa_id = NEW.empresa_id AND numero LIKE v_ano || '%';
  NEW.numero := v_ano || LPAD(v_seq::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.pedidos_compra_atualizar_totais()
RETURNS TRIGGER AS $$
DECLARE
  v_total_produtos DECIMAL(15,2);
BEGIN
  SELECT COALESCE(SUM(valor_total - COALESCE(valor_desconto, 0)), 0) INTO v_total_produtos
  FROM public.pedidos_compra_itens WHERE pedido_compra_id = COALESCE(NEW.pedido_compra_id, OLD.pedido_compra_id);
  
  UPDATE public.pedidos_compra SET 
    valor_produtos = v_total_produtos,
    valor_total = v_total_produtos - COALESCE(valor_desconto, 0) + COALESCE(valor_frete, 0) + COALESCE(valor_outras_despesas, 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.pedido_compra_id, OLD.pedido_compra_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.compras_atualizar_totais()
RETURNS TRIGGER AS $$
DECLARE
  v_total_produtos DECIMAL(15,2);
  v_total_ipi DECIMAL(15,2);
  v_total_icms_st DECIMAL(15,2);
BEGIN
  SELECT 
    COALESCE(SUM(valor_total - COALESCE(valor_desconto, 0)), 0),
    COALESCE(SUM(valor_ipi), 0),
    COALESCE(SUM(valor_icms_st), 0)
  INTO v_total_produtos, v_total_ipi, v_total_icms_st
  FROM public.compras_itens WHERE compra_id = COALESCE(NEW.compra_id, OLD.compra_id);
  
  UPDATE public.compras SET 
    valor_produtos = v_total_produtos,
    valor_ipi = v_total_ipi,
    valor_icms_st = v_total_icms_st,
    valor_total = v_total_produtos - COALESCE(valor_desconto, 0) + COALESCE(valor_frete, 0) + COALESCE(valor_seguro, 0) + COALESCE(valor_outras_despesas, 0) + v_total_ipi + v_total_icms_st,
    updated_at = now()
  WHERE id = COALESCE(NEW.compra_id, OLD.compra_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.compras_atualizar_custo_produto()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movimenta_estoque AND NEW.preco_custo > 0 THEN
    UPDATE public.produtos SET 
      preco_custo = NEW.preco_custo,
      updated_at = now()
    WHERE id = NEW.produto_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.compras_movimentar_estoque()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  IF NEW.movimenta_estoque AND NOT NEW.estoque_movimentado THEN
    SELECT empresa_id INTO v_empresa_id FROM public.compras WHERE id = NEW.compra_id;
    
    INSERT INTO public.movimentacoes_estoque (
      produto_id, tipo_movimentacao, quantidade, custo_unitario, valor_total,
      documento_tipo, documento_id, observacao, empresa_id
    ) VALUES (
      NEW.produto_id, 'entrada', NEW.quantidade, NEW.preco_custo, NEW.valor_total,
      'compra', NEW.compra_id, 'Entrada por compra', v_empresa_id
    );
    
    NEW.estoque_movimentado := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.compras_atualizar_pedido()
RETURNS TRIGGER AS $$
DECLARE
  v_pedido_id UUID;
  v_total_pedido DECIMAL(15,4);
  v_total_recebido DECIMAL(15,4);
BEGIN
  SELECT pedido_compra_id INTO v_pedido_id FROM public.compras WHERE id = NEW.compra_id;
  
  IF v_pedido_id IS NOT NULL THEN
    UPDATE public.pedidos_compra_itens pi SET
      quantidade_recebida = quantidade_recebida + NEW.quantidade
    WHERE pi.pedido_compra_id = v_pedido_id AND pi.produto_id = NEW.produto_id;
    
    SELECT SUM(quantidade_pedida), SUM(quantidade_recebida) INTO v_total_pedido, v_total_recebido
    FROM public.pedidos_compra_itens WHERE pedido_compra_id = v_pedido_id;
    
    IF v_total_recebido >= v_total_pedido THEN
      UPDATE public.pedidos_compra SET situacao = 'atendido', updated_at = now() WHERE id = v_pedido_id;
    ELSIF v_total_recebido > 0 THEN
      UPDATE public.pedidos_compra SET situacao = 'parcial', updated_at = now() WHERE id = v_pedido_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.validar_quantidade_compra()
RETURNS TRIGGER AS $$
DECLARE
  v_pedido_id UUID;
  v_quantidade_pendente DECIMAL(15,4);
BEGIN
  SELECT pedido_compra_id INTO v_pedido_id FROM public.compras WHERE id = NEW.compra_id;
  
  IF v_pedido_id IS NOT NULL THEN
    SELECT quantidade_pendente INTO v_quantidade_pendente
    FROM public.pedidos_compra_itens WHERE pedido_compra_id = v_pedido_id AND produto_id = NEW.produto_id;
    
    IF v_quantidade_pendente IS NOT NULL AND NEW.quantidade > v_quantidade_pendente THEN
      RAISE EXCEPTION 'Quantidade (%) excede a quantidade pendente do pedido (%)', NEW.quantidade, v_quantidade_pendente;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER trg_pedidos_compra_numero BEFORE INSERT ON public.pedidos_compra
FOR EACH ROW WHEN (NEW.numero IS NULL) EXECUTE FUNCTION public.pedidos_compra_generate_numero();

CREATE TRIGGER trg_cotacoes_numero BEFORE INSERT ON public.cotacoes
FOR EACH ROW WHEN (NEW.numero IS NULL) EXECUTE FUNCTION public.cotacoes_generate_numero();

CREATE TRIGGER trg_compras_numero BEFORE INSERT ON public.compras
FOR EACH ROW WHEN (NEW.numero IS NULL) EXECUTE FUNCTION public.compras_generate_numero();

CREATE TRIGGER trg_pedidos_compra_itens_totais AFTER INSERT OR UPDATE OR DELETE ON public.pedidos_compra_itens
FOR EACH ROW EXECUTE FUNCTION public.pedidos_compra_atualizar_totais();

CREATE TRIGGER trg_compras_itens_totais AFTER INSERT OR UPDATE OR DELETE ON public.compras_itens
FOR EACH ROW EXECUTE FUNCTION public.compras_atualizar_totais();

CREATE TRIGGER trg_compras_itens_custo AFTER INSERT ON public.compras_itens
FOR EACH ROW EXECUTE FUNCTION public.compras_atualizar_custo_produto();

CREATE TRIGGER trg_compras_itens_estoque BEFORE INSERT ON public.compras_itens
FOR EACH ROW EXECUTE FUNCTION public.compras_movimentar_estoque();

CREATE TRIGGER trg_compras_itens_pedido AFTER INSERT ON public.compras_itens
FOR EACH ROW EXECUTE FUNCTION public.compras_atualizar_pedido();

CREATE TRIGGER trg_validar_quantidade_compra BEFORE INSERT ON public.compras_itens
FOR EACH ROW EXECUTE FUNCTION public.validar_quantidade_compra();

CREATE TRIGGER trg_pedidos_compra_updated BEFORE UPDATE ON public.pedidos_compra
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_cotacoes_updated BEFORE UPDATE ON public.cotacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_compras_updated BEFORE UPDATE ON public.compras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- VIEWS (usando nome_razao em vez de razao_social)
-- =====================================================

CREATE VIEW public.v_pedidos_pendentes
WITH (security_invoker = true)
AS
SELECT pc.id, pc.numero, pc.data_pedido, pc.data_necessidade, pc.situacao,
  pc.fornecedor_id, pc.fornecedor_nome, pc.valor_total,
  COUNT(pci.id) as total_itens,
  SUM(pci.quantidade_pedida) as total_quantidade_pedida,
  SUM(pci.quantidade_recebida) as total_quantidade_recebida,
  SUM(pci.quantidade_pendente) as total_quantidade_pendente,
  pc.empresa_id
FROM public.pedidos_compra pc
LEFT JOIN public.pedidos_compra_itens pci ON pci.pedido_compra_id = pc.id
WHERE pc.situacao IN ('aberto', 'aprovado', 'parcial')
GROUP BY pc.id;

CREATE VIEW public.v_compras_periodo
WITH (security_invoker = true)
AS
SELECT 
  DATE_TRUNC('month', c.data_compra) as periodo,
  c.empresa_id,
  COUNT(*) as total_compras,
  SUM(c.valor_total) as valor_total,
  SUM(c.valor_produtos) as valor_produtos,
  SUM(c.valor_frete) as valor_frete,
  SUM(c.valor_ipi) as valor_ipi,
  AVG(c.valor_total) as ticket_medio,
  COUNT(DISTINCT c.fornecedor_id) as total_fornecedores
FROM public.compras c
WHERE c.situacao != 'cancelada'
GROUP BY DATE_TRUNC('month', c.data_compra), c.empresa_id;

CREATE VIEW public.v_fornecedores_performance
WITH (security_invoker = true)
AS
SELECT 
  f.id as fornecedor_id,
  f.nome_razao as fornecedor_nome,
  f.empresa_id,
  COUNT(c.id) as total_compras,
  SUM(c.valor_total) as valor_total_compras,
  AVG(c.valor_total) as ticket_medio,
  COUNT(CASE WHEN c.data_recebimento <= c.data_entrega THEN 1 END) as entregas_no_prazo,
  COUNT(CASE WHEN c.data_recebimento > c.data_entrega THEN 1 END) as entregas_atrasadas,
  ROUND(COUNT(CASE WHEN c.data_recebimento <= c.data_entrega THEN 1 END)::NUMERIC / NULLIF(COUNT(c.id), 0) * 100, 2) as percentual_no_prazo,
  MAX(c.data_compra) as ultima_compra,
  AVG(c.data_recebimento - c.data_compra) as prazo_medio_entrega_dias
FROM public.fornecedores f
LEFT JOIN public.compras c ON c.fornecedor_id = f.id AND c.situacao = 'atendida'
GROUP BY f.id, f.nome_razao, f.empresa_id;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_compra_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotacoes_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotacoes_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recebimentos_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedidos_compra_select" ON public.pedidos_compra FOR SELECT
USING (empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "pedidos_compra_insert" ON public.pedidos_compra FOR INSERT
WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "pedidos_compra_update" ON public.pedidos_compra FOR UPDATE
USING (empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "pedidos_compra_delete" ON public.pedidos_compra FOR DELETE
USING (empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "pedidos_compra_itens_select" ON public.pedidos_compra_itens FOR SELECT
USING (pedido_compra_id IN (SELECT id FROM public.pedidos_compra WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "pedidos_compra_itens_insert" ON public.pedidos_compra_itens FOR INSERT
WITH CHECK (pedido_compra_id IN (SELECT id FROM public.pedidos_compra WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "pedidos_compra_itens_update" ON public.pedidos_compra_itens FOR UPDATE
USING (pedido_compra_id IN (SELECT id FROM public.pedidos_compra WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "pedidos_compra_itens_delete" ON public.pedidos_compra_itens FOR DELETE
USING (pedido_compra_id IN (SELECT id FROM public.pedidos_compra WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "cotacoes_select" ON public.cotacoes FOR SELECT
USING (empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "cotacoes_insert" ON public.cotacoes FOR INSERT
WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "cotacoes_update" ON public.cotacoes FOR UPDATE
USING (empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "cotacoes_delete" ON public.cotacoes FOR DELETE
USING (empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "cotacoes_itens_select" ON public.cotacoes_itens FOR SELECT
USING (cotacao_id IN (SELECT id FROM public.cotacoes WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "cotacoes_itens_insert" ON public.cotacoes_itens FOR INSERT
WITH CHECK (cotacao_id IN (SELECT id FROM public.cotacoes WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "cotacoes_itens_update" ON public.cotacoes_itens FOR UPDATE
USING (cotacao_id IN (SELECT id FROM public.cotacoes WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "cotacoes_itens_delete" ON public.cotacoes_itens FOR DELETE
USING (cotacao_id IN (SELECT id FROM public.cotacoes WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "cotacoes_fornecedores_select" ON public.cotacoes_fornecedores FOR SELECT
USING (cotacao_id IN (SELECT id FROM public.cotacoes WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "cotacoes_fornecedores_insert" ON public.cotacoes_fornecedores FOR INSERT
WITH CHECK (cotacao_id IN (SELECT id FROM public.cotacoes WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "cotacoes_fornecedores_update" ON public.cotacoes_fornecedores FOR UPDATE
USING (cotacao_id IN (SELECT id FROM public.cotacoes WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "cotacoes_fornecedores_delete" ON public.cotacoes_fornecedores FOR DELETE
USING (cotacao_id IN (SELECT id FROM public.cotacoes WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "compras_select" ON public.compras FOR SELECT
USING (empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "compras_insert" ON public.compras FOR INSERT
WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "compras_update" ON public.compras FOR UPDATE
USING (empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "compras_delete" ON public.compras FOR DELETE
USING (empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "compras_itens_select" ON public.compras_itens FOR SELECT
USING (compra_id IN (SELECT id FROM public.compras WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "compras_itens_insert" ON public.compras_itens FOR INSERT
WITH CHECK (compra_id IN (SELECT id FROM public.compras WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "compras_itens_update" ON public.compras_itens FOR UPDATE
USING (compra_id IN (SELECT id FROM public.compras WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "compras_itens_delete" ON public.compras_itens FOR DELETE
USING (compra_id IN (SELECT id FROM public.compras WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "recebimentos_compra_select" ON public.recebimentos_compra FOR SELECT
USING (compra_id IN (SELECT id FROM public.compras WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "recebimentos_compra_insert" ON public.recebimentos_compra FOR INSERT
WITH CHECK (compra_id IN (SELECT id FROM public.compras WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "recebimentos_compra_update" ON public.recebimentos_compra FOR UPDATE
USING (compra_id IN (SELECT id FROM public.compras WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "recebimentos_compra_delete" ON public.recebimentos_compra FOR DELETE
USING (compra_id IN (SELECT id FROM public.compras WHERE empresa_id IN (SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid())));
