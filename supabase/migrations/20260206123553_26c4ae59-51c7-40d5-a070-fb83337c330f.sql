-- =============================================
-- AUTOMAÇÃO DE ESTOQUE: ENTRADAS E VENDAS
-- =============================================

-- 1. Criar tabela de entradas de compra (se não existir)
CREATE TABLE IF NOT EXISTS public.purchase_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  supplier_id UUID REFERENCES public.counterparties(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number TEXT,
  invoice_series TEXT,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'confirmada', 'cancelada')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Criar tabela de itens da entrada
CREATE TABLE IF NOT EXISTS public.purchase_entry_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.purchase_entries(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC(15,4) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(15,4) NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Adicionar coluna reason em stock_movements se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'reason') THEN
    ALTER TABLE public.stock_movements ADD COLUMN reason TEXT;
  END IF;
END $$;

-- 4. Habilitar RLS nas novas tabelas
ALTER TABLE public.purchase_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_entry_items ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para purchase_entries
DROP POLICY IF EXISTS "Users can view their company purchase entries" ON public.purchase_entries;
CREATE POLICY "Users can view their company purchase entries" 
ON public.purchase_entries FOR SELECT 
USING (public.user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert their company purchase entries" ON public.purchase_entries;
CREATE POLICY "Users can insert their company purchase entries" 
ON public.purchase_entries FOR INSERT 
WITH CHECK (public.user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "Users can update their company purchase entries" ON public.purchase_entries;
CREATE POLICY "Users can update their company purchase entries" 
ON public.purchase_entries FOR UPDATE 
USING (public.user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "Users can delete their company purchase entries" ON public.purchase_entries;
CREATE POLICY "Users can delete their company purchase entries" 
ON public.purchase_entries FOR DELETE 
USING (public.user_belongs_to_company(company_id));

-- 6. Políticas RLS para purchase_entry_items
DROP POLICY IF EXISTS "Users can manage entry items via entry" ON public.purchase_entry_items;
CREATE POLICY "Users can manage entry items via entry" 
ON public.purchase_entry_items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_entries pe 
    WHERE pe.id = entry_id AND public.user_belongs_to_company(pe.company_id)
  )
);

-- 7. Função RPC para processar entrada de compra
CREATE OR REPLACE FUNCTION public.process_purchase_entry(p_entry_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry RECORD;
  v_item RECORD;
  v_old_stock NUMERIC;
  v_old_cost NUMERIC;
  v_new_stock NUMERIC;
  v_new_cost NUMERIC;
  v_processed_count INT := 0;
BEGIN
  -- Buscar entrada
  SELECT * INTO v_entry FROM purchase_entries WHERE id = p_entry_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Entrada não encontrada');
  END IF;
  
  IF v_entry.status = 'confirmada' THEN
    RETURN json_build_object('success', false, 'error', 'Entrada já foi confirmada');
  END IF;

  -- Processar cada item
  FOR v_item IN SELECT * FROM purchase_entry_items WHERE entry_id = p_entry_id LOOP
    -- Buscar estoque e custo atual do produto
    SELECT COALESCE(current_stock, 0), COALESCE(cost_price, 0) 
    INTO v_old_stock, v_old_cost
    FROM products WHERE id = v_item.product_id;
    
    -- Calcular novo estoque
    v_new_stock := v_old_stock + v_item.quantity;
    
    -- Calcular custo médio ponderado
    IF v_new_stock > 0 THEN
      v_new_cost := ((v_old_stock * v_old_cost) + (v_item.quantity * v_item.unit_cost)) / v_new_stock;
    ELSE
      v_new_cost := v_item.unit_cost;
    END IF;
    
    -- Atualizar produto
    UPDATE products 
    SET current_stock = v_new_stock,
        cost_price = v_new_cost,
        updated_at = now()
    WHERE id = v_item.product_id;
    
    -- Registrar movimentação de estoque
    INSERT INTO stock_movements (
      company_id, product_id, movement_type, quantity, 
      unit_cost, reference_type, reference_id, reason, created_at
    ) VALUES (
      v_entry.company_id, v_item.product_id, 'entrada', v_item.quantity,
      v_item.unit_cost, 'purchase_entry', p_entry_id, 'Entrada de compra', now()
    );
    
    v_processed_count := v_processed_count + 1;
  END LOOP;
  
  -- Atualizar status da entrada
  UPDATE purchase_entries 
  SET status = 'confirmada', updated_at = now() 
  WHERE id = p_entry_id;
  
  -- Criar conta a pagar (transação financeira)
  IF v_entry.total_amount > 0 THEN
    INSERT INTO transactions (
      company_id, direction, description, total_amount, original_amount,
      transaction_date, due_date, status, document_number
    ) VALUES (
      v_entry.company_id, 'saida', 
      'Entrada de Mercadoria - NF ' || COALESCE(v_entry.invoice_number, 'S/N'),
      v_entry.total_amount, v_entry.total_amount,
      v_entry.entry_date, v_entry.entry_date + INTERVAL '30 days',
      'lancado', v_entry.invoice_number
    );
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'processed_items', v_processed_count,
    'message', 'Entrada processada com sucesso'
  );
END;
$$;

-- 8. Função trigger para dedução de estoque em vendas
CREATE OR REPLACE FUNCTION public.process_sale_stock_deduction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Só processa se o status mudou para faturado ou entregue
  IF NEW.status IN ('faturado', 'entregue') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('faturado', 'entregue')) THEN
    
    -- Processar cada item do pedido
    FOR v_item IN SELECT * FROM sales_order_items WHERE order_id = NEW.id LOOP
      -- Deduzir estoque (nunca abaixo de zero)
      UPDATE products 
      SET current_stock = GREATEST(0, COALESCE(current_stock, 0) - v_item.quantity),
          updated_at = now()
      WHERE id = v_item.product_id;
      
      -- Registrar movimentação de saída
      INSERT INTO stock_movements (
        company_id, product_id, movement_type, quantity,
        unit_cost, reference_type, reference_id, reason, created_at
      ) VALUES (
        NEW.company_id, v_item.product_id, 'saida', v_item.quantity,
        v_item.unit_price, 'sales_order', NEW.id, 'Venda - Pedido ' || NEW.order_number, now()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 9. Criar trigger para vendas
DROP TRIGGER IF EXISTS trigger_sale_stock_deduction ON public.sales_orders;
CREATE TRIGGER trigger_sale_stock_deduction
  AFTER UPDATE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.process_sale_stock_deduction();

-- 10. Índices de performance
CREATE INDEX IF NOT EXISTS idx_purchase_entries_company_date ON public.purchase_entries(company_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_entries_status ON public.purchase_entries(status) WHERE status = 'rascunho';
CREATE INDEX IF NOT EXISTS idx_purchase_entry_items_entry ON public.purchase_entry_items(entry_id);
CREATE INDEX IF NOT EXISTS idx_purchase_entry_items_product ON public.purchase_entry_items(product_id);

-- 11. Habilitar Realtime para stock_movements
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;