-- =====================================================
-- MÓDULO VENDAS - Migration Completa
-- =====================================================

-- =====================================================
-- 1. VENDAS - Tabela Principal
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(20) NOT NULL,
  serie VARCHAR(3) DEFAULT '1',
  tipo CHAR(1) NOT NULL DEFAULT 'V' CHECK (tipo IN ('V', 'O', 'C')),
  situacao CHAR(1) NOT NULL DEFAULT 'A' CHECK (situacao IN ('A', 'F', 'P', 'C', 'X')),
  
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  cliente_nome VARCHAR(100),
  cliente_cpf_cnpj VARCHAR(14),
  cliente_endereco_id UUID REFERENCES public.clientes_enderecos(id),
  
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega DATE,
  data_validade DATE,
  hora_venda TIME DEFAULT CURRENT_TIME,
  
  valor_produtos DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_desconto DECIMAL(15,2) NOT NULL DEFAULT 0,
  percentual_desconto DECIMAL(5,2),
  valor_frete DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_seguro DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_outras_despesas DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  vendedor_id UUID,
  vendedor_nome VARCHAR(100),
  comissao_percentual DECIMAL(5,2) DEFAULT 0,
  comissao_valor DECIMAL(15,2) DEFAULT 0,
  
  condicao_pagamento_id UUID REFERENCES public.condicoes_pagamento(id),
  
  natureza_operacao VARCHAR(60),
  cfop VARCHAR(4),
  nfe_id UUID,
  nfe_chave VARCHAR(44),
  
  observacoes TEXT,
  observacoes_internas TEXT,
  observacoes_nf TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  CONSTRAINT vendas_numero_serie_empresa_unique UNIQUE (empresa_id, serie, numero)
);

CREATE INDEX IF NOT EXISTS idx_vendas_numero ON public.vendas(numero);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_empresa ON public.vendas(cliente_id, empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data_empresa ON public.vendas(data_venda DESC, empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_situacao_tipo_empresa ON public.vendas(situacao, tipo, empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor_data ON public.vendas(vendedor_id, data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa ON public.vendas(empresa_id);

-- =====================================================
-- 2. VENDAS_ITENS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vendas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  tipo_item CHAR(1) NOT NULL DEFAULT 'P' CHECK (tipo_item IN ('P', 'S')),
  
  produto_id UUID REFERENCES public.produtos(id),
  produto_variacao_id UUID REFERENCES public.produtos_variacoes(id),
  codigo VARCHAR(20),
  descricao VARCHAR(100) NOT NULL,
  
  quantidade DECIMAL(15,4) NOT NULL,
  unidade VARCHAR(6) DEFAULT 'UN',
  
  preco_unitario DECIMAL(15,4) NOT NULL,
  preco_custo DECIMAL(15,4) DEFAULT 0,
  valor_total DECIMAL(15,2) NOT NULL,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  percentual_desconto DECIMAL(5,2),
  
  cfop VARCHAR(4),
  ncm VARCHAR(8),
  cest VARCHAR(7),
  origem INTEGER DEFAULT 0,
  cst_icms VARCHAR(3),
  aliquota_icms DECIMAL(5,2) DEFAULT 0,
  valor_icms DECIMAL(15,2) DEFAULT 0,
  base_icms DECIMAL(15,2) DEFAULT 0,
  cst_pis VARCHAR(2),
  aliquota_pis DECIMAL(5,2) DEFAULT 0,
  valor_pis DECIMAL(15,2) DEFAULT 0,
  cst_cofins VARCHAR(2),
  aliquota_cofins DECIMAL(5,2) DEFAULT 0,
  valor_cofins DECIMAL(15,2) DEFAULT 0,
  cst_ipi VARCHAR(2),
  aliquota_ipi DECIMAL(5,2) DEFAULT 0,
  valor_ipi DECIMAL(15,2) DEFAULT 0,
  
  movimenta_estoque BOOLEAN DEFAULT true,
  estoque_movimentado BOOLEAN DEFAULT false,
  
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendas_itens_venda ON public.vendas_itens(venda_id);
CREATE INDEX IF NOT EXISTS idx_vendas_itens_produto ON public.vendas_itens(produto_id);

-- =====================================================
-- 3. VENDAS_PAGAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vendas_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  sequencia INTEGER NOT NULL,
  
  forma_pagamento VARCHAR(20) NOT NULL CHECK (forma_pagamento IN ('boleto', 'pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'cheque', 'transferencia')),
  percentual DECIMAL(5,2) NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  
  condicao_pagamento_id UUID REFERENCES public.condicoes_pagamento(id),
  numero_parcelas INTEGER DEFAULT 1,
  
  nosso_numero VARCHAR(20),
  codigo_barras VARCHAR(60),
  linha_digitavel VARCHAR(60),
  qrcode TEXT,
  qrcode_base64 TEXT,
  
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'emitido', 'pago', 'cancelado')),
  
  data_emissao DATE,
  data_vencimento DATE,
  data_pagamento DATE,
  valor_pago DECIMAL(15,2),
  taxa_cobranca DECIMAL(15,2) DEFAULT 0,
  
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendas_pagamentos_venda ON public.vendas_pagamentos(venda_id);
CREATE INDEX IF NOT EXISTS idx_vendas_pagamentos_status_venc ON public.vendas_pagamentos(status, data_vencimento);

-- =====================================================
-- 4. VENDAS_PARCELAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vendas_parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  venda_pagamento_id UUID REFERENCES public.vendas_pagamentos(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  
  valor_original DECIMAL(15,2) NOT NULL,
  valor_juros DECIMAL(15,2) DEFAULT 0,
  valor_multa DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) NOT NULL,
  
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  
  status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'vencido', 'cancelado')),
  forma_recebimento VARCHAR(20),
  conta_receber_id UUID,
  
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendas_parcelas_venda ON public.vendas_parcelas(venda_id);
CREATE INDEX IF NOT EXISTS idx_vendas_parcelas_vencimento ON public.vendas_parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_vendas_parcelas_status ON public.vendas_parcelas(status);

-- =====================================================
-- 5. CONTRATOS_RECORRENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contratos_recorrentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID REFERENCES public.vendas(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  descricao VARCHAR(200) NOT NULL,
  
  data_inicio DATE NOT NULL,
  data_fim DATE,
  dia_vencimento INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31),
  
  valor_mensal DECIMAL(15,2) NOT NULL,
  valor_anual DECIMAL(15,2),
  
  situacao VARCHAR(20) DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'suspenso', 'cancelado')),
  gerar_automatico BOOLEAN DEFAULT true,
  enviar_cobranca BOOLEAN DEFAULT true,
  
  ultima_geracao DATE,
  proxima_geracao DATE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contratos_cliente ON public.contratos_recorrentes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_situacao ON public.contratos_recorrentes(situacao);
CREATE INDEX IF NOT EXISTS idx_contratos_proxima_geracao ON public.contratos_recorrentes(proxima_geracao);
CREATE INDEX IF NOT EXISTS idx_contratos_empresa ON public.contratos_recorrentes(empresa_id);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER trg_vendas_updated_at
  BEFORE UPDATE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_contratos_recorrentes_updated_at
  BEFORE UPDATE ON public.contratos_recorrentes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCTION: Gerar número sequencial de venda
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_venda_numero()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    SELECT COALESCE(MAX(CAST(numero AS INTEGER)), 0) + 1 INTO next_number
    FROM public.vendas
    WHERE empresa_id = NEW.empresa_id AND serie = NEW.serie;
    
    NEW.numero := LPAD(next_number::TEXT, 9, '0');
  END IF;
  
  IF NEW.cliente_nome IS NULL THEN
    SELECT nome_razao, cpf_cnpj INTO NEW.cliente_nome, NEW.cliente_cpf_cnpj
    FROM public.clientes WHERE id = NEW.cliente_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_vendas_numero
  BEFORE INSERT ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.generate_venda_numero();

-- =====================================================
-- FUNCTION: Calcular valor total da venda
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_venda_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_valor_produtos DECIMAL(15,2);
BEGIN
  SELECT COALESCE(SUM(valor_total), 0) INTO v_valor_produtos
  FROM public.vendas_itens WHERE venda_id = COALESCE(NEW.venda_id, OLD.venda_id);
  
  UPDATE public.vendas SET
    valor_produtos = v_valor_produtos,
    valor_total = v_valor_produtos - valor_desconto + valor_frete + valor_seguro + valor_outras_despesas,
    updated_at = now()
  WHERE id = COALESCE(NEW.venda_id, OLD.venda_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_vendas_itens_calculate_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.vendas_itens
  FOR EACH ROW EXECUTE FUNCTION public.calculate_venda_totals();

-- =====================================================
-- FUNCTION: Calcular valores do item
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_venda_item()
RETURNS TRIGGER AS $$
DECLARE
  v_produto RECORD;
BEGIN
  NEW.valor_total := ROUND((NEW.quantidade * NEW.preco_unitario) - COALESCE(NEW.valor_desconto, 0), 2);
  
  IF NEW.produto_id IS NOT NULL AND NEW.ncm IS NULL THEN
    SELECT ncm, cest, origem, cfop_padrao, cst_icms, aliquota_icms, 
           cst_pis, aliquota_pis, cst_cofins, aliquota_cofins,
           cst_ipi, aliquota_ipi, preco_custo, codigo, descricao, unidade
    INTO v_produto
    FROM public.produtos WHERE id = NEW.produto_id;
    
    IF FOUND THEN
      NEW.ncm := COALESCE(NEW.ncm, v_produto.ncm);
      NEW.cest := COALESCE(NEW.cest, v_produto.cest);
      NEW.origem := COALESCE(NEW.origem, v_produto.origem);
      NEW.cfop := COALESCE(NEW.cfop, v_produto.cfop_padrao);
      NEW.cst_icms := COALESCE(NEW.cst_icms, v_produto.cst_icms);
      NEW.aliquota_icms := COALESCE(NEW.aliquota_icms, v_produto.aliquota_icms);
      NEW.cst_pis := COALESCE(NEW.cst_pis, v_produto.cst_pis);
      NEW.aliquota_pis := COALESCE(NEW.aliquota_pis, v_produto.aliquota_pis);
      NEW.cst_cofins := COALESCE(NEW.cst_cofins, v_produto.cst_cofins);
      NEW.aliquota_cofins := COALESCE(NEW.aliquota_cofins, v_produto.aliquota_cofins);
      NEW.cst_ipi := COALESCE(NEW.cst_ipi, v_produto.cst_ipi);
      NEW.aliquota_ipi := COALESCE(NEW.aliquota_ipi, v_produto.aliquota_ipi);
      NEW.preco_custo := COALESCE(NEW.preco_custo, v_produto.preco_custo);
      NEW.codigo := COALESCE(NEW.codigo, v_produto.codigo);
      NEW.descricao := COALESCE(NEW.descricao, v_produto.descricao);
      NEW.unidade := COALESCE(NEW.unidade, v_produto.unidade);
    END IF;
  END IF;
  
  NEW.base_icms := NEW.valor_total;
  NEW.valor_icms := ROUND(NEW.valor_total * COALESCE(NEW.aliquota_icms, 0) / 100, 2);
  NEW.valor_pis := ROUND(NEW.valor_total * COALESCE(NEW.aliquota_pis, 0) / 100, 2);
  NEW.valor_cofins := ROUND(NEW.valor_total * COALESCE(NEW.aliquota_cofins, 0) / 100, 2);
  NEW.valor_ipi := ROUND(NEW.valor_total * COALESCE(NEW.aliquota_ipi, 0) / 100, 2);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_vendas_itens_calculate
  BEFORE INSERT OR UPDATE ON public.vendas_itens
  FOR EACH ROW EXECUTE FUNCTION public.calculate_venda_item();

-- =====================================================
-- FUNCTION: Impedir exclusão de venda com NF
-- =====================================================
CREATE OR REPLACE FUNCTION public.protect_venda_with_nfe()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.nfe_id IS NOT NULL OR OLD.nfe_chave IS NOT NULL THEN
    RAISE EXCEPTION 'Não é possível excluir venda com NF-e emitida.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_vendas_protect_nfe
  BEFORE DELETE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.protect_venda_with_nfe();

-- =====================================================
-- FUNCTION: Gerar parcelas automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_parcelas_from_pagamento()
RETURNS TRIGGER AS $$
DECLARE
  v_condicao RECORD;
  v_venda RECORD;
  v_parcela_valor DECIMAL(15,2);
  v_data_vencimento DATE;
  i INTEGER;
BEGIN
  IF NEW.condicao_pagamento_id IS NOT NULL THEN
    SELECT * INTO v_condicao FROM public.condicoes_pagamento WHERE id = NEW.condicao_pagamento_id;
    
    IF v_condicao.tipo = 'P' AND v_condicao.numero_parcelas > 1 THEN
      SELECT data_venda INTO v_venda FROM public.vendas WHERE id = NEW.venda_id;
      v_parcela_valor := ROUND(NEW.valor / v_condicao.numero_parcelas, 2);
      
      FOR i IN 1..v_condicao.numero_parcelas LOOP
        v_data_vencimento := v_venda.data_venda + 
          (v_condicao.dias_primeira_parcela + (v_condicao.intervalo_dias * (i - 1)))::INTEGER;
        
        INSERT INTO public.vendas_parcelas (
          venda_id, venda_pagamento_id, numero_parcela, 
          valor_original, valor_total, data_vencimento
        ) VALUES (
          NEW.venda_id, NEW.id, i,
          v_parcela_valor, v_parcela_valor, v_data_vencimento
        );
      END LOOP;
    ELSE
      INSERT INTO public.vendas_parcelas (
        venda_id, venda_pagamento_id, numero_parcela,
        valor_original, valor_total, data_vencimento
      ) VALUES (
        NEW.venda_id, NEW.id, 1,
        NEW.valor, NEW.valor, COALESCE(NEW.data_vencimento, CURRENT_DATE)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_vendas_pagamentos_generate_parcelas
  AFTER INSERT ON public.vendas_pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.generate_parcelas_from_pagamento();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- VENDAS
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendas_select_empresa" ON public.vendas
  FOR SELECT USING (
    empresa_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "vendas_insert_empresa" ON public.vendas
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "vendas_update_empresa" ON public.vendas
  FOR UPDATE USING (
    empresa_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "vendas_delete_empresa" ON public.vendas
  FOR DELETE USING (
    empresa_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

-- VENDAS_ITENS
ALTER TABLE public.vendas_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendas_itens_select" ON public.vendas_itens
  FOR SELECT USING (venda_id IN (SELECT id FROM public.vendas));

CREATE POLICY "vendas_itens_insert" ON public.vendas_itens
  FOR INSERT WITH CHECK (venda_id IN (SELECT id FROM public.vendas));

CREATE POLICY "vendas_itens_update" ON public.vendas_itens
  FOR UPDATE USING (venda_id IN (SELECT id FROM public.vendas));

CREATE POLICY "vendas_itens_delete" ON public.vendas_itens
  FOR DELETE USING (venda_id IN (SELECT id FROM public.vendas));

-- VENDAS_PAGAMENTOS
ALTER TABLE public.vendas_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendas_pagamentos_select" ON public.vendas_pagamentos
  FOR SELECT USING (venda_id IN (SELECT id FROM public.vendas));

CREATE POLICY "vendas_pagamentos_insert" ON public.vendas_pagamentos
  FOR INSERT WITH CHECK (venda_id IN (SELECT id FROM public.vendas));

CREATE POLICY "vendas_pagamentos_update" ON public.vendas_pagamentos
  FOR UPDATE USING (venda_id IN (SELECT id FROM public.vendas));

CREATE POLICY "vendas_pagamentos_delete" ON public.vendas_pagamentos
  FOR DELETE USING (venda_id IN (SELECT id FROM public.vendas));

-- VENDAS_PARCELAS
ALTER TABLE public.vendas_parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendas_parcelas_select" ON public.vendas_parcelas
  FOR SELECT USING (venda_id IN (SELECT id FROM public.vendas));

CREATE POLICY "vendas_parcelas_insert" ON public.vendas_parcelas
  FOR INSERT WITH CHECK (venda_id IN (SELECT id FROM public.vendas));

CREATE POLICY "vendas_parcelas_update" ON public.vendas_parcelas
  FOR UPDATE USING (venda_id IN (SELECT id FROM public.vendas));

CREATE POLICY "vendas_parcelas_delete" ON public.vendas_parcelas
  FOR DELETE USING (venda_id IN (SELECT id FROM public.vendas));

-- CONTRATOS_RECORRENTES
ALTER TABLE public.contratos_recorrentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contratos_select_empresa" ON public.contratos_recorrentes
  FOR SELECT USING (
    empresa_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "contratos_insert_empresa" ON public.contratos_recorrentes
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "contratos_update_empresa" ON public.contratos_recorrentes
  FOR UPDATE USING (
    empresa_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "contratos_delete_empresa" ON public.contratos_recorrentes
  FOR DELETE USING (
    empresa_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );