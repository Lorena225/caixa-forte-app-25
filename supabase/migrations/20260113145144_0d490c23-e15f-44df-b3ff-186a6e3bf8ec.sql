-- Add bank_id column to wallets table to link with banks_reference
ALTER TABLE public.wallets 
ADD COLUMN bank_id UUID REFERENCES public.banks_reference(id);

-- Create index for better performance
CREATE INDEX idx_wallets_bank_id ON public.wallets(bank_id);