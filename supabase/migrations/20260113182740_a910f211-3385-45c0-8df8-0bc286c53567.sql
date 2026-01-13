-- ============================================
-- MÓDULO DE BAIXAS (SETTLEMENTS) - AP/AR
-- Baixa Manual + Baixa Automática
-- ============================================

-- 1. ADICIONAR CAMPOS DE SALDO NA TABELA TRANSACTIONS (se não existir)
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS balance_amount DECIMAL(18,2);

-- Atualizar balance_amount com valor inicial baseado no status
UPDATE public.transactions 
SET balance_amount = 
  CASE 
    WHEN status = 'pago' THEN 0
    ELSE total_amount 
  END
WHERE balance_amount IS NULL;

-- Alterar para NOT NULL com default
ALTER TABLE public.transactions 
  ALTER COLUMN balance_amount SET DEFAULT 0;

-- 2. CRIAR ENUMS PARA O MÓDULO DE BAIXAS
DO $$ BEGIN
  CREATE TYPE settlement_type AS ENUM (
    'PAGAMENTO', 'RECEBIMENTO', 'CANCELAMENTO', 'ABATIMENTO', 'LUCRO_PERDA', 'COMPENSACAO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE settlement_origin AS ENUM (
    'MANUAL', 'CNAB', 'CSV', 'BORDERO', 'IMPORTACAO', 'COMPENSACAO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE settlement_status AS ENUM (
    'RASCUNHO', 'PROCESSADO', 'CANCELADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE settlement_file_type AS ENUM (
    'CNAB_RETORNO', 'CSV', 'OUTRO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE settlement_match_status AS ENUM (
    'OK', 'NOT_FOUND', 'VALUE_MISMATCH', 'ALREADY_SETTLED', 'AMBIGUOUS'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. TABELA SETTLEMENTS (cabeçalho de baixa)
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  settlement_type settlement_type NOT NULL,
  origin settlement_origin NOT NULL,
  title_type VARCHAR(10) NOT NULL CHECK (title_type IN ('PAGAR', 'RECEBER')),
  settlement_date DATE NOT NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  user_id UUID NOT NULL,
  notes VARCHAR(255),
  status settlement_status NOT NULL DEFAULT 'PROCESSADO',
  source_file_id UUID,
  reversed_settlement_id UUID REFERENCES public.settlements(id),
  is_reversal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para settlements
CREATE INDEX IF NOT EXISTS idx_settlements_company_date ON public.settlements(company_id, settlement_date);
CREATE INDEX IF NOT EXISTS idx_settlements_company_origin ON public.settlements(company_id, origin, created_at);
CREATE INDEX IF NOT EXISTS idx_settlements_source_file ON public.settlements(source_file_id) WHERE source_file_id IS NOT NULL;

-- 4. TABELA SETTLEMENT_ITEMS (itens por título)
CREATE TABLE IF NOT EXISTS public.settlement_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  settlement_id UUID NOT NULL REFERENCES public.settlements(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
  amount_settled DECIMAL(18,2) NOT NULL CHECK (amount_settled > 0),
  interest DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (interest >= 0),
  penalty DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (penalty >= 0),
  discount DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  fx_difference DECIMAL(18,2) NOT NULL DEFAULT 0,
  previous_balance DECIMAL(18,2) NOT NULL,
  new_balance DECIMAL(18,2) NOT NULL CHECK (new_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para settlement_items
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_items_unique ON public.settlement_items(company_id, settlement_id, transaction_id);
CREATE INDEX IF NOT EXISTS idx_settlement_items_transaction ON public.settlement_items(company_id, transaction_id);

-- 5. TABELA SETTLEMENT_FILES (log de arquivos importados)
CREATE TABLE IF NOT EXISTS public.settlement_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_type settlement_file_type NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  bank_id UUID REFERENCES public.banks_reference(id),
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  total_records INT NOT NULL DEFAULT 0,
  total_matched_ok INT NOT NULL DEFAULT 0,
  total_processed INT NOT NULL DEFAULT 0,
  total_errors INT NOT NULL DEFAULT 0,
  storage_path TEXT,
  idempotency_key VARCHAR(80) NOT NULL,
  summary_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraint de unicidade para idempotência
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_files_idempotency ON public.settlement_files(company_id, idempotency_key);

-- 6. TABELA SETTLEMENT_FILE_ROWS (linhas do arquivo para conferência)
CREATE TABLE IF NOT EXISTS public.settlement_file_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.settlement_files(id) ON DELETE CASCADE,
  external_key VARCHAR(60),
  amount DECIMAL(18,2) NOT NULL,
  event_date DATE,
  raw_description VARCHAR(255),
  suggested_transaction_id UUID REFERENCES public.transactions(id),
  match_status settlement_match_status NOT NULL DEFAULT 'NOT_FOUND',
  match_reason VARCHAR(120),
  selected BOOLEAN DEFAULT TRUE,
  settlement_item_id UUID REFERENCES public.settlement_items(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para settlement_file_rows
CREATE INDEX IF NOT EXISTS idx_settlement_file_rows_file ON public.settlement_file_rows(file_id);
CREATE INDEX IF NOT EXISTS idx_settlement_file_rows_match ON public.settlement_file_rows(file_id, match_status);

-- 7. FUNÇÃO PARA PROCESSAR BAIXA (transacional)
CREATE OR REPLACE FUNCTION public.process_settlement(
  p_company_id UUID,
  p_settlement_type TEXT,
  p_origin TEXT,
  p_title_type TEXT,
  p_settlement_date DATE,
  p_bank_account_id UUID,
  p_user_id UUID,
  p_notes TEXT,
  p_items JSONB,
  p_source_file_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settlement_id UUID;
  v_item JSONB;
  v_transaction RECORD;
  v_new_balance DECIMAL(18,2);
  v_new_status TEXT;
BEGIN
  -- Criar cabeçalho da baixa
  INSERT INTO settlements (
    company_id, settlement_type, origin, title_type, 
    settlement_date, bank_account_id, user_id, notes, source_file_id
  ) VALUES (
    p_company_id, p_settlement_type::settlement_type, p_origin::settlement_origin, p_title_type,
    p_settlement_date, p_bank_account_id, p_user_id, p_notes, p_source_file_id
  )
  RETURNING id INTO v_settlement_id;

  -- Processar cada item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Buscar transação com lock
    SELECT id, balance_amount, status INTO v_transaction
    FROM transactions
    WHERE id = (v_item->>'transaction_id')::UUID
      AND company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Transação % não encontrada', v_item->>'transaction_id';
    END IF;

    IF v_transaction.status IN ('pago', 'cancelado') THEN
      RAISE EXCEPTION 'Transação % já está %', v_item->>'transaction_id', v_transaction.status;
    END IF;

    IF v_transaction.balance_amount <= 0 THEN
      RAISE EXCEPTION 'Transação % sem saldo para baixa', v_item->>'transaction_id';
    END IF;

    -- Calcular novo saldo
    v_new_balance := GREATEST(v_transaction.balance_amount - (v_item->>'amount_settled')::DECIMAL, 0);
    
    -- Determinar novo status
    IF v_new_balance = 0 THEN
      v_new_status := 'pago';
    ELSE
      v_new_status := 'lancado'; -- parcial
    END IF;

    -- Inserir item de baixa
    INSERT INTO settlement_items (
      company_id, settlement_id, transaction_id, amount_settled,
      interest, penalty, discount, fx_difference,
      previous_balance, new_balance
    ) VALUES (
      p_company_id, v_settlement_id, v_transaction.id, 
      (v_item->>'amount_settled')::DECIMAL,
      COALESCE((v_item->>'interest')::DECIMAL, 0),
      COALESCE((v_item->>'penalty')::DECIMAL, 0),
      COALESCE((v_item->>'discount')::DECIMAL, 0),
      COALESCE((v_item->>'fx_difference')::DECIMAL, 0),
      v_transaction.balance_amount, v_new_balance
    );

    -- Atualizar transação
    UPDATE transactions
    SET balance_amount = v_new_balance,
        status = v_new_status::transaction_status,
        paid_date = CASE WHEN v_new_balance = 0 THEN p_settlement_date ELSE paid_date END,
        updated_at = now()
    WHERE id = v_transaction.id;
  END LOOP;

  RETURN v_settlement_id;
END;
$$;

-- 8. FUNÇÃO PARA ESTORNO DE BAIXA
CREATE OR REPLACE FUNCTION public.reverse_settlement(
  p_settlement_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settlement RECORD;
  v_reversal_id UUID;
  v_item RECORD;
  v_transaction RECORD;
  v_new_balance DECIMAL(18,2);
  v_new_status TEXT;
BEGIN
  -- Buscar baixa original
  SELECT * INTO v_settlement
  FROM settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Baixa % não encontrada', p_settlement_id;
  END IF;

  IF v_settlement.status = 'CANCELADO' THEN
    RAISE EXCEPTION 'Baixa % já foi cancelada/estornada', p_settlement_id;
  END IF;

  IF v_settlement.is_reversal THEN
    RAISE EXCEPTION 'Não é possível estornar um estorno';
  END IF;

  -- Criar registro de estorno
  INSERT INTO settlements (
    company_id, settlement_type, origin, title_type,
    settlement_date, bank_account_id, user_id, notes,
    reversed_settlement_id, is_reversal, status
  ) VALUES (
    v_settlement.company_id, v_settlement.settlement_type, 'MANUAL', v_settlement.title_type,
    CURRENT_DATE, v_settlement.bank_account_id, p_user_id, 
    COALESCE(p_notes, 'Estorno da baixa ' || p_settlement_id::TEXT),
    p_settlement_id, TRUE, 'PROCESSADO'
  )
  RETURNING id INTO v_reversal_id;

  -- Reverter cada item
  FOR v_item IN 
    SELECT * FROM settlement_items 
    WHERE settlement_id = p_settlement_id
  LOOP
    -- Buscar transação
    SELECT id, balance_amount, original_amount, status INTO v_transaction
    FROM transactions
    WHERE id = v_item.transaction_id
    FOR UPDATE;

    -- Calcular novo saldo (restaurar)
    v_new_balance := v_transaction.balance_amount + v_item.amount_settled;
    
    -- Determinar status
    v_new_status := 'lancado';

    -- Criar item de estorno (inverso)
    INSERT INTO settlement_items (
      company_id, settlement_id, transaction_id, amount_settled,
      interest, penalty, discount, fx_difference,
      previous_balance, new_balance
    ) VALUES (
      v_settlement.company_id, v_reversal_id, v_item.transaction_id,
      v_item.amount_settled,
      v_item.interest, v_item.penalty, v_item.discount, v_item.fx_difference,
      v_transaction.balance_amount, v_new_balance
    );

    -- Atualizar transação
    UPDATE transactions
    SET balance_amount = v_new_balance,
        status = v_new_status::transaction_status,
        paid_date = NULL,
        updated_at = now()
    WHERE id = v_item.transaction_id;
  END LOOP;

  -- Marcar baixa original como cancelada
  UPDATE settlements
  SET status = 'CANCELADO',
      updated_at = now()
  WHERE id = p_settlement_id;

  RETURN v_reversal_id;
END;
$$;

-- 9. RLS POLICIES

-- Settlements
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settlements_company_access" ON public.settlements
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- Settlement Items
ALTER TABLE public.settlement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settlement_items_company_access" ON public.settlement_items
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- Settlement Files
ALTER TABLE public.settlement_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settlement_files_company_access" ON public.settlement_files
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- Settlement File Rows
ALTER TABLE public.settlement_file_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settlement_file_rows_company_access" ON public.settlement_file_rows
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- 10. TRIGGER DE UPDATED_AT
DROP TRIGGER IF EXISTS update_settlements_updated_at ON public.settlements;
CREATE TRIGGER update_settlements_updated_at
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. VIEW PARA HISTÓRICO DE BAIXAS POR TRANSAÇÃO
CREATE OR REPLACE VIEW public.v_settlement_history AS
SELECT
  si.id,
  si.company_id,
  si.settlement_id,
  si.transaction_id,
  s.settlement_type::TEXT as settlement_type,
  s.origin::TEXT as origin,
  s.settlement_date,
  s.user_id,
  s.status::TEXT AS settlement_status,
  s.is_reversal,
  s.notes,
  si.amount_settled,
  si.interest,
  si.penalty,
  si.discount,
  si.fx_difference,
  si.previous_balance,
  si.new_balance,
  si.created_at
FROM settlement_items si
JOIN settlements s ON s.id = si.settlement_id
ORDER BY si.created_at DESC;