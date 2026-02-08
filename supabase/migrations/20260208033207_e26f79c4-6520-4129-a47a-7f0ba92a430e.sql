
-- ===========================================================
-- CORREÇÃO: Adaptar função MRP para schema existente
-- ===========================================================

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
    -- Adaptado para schema existente (português)
    FOR v_demand IN (
        SELECT 
            soi.product_id,
            SUM(soi.quantidade) as qty,
            MIN(COALESCE(so.data_entrega_prevista, CURRENT_DATE + 7))::DATE as due_date,
            'sales_order' as source_type,
            so.id as source_id
        FROM sales_order_items soi
        JOIN sales_orders so ON so.id = soi.sales_order_id
        JOIN products p ON p.id = soi.product_id
        WHERE so.company_id = p_company_id
        AND so.status IN ('pending', 'confirmed', 'processing', 'aguardando', 'confirmado')
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
                v_net_req,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.run_mrp_calculation(UUID, INTEGER) TO authenticated;
