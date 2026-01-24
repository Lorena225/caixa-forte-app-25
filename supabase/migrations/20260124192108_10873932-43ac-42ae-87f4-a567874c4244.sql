-- Create financial_goals table for storing user goals
CREATE TABLE public.financial_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC(15,2) NOT NULL,
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  target_date DATE NOT NULL,
  icon TEXT DEFAULT 'target',
  color TEXT DEFAULT 'blue',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for company access
CREATE POLICY "Users can view their company goals" 
ON public.financial_goals 
FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create goals for their company" 
ON public.financial_goals 
FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company goals" 
ON public.financial_goals 
FOR UPDATE 
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their company goals" 
ON public.financial_goals 
FOR DELETE 
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_financial_goals_updated_at
BEFORE UPDATE ON public.financial_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_financial_goals_company_id ON public.financial_goals(company_id);
CREATE INDEX idx_financial_goals_status ON public.financial_goals(status);

-- Add comment for documentation
COMMENT ON TABLE public.financial_goals IS 'Stores user financial goals with progress tracking';