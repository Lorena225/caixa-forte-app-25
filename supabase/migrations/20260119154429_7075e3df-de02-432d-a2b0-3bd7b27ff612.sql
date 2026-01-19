
-- =============================================
-- FIX: PROFILES TABLE - Consolidate RLS policies
-- Remove conflicting SELECT policies and create single restrictive policy
-- =============================================

-- Drop all existing SELECT policies (there are 3 conflicting ones)
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_company_colleagues" ON public.profiles;

-- Create a single, secure SELECT policy:
-- User can see their own profile OR profiles of company colleagues
CREATE POLICY "profiles_select_secure"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- Own profile
  id = auth.uid()
  OR
  -- Same company colleagues (via company_users join)
  EXISTS (
    SELECT 1 FROM public.company_users cu1
    JOIN public.company_users cu2 ON cu1.company_id = cu2.company_id
    WHERE cu1.user_id = auth.uid() AND cu2.user_id = profiles.id
  )
);

-- Add documentation
COMMENT ON POLICY "profiles_select_secure" ON public.profiles IS 
  'Users can only view their own profile or profiles of colleagues in their companies';
