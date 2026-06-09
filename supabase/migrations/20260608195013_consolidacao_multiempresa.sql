-- =====================================================
-- BLOCO 1: CONSOLIDAÇÃO MULTIEMPRESA
-- VirtruvIA · Blueprint Sistema Financeiro v1.0
-- Referência: SAP S/4HANA Finance for Group Reporting
-- =====================================================
-- Executar na ordem. Todos os objetos usam prefix
-- "cg_" (Company Group) para fácil identificação.
-- =====================================================

-- ────────────────────────────────────────────────────
-- 1. GRUPOS ECONÔMICOS (Holdings)
-- ────────────────────────────────────────────────────
CREATE TABLE public.economic_groups (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT    NOT NULL,
  trade_name          TEXT,
  cnpj                VARCHAR(18),
  currency            CHAR(3) NOT NULL DEFAULT 'BRL',
  fiscal_year_start   SMALLINT NOT NULL DEFAULT 1  -- mês (1=Jan)
    CHECK (fiscal_year_start BETWEEN 1 AND 12),
  consolidation_method TEXT NOT NULL DEFAULT 'full'
    CHECK (consolidation_method IN ('full','proportional','equity')),
  reporting_standard  TEXT NOT NULL DEFAULT 'BR_GAAP'
    CHECK (reporting_standard IN ('BR_GAAP','IFRS')),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.economic_groups ENABLE ROW LEVEL SECURITY;

-- Usuários só veem grupos a que suas empresas pertencem
CREATE POLICY "economic_groups_select" ON public.economic_groups
  FOR SELECT USING (
    id IN (
      SELECT group_id FROM public.group_companies gc
      JOIN public.company_users cu ON cu.company_id = gc.company_id
      WHERE cu.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────
-- 2. EMPRESAS DO GRUPO (membro ↔ holding)
-- ────────────────────────────────────────────────────
CREATE TABLE public.group_companies (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID    NOT NULL REFERENCES public.economic_groups(id) ON DELETE CASCADE,
  company_id        UUID    NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_company_id UUID    REFERENCES public.companies(id),   -- empresa mãe (para equity method)
  ownership_pct     NUMERIC(7,4) NOT NULL DEFAULT 100          -- % de participação
    CHECK (ownership_pct > 0 AND ownership_pct <= 100),
  is_holding        BOOLEAN NOT NULL DEFAULT false,
  join_date         DATE    NOT NULL DEFAULT CURRENT_DATE,
  leave_date        DATE,
  currency          CHAR(3) NOT NULL DEFAULT 'BRL',
  fx_rate_method    TEXT    NOT NULL DEFAULT 'closing'
    CHECK (fx_rate_method IN ('closing','average','historical')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, company_id)
);

ALTER TABLE public.group_companies ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_group_companies_group   ON public.group_companies(group_id);
CREATE INDEX idx_group_companies_company ON public.group_companies(company_id);

CREATE POLICY "group_companies_select" ON public.group_companies
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
    OR
    group_id IN (
      SELECT gc2.group_id FROM public.group_companies gc2
      JOIN public.company_users cu ON cu.company_id = gc2.company_id
      WHERE cu.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────
-- 3. MAPEAMENTO DE PLANO DE CONTAS DO GRUPO
--    Cada empresa pode ter conta local → conta grupo
-- ────────────────────────────────────────────────────
CREATE TABLE public.group_account_mapping (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            UUID NOT NULL REFERENCES public.economic_groups(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  local_account_id    UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  group_account_code  TEXT NOT NULL,   -- código padronizado do grupo
  group_account_name  TEXT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, company_id, local_account_id)
);

ALTER TABLE public.group_account_mapping ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gam_group_company ON public.group_account_mapping(group_id, company_id);

CREATE POLICY "group_account_mapping_select" ON public.group_account_mapping
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );
CREATE POLICY "group_account_mapping_all" ON public.group_account_mapping
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────
-- 4. TRANSAÇÕES INTERCOMPANY
--    Marca operações entre empresas do mesmo grupo
-- ────────────────────────────────────────────────────
CREATE TABLE public.intercompany_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              UUID NOT NULL REFERENCES public.economic_groups(id) ON DELETE CASCADE,
  source_company_id     UUID NOT NULL REFERENCES public.companies(id),
  target_company_id     UUID NOT NULL REFERENCES public.companies(id),
  source_transaction_id UUID REFERENCES public.transactions(id),
  target_transaction_id UUID REFERENCES public.transactions(id),
  ic_type               TEXT NOT NULL
    CHECK (ic_type IN (
      'sale','purchase','loan','interest','dividend',
      'service','royalty','cost_allocation','transfer'
    )),
  amount                NUMERIC(18,2) NOT NULL,
  currency              CHAR(3) NOT NULL DEFAULT 'BRL',
  fx_rate               NUMERIC(12,6) DEFAULT 1,
  period_year           SMALLINT NOT NULL,
  period_month          SMALLINT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  elimination_status    TEXT NOT NULL DEFAULT 'pending'
    CHECK (elimination_status IN ('pending','eliminated','partially_eliminated','manual_override')),
  eliminated_at         TIMESTAMPTZ,
  eliminated_by         UUID,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_company_id <> target_company_id)
);

ALTER TABLE public.intercompany_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ic_group          ON public.intercompany_transactions(group_id);
CREATE INDEX idx_ic_period         ON public.intercompany_transactions(group_id, period_year, period_month);
CREATE INDEX idx_ic_source_company ON public.intercompany_transactions(source_company_id);
CREATE INDEX idx_ic_target_company ON public.intercompany_transactions(target_company_id);
CREATE INDEX idx_ic_status         ON public.intercompany_transactions(elimination_status);

CREATE POLICY "ic_transactions_select" ON public.intercompany_transactions
  FOR SELECT USING (
    source_company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
    OR
    target_company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );
CREATE POLICY "ic_transactions_all" ON public.intercompany_transactions
  FOR ALL USING (
    source_company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────
-- 5. BALANCETES CONSOLIDADOS (cache mensal)
-- ────────────────────────────────────────────────────
CREATE TABLE public.consolidated_balances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            UUID NOT NULL REFERENCES public.economic_groups(id) ON DELETE CASCADE,
  period_year         SMALLINT NOT NULL,
  period_month        SMALLINT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  group_account_code  TEXT NOT NULL,
  group_account_name  TEXT NOT NULL,
  account_category    TEXT NOT NULL,
  total_debit         NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_credit        NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_balance         NUMERIC(18,2) NOT NULL DEFAULT 0,   -- crédito - débito (BR GAAP)
  intercompany_eliminated NUMERIC(18,2) DEFAULT 0,
  currency            CHAR(3) NOT NULL DEFAULT 'BRL',
  last_calculated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, period_year, period_month, group_account_code)
);

ALTER TABLE public.consolidated_balances ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cb_group_period ON public.consolidated_balances(group_id, period_year, period_month);

CREATE POLICY "consolidated_balances_select" ON public.consolidated_balances
  FOR SELECT USING (
    group_id IN (
      SELECT gc.group_id FROM public.group_companies gc
      JOIN public.company_users cu ON cu.company_id = gc.company_id
      WHERE cu.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────
-- 6. DRE / BALANÇO CONSOLIDADO (períodos fechados)
-- ────────────────────────────────────────────────────
CREATE TABLE public.consolidated_statements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       UUID NOT NULL REFERENCES public.economic_groups(id) ON DELETE CASCADE,
  statement_type TEXT NOT NULL CHECK (statement_type IN ('DRE','BP','DFC','DLPA')),
  period_year    SMALLINT NOT NULL,
  period_month   SMALLINT,  -- NULL = anual
  scenario       TEXT NOT NULL DEFAULT 'actual'
    CHECK (scenario IN ('actual','budget','forecast')),
  currency       CHAR(3) NOT NULL DEFAULT 'BRL',
  lines_json     JSONB NOT NULL DEFAULT '[]',  -- [{code, name, value, category}]
  ic_eliminations_json JSONB DEFAULT '[]',
  metadata_json  JSONB DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','reviewing','approved','published')),
  approved_by    UUID,
  approved_at    TIMESTAMPTZ,
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consolidated_statements ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cs_group_period ON public.consolidated_statements(group_id, period_year, statement_type);

CREATE POLICY "consolidated_statements_select" ON public.consolidated_statements
  FOR SELECT USING (
    group_id IN (
      SELECT gc.group_id FROM public.group_companies gc
      JOIN public.company_users cu ON cu.company_id = gc.company_id
      WHERE cu.user_id = auth.uid()
    )
  );
CREATE POLICY "consolidated_statements_all" ON public.consolidated_statements
  FOR ALL USING (
    group_id IN (
      SELECT gc.group_id FROM public.group_companies gc
      JOIN public.company_users cu ON cu.company_id = gc.company_id
      WHERE cu.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────
-- 7. TAXAS DE CÂMBIO DO GRUPO (para multi-moeda)
-- ────────────────────────────────────────────────────
CREATE TABLE public.group_fx_rates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES public.economic_groups(id) ON DELETE CASCADE,
  from_currency CHAR(3) NOT NULL,
  to_currency   CHAR(3) NOT NULL DEFAULT 'BRL',
  rate_date    DATE NOT NULL,
  closing_rate NUMERIC(12,6) NOT NULL,
  average_rate NUMERIC(12,6),
  source       TEXT DEFAULT 'manual'
    CHECK (source IN ('manual','bcb_api','open_exchange','ecb')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, from_currency, to_currency, rate_date)
);

ALTER TABLE public.group_fx_rates ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_fx_group_date ON public.group_fx_rates(group_id, rate_date DESC);

CREATE POLICY "fx_rates_select" ON public.group_fx_rates
  FOR SELECT USING (
    group_id IN (
      SELECT gc.group_id FROM public.group_companies gc
      JOIN public.company_users cu ON cu.company_id = gc.company_id
      WHERE cu.user_id = auth.uid()
    )
  );
CREATE POLICY "fx_rates_all" ON public.group_fx_rates
  FOR ALL USING (
    group_id IN (
      SELECT gc.group_id FROM public.group_companies gc
      JOIN public.company_users cu ON cu.company_id = gc.company_id
      WHERE cu.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────
-- 8. PERMISSÕES DE GRUPO (perfil de usuário ↔ grupo)
-- ────────────────────────────────────────────────────
CREATE TABLE public.group_user_permissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES public.economic_groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('viewer','analyst','controller','admin')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.group_user_permissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gup_user ON public.group_user_permissions(user_id);

CREATE POLICY "gup_select" ON public.group_user_permissions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "gup_admin_all" ON public.group_user_permissions
  FOR ALL USING (
    group_id IN (
      SELECT gup2.group_id FROM public.group_user_permissions gup2
      WHERE gup2.user_id = auth.uid() AND gup2.role = 'admin'
    )
  );

-- ────────────────────────────────────────────────────
-- 9. FUNÇÃO: calcular_consolidado_periodo
--    Consolida balancetes de todas as empresas do
--    grupo, aplica FX e elimina intercompany.
-- ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_group_consolidation(
  p_group_id    UUID,
  p_year        SMALLINT,
  p_month       SMALLINT
)
RETURNS TABLE (
  group_account_code  TEXT,
  group_account_name  TEXT,
  account_category    TEXT,
  total_debit         NUMERIC,
  total_credit        NUMERIC,
  net_balance         NUMERIC,
  intercompany_eliminated NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  -- 1. Limpa cache do período
  DELETE FROM public.consolidated_balances
  WHERE group_id = p_group_id
    AND period_year = p_year
    AND period_month = p_month;

  -- 2. Agrega balancetes de todas as empresas do grupo (com FX)
  INSERT INTO public.consolidated_balances (
    group_id, period_year, period_month,
    group_account_code, group_account_name, account_category,
    total_debit, total_credit, net_balance, intercompany_eliminated
  )
  SELECT
    p_group_id,
    p_year,
    p_month,
    COALESCE(gam.group_account_code, a.code)  AS group_account_code,
    COALESCE(gam.group_account_name, a.name)  AS group_account_name,
    a.category_type::TEXT                      AS account_category,
    SUM(glb.total_debit  * COALESCE(fx.closing_rate, 1)) AS total_debit,
    SUM(glb.total_credit * COALESCE(fx.closing_rate, 1)) AS total_credit,
    SUM(glb.ending_balance * COALESCE(fx.closing_rate, 1)) AS net_balance,
    0 AS intercompany_eliminated
  FROM public.group_companies gc
  JOIN public.gl_balances_monthly glb
    ON glb.company_id = gc.company_id
   AND glb.period_year  = p_year
   AND glb.period_month = p_month
  JOIN public.accounts a ON a.id = glb.account_id
  LEFT JOIN public.group_account_mapping gam
    ON gam.group_id   = p_group_id
   AND gam.company_id = gc.company_id
   AND gam.local_account_id = a.id
  LEFT JOIN public.group_fx_rates fx
    ON fx.group_id     = p_group_id
   AND fx.from_currency = gc.currency
   AND fx.to_currency   = 'BRL'
   AND fx.rate_date     = (
         SELECT MAX(rate_date)
         FROM public.group_fx_rates
         WHERE group_id     = p_group_id
           AND from_currency = gc.currency
           AND rate_date    <= make_date(p_year, p_month, 1) + interval '1 month - 1 day'
       )
  WHERE gc.group_id  = p_group_id
    AND gc.is_active = true
    AND (gc.leave_date IS NULL OR gc.leave_date >= make_date(p_year, p_month, 1))
  GROUP BY
    COALESCE(gam.group_account_code, a.code),
    COALESCE(gam.group_account_name, a.name),
    a.category_type;

  -- 3. Aplica eliminações intercompany
  UPDATE public.consolidated_balances cb
  SET
    intercompany_eliminated = ic_agg.total_ic,
    net_balance = cb.net_balance - ic_agg.total_ic,
    last_calculated_at = now()
  FROM (
    SELECT
      COALESCE(gam.group_account_code, a.code) AS group_account_code,
      SUM(ict.amount * COALESCE(fx.closing_rate, 1)) AS total_ic
    FROM public.intercompany_transactions ict
    JOIN public.transactions t ON t.id = ict.source_transaction_id
    JOIN public.accounts a     ON a.id = t.account_id
    LEFT JOIN public.group_account_mapping gam
      ON gam.group_id   = p_group_id
     AND gam.company_id = ict.source_company_id
     AND gam.local_account_id = a.id
    LEFT JOIN public.group_fx_rates fx
      ON fx.group_id     = p_group_id
     AND fx.from_currency = ict.currency
     AND fx.to_currency   = 'BRL'
     AND fx.rate_date     = (
           SELECT MAX(rate_date) FROM public.group_fx_rates
           WHERE group_id = p_group_id AND from_currency = ict.currency
             AND rate_date <= make_date(p_year, p_month, 1) + interval '1 month - 1 day'
         )
    WHERE ict.group_id      = p_group_id
      AND ict.period_year   = p_year
      AND ict.period_month  = p_month
      AND ict.elimination_status IN ('pending','eliminated')
    GROUP BY COALESCE(gam.group_account_code, a.code)
  ) ic_agg
  WHERE cb.group_id            = p_group_id
    AND cb.period_year         = p_year
    AND cb.period_month        = p_month
    AND cb.group_account_code  = ic_agg.group_account_code;

  -- 4. Marca intercompany como eliminadas
  UPDATE public.intercompany_transactions
  SET elimination_status = 'eliminated',
      eliminated_at      = now()
  WHERE group_id     = p_group_id
    AND period_year  = p_year
    AND period_month = p_month
    AND elimination_status = 'pending';

  -- 5. Retorna resultado
  RETURN QUERY
  SELECT
    cb.group_account_code,
    cb.group_account_name,
    cb.account_category,
    cb.total_debit,
    cb.total_credit,
    cb.net_balance,
    cb.intercompany_eliminated
  FROM public.consolidated_balances cb
  WHERE cb.group_id     = p_group_id
    AND cb.period_year  = p_year
    AND cb.period_month = p_month
  ORDER BY cb.group_account_code;
END;
$$;

-- ────────────────────────────────────────────────────
-- 10. FUNÇÃO: detect_intercompany_transactions
--     Identifica automaticamente transações entre
--     empresas do mesmo grupo (por CNPJ do contraparte)
-- ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.detect_intercompany_transactions(
  p_group_id   UUID,
  p_year       SMALLINT,
  p_month      SMALLINT
)
RETURNS INTEGER   -- número de transações IC detectadas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Para cada transação onde o contraparte é uma empresa do grupo
  INSERT INTO public.intercompany_transactions (
    group_id, source_company_id, target_company_id,
    source_transaction_id, ic_type, amount, currency,
    period_year, period_month, elimination_status
  )
  SELECT DISTINCT
    p_group_id,
    t.company_id                                         AS source_company_id,
    gc_target.company_id                                 AS target_company_id,
    t.id                                                 AS source_transaction_id,
    CASE
      WHEN t.type = 'income' THEN 'sale'
      WHEN t.type = 'expense' THEN 'purchase'
      ELSE 'transfer'
    END                                                  AS ic_type,
    ABS(t.amount)                                        AS amount,
    'BRL'                                                AS currency,
    p_year,
    p_month,
    'pending'
  FROM public.transactions t
  JOIN public.counterparties cp ON cp.id = t.counterparty_id
  JOIN public.companies c_target ON c_target.document = cp.document
  JOIN public.group_companies gc_source ON gc_source.company_id = t.company_id
                                       AND gc_source.group_id   = p_group_id
  JOIN public.group_companies gc_target ON gc_target.company_id = c_target.id
                                       AND gc_target.group_id   = p_group_id
  WHERE EXTRACT(YEAR  FROM t.transaction_date) = p_year
    AND EXTRACT(MONTH FROM t.transaction_date) = p_month
    AND t.company_id <> c_target.id
    AND NOT EXISTS (
      SELECT 1 FROM public.intercompany_transactions ict2
      WHERE ict2.source_transaction_id = t.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ────────────────────────────────────────────────────
-- 11. VIEW: v_group_companies_summary
--     Resumo de cada empresa do grupo com saldos
-- ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_group_companies_summary
WITH (security_invoker = on)
AS
SELECT
  gc.group_id,
  gc.company_id,
  c.name                                          AS company_name,
  c.document                                      AS cnpj,
  gc.ownership_pct,
  gc.is_holding,
  gc.currency,
  eg.name                                         AS group_name,
  COALESCE(wallet_sum.total_balance, 0)           AS cash_balance,
  COALESCE(ar_sum.total_ar, 0)                    AS accounts_receivable,
  COALESCE(ap_sum.total_ap, 0)                    AS accounts_payable,
  gc.join_date,
  gc.leave_date
FROM public.group_companies gc
JOIN public.companies c         ON c.id  = gc.company_id
JOIN public.economic_groups eg  ON eg.id = gc.group_id
LEFT JOIN (
  SELECT company_id, SUM(balance) AS total_balance
  FROM public.wallets WHERE is_active = true
  GROUP BY company_id
) wallet_sum ON wallet_sum.company_id = gc.company_id
LEFT JOIN (
  SELECT company_id, SUM(amount) AS total_ar
  FROM public.transactions
  WHERE type = 'income' AND status IN ('pending','overdue')
  GROUP BY company_id
) ar_sum ON ar_sum.company_id = gc.company_id
LEFT JOIN (
  SELECT company_id, SUM(amount) AS total_ap
  FROM public.transactions
  WHERE type = 'expense' AND status IN ('pending','overdue')
  GROUP BY company_id
) ap_sum ON ap_sum.company_id = gc.company_id
WHERE gc.is_active = true
  AND (gc.leave_date IS NULL OR gc.leave_date >= CURRENT_DATE);

GRANT SELECT ON public.v_group_companies_summary TO authenticated;

-- ────────────────────────────────────────────────────
-- 12. VIEW: v_intercompany_pending
--     Transações IC ainda não eliminadas
-- ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_intercompany_pending
WITH (security_invoker = on)
AS
SELECT
  ict.id,
  ict.group_id,
  eg.name                 AS group_name,
  cs.name                 AS source_company,
  ct.name                 AS target_company,
  ict.ic_type,
  ict.amount,
  ict.currency,
  ict.period_year,
  ict.period_month,
  ict.elimination_status,
  ict.created_at
FROM public.intercompany_transactions ict
JOIN public.economic_groups eg ON eg.id = ict.group_id
JOIN public.companies cs ON cs.id = ict.source_company_id
JOIN public.companies ct ON ct.id = ict.target_company_id
WHERE ict.elimination_status = 'pending';

GRANT SELECT ON public.v_intercompany_pending TO authenticated;

-- ────────────────────────────────────────────────────
-- 13. TRIGGERS updated_at
-- ────────────────────────────────────────────────────
CREATE TRIGGER update_economic_groups_updated_at
  BEFORE UPDATE ON public.economic_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_companies_updated_at
  BEFORE UPDATE ON public.group_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ic_transactions_updated_at
  BEFORE UPDATE ON public.intercompany_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consolidated_statements_updated_at
  BEFORE UPDATE ON public.consolidated_statements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ────────────────────────────────────────────────────
-- 14. MENU ITEMS (consolidação do grupo)
-- ────────────────────────────────────────────────────
INSERT INTO public.menu_items
  (key, label, path, icon, parent_key, sort_order, permission_key, feature_flag, is_separator)
VALUES
  ('group.consolidation', 'Grupo Econômico', NULL, 'Building2', NULL, 90, NULL, 'feature_group', true),
  ('group.overview',      'Visão do Grupo',       '/grupo/visao-geral',     'LayoutDashboard', 'group.consolidation', 91, 'group.view', 'feature_group', false),
  ('group.consolidation.balance', 'Balancete Consolidado', '/grupo/balancete', 'TableProperties', 'group.consolidation', 92, 'group.view', 'feature_group', false),
  ('group.intercompany',  'Intercompany',          '/grupo/intercompany',    'ArrowLeftRight',  'group.consolidation', 93, 'group.view', 'feature_group', false),
  ('group.statements',    'Demonstrativos',        '/grupo/demonstrativos',  'FileBarChart2',   'group.consolidation', 94, 'group.view', 'feature_group', false),
  ('group.companies',     'Empresas do Grupo',     '/grupo/empresas',        'Building',        'group.consolidation', 95, 'group.admin', 'feature_group', false),
  ('group.fx',            'Taxas de Câmbio',       '/grupo/cambio',          'DollarSign',      'group.consolidation', 96, 'group.admin', 'feature_group', false)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label,
      path  = EXCLUDED.path,
      icon  = EXCLUDED.icon;
