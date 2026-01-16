-- =====================================================
-- CREATE HELPER FUNCTION AND FIX ALL RLS POLICIES
-- =====================================================

-- Helper function to check company membership
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(check_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = check_company_id
  )
$$;