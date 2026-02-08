-- ============================================
-- CRM & VENDAS 4.0 - DATABASE INFRASTRUCTURE
-- ============================================

-- 1. PERFORMANCE INDICES
-- ============================================

-- Indices for opportunities table
CREATE INDEX IF NOT EXISTS idx_opportunities_close_date 
ON opportunities(company_id, expected_close_date DESC);

CREATE INDEX IF NOT EXISTS idx_opportunities_amount 
ON opportunities(company_id, amount DESC);

CREATE INDEX IF NOT EXISTS idx_opportunities_status 
ON opportunities(company_id, status);

-- Indices for quotes table
CREATE INDEX IF NOT EXISTS idx_quotes_status_approval 
ON quotes(company_id, status, approval_status);

CREATE INDEX IF NOT EXISTS idx_quotes_valid_until 
ON quotes(valid_until);

CREATE INDEX IF NOT EXISTS idx_quotes_opportunity 
ON quotes(opportunity_id);

-- Indices for quote_items
CREATE INDEX IF NOT EXISTS idx_quote_items_quote 
ON quote_items(quote_id);

-- 2. NEW COLUMNS FOR EXISTING TABLES
-- ============================================

-- Add multi-currency support to opportunities
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS currency_code text DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1;

-- Add converted order reference
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS converted_order_id uuid REFERENCES sales_orders(id);

-- Add hierarchy and discount limits to sellers
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS max_discount_percent numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS hierarchy_level text DEFAULT 'seller',
ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES sellers(id);

-- Add constraint for hierarchy_level
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sellers_hierarchy_level_check'
    ) THEN
        ALTER TABLE sellers ADD CONSTRAINT sellers_hierarchy_level_check 
        CHECK (hierarchy_level IN ('seller', 'team_leader', 'manager', 'director'));
    END IF;
END $$;

-- Add approval fields to quotes if not exist
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3. NEW TABLE: seller_territories
-- ============================================

CREATE TABLE IF NOT EXISTS seller_territories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    territory_id uuid NOT NULL REFERENCES sales_territories(id) ON DELETE CASCADE,
    is_primary boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE(seller_id, territory_id)
);

-- Enable RLS
ALTER TABLE seller_territories ENABLE ROW LEVEL SECURITY;

-- RLS Policy for seller_territories
DROP POLICY IF EXISTS "seller_territories_company_access" ON seller_territories;
CREATE POLICY "seller_territories_company_access" ON seller_territories
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM sellers s 
        WHERE s.id = seller_territories.seller_id 
        AND public.user_belongs_to_company(s.company_id)
    )
);

-- Index for seller_territories
CREATE INDEX IF NOT EXISTS idx_seller_territories_seller ON seller_territories(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_territories_territory ON seller_territories(territory_id);

-- 4. SECURITY DEFINER FUNCTIONS
-- ============================================

-- Function to get current seller info for the authenticated user
-- NOTE: sales_team_members uses user_id, not seller_id
CREATE OR REPLACE FUNCTION public.get_current_seller_info(p_company_id uuid)
RETURNS TABLE (
    seller_id uuid,
    hierarchy_level text,
    team_id uuid,
    max_discount numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        s.id as seller_id,
        s.hierarchy_level,
        stm.team_id,
        s.max_discount_percent as max_discount
    FROM sellers s
    LEFT JOIN sales_team_members stm ON stm.user_id = s.user_id
    WHERE s.user_id = auth.uid()
    AND s.company_id = p_company_id
    LIMIT 1;
$$;

-- Function to check if user can view opportunity (hierarchical RLS)
CREATE OR REPLACE FUNCTION public.can_view_opportunity(p_opportunity_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_opp_company_id uuid;
    v_opp_seller_id uuid;
    v_opp_owner_user_id uuid;
    v_current_seller_id uuid;
    v_current_hierarchy text;
    v_current_team_id uuid;
    v_opp_team_id uuid;
    v_is_admin boolean;
BEGIN
    -- Get opportunity details
    SELECT o.company_id, o.seller_id, s.user_id
    INTO v_opp_company_id, v_opp_seller_id, v_opp_owner_user_id
    FROM opportunities o
    LEFT JOIN sellers s ON s.id = o.seller_id
    WHERE o.id = p_opportunity_id;
    
    IF v_opp_company_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user belongs to company
    IF NOT public.user_belongs_to_company(v_opp_company_id) THEN
        RETURN false;
    END IF;
    
    -- Check if admin
    SELECT EXISTS (
        SELECT 1 FROM company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.company_id = v_opp_company_id
        AND cu.role = 'admin'
    ) INTO v_is_admin;
    
    IF v_is_admin THEN
        RETURN true;
    END IF;
    
    -- Get current seller info
    SELECT seller_id, hierarchy_level, team_id
    INTO v_current_seller_id, v_current_hierarchy, v_current_team_id
    FROM public.get_current_seller_info(v_opp_company_id);
    
    -- If not a seller, check if still company member
    IF v_current_seller_id IS NULL THEN
        -- Allow company members to view (but controlled by company_id)
        RETURN public.user_belongs_to_company(v_opp_company_id);
    END IF;
    
    -- Director sees everything
    IF v_current_hierarchy = 'director' THEN
        RETURN true;
    END IF;
    
    -- Get opportunity seller's team using user_id
    SELECT stm.team_id INTO v_opp_team_id
    FROM sales_team_members stm
    WHERE stm.user_id = v_opp_owner_user_id;
    
    -- Manager sees their team
    IF v_current_hierarchy = 'manager' AND v_current_team_id IS NOT NULL AND v_current_team_id = v_opp_team_id THEN
        RETURN true;
    END IF;
    
    -- Team leader sees their team
    IF v_current_hierarchy = 'team_leader' AND v_current_team_id IS NOT NULL AND v_current_team_id = v_opp_team_id THEN
        RETURN true;
    END IF;
    
    -- Seller sees only their own
    IF v_current_seller_id = v_opp_seller_id THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- 5. DISCOUNT APPROVAL FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.check_quote_discount_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_seller_id uuid;
    v_max_discount numeric;
    v_manager_id uuid;
    v_company_id uuid;
BEGIN
    -- Get seller info from opportunity
    SELECT o.seller_id, o.company_id
    INTO v_seller_id, v_company_id
    FROM opportunities o
    WHERE o.id = NEW.opportunity_id;
    
    -- Get seller's max discount and manager
    SELECT s.max_discount_percent, s.manager_id
    INTO v_max_discount, v_manager_id
    FROM sellers s
    WHERE s.id = v_seller_id;
    
    -- Default max discount if not set
    v_max_discount := COALESCE(v_max_discount, 10);
    
    -- Check if discount exceeds limit
    IF COALESCE(NEW.discount_percent, 0) > v_max_discount THEN
        NEW.requires_approval := true;
        NEW.approval_status := 'pending';
        
        -- Create notification for manager
        IF v_manager_id IS NOT NULL THEN
            INSERT INTO notifications (
                company_id,
                user_id,
                title,
                message,
                type,
                reference_type,
                reference_id
            )
            SELECT 
                v_company_id,
                s.user_id,
                'Aprovação de Desconto Necessária',
                'Proposta #' || COALESCE(NEW.quote_number, NEW.id::text) || ' requer aprovação (desconto de ' || NEW.discount_percent || '%)',
                'approval_required',
                'quote',
                NEW.id
            FROM sellers s
            WHERE s.id = v_manager_id;
        END IF;
    ELSE
        NEW.requires_approval := false;
        NEW.approval_status := 'auto_approved';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for discount approval
DROP TRIGGER IF EXISTS trg_check_quote_discount ON quotes;
CREATE TRIGGER trg_check_quote_discount
    BEFORE INSERT OR UPDATE OF discount_percent ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.check_quote_discount_approval();

-- 6. WON AUTOMATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_opportunity_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pipeline_config record;
    v_quote record;
    v_new_order_id uuid;
    v_item record;
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
            entity_id,
            order_date,
            total_amount,
            status,
            notes
        ) VALUES (
            NEW.company_id,
            NEW.id,
            NEW.entity_id,
            CURRENT_DATE,
            COALESCE(v_quote.total_with_taxes, NEW.amount),
            'pending',
            'Auto-gerado a partir da Oportunidade #' || NEW.id
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
            qi.total
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
            entity_id,
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
            NEW.entity_id,
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
            'Projeto gerado automaticamente da oportunidade ganha',
            NEW.entity_id,
            'planning',
            CURRENT_DATE
        );
    END IF;
    
    -- Log the automation
    INSERT INTO audit_logs (
        company_id,
        user_id,
        action,
        table_name,
        record_id,
        changes
    ) VALUES (
        NEW.company_id,
        auth.uid(),
        'opportunity_won_automation',
        'opportunities',
        NEW.id,
        jsonb_build_object(
            'order_created', v_pipeline_config.won_create_order,
            'cashflow_created', v_pipeline_config.won_create_cashflow,
            'stock_reserved', v_pipeline_config.won_create_stock_order,
            'project_created', v_pipeline_config.won_create_project,
            'order_id', v_new_order_id
        )
    );
    
    RETURN NEW;
END;
$$;

-- Create trigger for won automation
DROP TRIGGER IF EXISTS trg_opportunity_won ON opportunities;
CREATE TRIGGER trg_opportunity_won
    BEFORE UPDATE ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_opportunity_won();

-- 7. CPQ TAX CALCULATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_quote_item_taxes(
    p_product_id uuid,
    p_quantity numeric,
    p_unit_price numeric,
    p_company_id uuid,
    p_counterparty_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ncm text;
    v_uf_origem text;
    v_uf_destino text;
    v_icms_rate numeric := 18;
    v_icms_st_rate numeric := 0;
    v_ipi_rate numeric := 0;
    v_pis_rate numeric := 1.65;
    v_cofins_rate numeric := 7.6;
    v_base_value numeric;
    v_icms numeric := 0;
    v_icms_st numeric := 0;
    v_ipi numeric := 0;
    v_pis numeric := 0;
    v_cofins numeric := 0;
    v_total numeric;
BEGIN
    -- Calculate base value
    v_base_value := p_quantity * p_unit_price;
    
    -- Get product NCM
    SELECT ncm INTO v_ncm
    FROM products
    WHERE id = p_product_id;
    
    -- Get company UF (origin)
    SELECT COALESCE(c.state, 'SP') INTO v_uf_origem
    FROM companies c
    WHERE c.id = p_company_id;
    
    -- Get counterparty UF (destination)
    SELECT COALESCE(e.state, 'SP') INTO v_uf_destino
    FROM entities e
    WHERE e.id = p_counterparty_id;
    
    -- Get applicable tax rules
    SELECT 
        COALESCE(tr.icms_rate, 18),
        COALESCE(tr.icms_st_rate, 0),
        COALESCE(tr.ipi_rate, 0),
        COALESCE(tr.pis_rate, 1.65),
        COALESCE(tr.cofins_rate, 7.6)
    INTO v_icms_rate, v_icms_st_rate, v_ipi_rate, v_pis_rate, v_cofins_rate
    FROM tax_rules tr
    WHERE tr.company_id = p_company_id
    AND (tr.ncm = v_ncm OR tr.ncm IS NULL)
    AND (tr.uf_origem = v_uf_origem OR tr.uf_origem IS NULL)
    AND (tr.uf_destino = v_uf_destino OR tr.uf_destino IS NULL)
    AND tr.is_active = true
    ORDER BY 
        CASE WHEN tr.ncm IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN tr.uf_origem IS NOT NULL THEN 0 ELSE 1 END
    LIMIT 1;
    
    -- Calculate taxes
    v_icms := v_base_value * (v_icms_rate / 100);
    v_icms_st := v_base_value * (v_icms_st_rate / 100);
    v_ipi := v_base_value * (v_ipi_rate / 100);
    v_pis := v_base_value * (v_pis_rate / 100);
    v_cofins := v_base_value * (v_cofins_rate / 100);
    
    -- Total with taxes (IPI and ICMS-ST are added to value)
    v_total := v_base_value + v_ipi + v_icms_st;
    
    RETURN jsonb_build_object(
        'base_value', v_base_value,
        'icms', v_icms,
        'icms_rate', v_icms_rate,
        'icms_st', v_icms_st,
        'icms_st_rate', v_icms_st_rate,
        'ipi', v_ipi,
        'ipi_rate', v_ipi_rate,
        'pis', v_pis,
        'pis_rate', v_pis_rate,
        'cofins', v_cofins,
        'cofins_rate', v_cofins_rate,
        'total', v_total
    );
END;
$$;

-- 8. UPDATE RLS POLICIES FOR OPPORTUNITIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "opportunities_select" ON opportunities;
DROP POLICY IF EXISTS "opportunities_insert" ON opportunities;
DROP POLICY IF EXISTS "opportunities_update" ON opportunities;
DROP POLICY IF EXISTS "opportunities_delete" ON opportunities;
DROP POLICY IF EXISTS "opportunities_hierarchical_select" ON opportunities;

-- Create hierarchical RLS policies
CREATE POLICY "opportunities_hierarchical_select" ON opportunities
FOR SELECT USING (
    public.can_view_opportunity(id)
);

CREATE POLICY "opportunities_insert" ON opportunities
FOR INSERT WITH CHECK (
    public.user_belongs_to_company(company_id)
);

CREATE POLICY "opportunities_update" ON opportunities
FOR UPDATE USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.company_id = opportunities.company_id
        AND cu.role = 'admin'
    )
    OR (
        SELECT hierarchy_level FROM sellers WHERE user_id = auth.uid() AND company_id = opportunities.company_id
    ) IN ('manager', 'director')
);

CREATE POLICY "opportunities_delete" ON opportunities
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.company_id = opportunities.company_id
        AND cu.role = 'admin'
    )
);

-- 9. UPDATE RLS POLICIES FOR QUOTES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "quotes_select" ON quotes;
DROP POLICY IF EXISTS "quotes_insert" ON quotes;
DROP POLICY IF EXISTS "quotes_update" ON quotes;
DROP POLICY IF EXISTS "quotes_delete" ON quotes;
DROP POLICY IF EXISTS "quotes_hierarchical_select" ON quotes;

-- Create hierarchical RLS policies for quotes
CREATE POLICY "quotes_hierarchical_select" ON quotes
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM opportunities o
        WHERE o.id = quotes.opportunity_id
        AND public.can_view_opportunity(o.id)
    )
);

CREATE POLICY "quotes_insert" ON quotes
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM opportunities o
        WHERE o.id = quotes.opportunity_id
        AND public.can_view_opportunity(o.id)
    )
);

CREATE POLICY "quotes_update" ON quotes
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM opportunities o
        WHERE o.id = quotes.opportunity_id
        AND (
            o.seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
            OR EXISTS (
                SELECT 1 FROM company_users cu
                WHERE cu.user_id = auth.uid()
                AND cu.company_id = o.company_id
                AND cu.role = 'admin'
            )
        )
    )
);

CREATE POLICY "quotes_delete" ON quotes
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM opportunities o
        WHERE o.id = quotes.opportunity_id
        AND EXISTS (
            SELECT 1 FROM company_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.company_id = o.company_id
            AND cu.role = 'admin'
        )
    )
);

-- 10. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.get_current_seller_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_opportunity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_quote_item_taxes(uuid, numeric, numeric, uuid, uuid) TO authenticated;

GRANT ALL ON seller_territories TO authenticated;