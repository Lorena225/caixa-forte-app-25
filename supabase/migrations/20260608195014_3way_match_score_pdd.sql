-- =====================================================
-- BLOCO 4: 3-WAY MATCH (AP) + SCORE CRÉDITO + PDD (AR)
-- VirtruvIA · Blueprint Sistema Financeiro v1.0
-- =====================================================

-- ────────────────────────────────────────────────────
-- 1. PEDIDOS DE COMPRA (para 3-way match)
--    Se já existe purchase_requisitions, adaptar.
-- ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  po_number         TEXT NOT NULL,
  counterparty_id   UUID REFERENCES public.counterparties(id),
  status            TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('draft','open','partially_received','received','invoiced','closed','cancelled')),
  order_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date     DATE,
  total_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  received_amount   NUMERIC(15,2) DEFAULT 0,
  invoiced_amount   NUMERIC(15,2) DEFAULT 0,
  notes             TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, po_number)
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_po_company   ON public.purchase_orders(company_id);
CREATE INDEX idx_po_status    ON public.purchase_orders(company_id, status);
CREATE INDEX idx_po_vendor    ON public.purchase_orders(company_id, counterparty_id);

CREATE POLICY "po_all" ON public.purchase_orders
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE TRIGGER update_po_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ────────────────────────────────────────────────────
-- 2. ITENS DO PEDIDO DE COMPRA
-- ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  quantity        NUMERIC(15,4) NOT NULL,
  unit_price      NUMERIC(15,4) NOT NULL,
  total_price     NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  received_qty    NUMERIC(15,4) DEFAULT 0,
  invoiced_qty    NUMERIC(15,4) DEFAULT 0,
  account_id      UUID REFERENCES public.accounts(id),
  cost_center_id  UUID REFERENCES public.cost_centers(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_poi_po ON public.purchase_order_items(po_id);

CREATE POLICY "poi_all" ON public.purchase_order_items
  FOR ALL USING (
    po_id IN (
      SELECT id FROM public.purchase_orders
      WHERE company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- ────────────────────────────────────────────────────
-- 3. RECEBIMENTO FÍSICO (Nota de Recebimento)
-- ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  po_id           UUID NOT NULL REFERENCES public.purchase_orders(id),
  receipt_number  TEXT,
  receipt_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('draft','confirmed','rejected')),
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gr_po      ON public.goods_receipts(po_id);
CREATE INDEX idx_gr_company ON public.goods_receipts(company_id);

CREATE POLICY "gr_all" ON public.goods_receipts
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.goods_receipt_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id      UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  po_item_id      UUID NOT NULL REFERENCES public.purchase_order_items(id),
  received_qty    NUMERIC(15,4) NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────
-- 4. VINCULO NF ↔ PO (3-way match tracking)
-- ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ap_three_way_match (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_id      UUID NOT NULL REFERENCES public.transactions(id),  -- título AP
  po_id               UUID REFERENCES public.purchase_orders(id),
  receipt_id          UUID REFERENCES public.goods_receipts(id),
  match_status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (match_status IN ('pending','matched','partial','divergent','manual_override')),
  -- diferenças
  po_amount           NUMERIC(15,2),
  invoice_amount      NUMERIC(15,2),
  receipt_amount      NUMERIC(15,2),
  tolerance_pct       NUMERIC(5,2) DEFAULT 2.0,    -- tolerância padrão 2%
  amount_diff         NUMERIC(15,2),
  amount_diff_pct     NUMERIC(5,2),
  -- resultado
  match_confidence    NUMERIC(5,2),
  match_reason        TEXT,
  override_by         UUID,
  override_reason     TEXT,
  matched_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ap_three_way_match ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_3wm_transaction ON public.ap_three_way_match(transaction_id);
CREATE INDEX idx_3wm_po          ON public.ap_three_way_match(po_id);
CREATE INDEX idx_3wm_status      ON public.ap_three_way_match(company_id, match_status);

CREATE POLICY "3wm_all" ON public.ap_three_way_match
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Função: executa 3-way match automático
CREATE OR REPLACE FUNCTION public.execute_three_way_match(
  p_transaction_id UUID,
  p_tolerance_pct  NUMERIC DEFAULT 2.0
)
RETURNS TEXT   -- match_status
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tx           public.transactions%ROWTYPE;
  v_po           public.purchase_orders%ROWTYPE;
  v_receipt      public.goods_receipts%ROWTYPE;
  v_match_id     UUID;
  v_diff         NUMERIC;
  v_diff_pct     NUMERIC;
  v_status       TEXT;
  v_confidence   NUMERIC;
BEGIN
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN RETURN 'error: transaction not found'; END IF;

  -- Busca PO pelo fornecedor + valor próximo
  SELECT po.* INTO v_po
  FROM public.purchase_orders po
  WHERE po.company_id      = v_tx.company_id
    AND po.counterparty_id = v_tx.counterparty_id
    AND po.status          IN ('open','partially_received')
    AND ABS(po.total_amount - ABS(v_tx.amount)) / NULLIF(po.total_amount, 0) * 100 <= p_tolerance_pct * 2
  ORDER BY ABS(po.total_amount - ABS(v_tx.amount)) ASC
  LIMIT 1;

  -- Busca recebimento físico vinculado ao PO
  IF v_po.id IS NOT NULL THEN
    SELECT gr.* INTO v_receipt
    FROM public.goods_receipts gr
    WHERE gr.po_id = v_po.id AND gr.status = 'confirmed'
    ORDER BY gr.receipt_date DESC LIMIT 1;
  END IF;

  -- Calcula divergência
  v_diff     := ABS(COALESCE(v_po.total_amount, 0) - ABS(v_tx.amount));
  v_diff_pct := CASE
    WHEN COALESCE(v_po.total_amount, 0) > 0
    THEN v_diff / v_po.total_amount * 100
    ELSE 100
  END;

  -- Determina status
  IF v_po.id IS NULL THEN
    v_status := 'divergent';
    v_confidence := 0;
  ELSIF v_receipt.id IS NULL THEN
    v_status := 'partial';    -- tem PO mas não tem recebimento
    v_confidence := 60;
  ELSIF v_diff_pct <= p_tolerance_pct THEN
    v_status := 'matched';
    v_confidence := 95 - v_diff_pct * 2;  -- quanto menor a diff, maior a confiança
  ELSIF v_diff_pct <= p_tolerance_pct * 2 THEN
    v_status := 'partial';
    v_confidence := 70;
  ELSE
    v_status := 'divergent';
    v_confidence := 30;
  END IF;

  -- Upsert resultado
  INSERT INTO public.ap_three_way_match (
    company_id, transaction_id, po_id, receipt_id,
    match_status, po_amount, invoice_amount, receipt_amount,
    tolerance_pct, amount_diff, amount_diff_pct,
    match_confidence, match_reason, matched_at
  ) VALUES (
    v_tx.company_id, p_transaction_id, v_po.id, v_receipt.id,
    v_status,
    v_po.total_amount, ABS(v_tx.amount),
    CASE WHEN v_receipt.id IS NOT NULL THEN v_po.total_amount ELSE NULL END,
    p_tolerance_pct, v_diff, v_diff_pct,
    v_confidence,
    CASE
      WHEN v_status = 'matched'   THEN 'PO + NF + recebimento batem dentro da tolerância'
      WHEN v_status = 'partial'   THEN 'PO encontrado mas sem confirmação de recebimento físico'
      WHEN v_status = 'divergent' THEN 'Nenhum PO encontrado ou divergência acima de ' || (p_tolerance_pct*2) || '%'
    END,
    CASE WHEN v_status = 'matched' THEN now() ELSE NULL END
  )
  ON CONFLICT (transaction_id) DO UPDATE
  SET match_status = EXCLUDED.match_status,
      match_confidence = EXCLUDED.match_confidence,
      amount_diff = EXCLUDED.amount_diff,
      matched_at = EXCLUDED.matched_at,
      updated_at = now();

  -- Atualiza PO se matched
  IF v_status = 'matched' AND v_po.id IS NOT NULL THEN
    UPDATE public.purchase_orders
    SET invoiced_amount = invoiced_amount + ABS(v_tx.amount),
        status = CASE
          WHEN (invoiced_amount + ABS(v_tx.amount)) >= total_amount THEN 'invoiced'
          ELSE status
        END
    WHERE id = v_po.id;
  END IF;

  RETURN v_status;
END;
$$;

-- ────────────────────────────────────────────────────
-- 5. SCORE DE CRÉDITO DO CLIENTE (AR)
-- ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_credit_scores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  counterparty_id       UUID NOT NULL REFERENCES public.counterparties(id) ON DELETE CASCADE,
  score                 SMALLINT NOT NULL DEFAULT 50 CHECK (score BETWEEN 0 AND 100),
  score_band            TEXT GENERATED ALWAYS AS (
    CASE
      WHEN score >= 80 THEN 'A'   -- excelente pagador
      WHEN score >= 60 THEN 'B'   -- bom pagador
      WHEN score >= 40 THEN 'C'   -- pagador regular
      WHEN score >= 20 THEN 'D'   -- pagador ruim
      ELSE                   'E'  -- inadimplente
    END
  ) STORED,
  -- componentes do score
  on_time_payments      SMALLINT DEFAULT 0,
  late_payments         SMALLINT DEFAULT 0,
  avg_days_late         NUMERIC(5,1) DEFAULT 0,
  total_invoiced        NUMERIC(15,2) DEFAULT 0,
  total_paid            NUMERIC(15,2) DEFAULT 0,
  outstanding_amount    NUMERIC(15,2) DEFAULT 0,
  -- limite de crédito
  credit_limit          NUMERIC(15,2),
  limit_usage_pct       NUMERIC(5,2),
  -- última atualização
  last_calculated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  calculation_reason    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, counterparty_id)
);

ALTER TABLE public.client_credit_scores ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ccs_company      ON public.client_credit_scores(company_id);
CREATE INDEX idx_ccs_counterparty ON public.client_credit_scores(counterparty_id);
CREATE INDEX idx_ccs_band         ON public.client_credit_scores(company_id, score_band);

CREATE POLICY "ccs_all" ON public.client_credit_scores
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Função: recalcula score de crédito de um cliente
CREATE OR REPLACE FUNCTION public.recalculate_client_credit_score(
  p_company_id       UUID,
  p_counterparty_id  UUID
)
RETURNS SMALLINT   -- novo score
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_on_time      INTEGER := 0;
  v_late         INTEGER := 0;
  v_avg_late     NUMERIC := 0;
  v_total_inv    NUMERIC := 0;
  v_total_paid   NUMERIC := 0;
  v_outstanding  NUMERIC := 0;
  v_score        NUMERIC := 50;
BEGIN
  -- Busca histórico dos últimos 12 meses
  SELECT
    COUNT(*) FILTER (WHERE due_date >= payment_date OR status = 'paid')                     AS on_time,
    COUNT(*) FILTER (WHERE due_date < payment_date  AND status = 'paid')                    AS late,
    COALESCE(AVG(EXTRACT(DAY FROM payment_date - due_date))
      FILTER (WHERE payment_date > due_date AND status = 'paid'), 0)                        AS avg_late_days,
    COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)                                 AS total_invoiced,
    COALESCE(SUM(amount) FILTER (WHERE type = 'income' AND status = 'paid'), 0)             AS total_paid,
    COALESCE(SUM(amount) FILTER (WHERE type = 'income' AND status IN ('pending','overdue')),0) AS outstanding
  INTO v_on_time, v_late, v_avg_late, v_total_inv, v_total_paid, v_outstanding
  FROM public.transactions
  WHERE company_id      = p_company_id
    AND counterparty_id = p_counterparty_id
    AND transaction_date >= CURRENT_DATE - interval '12 months';

  -- Algoritmo de score
  -- Base 50; +25 por bom histórico de pagamento; -20 por atrasos; -5 por saldo alto
  v_score := 50
    + LEAST(25, v_on_time * 2)
    - LEAST(20, v_late * 4)
    - LEAST(10, v_avg_late * 0.5)
    - CASE WHEN v_total_inv > 0 AND (v_outstanding / v_total_inv) > 0.3 THEN 10 ELSE 0 END;

  v_score := GREATEST(0, LEAST(100, ROUND(v_score)));

  -- Upsert
  INSERT INTO public.client_credit_scores (
    company_id, counterparty_id, score,
    on_time_payments, late_payments, avg_days_late,
    total_invoiced, total_paid, outstanding_amount,
    last_calculated_at, calculation_reason
  ) VALUES (
    p_company_id, p_counterparty_id, v_score::SMALLINT,
    v_on_time, v_late, v_avg_late,
    v_total_inv, v_total_paid, v_outstanding,
    now(), 'Recalculado com base nos últimos 12 meses'
  )
  ON CONFLICT (company_id, counterparty_id) DO UPDATE
  SET score                = v_score::SMALLINT,
      on_time_payments     = v_on_time,
      late_payments        = v_late,
      avg_days_late        = v_avg_late,
      total_invoiced       = v_total_inv,
      total_paid           = v_total_paid,
      outstanding_amount   = v_outstanding,
      last_calculated_at   = now(),
      updated_at           = now();

  RETURN v_score::SMALLINT;
END;
$$;

-- Trigger: recalcula score quando uma transação AR é quitada
CREATE OR REPLACE FUNCTION public.trigger_credit_score_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'income'
     AND NEW.status = 'paid'
     AND (OLD.status IS DISTINCT FROM 'paid')
     AND NEW.counterparty_id IS NOT NULL
  THEN
    PERFORM public.recalculate_client_credit_score(NEW.company_id, NEW.counterparty_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_score_on_payment ON public.transactions;
CREATE TRIGGER trg_credit_score_on_payment
  AFTER UPDATE OF status ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_credit_score_on_payment();

-- ────────────────────────────────────────────────────
-- 6. PDD — PROVISÃO PARA DEVEDORES DUVIDOSOS
-- ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pdd_provisions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_year           SMALLINT NOT NULL,
  period_month          SMALLINT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  -- aging por faixa (saldo em aberto)
  bucket_current        NUMERIC(15,2) DEFAULT 0,  -- até 30 dias
  bucket_31_60          NUMERIC(15,2) DEFAULT 0,
  bucket_61_90          NUMERIC(15,2) DEFAULT 0,
  bucket_91_180         NUMERIC(15,2) DEFAULT 0,
  bucket_over_180       NUMERIC(15,2) DEFAULT 0,
  -- taxas de provisão por faixa (configuráveis)
  rate_current          NUMERIC(5,2) DEFAULT 0,    -- 0%
  rate_31_60            NUMERIC(5,2) DEFAULT 5,    -- 5%
  rate_61_90            NUMERIC(5,2) DEFAULT 20,   -- 20%
  rate_91_180           NUMERIC(5,2) DEFAULT 50,   -- 50%
  rate_over_180         NUMERIC(5,2) DEFAULT 100,  -- 100%
  -- total calculado
  total_ar              NUMERIC(15,2) DEFAULT 0,
  total_provision       NUMERIC(15,2) DEFAULT 0,
  provision_pct         NUMERIC(5,2) DEFAULT 0,
  -- contabilização
  provision_account_id  UUID REFERENCES public.accounts(id),
  gl_posted             BOOLEAN NOT NULL DEFAULT false,
  gl_transaction_id     UUID,
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, period_year, period_month)
);

ALTER TABLE public.pdd_provisions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pdd_company ON public.pdd_provisions(company_id, period_year, period_month DESC);

CREATE POLICY "pdd_all" ON public.pdd_provisions
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Função: calcula PDD do período
CREATE OR REPLACE FUNCTION public.calculate_pdd(
  p_company_id UUID,
  p_year       SMALLINT,
  p_month      SMALLINT
)
RETURNS NUMERIC   -- total_provision
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_current     NUMERIC := 0;
  v_31_60       NUMERIC := 0;
  v_61_90       NUMERIC := 0;
  v_91_180      NUMERIC := 0;
  v_over_180    NUMERIC := 0;
  v_total_ar    NUMERIC := 0;
  v_provision   NUMERIC := 0;
  v_ref_date    DATE;
  r_rates       public.pdd_provisions%ROWTYPE;
BEGIN
  v_ref_date := make_date(p_year, p_month, 1) + interval '1 month - 1 day';

  -- Busca taxas configuradas ou usa padrão
  SELECT * INTO r_rates FROM public.pdd_provisions
  WHERE company_id = p_company_id AND period_year = p_year AND period_month = p_month;

  -- Aging: saldo em aberto por faixa de vencimento
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE v_ref_date - due_date <= 0),      0),
    COALESCE(SUM(amount) FILTER (WHERE v_ref_date - due_date BETWEEN 1  AND 30),  0),
    COALESCE(SUM(amount) FILTER (WHERE v_ref_date - due_date BETWEEN 31 AND 60),  0),
    COALESCE(SUM(amount) FILTER (WHERE v_ref_date - due_date BETWEEN 61 AND 90),  0),
    COALESCE(SUM(amount) FILTER (WHERE v_ref_date - due_date BETWEEN 91 AND 180), 0),
    COALESCE(SUM(amount) FILTER (WHERE v_ref_date - due_date > 180),     0)
  INTO v_current, v_31_60, v_61_90, v_61_90, v_91_180, v_over_180
  FROM public.transactions
  WHERE company_id = p_company_id
    AND type       = 'income'
    AND status     IN ('pending','overdue')
    AND due_date   IS NOT NULL;

  v_total_ar := v_current + v_31_60 + v_61_90 + v_91_180 + v_over_180;

  v_provision :=
    v_current   * COALESCE(r_rates.rate_current,   0)   / 100 +
    v_31_60     * COALESCE(r_rates.rate_31_60,      5)   / 100 +
    v_61_90     * COALESCE(r_rates.rate_61_90,      20)  / 100 +
    v_91_180    * COALESCE(r_rates.rate_91_180,     50)  / 100 +
    v_over_180  * COALESCE(r_rates.rate_over_180,   100) / 100;

  -- Upsert
  INSERT INTO public.pdd_provisions (
    company_id, period_year, period_month,
    bucket_current, bucket_31_60, bucket_61_90, bucket_91_180, bucket_over_180,
    total_ar, total_provision,
    provision_pct, calculated_at
  ) VALUES (
    p_company_id, p_year, p_month,
    v_current, v_31_60, v_61_90, v_91_180, v_over_180,
    v_total_ar, v_provision,
    CASE WHEN v_total_ar > 0 THEN ROUND(v_provision / v_total_ar * 100, 2) ELSE 0 END,
    now()
  )
  ON CONFLICT (company_id, period_year, period_month) DO UPDATE
  SET bucket_current  = v_current,
      bucket_31_60    = v_31_60,
      bucket_61_90    = v_61_90,
      bucket_91_180   = v_91_180,
      bucket_over_180 = v_over_180,
      total_ar        = v_total_ar,
      total_provision = v_provision,
      provision_pct   = CASE WHEN v_total_ar > 0 THEN ROUND(v_provision / v_total_ar * 100, 2) ELSE 0 END,
      calculated_at   = now();

  RETURN v_provision;
END;
$$;
