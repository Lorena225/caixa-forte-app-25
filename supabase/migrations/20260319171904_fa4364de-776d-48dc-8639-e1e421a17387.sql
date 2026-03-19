
-- Function to generate a people_analytics_snapshot for a given company
CREATE OR REPLACE FUNCTION public.generate_people_analytics_snapshot(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_active int;
  v_vacation int;
  v_leave int;
  v_terminated_mtd int;
  v_hired_mtd int;
  v_total_payroll numeric;
  v_total_benefits numeric;
  v_total_overtime numeric;
  v_avg_salary numeric;
  v_turnover numeric;
  v_start_of_month date;
BEGIN
  v_start_of_month := date_trunc('month', now())::date;

  SELECT count(*) INTO v_total FROM employees_profiles WHERE company_id = p_company_id;
  SELECT count(*) INTO v_active FROM employees_profiles WHERE company_id = p_company_id AND status = 'ativo';
  SELECT count(*) INTO v_vacation FROM employees_profiles WHERE company_id = p_company_id AND status = 'ferias';
  SELECT count(*) INTO v_leave FROM employees_profiles WHERE company_id = p_company_id AND status = 'afastado';

  SELECT count(*) INTO v_terminated_mtd FROM employees_profiles
    WHERE company_id = p_company_id AND termination_date >= v_start_of_month;

  SELECT count(*) INTO v_hired_mtd FROM employees_profiles
    WHERE company_id = p_company_id AND hire_date >= v_start_of_month;

  SELECT coalesce(sum(base_salary), 0) INTO v_total_payroll
    FROM employees_profiles WHERE company_id = p_company_id AND status = 'ativo';

  SELECT coalesce(sum(company_value), 0) INTO v_total_benefits
    FROM employee_benefits WHERE company_id = p_company_id AND is_active = true;

  SELECT coalesce(sum(coalesce(overtime_50,0) + coalesce(overtime_100,0)), 0) INTO v_total_overtime
    FROM time_daily_summary WHERE company_id = p_company_id AND work_date >= v_start_of_month;

  v_avg_salary := CASE WHEN v_active > 0 THEN v_total_payroll / v_active ELSE 0 END;
  v_turnover := CASE WHEN v_total > 0 THEN (v_terminated_mtd::numeric / v_total) * 100 ELSE 0 END;

  INSERT INTO people_analytics_snapshots (
    company_id, snapshot_date, total_employees, active_employees,
    on_vacation, on_leave, terminated_mtd, hired_mtd,
    total_payroll_cost, total_benefits_cost, total_overtime_cost,
    turnover_rate, absenteeism_rate, avg_salary
  ) VALUES (
    p_company_id, now()::date, v_total, v_active,
    v_vacation, v_leave, v_terminated_mtd, v_hired_mtd,
    v_total_payroll, v_total_benefits, v_total_overtime,
    round(v_turnover, 2), 0, round(v_avg_salary, 2)
  );
END;
$$;
