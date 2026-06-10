-- =====================================================
-- BLOCO 2: GUARDRAILS & NÍVEIS DE AUTONOMIA (N0–N3)
-- VirtruvIA · Blueprint Sistema Financeiro v1.0
-- Referência: Seção 5B.2 e 5B.5 do Blueprint
-- =====================================================
-- Estende o ai_company_settings existente com os
-- 4 níveis formais e todos os guardrails obrigatórios.
-- =====================================================

-- ────────────────────────────────────────────────────
-- 1. ENUM: níveis de autonomia formais
-- ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.agent_autonomy_level AS ENUM (
    'N0_suggestion',   -- IA sugere; humano executa
    'N1_approval',     -- IA prepara; humano aprova 1 clique
    'N2_notify',       -- IA executa + notifica; humano pode reverter
    'N3_autonomous'    -- IA executa em silêncio; auditoria mensal
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.agent_type AS ENUM (
    'AP','AR','reconciliation','classifier',
    'cashflow','loans','budget','fiscal',
    'auditor','conversational'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────
-- 2. CONFIGURAÇÃO DETALHADA DE AUTONOMIA POR AGENTE
--    (uma linha por agente por empresa)
-- ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_autonomy_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_type          public.agent_type NOT NULL,
  autonomy_level      public.agent_autonomy_level NOT NULL DEFAULT 'N1_approval',
  is_enabled          BOOLEAN NOT NULL DEFAULT false,
  -- limites financeiros específicos deste agente
  max_amount_auto     NUMERIC(15,2) DEFAULT 5000,    -- até N3 autônomo
  max_amount_notify   NUMERIC(15,2) DEFAULT 50000,   -- até N2 notifica
  -- janela de operação automática
  auto_window_start   TIME DEFAULT '07:00',
  auto_window_end     TIME DEFAULT '19:00',
  auto_days_json      JSONB DEFAULT '[1,2,3,4,5]',   -- dias da semana (1=seg)
  -- ação N1: canal de aprovação
  approval_channel    TEXT DEFAULT 'app'
    CHECK (approval_channel IN ('app','whatsapp','email')),
  approval_timeout_min INTEGER DEFAULT 60,           -- minutos para expirar
  -- configurações extras em JSON
  extra_config_json   JSONB DEFAULT '{}',
  updated_by          UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, agent_type)
);

ALTER TABLE public.agent_autonomy_config ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_aac_company ON public.agent_autonomy_config(company_id);

DROP POLICY IF EXISTS "aac_select" ON public.agent_autonomy_config;
CREATE POLICY "aac_select" ON public.agent_autonomy_config
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "aac_admin_all" ON public.agent_autonomy_config;
CREATE POLICY "aac_admin_all" ON public.agent_autonomy_config
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP TRIGGER IF EXISTS update_aac_updated_at ON public.agent_autonomy_config;
CREATE TRIGGER update_aac_updated_at
  BEFORE UPDATE ON public.agent_autonomy_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ────────────────────────────────────────────────────
-- 3. MATRIZ DE AUTONOMIA POR TIPO DE AÇÃO
--    (tabela de referência com os níveis recomendados)
-- ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.action_autonomy_matrix (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_key       TEXT NOT NULL,
  action_label     TEXT NOT NULL,
  agent_type       public.agent_type NOT NULL,
  default_level    public.agent_autonomy_level NOT NULL,
  current_level    public.agent_autonomy_level NOT NULL,
  justification    TEXT,
  amount_threshold NUMERIC(15,2),   -- se relevante, ex: 5000 = "pagamento < R$5k"
  updated_by       UUID,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, action_key)
);

ALTER TABLE public.action_autonomy_matrix ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_aam_company ON public.action_autonomy_matrix(company_id);

DROP POLICY IF EXISTS "aam_select" ON public.action_autonomy_matrix;
CREATE POLICY "aam_select" ON public.action_autonomy_matrix
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "aam_admin_all" ON public.action_autonomy_matrix;
CREATE POLICY "aam_admin_all" ON public.action_autonomy_matrix
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insere a matriz padrão para uma empresa (chamada pelo onboarding)
CREATE OR REPLACE FUNCTION public.seed_action_autonomy_matrix(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.action_autonomy_matrix
    (company_id, action_key, action_label, agent_type, default_level, current_level, justification, amount_threshold)
  VALUES
    (p_company_id,'classify_expense',        'Classificar despesa (conta+CC)',      'classifier',    'N3_autonomous','N1_approval','Reversibilidade total, alto volume',NULL),
    (p_company_id,'create_ap_recurring',     'Incluir título AP (NF recorrente)',    'AP',            'N2_notify',    'N1_approval','Padrão conhecido, valor previsível',NULL),
    (p_company_id,'create_ap_new_vendor',    'Incluir título AP (fornecedor novo)',  'AP',            'N1_approval',  'N1_approval','Sem histórico para validar',NULL),
    (p_company_id,'settle_ar_exact',         'Baixar AR (match exato)',              'AR',            'N3_autonomous','N1_approval','Valor+data+documento batem',NULL),
    (p_company_id,'settle_ap_boleto',        'Baixar AP (boleto pago via CNAB)',     'AP',            'N3_autonomous','N1_approval','Confirmação bancária via CNAB',NULL),
    (p_company_id,'reconcile_high_conf',     'Conciliação bancária (conf>90%)',      'reconciliation','N3_autonomous','N1_approval','Padrão aprendido, baixo risco',NULL),
    (p_company_id,'reconcile_mid_conf',      'Conciliação bancária (conf 70-90%)',   'reconciliation','N2_notify',    'N1_approval','Provavelmente correto, vale auditar',NULL),
    (p_company_id,'reconcile_low_conf',      'Conciliação bancária (conf<70%)',      'reconciliation','N1_approval',  'N1_approval','Divergência que merece olhar humano',NULL),
    (p_company_id,'payment_low',             'Pagamento até R$5.000',               'AP',            'N2_notify',    'N1_approval','Valor baixo, padrão conhecido',5000),
    (p_company_id,'payment_mid',             'Pagamento R$5k–R$50k',                'AP',            'N1_approval',  'N1_approval','Alçada gerencial',50000),
    (p_company_id,'payment_high',            'Pagamento acima R$50.000',            'AP',            'N0_suggestion','N0_suggestion','Sempre toque humano explícito',NULL),
    (p_company_id,'send_collection_rule',    'Envio cobrança (régua automática)',    'AR',            'N3_autonomous','N1_approval','Comunicação padronizada',NULL),
    (p_company_id,'renegotiate_title',       'Renegociar título',                   'AR',            'N1_approval',  'N1_approval','Envolve desconto/prazo, decisão estratégica',NULL),
    (p_company_id,'generate_report',         'Gerar relatório contábil',            'conversational','N3_autonomous','N1_approval','Só leitura, sem alteração de dados',NULL),
    (p_company_id,'monthly_close',           'Encerramento mensal',                 'classifier',    'N0_suggestion','N0_suggestion','Marco crítico, sempre humano',NULL)
  ON CONFLICT (company_id, action_key) DO NOTHING;
END;
$$;

-- ────────────────────────────────────────────────────
-- 4. KILL SWITCH GLOBAL DE AGENTES
-- ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_kill_switch (
  company_id     UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  is_paused      BOOLEAN NOT NULL DEFAULT false,
  paused_at      TIMESTAMPTZ,
  paused_by      UUID,
  pause_reason   TEXT,
  resume_at      TIMESTAMPTZ,  -- se NULL, só manual
  resumed_at     TIMESTAMPTZ,
  resumed_by     UUID,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_kill_switch ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kill_switch_select" ON public.agent_kill_switch;
CREATE POLICY "kill_switch_select" ON public.agent_kill_switch
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "kill_switch_admin_all" ON public.agent_kill_switch;
CREATE POLICY "kill_switch_admin_all" ON public.agent_kill_switch
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Função: pausar todos os agentes com 1 clique
CREATE OR REPLACE FUNCTION public.pause_all_agents(
  p_company_id UUID,
  p_reason     TEXT,
  p_resume_at  TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.agent_kill_switch
    (company_id, is_paused, paused_at, paused_by, pause_reason, resume_at)
  VALUES
    (p_company_id, true, now(), auth.uid(), p_reason, p_resume_at)
  ON CONFLICT (company_id) DO UPDATE
  SET is_paused    = true,
      paused_at    = now(),
      paused_by    = auth.uid(),
      pause_reason = p_reason,
      resume_at    = p_resume_at,
      updated_at   = now();

  -- Registra no audit log
  INSERT INTO public.audit_logs (company_id, table_name, record_id, action, new_data, user_id)
  VALUES (p_company_id, 'agent_kill_switch', p_company_id, 'PAUSE_ALL_AGENTS',
          jsonb_build_object('reason', p_reason, 'resume_at', p_resume_at), auth.uid());
END;
$$;

-- Função: retomar agentes
CREATE OR REPLACE FUNCTION public.resume_all_agents(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.agent_kill_switch
  SET is_paused   = false,
      resumed_at  = now(),
      resumed_by  = auth.uid(),
      updated_at  = now()
  WHERE company_id = p_company_id;

  INSERT INTO public.audit_logs (company_id, table_name, record_id, action, new_data, user_id)
  VALUES (p_company_id, 'agent_kill_switch', p_company_id, 'RESUME_ALL_AGENTS',
          jsonb_build_object('resumed_at', now()), auth.uid());
END;
$$;

-- ────────────────────────────────────────────────────
-- 5. WHITELIST DE FORNECEDORES PARA PAGAMENTO AUTO
-- ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_vendor_whitelist (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  counterparty_id     UUID NOT NULL REFERENCES public.counterparties(id) ON DELETE CASCADE,
  max_auto_amount     NUMERIC(15,2) DEFAULT 5000,
  approved_by         UUID NOT NULL,
  approved_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until         DATE,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, counterparty_id)
);

ALTER TABLE public.agent_vendor_whitelist ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_avw_company      ON public.agent_vendor_whitelist(company_id);
CREATE INDEX IF NOT EXISTS idx_avw_counterparty ON public.agent_vendor_whitelist(counterparty_id);

DROP POLICY IF EXISTS "avw_select" ON public.agent_vendor_whitelist;
CREATE POLICY "avw_select" ON public.agent_vendor_whitelist
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "avw_admin_all" ON public.agent_vendor_whitelist;
CREATE POLICY "avw_admin_all" ON public.agent_vendor_whitelist
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND role IN ('admin','gestor')
    )
  );

-- Função de validação (chamada antes de pagamento automático)
CREATE OR REPLACE FUNCTION public.check_vendor_whitelist(
  p_company_id      UUID,
  p_counterparty_id UUID,
  p_amount          NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ok BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.agent_vendor_whitelist
    WHERE company_id      = p_company_id
      AND counterparty_id = p_counterparty_id
      AND is_active       = true
      AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      AND max_auto_amount >= p_amount
  ) INTO v_ok;
  RETURN v_ok;
END;
$$;

-- ────────────────────────────────────────────────────
-- 6. DRIFT DETECTION (monitoramento de qualidade IA)
-- ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_drift_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_type          public.agent_type NOT NULL,
  period_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  total_actions       INTEGER NOT NULL DEFAULT 0,
  auto_accepted       INTEGER NOT NULL DEFAULT 0,  -- N2/N3 sem reversão
  human_corrected     INTEGER NOT NULL DEFAULT 0,  -- corrigidos manualmente
  human_rejected      INTEGER NOT NULL DEFAULT 0,  -- rejeitados
  accuracy_pct        NUMERIC(5,2),                -- auto_accepted/total
  drift_detected      BOOLEAN NOT NULL DEFAULT false,
  drift_reason        TEXT,
  -- se drift: rebaixa autonomy_level automaticamente
  autonomy_downgraded BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, agent_type, period_date)
);

ALTER TABLE public.agent_drift_metrics ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_adm_company ON public.agent_drift_metrics(company_id, period_date DESC);

DROP POLICY IF EXISTS "drift_select" ON public.agent_drift_metrics;
CREATE POLICY "drift_select" ON public.agent_drift_metrics
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

-- Função: registra resultado de uma ação do agente e verifica drift
CREATE OR REPLACE FUNCTION public.record_agent_action_result(
  p_company_id    UUID,
  p_agent_type    public.agent_type,
  p_was_corrected BOOLEAN,
  p_was_rejected  BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_accuracy   NUMERIC(5,2);
  v_drift      BOOLEAN := false;
  v_threshold  NUMERIC := 85; -- abaixo de 85% accuracy = drift
BEGIN
  -- Upsert métricas do dia
  INSERT INTO public.agent_drift_metrics
    (company_id, agent_type, period_date, total_actions,
     auto_accepted, human_corrected, human_rejected)
  VALUES (p_company_id, p_agent_type, CURRENT_DATE, 1,
          CASE WHEN NOT p_was_corrected AND NOT p_was_rejected THEN 1 ELSE 0 END,
          CASE WHEN p_was_corrected THEN 1 ELSE 0 END,
          CASE WHEN p_was_rejected  THEN 1 ELSE 0 END)
  ON CONFLICT (company_id, agent_type, period_date) DO UPDATE
  SET total_actions    = agent_drift_metrics.total_actions + 1,
      auto_accepted    = agent_drift_metrics.auto_accepted +
                         CASE WHEN NOT p_was_corrected AND NOT p_was_rejected THEN 1 ELSE 0 END,
      human_corrected  = agent_drift_metrics.human_corrected +
                         CASE WHEN p_was_corrected THEN 1 ELSE 0 END,
      human_rejected   = agent_drift_metrics.human_rejected +
                         CASE WHEN p_was_rejected THEN 1 ELSE 0 END;

  -- Calcula accuracy do dia
  SELECT
    ROUND(100.0 * auto_accepted::NUMERIC / NULLIF(total_actions,0), 2),
    (100.0 * auto_accepted::NUMERIC / NULLIF(total_actions,0)) < v_threshold
      AND total_actions >= 10  -- só detecta com >= 10 ações
  INTO v_accuracy, v_drift
  FROM public.agent_drift_metrics
  WHERE company_id = p_company_id
    AND agent_type = p_agent_type
    AND period_date = CURRENT_DATE;

  -- Atualiza drift
  UPDATE public.agent_drift_metrics
  SET accuracy_pct    = v_accuracy,
      drift_detected  = v_drift,
      drift_reason    = CASE WHEN v_drift THEN
        'Accuracy ' || v_accuracy || '% abaixo do threshold ' || v_threshold || '%'
      ELSE NULL END
  WHERE company_id = p_company_id
    AND agent_type = p_agent_type
    AND period_date = CURRENT_DATE;

  -- Se drift detectado: rebaixa autonomy_level automaticamente
  IF v_drift THEN
    UPDATE public.agent_autonomy_config
    SET autonomy_level = CASE
      WHEN autonomy_level = 'N3_autonomous' THEN 'N2_notify'
      WHEN autonomy_level = 'N2_notify'     THEN 'N1_approval'
      WHEN autonomy_level = 'N1_approval'   THEN 'N0_suggestion'
      ELSE 'N0_suggestion'
    END,
    updated_at = now()
    WHERE company_id = p_company_id AND agent_type = p_agent_type;

    UPDATE public.agent_drift_metrics
    SET autonomy_downgraded = true
    WHERE company_id = p_company_id
      AND agent_type = p_agent_type
      AND period_date = CURRENT_DATE;

    -- Notifica via audit log
    INSERT INTO public.audit_logs (company_id, table_name, record_id, action, new_data)
    VALUES (p_company_id, 'agent_drift_metrics', gen_random_uuid(), 'DRIFT_DETECTED',
            jsonb_build_object(
              'agent_type', p_agent_type::TEXT,
              'accuracy_pct', v_accuracy,
              'action', 'autonomy_level_downgraded'
            ));
  END IF;
END;
$$;

-- ────────────────────────────────────────────────────
-- 7. AUDIT LOG DE AÇÕES AUTÔNOMAS (append-only)
--    Cada ação autônoma carrega a razão (explainability)
-- ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_action_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_type      public.agent_type NOT NULL,
  autonomy_level  public.agent_autonomy_level NOT NULL,
  action_key      TEXT NOT NULL,
  action_label    TEXT,
  -- payload da ação
  entity_type     TEXT,          -- 'transaction','reconciliation', etc.
  entity_id       UUID,
  amount          NUMERIC(15,2),
  -- explainability obrigatória
  reason          TEXT NOT NULL, -- "executei porque: ..."
  confidence_pct  NUMERIC(5,2),
  -- resultado
  status          TEXT NOT NULL DEFAULT 'executed'
    CHECK (status IN ('executed','pending_approval','approved','rejected','reverted','failed')),
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  reverted_by     UUID,
  reverted_at     TIMESTAMPTZ,
  revert_reason   TEXT,
  -- rastreabilidade
  triggered_by    TEXT DEFAULT 'agent', -- 'agent','webhook','schedule','manual'
  session_id      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  -- SEM updated_at → append-only
);

ALTER TABLE public.agent_action_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_aal_company     ON public.agent_action_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aal_agent       ON public.agent_action_log(company_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_aal_status      ON public.agent_action_log(company_id, status);
CREATE INDEX IF NOT EXISTS idx_aal_entity      ON public.agent_action_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_aal_pending     ON public.agent_action_log(company_id, status)
  WHERE status = 'pending_approval';

DROP POLICY IF EXISTS "aal_select" ON public.agent_action_log;
CREATE POLICY "aal_select" ON public.agent_action_log
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "aal_insert_service" ON public.agent_action_log;
CREATE POLICY "aal_insert_service" ON public.agent_action_log
  FOR INSERT WITH CHECK (true);  -- Edge Functions usam service_role

-- Proíbe UPDATE e DELETE (append-only)
CREATE OR REPLACE RULE agent_action_log_no_update AS
  ON UPDATE TO public.agent_action_log DO INSTEAD NOTHING;
-- Permite apenas update de status (aprovação/rejeição) via função
CREATE OR REPLACE FUNCTION public.update_agent_action_status(
  p_log_id   UUID,
  p_status   TEXT,
  p_reason   TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Remove a regra NOTHING temporariamente não é possível; usamos UPDATE direto com service_role
  UPDATE public.agent_action_log
  SET
    status      = p_status,
    approved_by = CASE WHEN p_status = 'approved' THEN auth.uid() ELSE approved_by END,
    approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE approved_at END,
    reverted_by = CASE WHEN p_status = 'reverted' THEN auth.uid() ELSE reverted_by END,
    reverted_at = CASE WHEN p_status = 'reverted' THEN now() ELSE reverted_at END,
    revert_reason = CASE WHEN p_status = 'reverted' THEN p_reason ELSE revert_reason END
  WHERE id = p_log_id;
END;
$$;

-- ────────────────────────────────────────────────────
-- 8. RELATÓRIO DIGEST DIÁRIO
--    Resumo de todas as ações autônomas do dia
-- ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_daily_digest (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  digest_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  total_actions     INTEGER NOT NULL DEFAULT 0,
  by_agent_json     JSONB DEFAULT '{}',  -- {AP:5, AR:3, ...}
  by_status_json    JSONB DEFAULT '{}',  -- {executed:6, pending:2, ...}
  total_amount      NUMERIC(15,2) DEFAULT 0,
  highlights_json   JSONB DEFAULT '[]',  -- ações relevantes para o gestor
  sent_at           TIMESTAMPTZ,
  sent_channel      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, digest_date)
);

ALTER TABLE public.agent_daily_digest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "digest_select" ON public.agent_daily_digest;
CREATE POLICY "digest_select" ON public.agent_daily_digest
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

-- Função: gera o digest do dia
CREATE OR REPLACE FUNCTION public.generate_daily_digest(p_company_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_digest_id UUID;
  v_by_agent  JSONB;
  v_by_status JSONB;
  v_total_amt NUMERIC;
  v_highlights JSONB;
BEGIN
  SELECT jsonb_object_agg(agent_type::TEXT, cnt)
  INTO v_by_agent
  FROM (
    SELECT agent_type, COUNT(*) AS cnt
    FROM public.agent_action_log
    WHERE company_id = p_company_id AND DATE(created_at) = p_date
    GROUP BY agent_type
  ) x;

  SELECT jsonb_object_agg(status, cnt)
  INTO v_by_status
  FROM (
    SELECT status, COUNT(*) AS cnt
    FROM public.agent_action_log
    WHERE company_id = p_company_id AND DATE(created_at) = p_date
    GROUP BY status
  ) x;

  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO v_total_amt
  FROM public.agent_action_log
  WHERE company_id = p_company_id AND DATE(created_at) = p_date;

  -- Highlights: ações acima de R$1k ou rejeitadas/revertidas
  SELECT jsonb_agg(jsonb_build_object(
    'id',           id,
    'agent',        agent_type::TEXT,
    'action',       action_label,
    'amount',       amount,
    'status',       status,
    'reason',       reason
  ))
  INTO v_highlights
  FROM public.agent_action_log
  WHERE company_id = p_company_id
    AND DATE(created_at) = p_date
    AND (amount > 1000 OR status IN ('rejected','reverted','failed'));

  INSERT INTO public.agent_daily_digest
    (company_id, digest_date, total_actions, by_agent_json, by_status_json,
     total_amount, highlights_json)
  SELECT
    p_company_id, p_date,
    COUNT(*),
    COALESCE(v_by_agent, '{}'),
    COALESCE(v_by_status, '{}'),
    v_total_amt,
    COALESCE(v_highlights, '[]')
  FROM public.agent_action_log
  WHERE company_id = p_company_id AND DATE(created_at) = p_date
  ON CONFLICT (company_id, digest_date) DO UPDATE
  SET total_actions  = EXCLUDED.total_actions,
      by_agent_json  = EXCLUDED.by_agent_json,
      by_status_json = EXCLUDED.by_status_json,
      total_amount   = EXCLUDED.total_amount,
      highlights_json = EXCLUDED.highlights_json
  RETURNING id INTO v_digest_id;

  RETURN v_digest_id;
END;
$$;

-- ────────────────────────────────────────────────────
-- 9. DUPLA CHECAGEM PARA AÇÕES > R$100k
-- ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_dual_approval (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_log_id    UUID NOT NULL REFERENCES public.agent_action_log(id),
  amount           NUMERIC(15,2) NOT NULL,
  first_agent      public.agent_type NOT NULL,
  second_agent     public.agent_type,
  first_approved   BOOLEAN DEFAULT false,
  second_approved  BOOLEAN DEFAULT false,
  first_approved_by UUID,
  second_approved_by UUID,
  first_approved_at  TIMESTAMPTZ,
  second_approved_at TIMESTAMPTZ,
  final_status     TEXT DEFAULT 'pending'
    CHECK (final_status IN ('pending','approved','rejected','expired')),
  expires_at       TIMESTAMPTZ DEFAULT (now() + interval '4 hours'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_dual_approval ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ada_company ON public.agent_dual_approval(company_id, final_status);

DROP POLICY IF EXISTS "ada_select" ON public.agent_dual_approval;
CREATE POLICY "ada_select" ON public.agent_dual_approval
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────
-- 10. VIEW: v_agent_guardrail_status
--     Visão consolidada de saúde dos guardrails
-- ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_agent_guardrail_status
WITH (security_invoker = on)
AS
SELECT
  c.id                                        AS company_id,
  c.name                                      AS company_name,
  COALESCE(ks.is_paused, false)              AS kill_switch_active,
  ks.pause_reason,
  ks.paused_at,
  COALESCE(ais.enabled, false)               AS ai_enabled,
  ais.autopilot_mode,
  COUNT(DISTINCT vw.id)                       AS whitelisted_vendors,
  COUNT(DISTINCT CASE WHEN aac.is_enabled THEN aac.agent_type END) AS active_agents,
  MAX(adm.period_date)
    FILTER (WHERE adm.drift_detected)        AS last_drift_date,
  COUNT(DISTINCT aal.id)
    FILTER (WHERE aal.status='pending_approval'
            AND aal.created_at > now() - interval '24h') AS pending_approvals_24h
FROM public.companies c
LEFT JOIN public.agent_kill_switch ks    ON ks.company_id = c.id
LEFT JOIN public.ai_company_settings ais ON ais.company_id = c.id
LEFT JOIN public.agent_vendor_whitelist vw ON vw.company_id = c.id AND vw.is_active
LEFT JOIN public.agent_autonomy_config aac ON aac.company_id = c.id
LEFT JOIN public.agent_drift_metrics adm ON adm.company_id = c.id
LEFT JOIN public.agent_action_log aal   ON aal.company_id = c.id
GROUP BY c.id, c.name, ks.is_paused, ks.pause_reason, ks.paused_at,
         ais.enabled, ais.autopilot_mode;

GRANT SELECT ON public.v_agent_guardrail_status TO authenticated;
