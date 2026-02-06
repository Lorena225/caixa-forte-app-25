
-- =====================================================
-- FINANCIAL MODULE PERFORMANCE OPTIMIZATION
-- Multi-tenant architecture for 5,000+ concurrent users
-- =====================================================

-- 1. COMPOSITE INDEXES FOR HIGH-PERFORMANCE QUERIES
-- =================================================

-- Transactions table - critical for cash flow (using correct enum values)
CREATE INDEX IF NOT EXISTS idx_transactions_company_due_status 
ON public.transactions (company_id, due_date, status);

CREATE INDEX IF NOT EXISTS idx_transactions_company_direction_date 
ON public.transactions (company_id, direction, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_company_status_amount 
ON public.transactions (company_id, status, total_amount) 
WHERE status IN ('rascunho', 'lancado');

-- Partial index for open transactions (most queried)
CREATE INDEX IF NOT EXISTS idx_transactions_open 
ON public.transactions (company_id, due_date) 
WHERE status NOT IN ('pago', 'cancelado');

-- Index for wallet operations
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_date 
ON public.transactions (wallet_id, transaction_date DESC);

-- 2. RECURRENCE ENGINE - Support recurring transactions
-- =====================================================

-- Add recurrence fields to transactions (is_recurring and recurrence_type already exist)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS recurrence_end_date date,
ADD COLUMN IF NOT EXISTS recurrence_count integer,
ADD COLUMN IF NOT EXISTS parent_transaction_id uuid REFERENCES public.transactions(id),
ADD COLUMN IF NOT EXISTS recurrence_index integer DEFAULT 0;

-- 3. CHEQUES MANAGEMENT TABLE
-- ===========================

CREATE TABLE IF NOT EXISTS public.cheques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  counterparty_id uuid REFERENCES public.counterparties(id),
  transaction_id uuid REFERENCES public.transactions(id),
  
  cheque_number text NOT NULL,
  cheque_type text NOT NULL CHECK (cheque_type IN ('emitido', 'recebido')),
  amount numeric(15,2) NOT NULL,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'compensado', 'devolvido', 'cancelado', 'custodia')),
  compensation_date date,
  
  bank_code text,
  agency text,
  account_number text,
  
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for cheques
CREATE INDEX IF NOT EXISTS idx_cheques_company_status ON public.cheques(company_id, status);
CREATE INDEX IF NOT EXISTS idx_cheques_company_due ON public.cheques(company_id, due_date);

-- RLS for cheques
ALTER TABLE public.cheques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cheques_tenant_isolation" ON public.cheques;
CREATE POLICY "cheques_tenant_isolation" ON public.cheques
FOR ALL USING (public.user_belongs_to_company(company_id));

-- 4. ATOMIC BANK TRANSFER FUNCTION
-- ================================

CREATE OR REPLACE FUNCTION public.execute_bank_transfer(
  p_company_id uuid,
  p_origin_account_id uuid,
  p_destination_account_id uuid,
  p_amount numeric,
  p_transfer_date date,
  p_description text DEFAULT NULL,
  p_reference_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer_id uuid;
  v_origin_balance numeric;
BEGIN
  -- Validate company access
  IF NOT public.user_belongs_to_company(p_company_id) THEN
    RAISE EXCEPTION 'Access denied to company';
  END IF;

  -- Validate accounts belong to same company
  IF NOT EXISTS (
    SELECT 1 FROM bank_accounts 
    WHERE id = p_origin_account_id AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Origin account not found or access denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM bank_accounts 
    WHERE id = p_destination_account_id AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Destination account not found or access denied';
  END IF;

  -- Check origin balance
  SELECT current_balance INTO v_origin_balance
  FROM bank_accounts WHERE id = p_origin_account_id;
  
  IF v_origin_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance in origin account. Available: %, Required: %', v_origin_balance, p_amount;
  END IF;

  -- BEGIN ATOMIC TRANSACTION
  -- Create bank transfer record
  INSERT INTO bank_transfers (
    company_id,
    origin_bank_account_id,
    destination_bank_account_id,
    transfer_date,
    amount,
    description,
    reference_number,
    status,
    executed_at
  ) VALUES (
    p_company_id,
    p_origin_account_id,
    p_destination_account_id,
    p_transfer_date,
    p_amount,
    COALESCE(p_description, 'Transferência entre contas'),
    p_reference_number,
    'concluido',
    now()
  ) RETURNING id INTO v_transfer_id;

  -- Update bank account balances atomically
  UPDATE bank_accounts 
  SET current_balance = current_balance - p_amount,
      updated_at = now()
  WHERE id = p_origin_account_id;

  UPDATE bank_accounts 
  SET current_balance = current_balance + p_amount,
      updated_at = now()
  WHERE id = p_destination_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'amount', p_amount
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Transaction automatically rolled back
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- 5. RECURRENCE GENERATOR FUNCTION
-- ================================

CREATE OR REPLACE FUNCTION public.generate_recurring_transactions(
  p_transaction_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction RECORD;
  v_next_date date;
  v_count integer := 0;
  v_max_count integer;
  v_interval interval;
BEGIN
  SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id;
  
  IF NOT FOUND OR NOT COALESCE(v_transaction.is_recurring, false) THEN
    RETURN 0;
  END IF;

  -- Determine interval based on recurrence type
  v_interval := CASE v_transaction.recurrence_type
    WHEN 'diario' THEN interval '1 day'
    WHEN 'semanal' THEN interval '1 week'
    WHEN 'quinzenal' THEN interval '2 weeks'
    WHEN 'mensal' THEN interval '1 month'
    WHEN 'bimestral' THEN interval '2 months'
    WHEN 'trimestral' THEN interval '3 months'
    WHEN 'semestral' THEN interval '6 months'
    WHEN 'anual' THEN interval '1 year'
    ELSE interval '1 month'
  END;

  v_max_count := COALESCE(v_transaction.recurrence_count, 12);
  v_next_date := v_transaction.due_date + v_interval;

  WHILE v_count < v_max_count - 1 LOOP
    -- Check end date
    IF v_transaction.recurrence_end_date IS NOT NULL AND v_next_date > v_transaction.recurrence_end_date THEN
      EXIT;
    END IF;

    INSERT INTO transactions (
      company_id, counterparty_id, category_id, wallet_id, cost_center_id, account_id,
      direction, original_amount, total_amount, balance_amount, description, 
      transaction_date, due_date, status,
      is_recurring, recurrence_type, parent_transaction_id, recurrence_index
    ) VALUES (
      v_transaction.company_id,
      v_transaction.counterparty_id,
      v_transaction.category_id,
      v_transaction.wallet_id,
      v_transaction.cost_center_id,
      v_transaction.account_id,
      v_transaction.direction,
      v_transaction.original_amount,
      v_transaction.total_amount,
      v_transaction.total_amount,
      v_transaction.description,
      v_next_date,
      v_next_date,
      'lancado',
      false,
      v_transaction.recurrence_type,
      p_transaction_id,
      v_count + 2
    );

    v_count := v_count + 1;
    v_next_date := v_next_date + v_interval;
  END LOOP;

  -- Update parent with count
  UPDATE transactions 
  SET recurrence_index = 1 
  WHERE id = p_transaction_id;

  RETURN v_count;
END;
$$;

-- 6. PARTIAL PAYMENT FUNCTION
-- ===========================

CREATE OR REPLACE FUNCTION public.register_partial_payment(
  p_transaction_id uuid,
  p_payment_amount numeric,
  p_payment_date date DEFAULT CURRENT_DATE,
  p_wallet_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction RECORD;
  v_new_balance numeric;
  v_new_status transaction_status;
BEGIN
  SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;

  -- Validate company access
  IF NOT public.user_belongs_to_company(v_transaction.company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  v_new_balance := GREATEST(0, COALESCE(v_transaction.balance_amount, v_transaction.total_amount) - p_payment_amount);
  
  IF p_payment_amount > COALESCE(v_transaction.balance_amount, v_transaction.total_amount) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment exceeds remaining balance');
  END IF;

  -- Determine new status (use 'pago' when fully paid, keep 'lancado' for partial)
  IF v_new_balance <= 0 THEN
    v_new_status := 'pago';
  ELSE
    v_new_status := 'lancado';
  END IF;

  -- Update transaction
  UPDATE transactions
  SET balance_amount = v_new_balance,
      status = v_new_status,
      paid_at = CASE WHEN v_new_status = 'pago' THEN now() ELSE paid_at END,
      paid_date = CASE WHEN v_new_status = 'pago' THEN p_payment_date ELSE paid_date END,
      wallet_id = COALESCE(p_wallet_id, wallet_id),
      notes = CASE WHEN p_notes IS NOT NULL 
        THEN COALESCE(notes, '') || chr(10) || p_payment_date || ': ' || p_notes 
        ELSE notes END,
      updated_at = now()
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'paid_amount', p_payment_amount,
    'new_status', v_new_status::text
  );
END;
$$;

-- 7. BULK PAYMENT FUNCTION
-- ========================

CREATE OR REPLACE FUNCTION public.bulk_settle_transactions(
  p_transaction_ids uuid[],
  p_wallet_id uuid,
  p_payment_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_total numeric := 0;
  v_tid uuid;
  v_transaction RECORD;
BEGIN
  FOREACH v_tid IN ARRAY p_transaction_ids LOOP
    SELECT * INTO v_transaction FROM transactions WHERE id = v_tid;
    
    IF FOUND AND public.user_belongs_to_company(v_transaction.company_id) THEN
      UPDATE transactions
      SET status = 'pago',
          balance_amount = 0,
          paid_at = now(),
          paid_date = p_payment_date,
          wallet_id = COALESCE(p_wallet_id, wallet_id),
          updated_at = now()
      WHERE id = v_tid AND status NOT IN ('pago', 'cancelado');
      
      IF FOUND THEN
        v_count := v_count + 1;
        v_total := v_total + COALESCE(v_transaction.balance_amount, v_transaction.total_amount);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'settled_count', v_count,
    'total_amount', v_total
  );
END;
$$;

-- 8. CASH FLOW PROJECTION VIEW (Optimized)
-- ========================================

DROP VIEW IF EXISTS public.v_cash_flow_projection;
CREATE VIEW public.v_cash_flow_projection WITH (security_invoker = true) AS
SELECT 
  t.company_id,
  t.due_date,
  t.direction,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN t.direction = 'entrada' THEN COALESCE(t.balance_amount, t.total_amount) ELSE 0 END) as total_receivable,
  SUM(CASE WHEN t.direction = 'saida' THEN COALESCE(t.balance_amount, t.total_amount) ELSE 0 END) as total_payable,
  SUM(CASE WHEN t.direction = 'entrada' THEN COALESCE(t.balance_amount, t.total_amount) ELSE -COALESCE(t.balance_amount, t.total_amount) END) as net_flow
FROM transactions t
WHERE t.status NOT IN ('pago', 'cancelado')
  AND t.due_date >= CURRENT_DATE
  AND t.due_date <= CURRENT_DATE + interval '90 days'
GROUP BY t.company_id, t.due_date, t.direction
ORDER BY t.due_date;

-- 9. LIQUIDITY DASHBOARD VIEW
-- ============================

DROP VIEW IF EXISTS public.v_liquidity_dashboard;
CREATE VIEW public.v_liquidity_dashboard WITH (security_invoker = true) AS
SELECT 
  ba.company_id,
  SUM(ba.current_balance) as total_balance,
  SUM(CASE WHEN ba.account_type = 'conta_corrente' THEN ba.current_balance ELSE 0 END) as checking_balance,
  SUM(CASE WHEN ba.account_type = 'poupanca' THEN ba.current_balance ELSE 0 END) as savings_balance,
  SUM(CASE WHEN ba.account_type = 'caixa' THEN ba.current_balance ELSE 0 END) as cash_balance,
  SUM(CASE WHEN ba.account_type = 'investimento' THEN ba.current_balance ELSE 0 END) as investment_balance,
  (
    SELECT COALESCE(SUM(COALESCE(balance_amount, total_amount)), 0)
    FROM transactions 
    WHERE company_id = ba.company_id 
      AND direction = 'entrada' 
      AND status NOT IN ('pago', 'cancelado')
      AND due_date <= CURRENT_DATE + interval '30 days'
  ) as receivables_30d,
  (
    SELECT COALESCE(SUM(COALESCE(balance_amount, total_amount)), 0)
    FROM transactions 
    WHERE company_id = ba.company_id 
      AND direction = 'saida' 
      AND status NOT IN ('pago', 'cancelado')
      AND due_date <= CURRENT_DATE + interval '30 days'
  ) as payables_30d
FROM bank_accounts ba
WHERE ba.is_active = true
GROUP BY ba.company_id;

-- 10. REINFORCE RLS POLICIES
-- ==========================

-- Ensure transactions have proper RLS
DROP POLICY IF EXISTS "transactions_tenant_isolation" ON public.transactions;
CREATE POLICY "transactions_tenant_isolation" ON public.transactions
FOR ALL USING (public.user_belongs_to_company(company_id));

-- Bank accounts RLS
DROP POLICY IF EXISTS "bank_accounts_tenant_isolation" ON public.bank_accounts;
CREATE POLICY "bank_accounts_tenant_isolation" ON public.bank_accounts
FOR ALL USING (public.user_belongs_to_company(company_id));

-- Bank transfers RLS
DROP POLICY IF EXISTS "bank_transfers_tenant_isolation" ON public.bank_transfers;
CREATE POLICY "bank_transfers_tenant_isolation" ON public.bank_transfers
FOR ALL USING (public.user_belongs_to_company(company_id));

-- 11. Enable realtime for financial tables (ignore errors if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_accounts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cheques;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
