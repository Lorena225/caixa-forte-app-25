-- ===========================================================
-- MÓDULO PCP/MRP - PLANEJAMENTO E CONTROLE DA PRODUÇÃO
-- ===========================================================

-- 1. UNIDADES DE MEDIDA (se não existir)
-- ===========================================================
CREATE TABLE IF NOT EXISTS units_of_measure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT,
    unit_type TEXT DEFAULT 'quantity', -- quantity, weight, volume, length, time
    base_unit_id UUID REFERENCES units_of_measure(id),
    conversion_factor NUMERIC(19,6) DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, code)
);

ALTER TABLE units_of_measure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units_company" ON units_of_measure FOR ALL USING (user_belongs_to_company(company_id));

-- 2. CENTROS DE TRABALHO (Work Centers)
-- ===========================================================
CREATE TABLE IF NOT EXISTS work_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    work_center_type TEXT DEFAULT 'machine' CHECK (work_center_type IN ('machine', 'labor', 'outsourced')),
    capacity_hours_day NUMERIC(10,2) DEFAULT 8,
    efficiency_rate NUMERIC(5,2) DEFAULT 100,
    hourly_cost NUMERIC(19,4) NOT NULL DEFAULT 0,
    setup_time_minutes INTEGER DEFAULT 0,
    cost_center_id UUID REFERENCES cost_centers(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, code)
);

-- 3. BILL OF MATERIALS (BOM) - Estrutura de Produto
-- ===========================================================
CREATE TABLE IF NOT EXISTS industrial_boms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    version TEXT NOT NULL DEFAULT 'Rev.01',
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'obsolete')),
    effective_date DATE,
    obsolete_date DATE,
    standard_batch_size NUMERIC(19,4) DEFAULT 1,
    standard_lead_time_days INTEGER DEFAULT 1,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, product_id, version)
);

-- 4. COMPONENTES DA BOM (Multinível)
-- ===========================================================
CREATE TABLE IF NOT EXISTS bom_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES industrial_boms(id) ON DELETE CASCADE,
    component_product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(19,6) NOT NULL DEFAULT 1,
    unit_id UUID REFERENCES units_of_measure(id),
    scrap_rate NUMERIC(5,2) DEFAULT 0,
    is_phantom BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ROTEIROS DE PRODUÇÃO (Routing)
-- ===========================================================
CREATE TABLE IF NOT EXISTS industrial_routings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    bom_id UUID REFERENCES industrial_boms(id),
    version TEXT NOT NULL DEFAULT 'Rev.01',
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'obsolete')),
    total_lead_time_hours NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, product_id, version)
);

-- 6. OPERAÇÕES DO ROTEIRO
-- ===========================================================
CREATE TABLE IF NOT EXISTS routing_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routing_id UUID NOT NULL REFERENCES industrial_routings(id) ON DELETE CASCADE,
    operation_number INTEGER NOT NULL,
    operation_name TEXT NOT NULL,
    work_center_id UUID NOT NULL REFERENCES work_centers(id),
    setup_time_minutes NUMERIC(10,2) DEFAULT 0,
    run_time_minutes NUMERIC(10,2) NOT NULL,
    wait_time_minutes NUMERIC(10,2) DEFAULT 0,
    move_time_minutes NUMERIC(10,2) DEFAULT 0,
    overlap_percent NUMERIC(5,2) DEFAULT 0,
    description TEXT,
    is_outsourced BOOLEAN DEFAULT false,
    outsource_cost NUMERIC(19,4),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ORDENS DE PRODUÇÃO
-- ===========================================================
CREATE TABLE IF NOT EXISTS production_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id),
    bom_id UUID REFERENCES industrial_boms(id),
    routing_id UUID REFERENCES industrial_routings(id),
    sales_order_id UUID REFERENCES sales_orders(id),
    sales_order_item_id UUID,
    quantity_planned NUMERIC(19,4) NOT NULL,
    quantity_completed NUMERIC(19,4) DEFAULT 0,
    quantity_scrapped NUMERIC(19,4) DEFAULT 0,
    unit_id UUID REFERENCES units_of_measure(id),
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'released', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority INTEGER DEFAULT 5,
    planned_start_date TIMESTAMPTZ,
    planned_end_date TIMESTAMPTZ,
    actual_start_date TIMESTAMPTZ,
    actual_end_date TIMESTAMPTZ,
    standard_material_cost NUMERIC(19,4) DEFAULT 0,
    standard_labor_cost NUMERIC(19,4) DEFAULT 0,
    standard_overhead_cost NUMERIC(19,4) DEFAULT 0,
    actual_material_cost NUMERIC(19,4) DEFAULT 0,
    actual_labor_cost NUMERIC(19,4) DEFAULT 0,
    actual_overhead_cost NUMERIC(19,4) DEFAULT 0,
    variance_amount NUMERIC(19,4) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, order_number)
);

-- 8. OPERAÇÕES DA OP
-- ===========================================================
CREATE TABLE IF NOT EXISTS production_order_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    routing_operation_id UUID REFERENCES routing_operations(id),
    operation_number INTEGER NOT NULL,
    operation_name TEXT NOT NULL,
    work_center_id UUID NOT NULL REFERENCES work_centers(id),
    planned_setup_time NUMERIC(10,2) DEFAULT 0,
    planned_run_time NUMERIC(10,2) DEFAULT 0,
    actual_setup_time NUMERIC(10,2) DEFAULT 0,
    actual_run_time NUMERIC(10,2) DEFAULT 0,
    quantity_completed NUMERIC(19,4) DEFAULT 0,
    quantity_scrapped NUMERIC(19,4) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. APONTAMENTOS DE PRODUÇÃO
-- ===========================================================
CREATE TABLE IF NOT EXISTS production_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    operation_id UUID REFERENCES production_order_operations(id),
    work_center_id UUID REFERENCES work_centers(id),
    operator_id UUID REFERENCES auth.users(id),
    appointment_type TEXT NOT NULL CHECK (appointment_type IN ('start', 'pause', 'resume', 'stop', 'complete', 'scrap')),
    quantity_produced NUMERIC(19,4) DEFAULT 0,
    quantity_scrapped NUMERIC(19,4) DEFAULT 0,
    scrap_reason TEXT,
    pause_reason TEXT,
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time TIMESTAMPTZ,
    duration_minutes NUMERIC(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. CONSUMO DE MATERIAIS DA OP
-- ===========================================================
CREATE TABLE IF NOT EXISTS production_material_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    planned_quantity NUMERIC(19,6) NOT NULL,
    consumed_quantity NUMERIC(19,6) DEFAULT 0,
    unit_cost NUMERIC(19,4) DEFAULT 0,
    total_cost NUMERIC(19,4) DEFAULT 0,
    warehouse_id UUID,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. REQUISIÇÕES MRP
-- ===========================================================
CREATE TABLE IF NOT EXISTS mrp_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    calculation_run_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id),
    requirement_type TEXT NOT NULL CHECK (requirement_type IN ('production', 'purchase')),
    source_type TEXT,
    source_id UUID,
    required_date DATE NOT NULL,
    gross_requirement NUMERIC(19,4) NOT NULL,
    available_stock NUMERIC(19,4) DEFAULT 0,
    reserved_stock NUMERIC(19,4) DEFAULT 0,
    net_requirement NUMERIC(19,4) NOT NULL,
    suggested_order_qty NUMERIC(19,4),
    suggested_order_date DATE,
    status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'approved', 'converted', 'cancelled')),
    converted_to_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. REQUISIÇÕES DE COMPRA
-- ===========================================================
CREATE TABLE IF NOT EXISTS purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    requisition_number TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity NUMERIC(19,4) NOT NULL,
    unit_id UUID REFERENCES units_of_measure(id),
    required_date DATE NOT NULL,
    estimated_unit_cost NUMERIC(19,4),
    estimated_total NUMERIC(19,4),
    preferred_supplier_id UUID REFERENCES counterparties(id),
    source_type TEXT,
    source_id UUID,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'converted', 'cancelled')),
    purchase_order_id UUID,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, requisition_number)
);

-- 13. PREVISÃO DE DEMANDA
-- ===========================================================
CREATE TABLE IF NOT EXISTS stock_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    forecast_date DATE NOT NULL,
    quantity NUMERIC(19,4) NOT NULL,
    source TEXT DEFAULT 'manual',
    confidence_percent NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, product_id, forecast_date)
);

-- 14. LOG DE VARIAÇÃO DE CUSTOS
-- ===========================================================
CREATE TABLE IF NOT EXISTS production_cost_variances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    variance_type TEXT NOT NULL CHECK (variance_type IN ('material', 'labor', 'overhead', 'total')),
    standard_cost NUMERIC(19,4) NOT NULL,
    actual_cost NUMERIC(19,4) NOT NULL,
    variance_amount NUMERIC(19,4) NOT NULL,
    variance_percent NUMERIC(10,2),
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================================
-- ÍNDICES DE PERFORMANCE
-- ===========================================================
CREATE INDEX IF NOT EXISTS idx_units_company ON units_of_measure(company_id);
CREATE INDEX IF NOT EXISTS idx_work_centers_company ON work_centers(company_id);
CREATE INDEX IF NOT EXISTS idx_industrial_boms_product ON industrial_boms(company_id, product_id, status);
CREATE INDEX IF NOT EXISTS idx_bom_components_bom ON bom_components(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_components_product ON bom_components(component_product_id);
CREATE INDEX IF NOT EXISTS idx_industrial_routings_product ON industrial_routings(company_id, product_id, status);
CREATE INDEX IF NOT EXISTS idx_routing_operations_routing ON routing_operations(routing_id, operation_number);
CREATE INDEX IF NOT EXISTS idx_production_orders_company ON production_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_production_orders_dates ON production_orders(company_id, planned_start_date, planned_end_date);
CREATE INDEX IF NOT EXISTS idx_production_orders_sales ON production_orders(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_po_operations_order ON production_order_operations(production_order_id, operation_number);
CREATE INDEX IF NOT EXISTS idx_appointments_order ON production_appointments(production_order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mrp_requirements_run ON mrp_requirements(calculation_run_id, product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_company ON purchase_requisitions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_forecasts_product ON stock_forecasts(company_id, product_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_cost_variances_order ON production_cost_variances(production_order_id);

-- ===========================================================
-- RLS POLICIES
-- ===========================================================
ALTER TABLE work_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE industrial_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE industrial_routings ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_order_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_material_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrp_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_cost_variances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_centers_company" ON work_centers FOR ALL USING (user_belongs_to_company(company_id));
CREATE POLICY "industrial_boms_company" ON industrial_boms FOR ALL USING (user_belongs_to_company(company_id));
CREATE POLICY "bom_components_access" ON bom_components FOR ALL USING (
    EXISTS (SELECT 1 FROM industrial_boms b WHERE b.id = bom_id AND user_belongs_to_company(b.company_id))
);
CREATE POLICY "industrial_routings_company" ON industrial_routings FOR ALL USING (user_belongs_to_company(company_id));
CREATE POLICY "routing_operations_access" ON routing_operations FOR ALL USING (
    EXISTS (SELECT 1 FROM industrial_routings r WHERE r.id = routing_id AND user_belongs_to_company(r.company_id))
);
CREATE POLICY "production_orders_company" ON production_orders FOR ALL USING (user_belongs_to_company(company_id));
CREATE POLICY "po_operations_access" ON production_order_operations FOR ALL USING (
    EXISTS (SELECT 1 FROM production_orders po WHERE po.id = production_order_id AND user_belongs_to_company(po.company_id))
);
CREATE POLICY "appointments_company" ON production_appointments FOR ALL USING (user_belongs_to_company(company_id));
CREATE POLICY "material_consumption_access" ON production_material_consumption FOR ALL USING (
    EXISTS (SELECT 1 FROM production_orders po WHERE po.id = production_order_id AND user_belongs_to_company(po.company_id))
);
CREATE POLICY "mrp_requirements_company" ON mrp_requirements FOR ALL USING (user_belongs_to_company(company_id));
CREATE POLICY "purchase_requisitions_company" ON purchase_requisitions FOR ALL USING (user_belongs_to_company(company_id));
CREATE POLICY "stock_forecasts_company" ON stock_forecasts FOR ALL USING (user_belongs_to_company(company_id));
CREATE POLICY "cost_variances_company" ON production_cost_variances FOR ALL USING (user_belongs_to_company(company_id));

-- ===========================================================
-- TRIGGERS
-- ===========================================================
CREATE TRIGGER tr_work_centers_updated BEFORE UPDATE ON work_centers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_industrial_boms_updated BEFORE UPDATE ON industrial_boms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_industrial_routings_updated BEFORE UPDATE ON industrial_routings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_production_orders_updated BEFORE UPDATE ON production_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_purchase_requisitions_updated BEFORE UPDATE ON purchase_requisitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();