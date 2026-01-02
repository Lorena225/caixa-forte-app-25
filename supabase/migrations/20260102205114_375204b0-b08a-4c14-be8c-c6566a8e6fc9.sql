-- =====================================================
-- TABELAS FALTANTES DO GL
-- =====================================================

-- A3) FISCAL_PERIODS (Períodos contábeis)
CREATE TABLE public.fiscal_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed', 'reopened')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  reopened_at TIMESTAMPTZ,
  reopened_by UUID,
  reopen_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, period_year, period_month)
);

-- A3) CLOSING_CHECKLISTS (Checklist de fechamento)
CREATE TABLE public.closing_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.fiscal_periods(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period_id, item_code)
);

-- A1) GL_BALANCES_MONTHLY (Performance: saldos mensais agregados)
CREATE TABLE public.gl_balances_monthly (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  branch_id UUID REFERENCES public.branches(id),
  total_debit NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  ending_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  transaction_count INT NOT NULL DEFAULT 0,
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_fiscal_periods_lookup ON public.fiscal_periods(company_id, period_year, period_month);
CREATE INDEX idx_gl_balances_monthly_lookup ON public.gl_balances_monthly(company_id, period_year, period_month, account_id);
CREATE UNIQUE INDEX idx_gl_balances_unique ON public.gl_balances_monthly(
  company_id, period_year, period_month, account_id, 
  COALESCE(cost_center_id, '00000000-0000-0000-0000-000000000000'::uuid), 
  COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- RLS
ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closing_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gl_balances_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fiscal periods of their company"
  ON public.fiscal_periods FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage fiscal periods of their company"
  ON public.fiscal_periods FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view closing checklists of their company"
  ON public.closing_checklists FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage closing checklists of their company"
  ON public.closing_checklists FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view gl balances of their company"
  ON public.gl_balances_monthly FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "System can manage gl balances"
  ON public.gl_balances_monthly FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Triggers
CREATE TRIGGER update_fiscal_periods_updated_at
  BEFORE UPDATE ON public.fiscal_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Adicionar FK de period_locks para fiscal_periods
-- =====================================================

-- Adicionar coluna period_id em period_locks se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'period_locks' AND column_name = 'period_id'
  ) THEN
    ALTER TABLE public.period_locks ADD COLUMN period_id UUID REFERENCES public.fiscal_periods(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- FUNÇÃO: Validar período aberto antes de postar
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_period_open_for_posting()
RETURNS TRIGGER AS $$
DECLARE
  v_period_status TEXT;
  v_module_locked BOOLEAN;
BEGIN
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status != 'posted') THEN
    SELECT fp.status INTO v_period_status
    FROM public.fiscal_periods fp
    WHERE fp.company_id = NEW.company_id
      AND fp.period_year = EXTRACT(YEAR FROM NEW.entry_date)
      AND fp.period_month = EXTRACT(MONTH FROM NEW.entry_date);
    
    IF v_period_status IS NOT NULL AND v_period_status = 'closed' THEN
      RAISE EXCEPTION 'Cannot post to closed period: %/%', 
        EXTRACT(MONTH FROM NEW.entry_date), EXTRACT(YEAR FROM NEW.entry_date);
    END IF;
    
    SELECT pl.is_locked INTO v_module_locked
    FROM public.period_locks pl
    JOIN public.fiscal_periods fp ON fp.id = pl.period_id
    WHERE fp.company_id = NEW.company_id
      AND fp.period_year = EXTRACT(YEAR FROM NEW.entry_date)
      AND fp.period_month = EXTRACT(MONTH FROM NEW.entry_date)
      AND pl.module = 'GL';
    
    IF v_module_locked = true THEN
      RAISE EXCEPTION 'GL module is locked for period: %/%', 
        EXTRACT(MONTH FROM NEW.entry_date), EXTRACT(YEAR FROM NEW.entry_date);
    END IF;
    
    IF NEW.posted_at IS NULL THEN
      NEW.posted_at := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS trg_check_period_before_posting ON public.journal_entries;
CREATE TRIGGER trg_check_period_before_posting
  BEFORE INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.check_period_open_for_posting();