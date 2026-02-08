-- ============================================================
-- MÓDULO PCP INDUSTRIAL - FUNÇÕES E TRIGGERS
-- ============================================================

-- TRIGGER DE PROTEÇÃO DE BOM ATIVA
CREATE OR REPLACE FUNCTION protect_locked_bom()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_locked = TRUE AND NEW.status != 'obsolete' THEN
    IF NEW.status = OLD.status THEN
      RAISE EXCEPTION 'BOM bloqueada para edição. Crie uma nova revisão.';
    END IF;
  END IF;
  
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    NEW.is_locked := TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_protect_locked_bom ON industrial_boms;
CREATE TRIGGER trigger_protect_locked_bom
BEFORE UPDATE ON industrial_boms
FOR EACH ROW
EXECUTE FUNCTION protect_locked_bom();

-- FUNÇÃO PARA CRIAR NOVA REVISÃO DE BOM
CREATE OR REPLACE FUNCTION create_bom_revision(p_bom_id UUID, p_new_revision TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_new_bom_id UUID;
  v_old_bom RECORD;
  v_next_revision TEXT;
BEGIN
  SELECT * INTO v_old_bom FROM industrial_boms WHERE id = p_bom_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOM não encontrada'; END IF;
  
  IF p_new_revision IS NULL THEN
    SELECT 'Rev. ' || LPAD((COALESCE(MAX(SUBSTRING(revision FROM 'Rev. ([0-9]+)')::INT), 0) + 1)::TEXT, 2, '0')
    INTO v_next_revision FROM industrial_boms WHERE product_id = v_old_bom.product_id;
  ELSE
    v_next_revision := p_new_revision;
  END IF;
  
  INSERT INTO industrial_boms (company_id, product_id, version, revision, status, is_locked, parent_bom_id, notes, effective_date)
  VALUES (v_old_bom.company_id, v_old_bom.product_id, v_old_bom.version, v_next_revision, 'draft', FALSE, p_bom_id, 
    'Revisão criada a partir de ' || COALESCE(v_old_bom.revision, 'original'), NOW())
  RETURNING id INTO v_new_bom_id;
  
  INSERT INTO bom_components (bom_id, component_product_id, quantity, unit_id, scrap_rate, notes)
  SELECT v_new_bom_id, component_product_id, quantity, unit_id, scrap_rate, notes
  FROM bom_components WHERE bom_id = p_bom_id;
  
  RETURN v_new_bom_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CONVERTER MRP PARA REQUISIÇÃO DE COMPRA
CREATE OR REPLACE FUNCTION convert_mrp_to_purchase_requisition(p_mrp_id UUID)
RETURNS UUID AS $$
DECLARE
  v_mrp RECORD;
  v_requisition_id UUID;
  v_product RECORD;
  v_req_number TEXT;
BEGIN
  SELECT * INTO v_mrp FROM mrp_requirements WHERE id = p_mrp_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Requisito MRP não encontrado'; END IF;
  IF v_mrp.requirement_type != 'purchase' THEN RAISE EXCEPTION 'Este requisito não é do tipo compra'; END IF;
  IF v_mrp.status = 'converted' THEN RAISE EXCEPTION 'Este requisito já foi convertido'; END IF;
  
  SELECT * INTO v_product FROM products WHERE id = v_mrp.product_id;
  
  SELECT 'RC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((COUNT(*) + 1)::TEXT, 4, '0')
  INTO v_req_number FROM purchase_requisitions WHERE company_id = v_mrp.company_id AND created_at::DATE = CURRENT_DATE;
  
  INSERT INTO purchase_requisitions (company_id, requisition_number, product_id, quantity, estimated_unit_cost, required_date, status, notes)
  VALUES (v_mrp.company_id, v_req_number, v_mrp.product_id, COALESCE(v_mrp.net_requirement, v_mrp.suggested_order_qty),
    COALESCE(v_product.cost_price, 0), COALESCE(v_mrp.suggested_order_date, v_mrp.required_date), 'pending', 
    'Gerado via MRP - ' || COALESCE(v_mrp.source_type, 'manual'))
  RETURNING id INTO v_requisition_id;
  
  UPDATE mrp_requirements SET status = 'converted', converted_to_id = v_requisition_id, converted_to_type = 'purchase_requisition' WHERE id = p_mrp_id;
  
  RETURN v_requisition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CONVERTER MRP PARA ORDEM DE PRODUÇÃO
CREATE OR REPLACE FUNCTION convert_mrp_to_production_order(p_mrp_id UUID)
RETURNS UUID AS $$
DECLARE
  v_mrp RECORD;
  v_order_id UUID;
  v_bom RECORD;
  v_routing RECORD;
  v_order_number TEXT;
BEGIN
  SELECT * INTO v_mrp FROM mrp_requirements WHERE id = p_mrp_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Requisito MRP não encontrado'; END IF;
  IF v_mrp.requirement_type != 'production' THEN RAISE EXCEPTION 'Este requisito não é do tipo produção'; END IF;
  IF v_mrp.status = 'converted' THEN RAISE EXCEPTION 'Este requisito já foi convertido'; END IF;
  
  SELECT * INTO v_bom FROM industrial_boms WHERE product_id = v_mrp.product_id AND status = 'active' AND company_id = v_mrp.company_id LIMIT 1;
  SELECT * INTO v_routing FROM industrial_routings WHERE bom_id = v_bom.id AND status = 'active' LIMIT 1;
  
  SELECT 'OP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((COUNT(*) + 1)::TEXT, 4, '0')
  INTO v_order_number FROM production_orders WHERE company_id = v_mrp.company_id AND created_at::DATE = CURRENT_DATE;
  
  INSERT INTO production_orders (company_id, order_number, product_id, bom_id, planned_quantity, planned_start_date, planned_end_date, status, priority, notes)
  VALUES (v_mrp.company_id, v_order_number, v_mrp.product_id, v_bom.id, 
    COALESCE(v_mrp.net_requirement, v_mrp.suggested_order_qty), CURRENT_DATE, COALESCE(v_mrp.suggested_order_date, v_mrp.required_date),
    'planned', 'medium', 'Gerado via MRP - ' || COALESCE(v_mrp.source_type, 'manual'))
  RETURNING id INTO v_order_id;
  
  INSERT INTO production_material_consumption (production_order_id, product_id, planned_quantity, unit_cost)
  SELECT v_order_id, bc.component_product_id, bc.quantity * COALESCE(v_mrp.net_requirement, v_mrp.suggested_order_qty) * (1 + COALESCE(bc.scrap_rate, 0) / 100), COALESCE(p.cost_price, 0)
  FROM bom_components bc LEFT JOIN products p ON p.id = bc.component_product_id WHERE bc.bom_id = v_bom.id;
  
  IF v_routing.id IS NOT NULL THEN
    INSERT INTO production_order_operations (production_order_id, routing_operation_id, operation_number, operation_name, work_center_id, planned_setup_time, planned_run_time, status)
    SELECT v_order_id, ro.id, ro.operation_number, ro.operation_name, ro.work_center_id, ro.setup_time_minutes, 
      ro.run_time_minutes * COALESCE(v_mrp.net_requirement, v_mrp.suggested_order_qty), 'pending'
    FROM routing_operations ro WHERE ro.routing_id = v_routing.id ORDER BY ro.operation_number;
  END IF;
  
  UPDATE mrp_requirements SET status = 'converted', converted_to_id = v_order_id, converted_to_type = 'production_order' WHERE id = p_mrp_id;
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CONVERTER MÚLTIPLOS MRP EM LOTE
CREATE OR REPLACE FUNCTION convert_mrp_batch(p_mrp_ids UUID[])
RETURNS TABLE(mrp_id UUID, converted_id UUID, converted_type TEXT, success BOOLEAN, error_message TEXT) AS $$
DECLARE
  v_mrp_id UUID;
  v_mrp RECORD;
  v_result_id UUID;
BEGIN
  FOREACH v_mrp_id IN ARRAY p_mrp_ids LOOP
    BEGIN
      SELECT * INTO v_mrp FROM mrp_requirements WHERE id = v_mrp_id;
      IF v_mrp.requirement_type = 'purchase' THEN
        v_result_id := convert_mrp_to_purchase_requisition(v_mrp_id);
        RETURN QUERY SELECT v_mrp_id, v_result_id, 'purchase_requisition'::TEXT, TRUE, NULL::TEXT;
      ELSIF v_mrp.requirement_type = 'production' THEN
        v_result_id := convert_mrp_to_production_order(v_mrp_id);
        RETURN QUERY SELECT v_mrp_id, v_result_id, 'production_order'::TEXT, TRUE, NULL::TEXT;
      ELSE
        RETURN QUERY SELECT v_mrp_id, NULL::UUID, NULL::TEXT, FALSE, 'Tipo desconhecido'::TEXT;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT v_mrp_id, NULL::UUID, NULL::TEXT, FALSE, SQLERRM::TEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- FUNÇÕES DE APONTAMENTO SHOP FLOOR
CREATE OR REPLACE FUNCTION start_production_appointment(p_order_id UUID, p_operation_id UUID DEFAULT NULL, p_operator_id UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE v_appointment_id UUID; v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM production_orders WHERE id = p_order_id;
  UPDATE production_orders SET status = 'in_progress', actual_start_date = COALESCE(actual_start_date, NOW()) WHERE id = p_order_id AND status IN ('planned', 'released');
  INSERT INTO production_appointments (company_id, production_order_id, operation_id, operator_id, start_time, status)
  VALUES (v_company_id, p_order_id, p_operation_id, COALESCE(p_operator_id, auth.uid()), NOW(), 'in_progress') RETURNING id INTO v_appointment_id;
  IF p_operation_id IS NOT NULL THEN UPDATE production_order_operations SET status = 'in_progress', started_at = NOW() WHERE id = p_operation_id; END IF;
  RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION pause_production_appointment(p_appointment_id UUID, p_reason TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE production_appointments SET status = 'paused', pause_start = NOW(), pause_reason = p_reason, updated_at = NOW() WHERE id = p_appointment_id AND status = 'in_progress';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION resume_production_appointment(p_appointment_id UUID)
RETURNS VOID AS $$
DECLARE v_pause_minutes INTEGER;
BEGIN
  SELECT EXTRACT(EPOCH FROM (NOW() - pause_start)) / 60 INTO v_pause_minutes FROM production_appointments WHERE id = p_appointment_id;
  UPDATE production_appointments SET status = 'in_progress', total_pause_minutes = total_pause_minutes + COALESCE(v_pause_minutes, 0), pause_start = NULL, pause_reason = NULL, updated_at = NOW() WHERE id = p_appointment_id AND status = 'paused';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION finish_production_appointment(p_appointment_id UUID, p_quantity_produced INTEGER, p_quantity_rejected INTEGER DEFAULT 0, p_rejection_reason TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE v_appointment RECORD; v_order RECORD; v_total_produced INTEGER; v_work_minutes NUMERIC;
BEGIN
  SELECT * INTO v_appointment FROM production_appointments WHERE id = p_appointment_id;
  SELECT * INTO v_order FROM production_orders WHERE id = v_appointment.production_order_id;
  v_work_minutes := EXTRACT(EPOCH FROM (NOW() - v_appointment.start_time)) / 60 - COALESCE(v_appointment.total_pause_minutes, 0);
  UPDATE production_appointments SET status = 'completed', end_time = NOW(), quantity_produced = p_quantity_produced, quantity_scrapped = p_quantity_rejected, scrap_reason = p_rejection_reason, updated_at = NOW() WHERE id = p_appointment_id;
  IF v_appointment.operation_id IS NOT NULL THEN UPDATE production_order_operations SET status = 'completed', completed_at = NOW(), actual_run_time = v_work_minutes WHERE id = v_appointment.operation_id; END IF;
  SELECT COALESCE(SUM(quantity_produced), 0) INTO v_total_produced FROM production_appointments WHERE production_order_id = v_order.id AND status = 'completed';
  UPDATE production_orders SET produced_quantity = v_total_produced, updated_at = NOW() WHERE id = v_order.id;
  IF v_total_produced >= v_order.planned_quantity THEN PERFORM close_production_order(v_order.id); END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;