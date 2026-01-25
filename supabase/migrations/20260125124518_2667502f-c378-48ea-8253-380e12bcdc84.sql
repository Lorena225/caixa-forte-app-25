-- Fix remaining functions without search_path

ALTER FUNCTION public.calculate_credit_score(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.calculate_loss_provision(uuid, date, date) SET search_path = public;
ALTER FUNCTION public.schedule_collection_actions(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.update_credit_portfolio_summary(uuid) SET search_path = public;
ALTER FUNCTION public.update_credit_profile_score(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.update_credit_utilization() SET search_path = public;