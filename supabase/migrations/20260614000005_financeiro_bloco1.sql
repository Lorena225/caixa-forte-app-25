-- BLOCO 1 FINANCEIRO: Rateios + Trilha de auditoria + economics com rateio
CREATE TABLE IF NOT EXISTS public.transaction_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  percentage NUMERIC(7,4) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_txalloc_tx ON public.transaction_allocations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_txalloc_project ON public.transaction_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_txalloc_cc ON public.transaction_allocations(cost_center_id);

CREATE TABLE IF NOT EXISTS public.finance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, entity_id UUID NOT NULL, action TEXT NOT NULL,
  field_name TEXT, old_value TEXT, new_value TEXT, reason TEXT,
  changed_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_faudit_entity ON public.finance_audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faudit_company ON public.finance_audit_log(company_id, created_at DESC);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['transaction_allocations','finance_audit_log'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_all" ON public.%1$s;$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s_all" ON public.%1$s FOR ALL
      USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
      WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));$p$, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.ai_set_transaction_allocations(p_transaction_id UUID, p_allocations JSONB)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company UUID; v_total NUMERIC; v_sum_pct NUMERIC := 0; r JSONB; n INTEGER := 0;
BEGIN
  SELECT company_id, total_amount INTO v_company, v_total FROM public.transactions WHERE id = p_transaction_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Título não encontrado'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP v_sum_pct := v_sum_pct + (r->>'percentage')::numeric; END LOOP;
  IF ROUND(v_sum_pct,2) <> 100.00 THEN RAISE EXCEPTION 'A soma dos rateios deve ser 100%% (recebido: %)', v_sum_pct; END IF;
  DELETE FROM public.transaction_allocations WHERE transaction_id = p_transaction_id;
  FOR r IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP
    INSERT INTO public.transaction_allocations(company_id, transaction_id, cost_center_id, project_id, percentage, amount)
    VALUES (v_company, p_transaction_id, NULLIF(r->>'cost_center_id','')::uuid, NULLIF(r->>'project_id','')::uuid,
      (r->>'percentage')::numeric, ROUND(v_total * (r->>'percentage')::numeric / 100, 2));
    n := n + 1;
  END LOOP;
  INSERT INTO public.finance_audit_log(company_id, entity_type, entity_id, action, reason, changed_by)
  VALUES (v_company, 'transaction', p_transaction_id, 'rateio_definido', n || ' linha(s) de rateio', auth.uid());
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.ai_log_finance_change(p_entity_type TEXT, p_entity_id UUID, p_field TEXT, p_old TEXT, p_new TEXT, p_reason TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company UUID; v_id UUID;
BEGIN
  IF p_entity_type = 'transaction' THEN SELECT company_id INTO v_company FROM public.transactions WHERE id = p_entity_id; END IF;
  INSERT INTO public.finance_audit_log(company_id, entity_type, entity_id, action, field_name, old_value, new_value, reason, changed_by)
  VALUES (v_company, p_entity_type, p_entity_id, 'campo_alterado', p_field, p_old, p_new, p_reason, auth.uid()) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.ai_set_transaction_allocations(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_log_finance_change(TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_set_transaction_allocations(UUID, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ai_log_finance_change(TEXT, UUID, TEXT, TEXT, TEXT, TEXT) FROM anon;
-- project_economics atualizada para somar rateios (ver migration aplicada no painel)
