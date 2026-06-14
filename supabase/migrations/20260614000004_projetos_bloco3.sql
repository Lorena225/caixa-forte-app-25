-- BLOCO 3: KPIs por cliente/pessoa + Agente de Projetos
CREATE OR REPLACE FUNCTION public.project_kpi_by_client(p_company_id UUID)
RETURNS TABLE(counterparty_id UUID, client_name TEXT, project_count BIGINT, revenue NUMERIC, cost NUMERIC, margin_pct NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH proj AS (
    SELECT p.id, p.counterparty_id,
      (public.project_economics(p.id)->>'revenue_billed')::numeric AS rev,
      (public.project_economics(p.id)->>'cost_actual')::numeric AS cst
    FROM public.projects p WHERE p.company_id = p_company_id AND p.status <> 'cancelado'
  )
  SELECT c.id, c.name, COUNT(proj.id), COALESCE(SUM(proj.rev),0), COALESCE(SUM(proj.cst),0),
    CASE WHEN SUM(proj.rev) > 0 THEN ROUND(((SUM(proj.rev)-SUM(proj.cst))/SUM(proj.rev))*100,1) ELSE 0 END
  FROM proj JOIN public.counterparties c ON c.id = proj.counterparty_id
  GROUP BY c.id, c.name ORDER BY 4 DESC;
END $$;

CREATE OR REPLACE FUNCTION public.project_kpi_by_person(p_company_id UUID, p_days INTEGER DEFAULT 90)
RETURNS TABLE(employee_id UUID, full_name TEXT, total_hours NUMERIC, billable_hours NUMERIC, utilization_pct NUMERIC, revenue_generated NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.full_name, COALESCE(SUM(t.hours),0),
    COALESCE(SUM(t.hours) FILTER (WHERE t.billable),0),
    CASE WHEN SUM(t.hours) > 0 THEN ROUND((SUM(t.hours) FILTER (WHERE t.billable) / SUM(t.hours))*100,1) ELSE 0 END,
    COALESCE(SUM(t.hours * t.bill_rate_snapshot) FILTER (WHERE t.billable),0)
  FROM public.employees_profiles e
  LEFT JOIN public.project_time_entries t ON t.employee_id = e.id AND t.status = 'aprovado' AND t.entry_date >= CURRENT_DATE - p_days
  WHERE e.company_id = p_company_id GROUP BY e.id, e.full_name
  HAVING COALESCE(SUM(t.hours),0) > 0 ORDER BY 5 DESC;
$$;

CREATE OR REPLACE FUNCTION public.ai_run_project_agent(p_company_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; econ JSON; n INTEGER := 0; v_burn NUMERIC; v_progress INTEGER; v_margin_real NUMERIC; v_margin_plan NUMERIC;
BEGIN
  FOR r IN SELECT id, name, counterparty_id FROM public.projects WHERE company_id = p_company_id AND status NOT IN ('cancelado','concluido')
  LOOP
    econ := public.project_economics(r.id);
    v_burn := (econ->>'burn_pct')::numeric; v_progress := (econ->>'progress_pct')::int;
    v_margin_real := (econ->>'margin_real_pct')::numeric; v_margin_plan := (econ->>'margin_plan_pct')::numeric;
    IF v_burn > v_progress + 15 AND v_burn > 0 THEN
      PERFORM public.ai_log_action(p_company_id => p_company_id, p_agent_type => 'PROJETOS', p_autonomy_level => 'N2_notify',
        p_action_key => 'alerta_burn_rate', p_action_label => 'Burn rate acima do avanço — ' || r.name,
        p_entity_type => 'project', p_entity_id => r.id, p_amount => NULL,
        p_reason => 'Burn ' || v_burn || '% vs avanço ' || v_progress || '%. Risco de estouro de orçamento.', p_status => 'pending');
      n := n + 1;
    END IF;
    IF v_margin_real > 0 AND v_margin_real < v_margin_plan - 10 THEN
      PERFORM public.ai_log_action(p_company_id => p_company_id, p_agent_type => 'PROJETOS', p_autonomy_level => 'N2_notify',
        p_action_key => 'alerta_margem', p_action_label => 'Margem abaixo do previsto — ' || r.name,
        p_entity_type => 'project', p_entity_id => r.id, p_amount => NULL,
        p_reason => 'Margem realizada ' || v_margin_real || '% vs prevista ' || v_margin_plan || '%.', p_status => 'pending');
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;

GRANT EXECUTE ON FUNCTION public.project_kpi_by_client(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.project_kpi_by_person(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_run_project_agent(UUID) TO authenticated;
