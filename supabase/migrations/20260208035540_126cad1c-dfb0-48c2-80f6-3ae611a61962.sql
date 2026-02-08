-- ============================================================
-- MÓDULO PCP INDUSTRIAL - MIGRAÇÃO v5 (Schema Updates Only)
-- ============================================================

-- 1. Adicionar colunas de versionamento em industrial_boms
ALTER TABLE industrial_boms 
ADD COLUMN IF NOT EXISTS revision TEXT DEFAULT 'Rev. 01',
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_bom_id UUID REFERENCES industrial_boms(id);

-- 2. Adicionar conversão de unidades em bom_components
ALTER TABLE bom_components 
ADD COLUMN IF NOT EXISTS purchase_unit_id UUID REFERENCES units_of_measure(id),
ADD COLUMN IF NOT EXISTS consumption_unit_id UUID REFERENCES units_of_measure(id),
ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC(15,6) DEFAULT 1;

-- 3. Adicionar coluna converted_to_type em mrp_requirements
ALTER TABLE mrp_requirements 
ADD COLUMN IF NOT EXISTS converted_to_type TEXT;

-- 4. Adicionar colunas faltantes em production_appointments
ALTER TABLE production_appointments
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress',
ADD COLUMN IF NOT EXISTS pause_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_pause_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Adicionar constraint de status se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'production_appointments' AND constraint_name = 'production_appointments_status_check'
  ) THEN
    ALTER TABLE production_appointments 
    ADD CONSTRAINT production_appointments_status_check 
    CHECK (status IN ('in_progress', 'paused', 'completed', 'cancelled'));
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_appointments_order ON production_appointments(production_order_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON production_appointments(company_id, status);
CREATE INDEX IF NOT EXISTS idx_bom_components_bom ON bom_components(bom_id);
CREATE INDEX IF NOT EXISTS idx_boms_product ON industrial_boms(product_id, company_id);
CREATE INDEX IF NOT EXISTS idx_mrp_company ON mrp_requirements(company_id, status);