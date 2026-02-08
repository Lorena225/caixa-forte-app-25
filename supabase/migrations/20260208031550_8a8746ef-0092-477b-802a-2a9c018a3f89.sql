
-- ===========================================================
-- CORREÇÕES CRÍTICAS PARA O MÓDULO PCP/MRP
-- ===========================================================

-- 1. Adicionar campo product_type à tabela products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'purchased' 
CHECK (product_type IN ('purchased', 'manufactured', 'raw_material', 'semi_finished', 'service'));

COMMENT ON COLUMN products.product_type IS 'Tipo do produto: purchased (comprado), manufactured (fabricado), raw_material (matéria-prima), semi_finished (semi-acabado), service (serviço)';

-- 2. Adicionar campo sku (alias para code se necessário)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS sku TEXT;

-- Sincronizar SKU com code para produtos existentes
UPDATE products SET sku = code WHERE sku IS NULL;

-- 3. Corrigir função explode_bom para usar code ao invés de sku
CREATE OR REPLACE FUNCTION public.explode_bom(
    p_bom_id UUID,
    p_quantity NUMERIC DEFAULT 1
)
RETURNS TABLE (
    level INTEGER,
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    required_quantity NUMERIC,
    is_manufactured BOOLEAN,
    has_bom BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE bom_explosion AS (
        -- Base: componentes diretos
        SELECT 
            1 as lvl,
            bc.component_product_id,
            p.name as prod_name,
            COALESCE(p.sku, p.code) as prod_sku,
            bc.quantity * p_quantity * (1 + COALESCE(bc.scrap_rate, 0) / 100) as req_qty,
            COALESCE(p.product_type, 'purchased') = 'manufactured' as is_manuf,
            EXISTS (SELECT 1 FROM industrial_boms ib WHERE ib.product_id = bc.component_product_id AND ib.status = 'active') as has_bom_flag
        FROM bom_components bc
        JOIN products p ON p.id = bc.component_product_id
        WHERE bc.bom_id = p_bom_id
        
        UNION ALL
        
        -- Recursão: sub-componentes
        SELECT 
            be.lvl + 1,
            bc.component_product_id,
            p.name,
            COALESCE(p.sku, p.code),
            bc.quantity * be.req_qty * (1 + COALESCE(bc.scrap_rate, 0) / 100),
            COALESCE(p.product_type, 'purchased') = 'manufactured',
            EXISTS (SELECT 1 FROM industrial_boms ib WHERE ib.product_id = bc.component_product_id AND ib.status = 'active')
        FROM bom_explosion be
        JOIN industrial_boms ib ON ib.product_id = be.component_product_id AND ib.status = 'active'
        JOIN bom_components bc ON bc.bom_id = ib.id
        JOIN products p ON p.id = bc.component_product_id
        WHERE be.lvl < 10 -- limite de profundidade
    )
    SELECT 
        lvl, 
        component_product_id, 
        prod_name, 
        prod_sku, 
        SUM(req_qty), 
        is_manuf, 
        has_bom_flag
    FROM bom_explosion
    GROUP BY lvl, component_product_id, prod_name, prod_sku, is_manuf, has_bom_flag
    ORDER BY lvl, prod_name;
END;
$$;

-- 4. Corrigir função run_mrp_calculation para usar COALESCE
CREATE OR REPLACE FUNCTION public.run_mrp_calculation(
    p_company_id UUID,
    p_horizon_days INTEGER DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID := gen_random_uuid();
    v_demand RECORD;
    v_product RECORD;
    v_available NUMERIC;
    v_reserved NUMERIC;
    v_net_req NUMERIC;
    v_has_bom BOOLEAN;
    v_lead_time INTEGER;
    v_order_date DATE;
BEGIN
    -- Verificar permissão
    IF NOT user_belongs_to_company(p_company_id) THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;
    
    -- 1. Coletar demandas (Pedidos de Venda pendentes)
    FOR v_demand IN (
        SELECT 
            soi.product_id,
            SUM(soi.quantity) as qty,
            MIN(COALESCE(so.expected_delivery_date, CURRENT_DATE + INTERVAL '7 days'))::DATE as due_date,
            'sales_order' as source_type,
            so.id as source_id
        FROM sales_order_items soi
        JOIN sales_orders so ON so.id = soi.order_id
        JOIN products p ON p.id = soi.product_id
        WHERE so.company_id = p_company_id
        AND so.status IN ('pending', 'confirmed', 'processing')
        AND COALESCE(p.product_type, 'purchased') IN ('manufactured', 'purchased', 'raw_material', 'semi_finished')
        GROUP BY soi.product_id, so.id
    )
    LOOP
        -- Verificar estoque disponível
        SELECT 
            COALESCE(current_stock, 0),
            0 -- reserved placeholder
        INTO v_available, v_reserved
        FROM products 
        WHERE id = v_demand.product_id;
        
        -- Calcular necessidade líquida
        v_net_req := GREATEST(0, v_demand.qty - v_available + v_reserved);
        
        IF v_net_req > 0 THEN
            -- Verificar se tem BOM (produto fabricado)
            SELECT EXISTS (
                SELECT 1 FROM industrial_boms 
                WHERE product_id = v_demand.product_id 
                AND status = 'active'
            ) INTO v_has_bom;
            
            -- Obter lead time
            SELECT COALESCE(standard_lead_time_days, 7) INTO v_lead_time
            FROM industrial_boms 
            WHERE product_id = v_demand.product_id 
            AND status = 'active'
            LIMIT 1;
            
            v_order_date := v_demand.due_date - (COALESCE(v_lead_time, 7) || ' days')::INTERVAL;
            
            -- Inserir necessidade
            INSERT INTO mrp_requirements (
                id,
                company_id,
                calculation_run_id,
                product_id,
                requirement_type,
                source_type,
                source_id,
                required_date,
                gross_requirement,
                available_stock,
                reserved_stock,
                net_requirement,
                suggested_order_qty,
                suggested_order_date,
                status
            ) VALUES (
                gen_random_uuid(),
                p_company_id,
                v_run_id,
                v_demand.product_id,
                CASE WHEN v_has_bom THEN 'production' ELSE 'purchase' END,
                v_demand.source_type,
                v_demand.source_id,
                v_demand.due_date,
                v_demand.qty,
                v_available,
                v_reserved,
                v_net_req,
                v_net_req, -- quantidade sugerida = necessidade líquida
                v_order_date,
                'pending'
            );
            
            -- Se produto fabricado, explodir BOM e criar sub-necessidades
            IF v_has_bom THEN
                INSERT INTO mrp_requirements (
                    id,
                    company_id,
                    calculation_run_id,
                    product_id,
                    requirement_type,
                    source_type,
                    required_date,
                    gross_requirement,
                    available_stock,
                    net_requirement,
                    suggested_order_qty,
                    suggested_order_date,
                    status
                )
                SELECT
                    gen_random_uuid(),
                    p_company_id,
                    v_run_id,
                    e.product_id,
                    CASE WHEN e.has_bom THEN 'production' ELSE 'purchase' END,
                    'bom_explosion',
                    v_demand.due_date,
                    e.required_quantity,
                    COALESCE((SELECT current_stock FROM products WHERE id = e.product_id), 0),
                    GREATEST(0, e.required_quantity - COALESCE((SELECT current_stock FROM products WHERE id = e.product_id), 0)),
                    GREATEST(0, e.required_quantity - COALESCE((SELECT current_stock FROM products WHERE id = e.product_id), 0)),
                    CURRENT_DATE,
                    'pending'
                FROM explode_bom(
                    (SELECT id FROM industrial_boms WHERE product_id = v_demand.product_id AND status = 'active' LIMIT 1),
                    v_net_req
                ) e
                WHERE e.required_quantity > 0;
            END IF;
        END IF;
    END LOOP;
    
    RETURN v_run_id;
END;
$$;

-- 5. Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.explode_bom(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_mrp_calculation(UUID, INTEGER) TO authenticated;
