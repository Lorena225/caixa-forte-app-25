-- Fix Security Definer Views - Set all new views to SECURITY INVOKER
-- This ensures RLS policies are applied based on the querying user

ALTER VIEW public.v_budget_vs_actual_monthly SET (security_invoker = on);
ALTER VIEW public.v_ar_aging_summary SET (security_invoker = on);
ALTER VIEW public.v_ap_aging_summary SET (security_invoker = on);
ALTER VIEW public.v_top_debtors SET (security_invoker = on);
ALTER VIEW public.v_top_creditors SET (security_invoker = on);
ALTER VIEW public.v_cash_daily_balance SET (security_invoker = on);
ALTER VIEW public.v_cashflow_projection_daily SET (security_invoker = on);
ALTER VIEW public.v_cashflow_weekly_projection SET (security_invoker = on);
ALTER VIEW public.v_dso_monthly SET (security_invoker = on);
ALTER VIEW public.v_dpo_monthly SET (security_invoker = on);