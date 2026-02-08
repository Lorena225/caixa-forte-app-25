
-- ===========================================================
-- CORREÇÃO 1: Índice faltando em counterparty_id
-- ===========================================================
CREATE INDEX IF NOT EXISTS idx_opportunities_counterparty 
ON opportunities (company_id, counterparty_id);

-- ===========================================================
-- CORREÇÃO 2: Corrigir trigger para usar counterparty_id
-- ===========================================================
CREATE OR REPLACE FUNCTION public.trigger_opportunity_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_pipeline_config record;
    v_quote record;
    v_new_order_id uuid;
    v_item record;
    v_new_project_id uuid;
BEGIN
    -- Only process when status changes to 'won'
    IF NEW.status != 'won' OR OLD.status = 'won' THEN
        RETURN NEW;
    END IF;
    
    -- Get pipeline configuration
    SELECT 
        COALESCE(won_create_order, false) as won_create_order,
        COALESCE(won_create_cashflow, false) as won_create_cashflow,
        COALESCE(won_create_stock_order, false) as won_create_stock_order,
        COALESCE(won_create_project, false) as won_create_project,
        won_project_template_id
    INTO v_pipeline_config
    FROM crm_pipelines
    WHERE id = NEW.pipeline_id;
    
    -- Get accepted quote
    SELECT * INTO v_quote
    FROM quotes
    WHERE opportunity_id = NEW.id
    AND status = 'accepted'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- 1. Create Sales Order if configured
    IF v_pipeline_config.won_create_order = true AND v_quote.id IS NOT NULL THEN
        INSERT INTO sales_orders (
            company_id,
            opportunity_id,
            counterparty_id,  -- CORRIGIDO: era entity_id
            order_date,
            total_amount,
            status,
            notes
        ) VALUES (
            NEW.company_id,
            NEW.id,
            NEW.counterparty_id,  -- CORRIGIDO: era NEW.entity_id
            CURRENT_DATE,
            COALESCE(v_quote.total_with_taxes, NEW.amount),
            'pending',
            'Auto-gerado a partir da Oportunidade #' || COALESCE(NEW.code, NEW.id::text)
        )
        RETURNING id INTO v_new_order_id;
        
        -- Update opportunity with order reference
        NEW.converted_order_id := v_new_order_id;
        
        -- Copy quote items to order items
        INSERT INTO sales_order_items (
            order_id,
            product_id,
            quantity,
            unit_price,
            discount_percent,
            total
        )
        SELECT 
            v_new_order_id,
            qi.product_id,
            qi.quantity,
            qi.unit_price,
            qi.discount_percent,
            qi.total_amount
        FROM quote_items qi
        WHERE qi.quote_id = v_quote.id;
    END IF;
    
    -- 2. Create Financial Entry if configured
    IF v_pipeline_config.won_create_cashflow = true THEN
        INSERT INTO transactions (
            company_id,
            tipo,
            descricao,
            valor,
            data,
            due_date,
            status,
            counterparty_id,  -- CORRIGIDO: era entity_id
            reference_type,
            reference_id
        ) VALUES (
            NEW.company_id,
            'receita',
            'Venda - ' || NEW.title,
            COALESCE(v_quote.total_with_taxes, NEW.amount),
            CURRENT_DATE,
            COALESCE(NEW.expected_close_date, CURRENT_DATE + INTERVAL '30 days'),
            'lancado',
            NEW.counterparty_id,  -- CORRIGIDO: era NEW.entity_id
            'opportunity',
            NEW.id
        );
    END IF;
    
    -- 3. Create Inventory Reservations if configured
    IF v_pipeline_config.won_create_stock_order = true AND v_quote.id IS NOT NULL THEN
        FOR v_item IN 
            SELECT qi.product_id, qi.quantity
            FROM quote_items qi
            WHERE qi.quote_id = v_quote.id
            AND qi.product_id IS NOT NULL
        LOOP
            INSERT INTO inventory_reservations (
                company_id,
                product_id,
                quantity,
                reference_type,
                reference_id,
                status
            ) VALUES (
                NEW.company_id,
                v_item.product_id,
                v_item.quantity,
                'sales_order',
                v_new_order_id,
                'reserved'
            );
        END LOOP;
    END IF;
    
    -- 4. Create Project if configured
    IF v_pipeline_config.won_create_project = true THEN
        INSERT INTO projects (
            company_id,
            name,
            description,
            client_id,
            status,
            start_date
        ) VALUES (
            NEW.company_id,
            'Projeto - ' || NEW.title,
            'Projeto criado automaticamente a partir da oportunidade ganha',
            NEW.counterparty_id,  -- CORRIGIDO: era NEW.entity_id
            'planning',
            CURRENT_DATE
        )
        RETURNING id INTO v_new_project_id;
        
        NEW.converted_project_id := v_new_project_id;
    END IF;
    
    -- Set actual close date
    NEW.actual_close_date := CURRENT_DATE;
    
    RETURN NEW;
END;
$function$;
