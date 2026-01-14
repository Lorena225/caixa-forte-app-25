
-- Credit protection requests (negativação) with correct RLS
CREATE TABLE IF NOT EXISTS public.credit_protection_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES public.counterparties(id),
  transaction_id UUID REFERENCES public.transactions(id),
  customer_name TEXT NOT NULL,
  customer_document TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  days_overdue INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'registered', 'removed', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  registered_at TIMESTAMP WITH TIME ZONE,
  removed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_protection_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies using company_users table
CREATE POLICY "Users can view credit protection requests of their company"
  ON public.credit_protection_requests FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert credit protection requests in their company"
  ON public.credit_protection_requests FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update credit protection requests in their company"
  ON public.credit_protection_requests FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete credit protection requests in their company"
  ON public.credit_protection_requests FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_protection_company ON public.credit_protection_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_protection_status ON public.credit_protection_requests(status);
