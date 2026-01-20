-- Security fix: enable RLS + policies for newly created tables

-- Enable Row Level Security
ALTER TABLE public.organizational_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Policies: organizational_units
DROP POLICY IF EXISTS ou_select ON public.organizational_units;
DROP POLICY IF EXISTS ou_insert ON public.organizational_units;
DROP POLICY IF EXISTS ou_update ON public.organizational_units;
DROP POLICY IF EXISTS ou_delete ON public.organizational_units;

CREATE POLICY ou_select
ON public.organizational_units
FOR SELECT
USING (public.user_belongs_to_company(company_id));

CREATE POLICY ou_insert
ON public.organizational_units
FOR INSERT
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY ou_update
ON public.organizational_units
FOR UPDATE
USING (public.user_belongs_to_company(company_id));

CREATE POLICY ou_delete
ON public.organizational_units
FOR DELETE
USING (public.user_belongs_to_company(company_id));

-- Policies: departments
DROP POLICY IF EXISTS dept_select ON public.departments;
DROP POLICY IF EXISTS dept_insert ON public.departments;
DROP POLICY IF EXISTS dept_update ON public.departments;
DROP POLICY IF EXISTS dept_delete ON public.departments;

CREATE POLICY dept_select
ON public.departments
FOR SELECT
USING (public.user_belongs_to_company(company_id));

CREATE POLICY dept_insert
ON public.departments
FOR INSERT
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY dept_update
ON public.departments
FOR UPDATE
USING (public.user_belongs_to_company(company_id));

CREATE POLICY dept_delete
ON public.departments
FOR DELETE
USING (public.user_belongs_to_company(company_id));

-- updated_at triggers (reuse existing helper)
DROP TRIGGER IF EXISTS update_organizational_units_updated_at ON public.organizational_units;
CREATE TRIGGER update_organizational_units_updated_at
BEFORE UPDATE ON public.organizational_units
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_departments_updated_at ON public.departments;
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();