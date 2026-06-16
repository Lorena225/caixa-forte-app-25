-- IA Inbox de Governança + Dashboard Pulso + Onboarding (DDL reconciliado do banco)
-- Funções idempotentes (CREATE OR REPLACE). Versionamento da auditoria total.

CREATE OR REPLACE FUNCTION public.ai_approve_action(p_action_id uuid, p_note text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_company UUID;
BEGIN
  SELECT company_id INTO v_company FROM public.agent_action_log WHERE id = p_action_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Ação não encontrada'; END IF;
  UPDATE public.agent_action_log
     SET status = 'executed', approved_by = auth.uid(), approved_at = now()
   WHERE id = p_action_id AND status IN ('pending_approval','approved');
  RETURN p_action_id;
END $function$;

CREATE OR REPLACE FUNCTION public.ai_reject_action(p_action_id uuid, p_reason text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.agent_action_log
     SET status = 'rejected', approved_by = auth.uid(), approved_at = now(), revert_reason = p_reason
   WHERE id = p_action_id AND status = 'pending_approval';
  RETURN p_action_id;
END $function$;

CREATE OR REPLACE FUNCTION public.ai_revert_action(p_action_id uuid, p_reason text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.agent_action_log
     SET status = 'reverted', reverted_by = auth.uid(), reverted_at = now(), revert_reason = p_reason
   WHERE id = p_action_id AND status = 'executed';
  RETURN p_action_id;
END $function$;

CREATE OR REPLACE FUNCTION public.ai_inbox_summary(p_company_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_pending INTEGER; v_today INTEGER; v_by_agent JSON; v_amount NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_pending FROM public.agent_action_log
   WHERE company_id = p_company_id AND status = 'pending_approval';
  SELECT COUNT(*) INTO v_today FROM public.agent_action_log
   WHERE company_id = p_company_id AND created_at::date = CURRENT_DATE;
  SELECT COALESCE(SUM(amount),0) INTO v_amount FROM public.agent_action_log
   WHERE company_id = p_company_id AND status = 'pending_approval' AND amount IS NOT NULL;
  SELECT json_agg(row_to_json(t)) INTO v_by_agent FROM (
    SELECT agent_type::text AS agent_type, COUNT(*) AS n
    FROM public.agent_action_log
    WHERE company_id = p_company_id AND status = 'pending_approval'
    GROUP BY agent_type) t;
  RETURN json_build_object('pending', v_pending, 'today', v_today,
    'pending_amount', v_amount, 'by_agent', COALESCE(v_by_agent, '[]'::json));
END $function$;

CREATE OR REPLACE FUNCTION public.ai_run_all_agents(p_company_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_proj INTEGER := 0; v_delinq INTEGER := 0;
BEGIN
  BEGIN v_proj := public.ai_run_project_agent(p_company_id); EXCEPTION WHEN OTHERS THEN v_proj := 0; END;
  BEGIN v_delinq := public.ai_run_delinquency_agent(p_company_id); EXCEPTION WHEN OTHERS THEN v_delinq := 0; END;
  RETURN json_build_object('projetos', v_proj, 'inadimplencia', v_delinq, 'total', v_proj + v_delinq);
END $function$;

CREATE OR REPLACE FUNCTION public.ai_dashboard_pulse(p_company_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_cash NUMERIC; v_receivable NUMERIC; v_receivable_overdue NUMERIC;
  v_payable NUMERIC; v_payable_7d NUMERIC;
  v_revenue_month NUMERIC; v_cost_month NUMERIC; v_margin NUMERIC;
  v_start DATE := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  SELECT COALESCE(SUM(CASE WHEN direction::text='entrada' THEN total_amount ELSE -total_amount END),0)
    INTO v_cash FROM public.transactions WHERE company_id = p_company_id AND status::text = 'pago';
  SELECT COALESCE(SUM(balance_amount),0), COALESCE(SUM(balance_amount) FILTER (WHERE due_date < CURRENT_DATE),0)
    INTO v_receivable, v_receivable_overdue FROM public.transactions
   WHERE company_id = p_company_id AND direction::text = 'entrada' AND status::text = 'lancado' AND balance_amount > 0;
  SELECT COALESCE(SUM(balance_amount),0), COALESCE(SUM(balance_amount) FILTER (WHERE due_date <= CURRENT_DATE + 7),0)
    INTO v_payable, v_payable_7d FROM public.transactions
   WHERE company_id = p_company_id AND direction::text = 'saida' AND status::text = 'lancado' AND balance_amount > 0;
  SELECT COALESCE(SUM(total_amount) FILTER (WHERE direction::text='entrada'),0),
         COALESCE(SUM(total_amount) FILTER (WHERE direction::text='saida'),0)
    INTO v_revenue_month, v_cost_month FROM public.transactions
   WHERE company_id = p_company_id AND transaction_date >= v_start AND status::text IN ('lancado','pago');
  v_margin := CASE WHEN v_revenue_month > 0 THEN ROUND(((v_revenue_month - v_cost_month) / v_revenue_month) * 100, 1) ELSE 0 END;
  RETURN json_build_object('cash', v_cash, 'receivable', v_receivable, 'receivable_overdue', v_receivable_overdue,
    'payable', v_payable, 'payable_7d', v_payable_7d, 'revenue_month', v_revenue_month,
    'cost_month', v_cost_month, 'margin_pct', v_margin,
    'has_data', (v_cash <> 0 OR v_receivable <> 0 OR v_payable <> 0 OR v_revenue_month <> 0));
END $function$;

CREATE OR REPLACE FUNCTION public.ai_onboarding_status(p_company_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_company BOOLEAN; v_coa BOOLEAN; v_cc BOOLEAN; v_acc BOOLEAN; v_partners BOOLEAN; v_tax BOOLEAN; v_proj BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.companies WHERE id = p_company_id) INTO v_company;
  SELECT EXISTS(SELECT 1 FROM public.accounts WHERE company_id = p_company_id) INTO v_coa;
  SELECT EXISTS(SELECT 1 FROM public.cost_centers WHERE company_id = p_company_id) INTO v_cc;
  SELECT EXISTS(SELECT 1 FROM public.bank_accounts WHERE company_id = p_company_id AND is_active) INTO v_acc;
  SELECT EXISTS(SELECT 1 FROM public.counterparties WHERE company_id = p_company_id) INTO v_partners;
  SELECT EXISTS(SELECT 1 FROM public.tax_parameters WHERE company_id = p_company_id) INTO v_tax;
  SELECT EXISTS(SELECT 1 FROM public.projects WHERE company_id = p_company_id) INTO v_proj;
  RETURN json_build_object('company', COALESCE(v_company,false), 'chartOfAccounts', COALESCE(v_coa,false),
    'costCenters', COALESCE(v_cc,false), 'accounts', COALESCE(v_acc,false), 'partners', COALESCE(v_partners,false),
    'taxParams', COALESCE(v_tax,false), 'firstProject', COALESCE(v_proj,false));
END $function$;
