-- Create validation result types
CREATE TYPE public.settlement_item_validation AS (
  transaction_id UUID,
  ok BOOLEAN,
  errors JSONB,
  warnings JSONB,
  computed JSONB
);

CREATE TYPE public.settlement_validation_result AS (
  is_valid BOOLEAN,
  summary JSONB,
  item_results JSONB,
  global_errors JSONB
);

-- Create the comprehensive validation function
CREATE OR REPLACE FUNCTION public.validate_manual_settlement(
  p_company_id UUID,
  p_settlement_type TEXT,
  p_settlement_date DATE,
  p_bank_account_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_mode TEXT DEFAULT 'PARTIAL_OK', -- 'ALL_OR_NOTHING' | 'PARTIAL_OK'
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_transaction RECORD;
  v_item_result JSONB;
  v_item_results JSONB := '[]'::JSONB;
  v_global_errors JSONB := '[]'::JSONB;
  v_is_valid BOOLEAN := TRUE;
  v_has_valid_items BOOLEAN := FALSE;
  v_total_amount NUMERIC := 0;
  v_total_titles INTEGER := 0;
  v_item_errors JSONB;
  v_item_warnings JSONB;
  v_item_ok BOOLEAN;
  v_previous_balance NUMERIC;
  v_new_balance NUMERIC;
  v_amount_settled NUMERIC;
  v_interest NUMERIC;
  v_penalty NUMERIC;
  v_discount NUMERIC;
  v_effective_amount NUMERIC;
  v_period_closed BOOLEAN;
  v_bank_account_valid BOOLEAN;
  v_requires_bank_account BOOLEAN;
BEGIN
  -- Global validations
  
  -- 1. Settlement type required
  IF p_settlement_type IS NULL OR p_settlement_type = '' THEN
    v_global_errors := v_global_errors || jsonb_build_object(
      'code', 'SETTLEMENT_TYPE_REQUIRED',
      'message', 'Selecione um tipo de baixa.',
      'field', 'settlement_type'
    );
    v_is_valid := FALSE;
  END IF;

  -- 2. Settlement date required
  IF p_settlement_date IS NULL THEN
    v_global_errors := v_global_errors || jsonb_build_object(
      'code', 'SETTLEMENT_DATE_REQUIRED',
      'message', 'Informe a data da baixa.',
      'field', 'settlement_date'
    );
    v_is_valid := FALSE;
  END IF;

  -- 3. Check if period is closed (if fiscal_periods table exists and has data)
  IF p_settlement_date IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM fiscal_periods 
      WHERE company_id = p_company_id 
      AND status = 'closed'
      AND p_settlement_date >= start_date 
      AND p_settlement_date <= end_date
    ) INTO v_period_closed;
    
    IF v_period_closed THEN
      v_global_errors := v_global_errors || jsonb_build_object(
        'code', 'PERIOD_CLOSED',
        'message', 'Período fechado: não é possível baixar nesta data.',
        'field', 'settlement_date'
      );
      v_is_valid := FALSE;
    END IF;
  END IF;

  -- 4. Bank account validation
  v_requires_bank_account := p_settlement_type IN ('PAGAMENTO', 'RECEBIMENTO');
  
  IF v_requires_bank_account THEN
    IF p_bank_account_id IS NULL THEN
      v_global_errors := v_global_errors || jsonb_build_object(
        'code', 'BANK_ACCOUNT_REQUIRED',
        'message', 'Informe a conta bancária para este tipo de baixa.',
        'field', 'bank_account_id'
      );
      v_is_valid := FALSE;
    ELSE
      -- Validate bank account exists and is active
      SELECT EXISTS(
        SELECT 1 FROM wallets 
        WHERE id = p_bank_account_id 
        AND company_id = p_company_id 
        AND is_active = TRUE
      ) INTO v_bank_account_valid;
      
      IF NOT v_bank_account_valid THEN
        v_global_errors := v_global_errors || jsonb_build_object(
          'code', 'BANK_ACCOUNT_INVALID',
          'message', 'Conta bancária inválida ou inativa.',
          'field', 'bank_account_id'
        );
        v_is_valid := FALSE;
      END IF;
    END IF;
  END IF;

  -- 5. Items required
  IF jsonb_array_length(p_items) = 0 THEN
    v_global_errors := v_global_errors || jsonb_build_object(
      'code', 'NO_ITEMS',
      'message', 'Selecione pelo menos um título para baixar.',
      'field', 'items'
    );
    v_is_valid := FALSE;
  END IF;

  -- Item-level validations
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_errors := '[]'::JSONB;
    v_item_warnings := '[]'::JSONB;
    v_item_ok := TRUE;
    
    -- Extract item values
    v_amount_settled := COALESCE((v_item->>'amount_settled')::NUMERIC, 0);
    v_interest := COALESCE((v_item->>'interest')::NUMERIC, 0);
    v_penalty := COALESCE((v_item->>'penalty')::NUMERIC, 0);
    v_discount := COALESCE((v_item->>'discount')::NUMERIC, 0);
    
    -- Fetch transaction with lock for concurrency check
    SELECT 
      t.id,
      t.status,
      t.balance_amount,
      t.company_id,
      t.counterparty_id,
      t.description,
      t.document_number,
      t.updated_at,
      c.name as counterparty_name,
      c.is_active as counterparty_active
    INTO v_transaction
    FROM transactions t
    LEFT JOIN counterparties c ON c.id = t.counterparty_id
    WHERE t.id = (v_item->>'transaction_id')::UUID
    AND t.company_id = p_company_id
    FOR UPDATE NOWAIT; -- Lock row to prevent concurrent modifications
    
    IF NOT FOUND THEN
      v_item_errors := v_item_errors || jsonb_build_object(
        'code', 'TITLE_NOT_FOUND',
        'message', 'Título não encontrado ou não pertence à empresa.',
        'field', 'transaction_id'
      );
      v_item_ok := FALSE;
    ELSE
      v_previous_balance := COALESCE(v_transaction.balance_amount, v_transaction.balance_amount);
      
      -- 2.1 Title status validation
      IF v_transaction.status NOT IN ('lancado', 'rascunho') THEN
        v_item_errors := v_item_errors || jsonb_build_object(
          'code', 'TITLE_INVALID_STATUS',
          'message', 'Título já se encontra baixado/cancelado e não pode ser baixado novamente.',
          'field', 'status'
        );
        v_item_ok := FALSE;
      END IF;
      
      -- 2.1 Balance > 0
      IF v_previous_balance <= 0 THEN
        v_item_errors := v_item_errors || jsonb_build_object(
          'code', 'TITLE_NO_BALANCE',
          'message', 'Título sem saldo disponível para baixa.',
          'field', 'balance_amount'
        );
        v_item_ok := FALSE;
      END IF;
      
      -- 2.1 Counterparty validation
      IF v_transaction.counterparty_id IS NOT NULL AND v_transaction.counterparty_active = FALSE THEN
        v_item_errors := v_item_errors || jsonb_build_object(
          'code', 'COUNTERPARTY_INACTIVE',
          'message', 'Título inválido: parceiro (cliente/fornecedor) inativo.',
          'field', 'counterparty_id'
        );
        v_item_ok := FALSE;
      END IF;
      
      -- 2.2 Amount settled validation
      IF v_amount_settled <= 0 THEN
        v_item_errors := v_item_errors || jsonb_build_object(
          'code', 'AMOUNT_INVALID',
          'message', 'Valor da baixa deve ser maior que zero.',
          'field', 'amount_settled'
        );
        v_item_ok := FALSE;
      END IF;
      
      -- 2.2 Interest/Penalty/Discount validation
      IF v_interest < 0 THEN
        v_item_errors := v_item_errors || jsonb_build_object(
          'code', 'INTEREST_INVALID',
          'message', 'Juros deve ser um valor válido (≥ 0).',
          'field', 'interest'
        );
        v_item_ok := FALSE;
      END IF;
      
      IF v_penalty < 0 THEN
        v_item_errors := v_item_errors || jsonb_build_object(
          'code', 'PENALTY_INVALID',
          'message', 'Multa deve ser um valor válido (≥ 0).',
          'field', 'penalty'
        );
        v_item_ok := FALSE;
      END IF;
      
      IF v_discount < 0 THEN
        v_item_errors := v_item_errors || jsonb_build_object(
          'code', 'DISCOUNT_INVALID',
          'message', 'Desconto deve ser um valor válido (≥ 0).',
          'field', 'discount'
        );
        v_item_ok := FALSE;
      END IF;
      
      -- 2.3 Amount cannot exceed balance
      IF v_item_ok AND v_amount_settled > v_previous_balance THEN
        v_item_errors := v_item_errors || jsonb_build_object(
          'code', 'AMOUNT_EXCEEDS_BALANCE',
          'message', format('Valor da baixa (R$ %s) não pode ser maior que o saldo do título (R$ %s).', 
            to_char(v_amount_settled, 'FM999G999G999D00'),
            to_char(v_previous_balance, 'FM999G999G999D00')),
          'field', 'amount_settled'
        );
        v_item_ok := FALSE;
      END IF;
      
      -- Calculate new balance with rounding protection
      IF v_item_ok THEN
        v_new_balance := ROUND(v_previous_balance - v_amount_settled, 2);
        v_effective_amount := v_amount_settled + v_interest + v_penalty - v_discount;
        
        -- Rounding warning
        IF v_new_balance < 0 THEN
          v_new_balance := 0;
          v_item_warnings := v_item_warnings || jsonb_build_object(
            'code', 'ROUNDING_ADJUSTMENT',
            'message', 'Ajuste por arredondamento aplicado para zerar saldo.'
          );
        END IF;
        
        v_total_amount := v_total_amount + v_effective_amount;
        v_total_titles := v_total_titles + 1;
        v_has_valid_items := TRUE;
      ELSE
        v_new_balance := NULL;
        v_effective_amount := NULL;
      END IF;
      
      -- 2.6 Concurrency check - compare updated_at if provided in item
      IF v_item_ok AND v_item ? 'expected_updated_at' THEN
        IF v_transaction.updated_at != (v_item->>'expected_updated_at')::TIMESTAMPTZ THEN
          v_item_errors := v_item_errors || jsonb_build_object(
            'code', 'CONCURRENCY_CONFLICT',
            'message', 'Título foi alterado por outro usuário. Atualize a tela e tente novamente.',
            'field', 'updated_at'
          );
          v_item_ok := FALSE;
          v_has_valid_items := FALSE;
        END IF;
      END IF;
    END IF;

    -- Build item result
    v_item_result := jsonb_build_object(
      'transaction_id', v_item->>'transaction_id',
      'document_number', COALESCE(v_transaction.document_number, ''),
      'description', COALESCE(v_transaction.description, ''),
      'counterparty_name', COALESCE(v_transaction.counterparty_name, ''),
      'ok', v_item_ok,
      'errors', v_item_errors,
      'warnings', v_item_warnings,
      'computed', CASE WHEN v_item_ok THEN
        jsonb_build_object(
          'previous_balance', v_previous_balance,
          'new_balance', v_new_balance,
          'effective_amount', v_effective_amount,
          'amount_settled', v_amount_settled,
          'interest', v_interest,
          'penalty', v_penalty,
          'discount', v_discount
        )
      ELSE NULL END
    );
    
    v_item_results := v_item_results || v_item_result;
    
    IF NOT v_item_ok THEN
      IF p_mode = 'ALL_OR_NOTHING' THEN
        v_is_valid := FALSE;
      END IF;
    END IF;
  END LOOP;

  -- Final validation based on mode
  IF p_mode = 'PARTIAL_OK' AND NOT v_has_valid_items THEN
    v_is_valid := FALSE;
    v_global_errors := v_global_errors || jsonb_build_object(
      'code', 'NO_VALID_ITEMS',
      'message', 'Nenhum título válido para baixar após validação.'
    );
  END IF;

  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'summary', jsonb_build_object(
      'total_titles', v_total_titles,
      'total_amount', v_total_amount,
      'bank_account_id', p_bank_account_id,
      'settlement_date', p_settlement_date,
      'settlement_type', p_settlement_type,
      'mode', p_mode
    ),
    'item_results', v_item_results,
    'global_errors', v_global_errors
  );
  
EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'summary', NULL,
      'item_results', '[]'::JSONB,
      'global_errors', jsonb_build_array(
        jsonb_build_object(
          'code', 'LOCK_CONFLICT',
          'message', 'Um ou mais títulos estão sendo processados por outro usuário. Aguarde e tente novamente.'
        )
      )
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_manual_settlement TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.validate_manual_settlement IS 'Validates manual settlement payload with comprehensive ERP-grade checks for title status, balances, period locks, bank accounts, and concurrency.';
