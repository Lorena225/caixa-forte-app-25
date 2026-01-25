-- Create finalize_inventory_with_adjustments function
CREATE OR REPLACE FUNCTION public.finalize_inventory_with_adjustments(p_inventory_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_item RECORD;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.inventories
  WHERE id = p_inventory_id;

  FOR v_item IN
    SELECT ii.product_id, ii.counted_quantity, p.current_stock
    FROM public.inventory_items ii
    JOIN public.products p ON ii.product_id = p.id
    WHERE ii.inventory_id = p_inventory_id
  LOOP
    IF v_item.counted_quantity IS NOT NULL AND v_item.counted_quantity != v_item.current_stock THEN
      INSERT INTO public.stock_movements (
        company_id, product_id, movement_type, quantity, reason, reference_id
      ) VALUES (
        v_company_id, v_item.product_id, 'ajuste',
        v_item.counted_quantity - v_item.current_stock,
        'Ajuste de inventário', p_inventory_id
      );

      UPDATE public.products
      SET current_stock = v_item.counted_quantity, updated_at = now()
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  UPDATE public.inventories
  SET status = 'finalizado', closed_at = now(), updated_at = now()
  WHERE id = p_inventory_id;
END;
$$;

-- Revoke direct access to materialized views (security hardening)
REVOKE SELECT ON public.mv_dashboard_metrics FROM anon, authenticated;
REVOKE SELECT ON public.mv_security_dashboard FROM anon, authenticated;

-- Create secure accessor for dashboard metrics (using actual columns)
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_company_id uuid)
RETURNS TABLE (
  company_id uuid,
  total_payables bigint,
  total_receivables bigint,
  overdue_count bigint,
  total_payable_amount numeric,
  total_receivable_amount numeric,
  refreshed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.company_id, m.total_payables, m.total_receivables, m.overdue_count,
         m.total_payable_amount, m.total_receivable_amount, m.refreshed_at
  FROM public.mv_dashboard_metrics m
  WHERE m.company_id = p_company_id
    AND public.user_belongs_to_company(p_company_id)
$$;

-- Create secure accessor for security dashboard (using actual columns)
CREATE OR REPLACE FUNCTION public.get_security_dashboard(p_company_id uuid)
RETURNS TABLE (
  company_id uuid,
  company_name text,
  active_sessions bigint,
  security_events_24h bigint,
  critical_unresolved bigint,
  audit_events_24h bigint,
  api_errors_24h bigint,
  rate_limits_24h bigint,
  refreshed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.company_id, s.company_name, s.active_sessions, s.security_events_24h,
         s.critical_unresolved, s.audit_events_24h, s.api_errors_24h, 
         s.rate_limits_24h, s.refreshed_at
  FROM public.mv_security_dashboard s
  WHERE s.company_id = p_company_id
    AND public.user_belongs_to_company(p_company_id)
$$;