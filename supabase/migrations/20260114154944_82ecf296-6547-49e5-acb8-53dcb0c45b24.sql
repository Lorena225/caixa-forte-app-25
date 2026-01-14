-- Create Products table first
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'UN',
  category TEXT,
  brand TEXT,
  ncm TEXT,
  barcode TEXT,
  cost_price NUMERIC DEFAULT 0,
  sale_price NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  max_stock NUMERIC,
  current_stock NUMERIC DEFAULT 0,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "Users can view products for their company" ON public.products
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create products for their company" ON public.products
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update products for their company" ON public.products
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete products for their company" ON public.products
  FOR DELETE USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Create index
CREATE INDEX IF NOT EXISTS idx_products_company ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(code);

-- Now create Stock Movements table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'saida', 'ajuste', 'transferencia')),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  source_destination TEXT,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventories table
CREATE TABLE IF NOT EXISTS public.inventories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  inventory_code TEXT NOT NULL,
  inventory_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido', 'cancelado')),
  responsible_user_id UUID,
  total_items INTEGER DEFAULT 0,
  discrepancy_count INTEGER DEFAULT 0,
  notes TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory Items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.inventories(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  expected_qty NUMERIC NOT NULL DEFAULT 0,
  counted_qty NUMERIC,
  difference NUMERIC GENERATED ALWAYS AS (COALESCE(counted_qty, 0) - expected_qty) STORED,
  adjusted BOOLEAN DEFAULT false,
  notes TEXT,
  counted_by UUID,
  counted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Purchase Orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  supplier_id UUID REFERENCES public.counterparties(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'parcial', 'recebido', 'cancelado')),
  payment_condition TEXT,
  expected_delivery DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  freight NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Purchase Order Items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL,
  received_qty NUMERIC DEFAULT 0,
  unit_price NUMERIC NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quotations table
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  quote_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  supplier_id UUID REFERENCES public.counterparties(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'convertido')),
  validity_date DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  freight NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quotation Items table
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Purchase Receipts table
CREATE TABLE IF NOT EXISTS public.purchase_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  receipt_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.counterparties(id) ON DELETE SET NULL,
  invoice_number TEXT,
  total_items INTEGER DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  notes TEXT,
  received_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Purchase Receipt Items table
CREATE TABLE IF NOT EXISTS public.purchase_receipt_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.purchase_order_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity_received NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipt_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_movements
CREATE POLICY "Users can view stock movements" ON public.stock_movements
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create stock movements" ON public.stock_movements
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update stock movements" ON public.stock_movements
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for inventories
CREATE POLICY "Users can view inventories" ON public.inventories
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create inventories" ON public.inventories
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update inventories" ON public.inventories
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for inventory_items
CREATE POLICY "Users can manage inventory items" ON public.inventory_items
  FOR ALL USING (inventory_id IN (
    SELECT id FROM public.inventories WHERE company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

-- RLS Policies for purchase_orders
CREATE POLICY "Users can view purchase orders" ON public.purchase_orders
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create purchase orders" ON public.purchase_orders
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update purchase orders" ON public.purchase_orders
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for purchase_order_items
CREATE POLICY "Users can manage purchase order items" ON public.purchase_order_items
  FOR ALL USING (order_id IN (
    SELECT id FROM public.purchase_orders WHERE company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

-- RLS Policies for quotations
CREATE POLICY "Users can view quotations" ON public.quotations
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create quotations" ON public.quotations
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update quotations" ON public.quotations
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for quotation_items
CREATE POLICY "Users can manage quotation items" ON public.quotation_items
  FOR ALL USING (quotation_id IN (
    SELECT id FROM public.quotations WHERE company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

-- RLS Policies for purchase_receipts
CREATE POLICY "Users can view purchase receipts" ON public.purchase_receipts
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create purchase receipts" ON public.purchase_receipts
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for purchase_receipt_items
CREATE POLICY "Users can manage purchase receipt items" ON public.purchase_receipt_items
  FOR ALL USING (receipt_id IN (
    SELECT id FROM public.purchase_receipts WHERE company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON public.stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON public.stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_inventories_company ON public.inventories(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON public.purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_quotations_company ON public.quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_company ON public.purchase_receipts(company_id);