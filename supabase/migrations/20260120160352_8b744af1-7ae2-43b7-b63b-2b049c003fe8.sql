-- Step 1: Create organizational_units table
CREATE TABLE IF NOT EXISTS public.organizational_units (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'setor' CHECK (type IN ('empresa', 'unidade', 'filial', 'setor', 'departamento')),
    parent_unit_id UUID REFERENCES public.organizational_units(id) ON DELETE SET NULL,
    code TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    organizational_unit_id UUID REFERENCES public.organizational_units(id) ON DELETE SET NULL,
    manager_user_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizational_units_company_id ON public.organizational_units(company_id);
CREATE INDEX IF NOT EXISTS idx_organizational_units_parent ON public.organizational_units(parent_unit_id);
CREATE INDEX IF NOT EXISTS idx_organizational_units_type ON public.organizational_units(type);
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON public.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_org_unit ON public.departments(organizational_unit_id);