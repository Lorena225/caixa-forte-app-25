-- =============================================
-- FIX: IMPORT_TEMPLATES - Enable RLS for authenticated users only
-- This is a system-wide template table (no company_id)
-- =============================================

-- Enable RLS on import_templates
ALTER TABLE public.import_templates ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "import_templates_select_authenticated" ON public.import_templates;
DROP POLICY IF EXISTS "import_templates_insert_admin" ON public.import_templates;
DROP POLICY IF EXISTS "import_templates_update_admin" ON public.import_templates;
DROP POLICY IF EXISTS "import_templates_delete_admin" ON public.import_templates;

-- Create restrictive policies - read for authenticated, write for admins only
CREATE POLICY "import_templates_select_authenticated"
ON public.import_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "import_templates_insert_admin"
ON public.import_templates FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "import_templates_update_admin"
ON public.import_templates FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "import_templates_delete_admin"
ON public.import_templates FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add documentation
COMMENT ON TABLE public.import_templates IS 'System import templates with RLS: read for authenticated users, write for admins only';