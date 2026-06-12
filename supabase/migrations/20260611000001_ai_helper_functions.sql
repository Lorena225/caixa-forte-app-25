-- =====================================================
-- HELPER FUNCTIONS PARA AGENTES IA — usa schema real de transactions
-- VirtruvIA · Ajuste fino pós-auditoria
-- =====================================================

-- 1. Logger genérico do agent_action_log — resolve company_id automaticamente
CREATE OR REPLACE FUNCTION public.ai_log_action(
  p_company_id     UUID,
  p_agent_type     TEXT,
  p_autonomy_level TEXT,
  p_action_key     TEXT,
  p_action_label   TEXT,
  p_entity_type    TEXT DEFAULT NULL,
  p_entity_id      UUID DEFAULT NULL,
  p_amount         NUMERIC DEFAULT NULL,
  p_reason         TEXT DEFAULT 'Ação executada pelo agente IA',
  p_status         TEXT DEFAULT 'executed'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.agent_action_log
    (company_id, agent_type, autonomy_level, action_key, action_label,
     entity_type, entity_id, amount, reason, status, triggered_by)
  VALUES
    (p_company_id, p_agent_type::public.agent_type, p_autonomy_level::public.agent_autonomy_level,
     p_action_key, p_action_label, p_entity_type, p_entity_id, p_amount, p_reason, p_status, 'agent')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_log_action TO authenticated;

-- 2. Conta + Carteira padrão por direção (AP=saida->despesa, AR=entrada->receita)
CREATE OR REPLACE FUNCTION public.ai_get_default_account_wallet(
  p_company_id UUID,
  p_direction  TEXT
)
RETURNS TABLE(account_id UUID, wallet_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_wallet_id  UUID;
  v_category   public.account_category;
BEGIN
  v_category := CASE WHEN p_direction = 'saida' THEN 'despesa'::public.account_category
                      ELSE 'receita'::public.account_category END;

  SELECT id INTO v_account_id FROM public.accounts
   WHERE company_id = p_company_id AND category_type = v_category AND is_active = true
   ORDER BY code LIMIT 1;

  IF v_account_id IS NULL THEN
    SELECT id INTO v_account_id FROM public.accounts
     WHERE company_id = p_company_id AND is_active = true
     ORDER BY code LIMIT 1;
  END IF;

  SELECT id INTO v_wallet_id FROM public.wallets
   WHERE company_id = p_company_id AND is_active = true
   ORDER BY created_at LIMIT 1;

  RETURN QUERY SELECT v_account_id, v_wallet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_get_default_account_wallet TO authenticated;

-- 3. Criar título AP/AR — IA escolhe conta/carteira e registra log
CREATE OR REPLACE FUNCTION public.ai_create_title(
  p_company_id      UUID,
  p_direction       TEXT,           -- 'entrada' (AR) | 'saida' (AP)
  p_description     TEXT,
  p_amount          NUMERIC,
  p_due_date        DATE,
  p_counterparty_id UUID DEFAULT NULL,
  p_document_number TEXT DEFAULT NULL,
  p_notes           TEXT DEFAULT NULL,
  p_agent_type      TEXT DEFAULT 'AP',
  p_action_key      TEXT DEFAULT 'create_title',
  p_action_label    TEXT DEFAULT 'Título criado pela IA',
  p_reason          TEXT DEFAULT 'Criado automaticamente pelo agente IA',
  p_autonomy_level  TEXT DEFAULT 'N1_approval'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_wallet_id  UUID;
  v_tx_id      UUID;
BEGIN
  SELECT account_id, wallet_id INTO v_account_id, v_wallet_id
  FROM public.ai_get_default_account_wallet(p_company_id, p_direction);

  IF v_account_id IS NULL OR v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Configure ao menos uma conta contábil e uma carteira/conta bancária antes de usar os agentes IA';
  END IF;

  INSERT INTO public.transactions
    (company_id, description, direction, original_amount, total_amount, balance_amount,
     transaction_date, due_date, account_id, wallet_id, counterparty_id,
     status, notes, document_number)
  VALUES
    (p_company_id, p_description, p_direction::public.transaction_direction,
     p_amount, p_amount, p_amount,
     CURRENT_DATE, p_due_date, v_account_id, v_wallet_id, p_counterparty_id,
     'lancado'::public.transaction_status, p_notes, p_document_number)
  RETURNING id INTO v_tx_id;

  PERFORM public.ai_log_action(
    p_company_id, p_agent_type, p_autonomy_level, p_action_key, p_action_label,
    'transaction', v_tx_id, p_amount, p_reason, 'executed'
  );

  RETURN v_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_create_title TO authenticated;

-- 4. Baixar título (settle) — marca como pago e registra log
CREATE OR REPLACE FUNCTION public.ai_settle_title(
  p_transaction_id  UUID,
  p_paid_date       DATE DEFAULT CURRENT_DATE,
  p_agent_type      TEXT DEFAULT 'AP',
  p_action_key      TEXT DEFAULT 'settle_title',
  p_action_label    TEXT DEFAULT 'Título baixado pela IA',
  p_reason          TEXT DEFAULT 'Baixa automática pelo agente IA',
  p_autonomy_level  TEXT DEFAULT 'N2_notify'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_amount     NUMERIC;
BEGIN
  SELECT company_id, total_amount INTO v_company_id, v_amount
  FROM public.transactions WHERE id = p_transaction_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Transação não encontrada';
  END IF;

  UPDATE public.transactions
  SET status = 'pago'::public.transaction_status,
      balance_amount = 0,
      paid_date = p_paid_date,
      updated_at = now()
  WHERE id = p_transaction_id;

  PERFORM public.ai_log_action(
    v_company_id, p_agent_type, p_autonomy_level, p_action_key, p_action_label,
    'transaction', p_transaction_id, v_amount, p_reason, 'executed'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_settle_title TO authenticated;

-- 5. Atualizar status de aprovação (workflow AP) — usa transaction_status real
CREATE OR REPLACE FUNCTION public.ai_update_title_status(
  p_transaction_id  UUID,
  p_new_status      TEXT,            -- 'lancado' | 'pago' | 'cancelado' | 'rascunho'
  p_agent_type      TEXT DEFAULT 'AP',
  p_action_key      TEXT DEFAULT 'update_status',
  p_action_label    TEXT DEFAULT 'Status atualizado pela IA',
  p_reason          TEXT DEFAULT 'Atualização via workflow de aprovação',
  p_autonomy_level  TEXT DEFAULT 'N1_approval'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_amount     NUMERIC;
BEGIN
  SELECT company_id, total_amount INTO v_company_id, v_amount
  FROM public.transactions WHERE id = p_transaction_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Transação não encontrada';
  END IF;

  UPDATE public.transactions
  SET status = p_new_status::public.transaction_status, updated_at = now()
  WHERE id = p_transaction_id;

  PERFORM public.ai_log_action(
    v_company_id, p_agent_type, p_autonomy_level, p_action_key, p_action_label,
    'transaction', p_transaction_id, v_amount, p_reason, 'executed'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_update_title_status TO authenticated;
