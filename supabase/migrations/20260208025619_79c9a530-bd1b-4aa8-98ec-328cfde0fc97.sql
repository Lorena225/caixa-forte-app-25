-- ===========================================================
-- MOTOR MRP E FUNÇÕES DE AUTOMAÇÃO
-- ===========================================================

-- 1. FUNÇÃO: Explodir BOM Multinível (Recursiva)
-- ===========================================================
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
            p.sku as prod_sku,
            bc.quantity * p_quantity * (1 + COALESCE(bc.scrap_rate, 0) / 100) as req_qty,
            p.product_type = 'manufactured' as is_manuf,
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
            p.sku,
            bc.quantity * be.req_qty * (1 + COALESCE(bc.scrap_rate, 0) / 100),
            p.product_type = 'manufactured',
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

-- 2. FUNÇÃO: Cálculo MRP Completo
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
    
    -- 1. Coletar demandas (Pedidos de Venda pendentes + Previsões)
    FOR v_demand IN (
        -- Demanda de Pedidos de Venda
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
        AND p.product_type IN ('manufactured', 'purchased')
        GROUP BY soi.product_id, so.id
        
        UNION ALL
        
        -- Demanda de Previsão
        SELECT 
            sf.product_id,
            sf.quantity as qty,
            sf.forecast_date as due_date,
            'forecast' as source_type,
            sf.id as source_id
        FROM stock_forecasts sf
        JOIN products p ON p.id = sf.product_id
        WHERE sf.company_id = p_company_id
        AND sf.forecast_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (p_horizon_days || ' days')::INTERVAL
    )
    LOOP
        -- Obter estoque disponível
        SELECT COALESCE(current_stock, 0) INTO v_available
        FROM products WHERE id = v_demand.product_id;
        
        -- Obter estoque reservado
        SELECT COALESCE(SUM(quantity), 0) INTO v_reserved
        FROM inventory_reservations
        WHERE product_id = v_demand.product_id
        AND status = 'reserved';
        
        -- Calcular necessidade líquida
        v_net_req := v_demand.qty - (v_available - v_reserved);
        
        IF v_net_req > 0 THEN
            -- Verificar se tem BOM (é fabricado)
            SELECT EXISTS (
                SELECT 1 FROM industrial_boms 
                WHERE product_id = v_demand.product_id 
                AND status = 'active'
            ) INTO v_has_bom;
            
            -- Obter lead time
            SELECT COALESCE(
                (SELECT standard_lead_time_days FROM industrial_boms 
                 WHERE product_id = v_demand.product_id AND status = 'active' LIMIT 1),
                (SELECT lead_time_days FROM products WHERE id = v_demand.product_id),
                7
            ) INTO v_lead_time;
            
            v_order_date := v_demand.due_date - (v_lead_time || ' days')::INTERVAL;
            
            -- Inserir requisição MRP
            INSERT INTO mrp_requirements (
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
                suggested_order_date
            ) VALUES (
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
                v_order_date
            );
        END IF;
    END LOOP;
    
    -- 2. Explosão de BOM para itens de produção (gera demandas de nível inferior)
    FOR v_product IN (
        SELECT mr.id, mr.product_id, mr.net_requirement
        FROM mrp_requirements mr
        WHERE mr.calculation_run_id = v_run_id
        AND mr.requirement_type = 'production'
    )
    LOOP
        -- Explodir BOM e criar requisições para componentes
        INSERT INTO mrp_requirements (
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
            suggested_order_date
        )
        SELECT 
            p_company_id,
            v_run_id,
            e.product_id,
            CASE WHEN e.has_bom THEN 'production' ELSE 'purchase' END,
            'mrp_explosion',
            v_product.id,
            CURRENT_DATE + INTERVAL '7 days',
            e.required_quantity,
            COALESCE((SELECT current_stock FROM products WHERE id = e.product_id), 0),
            0,
            GREATEST(0, e.required_quantity - COALESCE((SELECT current_stock FROM products WHERE id = e.product_id), 0)),
            GREATEST(0, e.required_quantity - COALESCE((SELECT current_stock FROM products WHERE id = e.product_id), 0)),
            CURRENT_DATE
        FROM explode_bom(
            (SELECT id FROM industrial_boms WHERE product_id = v_product.product_id AND status = 'active' LIMIT 1),
            v_product.net_requirement
        ) e
        WHERE e.required_quantity > COALESCE((SELECT current_stock FROM products WHERE id = e.product_id), 0);
    END LOOP;
    
    RETURN v_run_id;
END;
$$;

-- 3. FUNÇÃO: Criar OP a partir de Pedido de Venda
-- ===========================================================
CREATE OR REPLACE FUNCTION public.create_production_order_from_sales(
    p_sales_order_id UUID,
    p_sales_order_item_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id UUID;
    v_po_id UUID;
    v_order_number TEXT;
    v_item RECORD;
    v_bom_id UUID;
    v_routing_id UUID;
    v_operation RECORD;
    v_component RECORD;
    v_standard_material NUMERIC := 0;
    v_standard_labor NUMERIC := 0;
BEGIN
    -- Obter company_id
    SELECT company_id INTO v_company_id 
    FROM sales_orders WHERE id = p_sales_order_id;
    
    IF NOT user_belongs_to_company(v_company_id) THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;
    
    -- Gerar número da OP
    SELECT 'OP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
           LPAD((COUNT(*) + 1)::TEXT, 4, '0') INTO v_order_number
    FROM production_orders 
    WHERE company_id = v_company_id 
    AND created_at::DATE = CURRENT_DATE;
    
    -- Processar item do pedido
    FOR v_item IN (
        SELECT soi.*, p.name as product_name
        FROM sales_order_items soi
        JOIN products p ON p.id = soi.product_id
        WHERE soi.order_id = p_sales_order_id
        AND (p_sales_order_item_id IS NULL OR soi.id = p_sales_order_item_id)
        AND p.product_type = 'manufactured'
    )
    LOOP
        -- Buscar BOM ativa
        SELECT id INTO v_bom_id
        FROM industrial_boms 
        WHERE product_id = v_item.product_id 
        AND status = 'active'
        ORDER BY created_at DESC LIMIT 1;
        
        -- Buscar Roteiro ativo
        SELECT id INTO v_routing_id
        FROM industrial_routings 
        WHERE product_id = v_item.product_id 
        AND status = 'active'
        ORDER BY created_at DESC LIMIT 1;
        
        -- Calcular custo padrão de materiais
        SELECT COALESCE(SUM(bc.quantity * v_item.quantity * p.cost_price), 0) INTO v_standard_material
        FROM bom_components bc
        JOIN products p ON p.id = bc.component_product_id
        WHERE bc.bom_id = v_bom_id;
        
        -- Calcular custo padrão de mão de obra
        SELECT COALESCE(SUM(
            (ro.setup_time_minutes + ro.run_time_minutes * v_item.quantity) / 60.0 * wc.hourly_cost
        ), 0) INTO v_standard_labor
        FROM routing_operations ro
        JOIN work_centers wc ON wc.id = ro.work_center_id
        WHERE ro.routing_id = v_routing_id;
        
        -- Criar OP
        INSERT INTO production_orders (
            company_id,
            order_number,
            product_id,
            bom_id,
            routing_id,
            sales_order_id,
            sales_order_item_id,
            quantity_planned,
            planned_start_date,
            planned_end_date,
            standard_material_cost,
            standard_labor_cost,
            created_by
        ) VALUES (
            v_company_id,
            v_order_number,
            v_item.product_id,
            v_bom_id,
            v_routing_id,
            p_sales_order_id,
            v_item.id,
            v_item.quantity,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP + INTERVAL '7 days',
            v_standard_material,
            v_standard_labor,
            auth.uid()
        )
        RETURNING id INTO v_po_id;
        
        -- Criar operações da OP
        FOR v_operation IN (
            SELECT * FROM routing_operations 
            WHERE routing_id = v_routing_id 
            ORDER BY operation_number
        )
        LOOP
            INSERT INTO production_order_operations (
                production_order_id,
                routing_operation_id,
                operation_number,
                operation_name,
                work_center_id,
                planned_setup_time,
                planned_run_time
            ) VALUES (
                v_po_id,
                v_operation.id,
                v_operation.operation_number,
                v_operation.operation_name,
                v_operation.work_center_id,
                v_operation.setup_time_minutes,
                v_operation.run_time_minutes * v_item.quantity
            );
        END LOOP;
        
        -- Criar lista de materiais planejados
        FOR v_component IN (
            SELECT bc.*, p.cost_price
            FROM bom_components bc
            JOIN products p ON p.id = bc.component_product_id
            WHERE bc.bom_id = v_bom_id
        )
        LOOP
            INSERT INTO production_material_consumption (
                production_order_id,
                product_id,
                planned_quantity,
                unit_cost
            ) VALUES (
                v_po_id,
                v_component.component_product_id,
                v_component.quantity * v_item.quantity * (1 + COALESCE(v_component.scrap_rate, 0) / 100),
                v_component.cost_price
            );
        END LOOP;
        
        -- Atualizar número para próximo item
        v_order_number := v_order_number || '-' || LPAD(v_item.id::TEXT, 2, '0');
    END LOOP;
    
    RETURN v_po_id;
END;
$$;

-- 4. FUNÇÃO: Fechar OP com Backflushing
-- ===========================================================
CREATE OR REPLACE FUNCTION public.close_production_order(
    p_production_order_id UUID,
    p_quantity_completed NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_po RECORD;
    v_material RECORD;
    v_total_material_cost NUMERIC := 0;
    v_total_labor_cost NUMERIC := 0;
    v_variance NUMERIC;
BEGIN
    -- Obter dados da OP
    SELECT * INTO v_po
    FROM production_orders 
    WHERE id = p_production_order_id;
    
    IF NOT user_belongs_to_company(v_po.company_id) THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;
    
    IF v_po.status = 'completed' THEN
        RAISE EXCEPTION 'OP já finalizada';
    END IF;
    
    -- 1. BACKFLUSHING: Consumir materiais do estoque
    FOR v_material IN (
        SELECT pmc.*, p.current_stock, p.cost_price, p.name as product_name
        FROM production_material_consumption pmc
        JOIN products p ON p.id = pmc.product_id
        WHERE pmc.production_order_id = p_production_order_id
    )
    LOOP
        -- Calcular quantidade proporcional
        DECLARE
            v_consumed_qty NUMERIC;
        BEGIN
            v_consumed_qty := (v_material.planned_quantity / v_po.quantity_planned) * p_quantity_completed;
            
            -- Atualizar consumo
            UPDATE production_material_consumption
            SET consumed_quantity = v_consumed_qty,
                total_cost = v_consumed_qty * v_material.cost_price,
                consumed_at = NOW()
            WHERE id = v_material.id;
            
            -- Baixar estoque
            UPDATE products
            SET current_stock = GREATEST(0, current_stock - v_consumed_qty),
                updated_at = NOW()
            WHERE id = v_material.product_id;
            
            -- Registrar movimentação
            INSERT INTO stock_movements (
                company_id,
                product_id,
                movement_type,
                quantity,
                unit_cost,
                reference_type,
                reference_id,
                notes
            ) VALUES (
                v_po.company_id,
                v_material.product_id,
                'saida',
                v_consumed_qty,
                v_material.cost_price,
                'production_order',
                p_production_order_id,
                'Consumo automático - OP ' || v_po.order_number
            );
            
            v_total_material_cost := v_total_material_cost + (v_consumed_qty * v_material.cost_price);
        END;
    END LOOP;
    
    -- 2. Calcular custo de mão de obra real
    SELECT COALESCE(SUM(
        poo.actual_run_time / 60.0 * wc.hourly_cost
    ), 0) INTO v_total_labor_cost
    FROM production_order_operations poo
    JOIN work_centers wc ON wc.id = poo.work_center_id
    WHERE poo.production_order_id = p_production_order_id;
    
    -- 3. Dar entrada no produto acabado
    UPDATE products
    SET current_stock = current_stock + p_quantity_completed,
        updated_at = NOW()
    WHERE id = v_po.product_id;
    
    -- Registrar entrada
    INSERT INTO stock_movements (
        company_id,
        product_id,
        movement_type,
        quantity,
        unit_cost,
        reference_type,
        reference_id,
        notes
    ) VALUES (
        v_po.company_id,
        v_po.product_id,
        'entrada',
        p_quantity_completed,
        (v_total_material_cost + v_total_labor_cost) / p_quantity_completed,
        'production_order',
        p_production_order_id,
        'Produção finalizada - OP ' || v_po.order_number
    );
    
    -- 4. Calcular variação
    v_variance := (v_total_material_cost + v_total_labor_cost) - 
                  (v_po.standard_material_cost + v_po.standard_labor_cost);
    
    -- 5. Registrar variações
    INSERT INTO production_cost_variances (company_id, production_order_id, variance_type, standard_cost, actual_cost, variance_amount, variance_percent)
    VALUES 
        (v_po.company_id, p_production_order_id, 'material', v_po.standard_material_cost, v_total_material_cost, 
         v_total_material_cost - v_po.standard_material_cost,
         CASE WHEN v_po.standard_material_cost > 0 THEN ((v_total_material_cost - v_po.standard_material_cost) / v_po.standard_material_cost * 100) ELSE 0 END),
        (v_po.company_id, p_production_order_id, 'labor', v_po.standard_labor_cost, v_total_labor_cost,
         v_total_labor_cost - v_po.standard_labor_cost,
         CASE WHEN v_po.standard_labor_cost > 0 THEN ((v_total_labor_cost - v_po.standard_labor_cost) / v_po.standard_labor_cost * 100) ELSE 0 END),
        (v_po.company_id, p_production_order_id, 'total', 
         v_po.standard_material_cost + v_po.standard_labor_cost,
         v_total_material_cost + v_total_labor_cost,
         v_variance,
         CASE WHEN (v_po.standard_material_cost + v_po.standard_labor_cost) > 0 
              THEN (v_variance / (v_po.standard_material_cost + v_po.standard_labor_cost) * 100) 
              ELSE 0 END);
    
    -- 6. Atualizar OP
    UPDATE production_orders
    SET quantity_completed = p_quantity_completed,
        actual_material_cost = v_total_material_cost,
        actual_labor_cost = v_total_labor_cost,
        variance_amount = v_variance,
        actual_end_date = NOW(),
        status = 'completed'
    WHERE id = p_production_order_id;
    
    RETURN TRUE;
END;
$$;

-- 5. GRANTS
-- ===========================================================
GRANT EXECUTE ON FUNCTION public.explode_bom(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_mrp_calculation(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_production_order_from_sales(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_production_order(UUID, NUMERIC) TO authenticated;