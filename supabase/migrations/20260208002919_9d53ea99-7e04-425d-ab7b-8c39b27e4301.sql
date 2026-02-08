-- Add missing company fields for General Settings
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS trade_name TEXT,
ADD COLUMN IF NOT EXISTS legal_name TEXT,
ADD COLUMN IF NOT EXISTS state_registration TEXT,
ADD COLUMN IF NOT EXISTS municipal_registration TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS tax_regime TEXT DEFAULT 'simples_nacional';

-- Add comment for documentation
COMMENT ON COLUMN public.companies.trade_name IS 'Nome Fantasia';
COMMENT ON COLUMN public.companies.legal_name IS 'Razão Social';
COMMENT ON COLUMN public.companies.tax_regime IS 'Regime tributário: simples_nacional, lucro_presumido, lucro_real, mei';