
-- Corrigir SECURITY DEFINER nas views - usar SECURITY INVOKER
-- (Recriar views sem SECURITY DEFINER para usar permissões do usuário)

-- Drop e recriar v_budget_variance_analysis com security invoker
DROP VIEW IF EXISTS public.v_budget_variance_analysis;
CREATE VIEW public.v_budget_variance_analysis
WITH (security_invoker = true)
AS
WITH budget_data AS (
  SELECT 
    bm.id as budget_id,
    bm.company_id,
    bm.year,
    bm.name as budget_name,
    bm.scenario_type,
    bm.version,
    bm.is_active,
    bl.account_id,
    bl.cost_center_id,
    bl.month,
    bl.planned_amount
  FROM public.budget_master bm
  JOIN public.budget_lines bl ON bl.budget_id = bm.id
),
actual_data AS (
  SELECT 
    company_id,
    account_id,
    cost_center_id,
    EXTRACT(YEAR FROM transaction_date)::integer as year,
    EXTRACT(MONTH FROM transaction_date)::integer as month,
    SUM(CASE WHEN direction = 'entrada' THEN total_amount ELSE -total_amount END) as actual_amount
  FROM public.transactions
  WHERE status = 'pago'
  GROUP BY company_id, account_id, cost_center_id, 
    EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date)
)
SELECT 
  bd.budget_id,
  bd.company_id,
  bd.year,
  bd.budget_name,
  bd.scenario_type,
  bd.version,
  bd.is_active,
  bd.account_id,
  a.account_code,
  a.account_name,
  a.category_type,
  bd.cost_center_id,
  cc.name as cost_center_name,
  bd.month,
  COALESCE(bd.planned_amount, 0) as budget_amount,
  COALESCE(ad.actual_amount, 0) as actual_amount,
  COALESCE(ad.actual_amount, 0) - COALESCE(bd.planned_amount, 0) as variance_amount,
  CASE 
    WHEN COALESCE(bd.planned_amount, 0) = 0 THEN 0
    ELSE ((COALESCE(ad.actual_amount, 0) - COALESCE(bd.planned_amount, 0)) / bd.planned_amount * 100)
  END as variance_percent,
  CASE 
    WHEN a.category_type = 'receita' THEN
      CASE WHEN COALESCE(ad.actual_amount, 0) >= COALESCE(bd.planned_amount, 0) THEN 'favorable' ELSE 'unfavorable' END
    ELSE
      CASE WHEN COALESCE(ad.actual_amount, 0) <= COALESCE(bd.planned_amount, 0) THEN 'favorable' ELSE 'unfavorable' END
  END as variance_status
FROM budget_data bd
LEFT JOIN actual_data ad ON ad.company_id = bd.company_id 
  AND ad.account_id = bd.account_id 
  AND COALESCE(ad.cost_center_id::text, '') = COALESCE(bd.cost_center_id::text, '')
  AND ad.year = bd.year 
  AND ad.month = bd.month
LEFT JOIN public.accounts a ON a.id = bd.account_id
LEFT JOIN public.cost_centers cc ON cc.id = bd.cost_center_id;

-- Drop e recriar v_pending_budget_approvals com security invoker
DROP VIEW IF EXISTS public.v_pending_budget_approvals;
CREATE VIEW public.v_pending_budget_approvals
WITH (security_invoker = true)
AS
SELECT 
  bar.id as request_id,
  bar.budget_id,
  bm.name as budget_name,
  bm.year,
  bm.company_id,
  bar.status as request_status,
  bar.current_level,
  bar.total_levels,
  bar.requested_at,
  bas.id as step_id,
  bas.level_order,
  bas.approver_id,
  bas.status as step_status,
  bal.level_name
FROM public.budget_approval_requests bar
JOIN public.budget_master bm ON bm.id = bar.budget_id
LEFT JOIN public.budget_approval_steps bas ON bas.request_id = bar.id AND bas.level_order = bar.current_level
LEFT JOIN public.budget_approval_levels bal ON bal.id = bas.level_id
WHERE bar.status IN ('pending', 'in_review');
