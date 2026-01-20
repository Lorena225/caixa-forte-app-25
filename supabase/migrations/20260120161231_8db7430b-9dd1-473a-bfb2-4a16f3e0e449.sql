-- Add missing columns to cost_center_responsibles
ALTER TABLE public.cost_center_responsibles 
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add organizational_unit_id to cost_centers
ALTER TABLE public.cost_centers 
ADD COLUMN IF NOT EXISTS organizational_unit_id UUID REFERENCES public.organizational_units(id) ON DELETE SET NULL;

-- Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_cost_center_responsibles_dates 
    ON public.cost_center_responsibles(start_date, end_date);

-- Trigger for cost_center_responsibles updated_at
DROP TRIGGER IF EXISTS update_cost_center_responsibles_updated_at ON public.cost_center_responsibles;
CREATE TRIGGER update_cost_center_responsibles_updated_at
BEFORE UPDATE ON public.cost_center_responsibles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();