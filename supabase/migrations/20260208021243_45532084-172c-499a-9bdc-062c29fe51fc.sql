
-- =====================================================
-- CRM AUDIT FIXES - Tax Engine & Missing Structures
-- =====================================================

-- 1. Create a proper tax configuration table for CPQ
CREATE TABLE IF NOT EXISTS cpq_tax_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ncm text,
    uf_origem text,
    uf_destino text,
    icms_rate numeric DEFAULT 18,
    icms_st_rate numeric DEFAULT 0,
    ipi_rate numeric DEFAULT 0,
    pis_rate numeric DEFAULT 1.65,
    cofins_rate numeric DEFAULT 7.6,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_cpq_tax_rates_lookup 
ON cpq_tax_rates(company_id, ncm, uf_origem, uf_destino) 
WHERE is_active = true;

-- RLS for cpq_tax_rates
ALTER TABLE cpq_tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cpq_tax_rates_company_access" ON cpq_tax_rates
    FOR ALL USING (user_belongs_to_company(company_id));

-- 2. Update calculate_quote_item_taxes to use cpq_tax_rates
CREATE OR REPLACE FUNCTION public.calculate_quote_item_taxes(
    p_product_id uuid, 
    p_quantity numeric, 
    p_unit_price numeric, 
    p_company_id uuid, 
    p_counterparty_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    
    -- Get counterparty UF (destination) - try counterparties first, then entities
    IF p_counterparty_id IS NOT NULL THEN
        SELECT COALESCE(cp.state, 'SP') INTO v_uf_destino
        FROM counterparties cp
        WHERE cp.id = p_counterparty_id;
        
        IF v_uf_destino IS NULL THEN
            SELECT COALESCE(e.state, 'SP') INTO v_uf_destino
            FROM entities e
            WHERE e.id = p_counterparty_id;
        END IF;
    END IF;
    
    v_uf_destino := COALESCE(v_uf_destino, 'SP');
    
    -- Get applicable tax rates from cpq_tax_rates (most specific match wins)
    SELECT 
        COALESCE(tr.icms_rate, 18),
        COALESCE(tr.icms_st_rate, 0),
        COALESCE(tr.ipi_rate, 0),
        COALESCE(tr.pis_rate, 1.65),
        COALESCE(tr.cofins_rate, 7.6)
    INTO v_icms_rate, v_icms_st_rate, v_ipi_rate, v_pis_rate, v_cofins_rate
    FROM cpq_tax_rates tr
    WHERE tr.company_id = p_company_id
    AND tr.is_active = true
    AND (tr.ncm = v_ncm OR tr.ncm IS NULL)
    AND (tr.uf_origem = v_uf_origem OR tr.uf_origem IS NULL)
    AND (tr.uf_destino = v_uf_destino OR tr.uf_destino IS NULL)
    ORDER BY 
        CASE WHEN tr.ncm IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN tr.uf_origem IS NOT NULL AND tr.uf_destino IS NOT NULL THEN 0
             WHEN tr.uf_origem IS NOT NULL OR tr.uf_destino IS NOT NULL THEN 1
             ELSE 2 END
    LIMIT 1;
    
    -- Calculate taxes
    v_icms := ROUND(v_base_value * (v_icms_rate / 100), 2);
    v_icms_st := ROUND(v_base_value * (v_icms_st_rate / 100), 2);
    v_ipi := ROUND(v_base_value * (v_ipi_rate / 100), 2);
    v_pis := ROUND(v_base_value * (v_pis_rate / 100), 2);
    v_cofins := ROUND(v_base_value * (v_cofins_rate / 100), 2);
    
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
$function$;

-- 3. Add updated_at trigger
CREATE TRIGGER trg_cpq_tax_rates_updated
    BEFORE UPDATE ON cpq_tax_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
