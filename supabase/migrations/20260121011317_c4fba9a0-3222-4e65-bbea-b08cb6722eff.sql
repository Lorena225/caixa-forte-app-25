-- Fix security issue: set search_path for cleanup_expired_reports function
CREATE OR REPLACE FUNCTION public.cleanup_expired_reports()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.report_exports WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  DELETE FROM public.reports_generated WHERE expires_at < now();
  deleted_count := deleted_count + ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;