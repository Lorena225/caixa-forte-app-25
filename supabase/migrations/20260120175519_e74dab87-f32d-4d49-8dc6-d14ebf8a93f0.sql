
-- =====================================================
-- EXTEND COUNTERPARTIES TABLE
-- =====================================================
ALTER TABLE counterparties 
ADD COLUMN IF NOT EXISTS prazo_pagamento_padrao INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS desconto_padrao NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS juros_padrao NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS multa_padrao NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating INTEGER,
ADD COLUMN IF NOT EXISTS limite_credito NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS credito_utilizado NUMERIC(15,2) DEFAULT 0;

-- =====================================================
-- CONTRACTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('cliente', 'fornecedor')),
  counterparty_id UUID NOT NULL REFERENCES counterparties(id) ON DELETE RESTRICT,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  renovacao_automatica BOOLEAN DEFAULT FALSE,
  condicoes_comerciais_json JSONB DEFAULT '{}',
  alertar_antes_dias INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('rascunho', 'ativo', 'suspenso', 'encerrado', 'cancelado')),
  valor_total NUMERIC(15,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, contract_number)
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_all" ON contracts FOR ALL USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- CONTRACT ALERTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS contract_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  data_alerta DATE NOT NULL,
  tipo_alerta TEXT NOT NULL CHECK (tipo_alerta IN ('vencimento', 'renovacao', 'revisao', 'custom')),
  mensagem TEXT,
  enviado BOOLEAN DEFAULT FALSE,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contract_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contract_alerts_all" ON contract_alerts FOR ALL 
  USING (contract_id IN (SELECT id FROM contracts WHERE public.user_belongs_to_company(company_id)));

-- =====================================================
-- RETURNS TABLE (DEVOLUÇÕES)
-- =====================================================
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  return_number TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('produto', 'fiscal')),
  origem TEXT NOT NULL CHECK (origem IN ('venda', 'compra')),
  documento_origem_id UUID,
  counterparty_id UUID REFERENCES counterparties(id),
  data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_conclusao DATE,
  motivo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_analise', 'aprovado', 'rejeitado', 'concluido')),
  valor_total NUMERIC(15,2),
  dados_json JSONB DEFAULT '{}',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, return_number)
);

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "returns_all" ON returns FOR ALL USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- RETURN ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantidade NUMERIC(15,4) NOT NULL,
  valor_unitario NUMERIC(15,4),
  valor_total NUMERIC(15,2),
  motivo_item TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "return_items_all" ON return_items FOR ALL 
  USING (return_id IN (SELECT id FROM returns WHERE public.user_belongs_to_company(company_id)));

-- =====================================================
-- SALES ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  quotation_id UUID,
  counterparty_id UUID REFERENCES counterparties(id),
  seller_id UUID,
  data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista DATE,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'confirmado', 'em_separacao', 'faturado', 'entregue', 'cancelado')),
  condicao_pagamento TEXT,
  valor_produtos NUMERIC(15,2) DEFAULT 0,
  valor_desconto NUMERIC(15,2) DEFAULT 0,
  valor_frete NUMERIC(15,2) DEFAULT 0,
  valor_total NUMERIC(15,2) DEFAULT 0,
  observacoes TEXT,
  observacoes_internas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, order_number)
);

ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_orders_all" ON sales_orders FOR ALL USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- SALES ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  descricao TEXT NOT NULL,
  quantidade NUMERIC(15,4) NOT NULL,
  quantidade_entregue NUMERIC(15,4) DEFAULT 0,
  valor_unitario NUMERIC(15,4) NOT NULL,
  percentual_desconto NUMERIC(5,2) DEFAULT 0,
  valor_desconto NUMERIC(15,2) DEFAULT 0,
  valor_total NUMERIC(15,2) NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_order_items_all" ON sales_order_items FOR ALL 
  USING (sales_order_id IN (SELECT id FROM sales_orders WHERE public.user_belongs_to_company(company_id)));

-- =====================================================
-- INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  serie TEXT DEFAULT '1',
  sales_order_id UUID REFERENCES sales_orders(id),
  counterparty_id UUID REFERENCES counterparties(id),
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_saida DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'emitida', 'cancelada', 'inutilizada')),
  chave_nfe TEXT,
  protocolo_autorizacao TEXT,
  valor_produtos NUMERIC(15,2) DEFAULT 0,
  valor_desconto NUMERIC(15,2) DEFAULT 0,
  valor_frete NUMERIC(15,2) DEFAULT 0,
  valor_icms NUMERIC(15,2) DEFAULT 0,
  valor_ipi NUMERIC(15,2) DEFAULT 0,
  valor_pis NUMERIC(15,2) DEFAULT 0,
  valor_cofins NUMERIC(15,2) DEFAULT 0,
  valor_total NUMERIC(15,2) DEFAULT 0,
  observacoes TEXT,
  xml_nfe TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, invoice_number, serie)
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_all" ON invoices FOR ALL USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- INVOICE ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  descricao TEXT NOT NULL,
  ncm TEXT,
  cfop TEXT,
  quantidade NUMERIC(15,4) NOT NULL,
  valor_unitario NUMERIC(15,4) NOT NULL,
  valor_desconto NUMERIC(15,2) DEFAULT 0,
  valor_total NUMERIC(15,2) NOT NULL,
  icms_base NUMERIC(15,2) DEFAULT 0,
  icms_aliquota NUMERIC(5,2) DEFAULT 0,
  icms_valor NUMERIC(15,2) DEFAULT 0,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_items_all" ON invoice_items FOR ALL 
  USING (invoice_id IN (SELECT id FROM invoices WHERE public.user_belongs_to_company(company_id)));

-- =====================================================
-- SALES COMMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  sales_order_id UUID REFERENCES sales_orders(id),
  data_venda DATE NOT NULL,
  percentual_comissao NUMERIC(5,2) NOT NULL,
  valor_base NUMERIC(15,2) NOT NULL,
  valor_comissao NUMERIC(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'paga', 'cancelada')),
  data_aprovacao DATE,
  data_pagamento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sales_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_commissions_all" ON sales_commissions FOR ALL USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- COSTING ACTIVITIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS costing_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cost_pool NUMERIC(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

ALTER TABLE costing_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "costing_activities_all" ON costing_activities FOR ALL USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- COST DRIVERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cost_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES costing_activities(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  total_quantity NUMERIC(15,4) DEFAULT 0,
  rate_per_unit NUMERIC(15,6) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

ALTER TABLE cost_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_drivers_all" ON cost_drivers FOR ALL USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- PRODUCT COST ALLOCATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS product_cost_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES cost_drivers(id) ON DELETE CASCADE,
  quantity_consumed NUMERIC(15,4) NOT NULL,
  allocated_cost NUMERIC(15,2) DEFAULT 0,
  periodo_ref DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_cost_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_cost_allocations_all" ON product_cost_allocations FOR ALL USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- BREAKEVEN PARAMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS breakeven_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  periodo_ref DATE NOT NULL,
  custos_fixos NUMERIC(15,2) NOT NULL DEFAULT 0,
  custos_variaveis_unitario NUMERIC(15,4) NOT NULL DEFAULT 0,
  preco_venda_unitario NUMERIC(15,4) NOT NULL DEFAULT 0,
  margem_contribuicao_unitaria NUMERIC(15,4) DEFAULT 0,
  margem_contribuicao_percentual NUMERIC(5,2) DEFAULT 0,
  ponto_equilibrio_qtd NUMERIC(15,4) DEFAULT 0,
  ponto_equilibrio_valor NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE breakeven_params ENABLE ROW LEVEL SECURITY;
CREATE POLICY "breakeven_params_all" ON breakeven_params FOR ALL USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- OPERATING LEVERAGE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS operating_leverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  periodo_ref DATE NOT NULL,
  receita_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  custos_variaveis_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  margem_contribuicao_total NUMERIC(15,2) DEFAULT 0,
  custos_fixos_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  lucro_operacional NUMERIC(15,2) DEFAULT 0,
  grau_alavancagem_operacional NUMERIC(10,4) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, periodo_ref)
);

ALTER TABLE operating_leverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "operating_leverage_all" ON operating_leverage FOR ALL USING (public.user_belongs_to_company(company_id));
