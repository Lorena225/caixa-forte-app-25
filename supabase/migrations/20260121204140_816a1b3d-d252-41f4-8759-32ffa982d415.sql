-- Fix: Drop existing policies before recreating
DROP POLICY IF EXISTS "report_templates_select" ON public.report_templates;
DROP POLICY IF EXISTS "report_templates_insert" ON public.report_templates;
DROP POLICY IF EXISTS "report_templates_update" ON public.report_templates;
DROP POLICY IF EXISTS "report_templates_delete" ON public.report_templates;

-- Recreate policies for report_templates
CREATE POLICY "report_templates_select" ON public.report_templates
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "report_templates_insert" ON public.report_templates
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "report_templates_update" ON public.report_templates
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "report_templates_delete" ON public.report_templates
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );