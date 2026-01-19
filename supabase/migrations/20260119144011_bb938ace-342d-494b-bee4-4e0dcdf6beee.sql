-- =============================================
-- FIX 1: PROFILES - Drop ALL existing policies first
-- =============================================
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- Recreate with correct restrictive policies
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- =============================================
-- FIX 2: TRANSACTIONS - Drop ALL existing policies first
-- =============================================
DROP POLICY IF EXISTS "transactions_select_finance_roles" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_finance_roles" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_finance_roles" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_admin_only" ON public.transactions;

-- Recreate with RBAC policies
CREATE POLICY "transactions_select_finance_roles"
ON public.transactions FOR SELECT
TO authenticated
USING (
  public.user_belongs_to_company(company_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance')
    OR public.has_role(auth.uid(), 'accountant')
    OR public.has_role(auth.uid(), 'treasury')
  )
);

CREATE POLICY "transactions_insert_finance_roles"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
  public.user_belongs_to_company(company_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance')
    OR public.has_role(auth.uid(), 'accountant')
    OR public.has_role(auth.uid(), 'treasury')
  )
);

CREATE POLICY "transactions_update_finance_roles"
ON public.transactions FOR UPDATE
TO authenticated
USING (
  public.user_belongs_to_company(company_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance')
    OR public.has_role(auth.uid(), 'accountant')
    OR public.has_role(auth.uid(), 'treasury')
  )
)
WITH CHECK (
  public.user_belongs_to_company(company_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance')
    OR public.has_role(auth.uid(), 'accountant')
    OR public.has_role(auth.uid(), 'treasury')
  )
);

CREATE POLICY "transactions_delete_admin_only"
ON public.transactions FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_company(company_id)
  AND public.has_role(auth.uid(), 'admin')
);

-- Add documentation
COMMENT ON TABLE public.profiles IS 'User profiles with RBAC RLS: owner-only access, admins can view all';
COMMENT ON TABLE public.transactions IS 'Financial transactions with RBAC RLS: restricted to admin/finance/accountant/treasury roles';