-- =============================================
-- DASHBOARD VIEWS FOR KPIs AND ANALYTICS
-- =============================================

-- 1. Budget vs Actual Monthly View
CREATE OR REPLACE VIEW public.v_budget_vs_actual_monthly AS
SELECT 
  b.company_id,
  b.year,
  b.month,
  b.target_revenue,
  b.target_expense,
  b.target_profit,
  b.target_margin,
  COALESCE(cf.entradas_pagas, 0) AS actual_revenue,
  COALESCE(cf.saidas_pagas, 0) AS actual_expense,
  COALESCE(cf.resultado, 0) AS actual_profit,
  CASE WHEN COALESCE(cf.entradas_pagas, 0) > 0 
       THEN (COALESCE(cf.resultado, 0) / cf.entradas_pagas * 100)
       ELSE 0 
  END AS actual_margin,
  COALESCE(cf.entradas_pagas, 0) - COALESCE(b.target_revenue, 0) AS revenue_variance,
  COALESCE(cf.saidas_pagas, 0) - COALESCE(b.target_expense, 0) AS expense_variance,
  COALESCE(cf.resultado, 0) - COALESCE(b.target_profit, 0) AS profit_variance,
  CASE WHEN COALESCE(b.target_revenue, 0) > 0 
       THEN ((COALESCE(cf.entradas_pagas, 0) - b.target_revenue) / b.target_revenue * 100)
       ELSE 0 
  END AS revenue_variance_pct,
  CASE WHEN COALESCE(b.target_expense, 0) > 0 
       THEN ((COALESCE(cf.saidas_pagas, 0) - b.target_expense) / b.target_expense * 100)
       ELSE 0 
  END AS expense_variance_pct
FROM budgets b
LEFT JOIN v_cashflow_monthly cf 
  ON b.company_id = cf.company_id 
  AND b.year = cf.year 
  AND b.month = cf.month;

-- 2. AR Aging Summary (aggregated by bucket)
CREATE OR REPLACE VIEW public.v_ar_aging_summary AS
WITH aging_data AS (
  SELECT 
    company_id,
    counterparty_id,
    total_amount,
    due_date,
    CASE
      WHEN due_date >= CURRENT_DATE THEN 'a_vencer'
      WHEN CURRENT_DATE - due_date BETWEEN 1 AND 30 THEN '0_30'
      WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN '31_60'
      WHEN CURRENT_DATE - due_date BETWEEN 61 AND 90 THEN '61_90'
      ELSE '90_plus'
    END AS aging_bucket
  FROM transactions
  WHERE direction = 'entrada'
    AND status NOT IN ('pago', 'cancelado')
)
SELECT 
  ad.company_id,
  ad.aging_bucket,
  COUNT(*) AS doc_count,
  SUM(ad.total_amount) AS total_amount,
  MIN(ad.due_date) AS oldest_date
FROM aging_data ad
GROUP BY ad.company_id, ad.aging_bucket;

-- 3. AP Aging Summary (aggregated by bucket)
CREATE OR REPLACE VIEW public.v_ap_aging_summary AS
WITH aging_data AS (
  SELECT 
    company_id,
    counterparty_id,
    total_amount,
    due_date,
    CASE
      WHEN due_date >= CURRENT_DATE THEN 'a_vencer'
      WHEN CURRENT_DATE - due_date BETWEEN 1 AND 30 THEN '0_30'
      WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN '31_60'
      WHEN CURRENT_DATE - due_date BETWEEN 61 AND 90 THEN '61_90'
      ELSE '90_plus'
    END AS aging_bucket
  FROM transactions
  WHERE direction = 'saida'
    AND status NOT IN ('pago', 'cancelado')
)
SELECT 
  ad.company_id,
  ad.aging_bucket,
  COUNT(*) AS doc_count,
  SUM(ad.total_amount) AS total_amount,
  MIN(ad.due_date) AS oldest_date
FROM aging_data ad
GROUP BY ad.company_id, ad.aging_bucket;

-- 4. Top Debtors (AR) View
CREATE OR REPLACE VIEW public.v_top_debtors AS
SELECT 
  t.company_id,
  t.counterparty_id,
  c.name AS counterparty_name,
  SUM(t.total_amount) AS total_open,
  SUM(CASE WHEN t.due_date < CURRENT_DATE THEN t.total_amount ELSE 0 END) AS total_overdue,
  COUNT(*) AS doc_count,
  MIN(t.due_date) AS oldest_due_date,
  MAX(CURRENT_DATE - t.due_date) FILTER (WHERE t.due_date < CURRENT_DATE) AS max_days_overdue
FROM transactions t
JOIN counterparties c ON t.counterparty_id = c.id
WHERE t.direction = 'entrada'
  AND t.status NOT IN ('pago', 'cancelado')
GROUP BY t.company_id, t.counterparty_id, c.name;

-- 5. Top Creditors (AP) View
CREATE OR REPLACE VIEW public.v_top_creditors AS
SELECT 
  t.company_id,
  t.counterparty_id,
  c.name AS counterparty_name,
  SUM(t.total_amount) AS total_open,
  SUM(CASE WHEN t.due_date < CURRENT_DATE THEN t.total_amount ELSE 0 END) AS total_overdue,
  COUNT(*) AS doc_count,
  MIN(t.due_date) AS oldest_due_date,
  MAX(CURRENT_DATE - t.due_date) FILTER (WHERE t.due_date < CURRENT_DATE) AS max_days_overdue
FROM transactions t
JOIN counterparties c ON t.counterparty_id = c.id
WHERE t.direction = 'saida'
  AND t.status NOT IN ('pago', 'cancelado')
GROUP BY t.company_id, t.counterparty_id, c.name;

-- 6. Daily Cash Balance View (with running totals)
CREATE OR REPLACE VIEW public.v_cash_daily_balance AS
WITH daily_movements AS (
  SELECT 
    company_id,
    wallet_id,
    paid_date AS movement_date,
    SUM(CASE WHEN direction = 'entrada' THEN total_amount ELSE 0 END) AS inflows,
    SUM(CASE WHEN direction = 'saida' THEN total_amount ELSE 0 END) AS outflows
  FROM transactions
  WHERE status = 'pago'
    AND paid_date IS NOT NULL
  GROUP BY company_id, wallet_id, paid_date
),
wallet_openings AS (
  SELECT id AS wallet_id, company_id, opening_balance
  FROM wallets
  WHERE is_active = true
)
SELECT 
  dm.company_id,
  dm.wallet_id,
  w.name AS wallet_name,
  dm.movement_date,
  dm.inflows,
  dm.outflows,
  dm.inflows - dm.outflows AS net,
  wo.opening_balance + SUM(dm.inflows - dm.outflows) OVER (
    PARTITION BY dm.company_id, dm.wallet_id 
    ORDER BY dm.movement_date
  ) AS closing_balance
FROM daily_movements dm
JOIN wallets w ON dm.wallet_id = w.id
JOIN wallet_openings wo ON dm.wallet_id = wo.wallet_id;

-- 7. Cash Flow Projection (next 90 days by day)
CREATE OR REPLACE VIEW public.v_cashflow_projection_daily AS
WITH date_series AS (
  SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', '1 day'::interval)::date AS projection_date
),
scheduled AS (
  SELECT 
    company_id,
    due_date AS projection_date,
    SUM(CASE WHEN direction = 'entrada' THEN total_amount ELSE 0 END) AS scheduled_inflows,
    SUM(CASE WHEN direction = 'saida' THEN total_amount ELSE 0 END) AS scheduled_outflows
  FROM transactions
  WHERE status NOT IN ('pago', 'cancelado')
    AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
  GROUP BY company_id, due_date
),
current_balance AS (
  SELECT 
    company_id,
    SUM(
      COALESCE(opening_balance, 0) +
      COALESCE((
        SELECT SUM(CASE WHEN direction = 'entrada' THEN total_amount ELSE -total_amount END)
        FROM transactions t
        WHERE t.wallet_id = w.id AND t.status = 'pago'
      ), 0)
    ) AS balance
  FROM wallets w
  WHERE is_active = true
  GROUP BY company_id
)
SELECT 
  cb.company_id,
  ds.projection_date,
  COALESCE(s.scheduled_inflows, 0) AS inflows,
  COALESCE(s.scheduled_outflows, 0) AS outflows,
  COALESCE(s.scheduled_inflows, 0) - COALESCE(s.scheduled_outflows, 0) AS net,
  cb.balance + SUM(COALESCE(s.scheduled_inflows, 0) - COALESCE(s.scheduled_outflows, 0)) OVER (
    PARTITION BY cb.company_id 
    ORDER BY ds.projection_date
  ) AS projected_balance
FROM date_series ds
CROSS JOIN current_balance cb
LEFT JOIN scheduled s ON s.projection_date = ds.projection_date AND s.company_id = cb.company_id;

-- 8. Weekly Cash Flow Projection (13 weeks)
CREATE OR REPLACE VIEW public.v_cashflow_weekly_projection AS
WITH week_series AS (
  SELECT 
    date_trunc('week', d::date)::date AS week_start,
    ROW_NUMBER() OVER (ORDER BY date_trunc('week', d::date)) AS week_number
  FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '13 weeks', '1 week'::interval) d
),
scheduled AS (
  SELECT 
    company_id,
    date_trunc('week', due_date)::date AS week_start,
    SUM(CASE WHEN direction = 'entrada' THEN total_amount ELSE 0 END) AS scheduled_inflows,
    SUM(CASE WHEN direction = 'saida' THEN total_amount ELSE 0 END) AS scheduled_outflows
  FROM transactions
  WHERE status NOT IN ('pago', 'cancelado')
    AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '13 weeks'
  GROUP BY company_id, date_trunc('week', due_date)
),
current_balance AS (
  SELECT 
    company_id,
    SUM(
      COALESCE(opening_balance, 0) +
      COALESCE((
        SELECT SUM(CASE WHEN direction = 'entrada' THEN total_amount ELSE -total_amount END)
        FROM transactions t
        WHERE t.wallet_id = w.id AND t.status = 'pago'
      ), 0)
    ) AS balance
  FROM wallets w
  WHERE is_active = true
  GROUP BY company_id
)
SELECT 
  cb.company_id,
  ws.week_start,
  ws.week_number,
  COALESCE(s.scheduled_inflows, 0) AS inflows,
  COALESCE(s.scheduled_outflows, 0) AS outflows,
  COALESCE(s.scheduled_inflows, 0) - COALESCE(s.scheduled_outflows, 0) AS net,
  cb.balance + SUM(COALESCE(s.scheduled_inflows, 0) - COALESCE(s.scheduled_outflows, 0)) OVER (
    PARTITION BY cb.company_id 
    ORDER BY ws.week_start
  ) AS projected_balance
FROM week_series ws
CROSS JOIN current_balance cb
LEFT JOIN scheduled s ON s.week_start = ws.week_start AND s.company_id = cb.company_id;

-- 9. DSO/PMR (Days Sales Outstanding)
CREATE OR REPLACE VIEW public.v_dso_monthly AS
WITH monthly_data AS (
  SELECT 
    company_id,
    EXTRACT(YEAR FROM due_date)::int AS year,
    EXTRACT(MONTH FROM due_date)::int AS month,
    SUM(total_amount) AS total_sales,
    AVG(
      CASE 
        WHEN status = 'pago' AND paid_date IS NOT NULL 
        THEN paid_date - due_date 
        ELSE NULL 
      END
    ) AS avg_collection_days
  FROM transactions
  WHERE direction = 'entrada'
    AND status != 'cancelado'
  GROUP BY company_id, EXTRACT(YEAR FROM due_date), EXTRACT(MONTH FROM due_date)
)
SELECT 
  company_id,
  year,
  month,
  total_sales,
  COALESCE(avg_collection_days, 0)::int AS dso_days
FROM monthly_data;

-- 10. DPO/PMP (Days Payable Outstanding)
CREATE OR REPLACE VIEW public.v_dpo_monthly AS
WITH monthly_data AS (
  SELECT 
    company_id,
    EXTRACT(YEAR FROM due_date)::int AS year,
    EXTRACT(MONTH FROM due_date)::int AS month,
    SUM(total_amount) AS total_payments,
    AVG(
      CASE 
        WHEN status = 'pago' AND paid_date IS NOT NULL 
        THEN paid_date - due_date 
        ELSE NULL 
      END
    ) AS avg_payment_days
  FROM transactions
  WHERE direction = 'saida'
    AND status != 'cancelado'
  GROUP BY company_id, EXTRACT(YEAR FROM due_date), EXTRACT(MONTH FROM due_date)
)
SELECT 
  company_id,
  year,
  month,
  total_payments,
  COALESCE(avg_payment_days, 0)::int AS dpo_days
FROM monthly_data;

-- 11. Saved Filters Table
CREATE TABLE IF NOT EXISTS public.saved_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  filter_type TEXT NOT NULL DEFAULT 'dashboard', -- dashboard, report, etc.
  filters_json JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_saved_filters_company ON saved_filters(company_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user ON saved_filters(user_id);

-- Enable RLS
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view company and shared filters"
  ON public.saved_filters FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
    AND (is_shared = true OR user_id = auth.uid() OR user_id IS NULL)
  );

CREATE POLICY "Users can create own filters"
  ON public.saved_filters FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own filters"
  ON public.saved_filters FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own filters"
  ON public.saved_filters FOR DELETE
  USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE OR REPLACE TRIGGER update_saved_filters_updated_at
  BEFORE UPDATE ON public.saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();