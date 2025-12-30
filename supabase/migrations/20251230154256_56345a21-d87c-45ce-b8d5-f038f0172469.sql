-- =====================================================
-- SISTEMA GERENCIAL FINANCEIRO - MIGRAÇÃO COMPLETA
-- =====================================================

-- Criar enum para roles de usuário
CREATE TYPE public.user_role AS ENUM ('admin', 'gestor', 'visualizador');

-- Criar enum para tipo de conta
CREATE TYPE public.account_category AS ENUM ('ativo', 'passivo', 'patrimonio_liquido', 'receita', 'custo', 'despesa');

-- Criar enum para direção da transação
CREATE TYPE public.transaction_direction AS ENUM ('entrada', 'saida');

-- Criar enum para status da transação
CREATE TYPE public.transaction_status AS ENUM ('rascunho', 'lancado', 'pago', 'cancelado');

-- Criar enum para tipo de carteira
CREATE TYPE public.wallet_type AS ENUM ('caixa', 'banco', 'cartao');

-- Criar enum para tipo de contraparte
CREATE TYPE public.counterparty_type AS ENUM ('cliente', 'fornecedor', 'ambos');

-- =====================================================
-- TABELA: companies (Empresas)
-- =====================================================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TABELA: profiles (Perfis de usuário)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TABELA: company_users (Usuários por empresa)
-- =====================================================
CREATE TABLE public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'visualizador',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TABELA: accounts (Plano de Contas)
-- =====================================================
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category_type account_category NOT NULL,
  is_managerial BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Índice para hierarquia
CREATE INDEX idx_accounts_parent ON public.accounts(parent_id);
CREATE INDEX idx_accounts_company ON public.accounts(company_id);

-- =====================================================
-- TABELA: cost_centers (Centros de Custo)
-- =====================================================
CREATE TABLE public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);

ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_cost_centers_company ON public.cost_centers(company_id);

-- =====================================================
-- TABELA: counterparties (Clientes/Fornecedores)
-- =====================================================
CREATE TABLE public.counterparties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type counterparty_type NOT NULL DEFAULT 'ambos',
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.counterparties ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_counterparties_company ON public.counterparties(company_id);
CREATE INDEX idx_counterparties_type ON public.counterparties(company_id, type);

-- =====================================================
-- TABELA: payment_methods (Formas de Pagamento)
-- =====================================================
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_payment_methods_company ON public.payment_methods(company_id);

-- =====================================================
-- TABELA: wallets (Contas/Cartões)
-- =====================================================
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type wallet_type NOT NULL DEFAULT 'banco',
  opening_balance DECIMAL(15,2) DEFAULT 0,
  closing_day INTEGER,
  due_day INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_wallets_company ON public.wallets(company_id);

-- =====================================================
-- TABELA: transactions (Lançamentos)
-- =====================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  direction transaction_direction NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  counterparty_id UUID REFERENCES public.counterparties(id),
  payment_method_id UUID REFERENCES public.payment_methods(id),
  description TEXT NOT NULL,
  original_amount DECIMAL(15,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  interest_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  status transaction_status NOT NULL DEFAULT 'lancado',
  is_recurring BOOLEAN DEFAULT false,
  recurrence_type TEXT,
  notes TEXT,
  installment_plan_id UUID,
  installment_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Índices principais para performance
CREATE INDEX idx_transactions_company_date ON public.transactions(company_id, transaction_date);
CREATE INDEX idx_transactions_company_due ON public.transactions(company_id, due_date);
CREATE INDEX idx_transactions_company_paid ON public.transactions(company_id, paid_date);
CREATE INDEX idx_transactions_company_account ON public.transactions(company_id, account_id);
CREATE INDEX idx_transactions_status ON public.transactions(company_id, status);
CREATE INDEX idx_transactions_direction ON public.transactions(company_id, direction);

-- =====================================================
-- TABELA: installment_plans (Parcelamentos)
-- =====================================================
CREATE TABLE public.installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  counterparty_id UUID REFERENCES public.counterparties(id),
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  description TEXT NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  installments INTEGER NOT NULL,
  first_due_date DATE NOT NULL,
  direction transaction_direction NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_installment_plans_company ON public.installment_plans(company_id);

-- Adicionar foreign key de installment_plan_id em transactions
ALTER TABLE public.transactions 
ADD CONSTRAINT fk_transactions_installment_plan 
FOREIGN KEY (installment_plan_id) REFERENCES public.installment_plans(id) ON DELETE SET NULL;

-- =====================================================
-- TABELA: budgets (Metas/Orçamento)
-- =====================================================
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  target_revenue DECIMAL(15,2) DEFAULT 0,
  target_expense DECIMAL(15,2) DEFAULT 0,
  target_profit DECIMAL(15,2) DEFAULT 0,
  target_margin DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, year, month)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_budgets_company_year ON public.budgets(company_id, year);

-- =====================================================
-- TABELA: audit_logs (Logs de auditoria)
-- =====================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_logs_company ON public.audit_logs(company_id);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);

-- =====================================================
-- FUNÇÃO: Verificar se usuário tem acesso à empresa
-- =====================================================
CREATE OR REPLACE FUNCTION public.user_has_company_access(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_id = p_company_id
    AND user_id = auth.uid()
  )
$$;

-- =====================================================
-- FUNÇÃO: Obter role do usuário na empresa
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_role(p_company_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.company_users
  WHERE company_id = p_company_id
  AND user_id = auth.uid()
  LIMIT 1
$$;

-- =====================================================
-- FUNÇÃO: Verificar se usuário é admin ou gestor
-- =====================================================
CREATE OR REPLACE FUNCTION public.user_can_write(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_id = p_company_id
    AND user_id = auth.uid()
    AND role IN ('admin', 'gestor')
  )
$$;

-- =====================================================
-- RLS POLICIES: profiles
-- =====================================================
CREATE POLICY "Usuários podem ver próprio perfil"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Usuários podem atualizar próprio perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Usuários podem inserir próprio perfil"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- =====================================================
-- RLS POLICIES: companies
-- =====================================================
CREATE POLICY "Usuários podem ver empresas que pertencem"
ON public.companies FOR SELECT
TO authenticated
USING (public.user_has_company_access(id));

CREATE POLICY "Admins podem criar empresas"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins podem atualizar empresas"
ON public.companies FOR UPDATE
TO authenticated
USING (public.get_user_role(id) = 'admin');

-- =====================================================
-- RLS POLICIES: company_users
-- =====================================================
CREATE POLICY "Usuários podem ver membros da empresa"
ON public.company_users FOR SELECT
TO authenticated
USING (public.user_has_company_access(company_id));

CREATE POLICY "Admins podem gerenciar membros"
ON public.company_users FOR INSERT
TO authenticated
WITH CHECK (public.get_user_role(company_id) = 'admin' OR user_id = auth.uid());

CREATE POLICY "Admins podem atualizar membros"
ON public.company_users FOR UPDATE
TO authenticated
USING (public.get_user_role(company_id) = 'admin');

CREATE POLICY "Admins podem remover membros"
ON public.company_users FOR DELETE
TO authenticated
USING (public.get_user_role(company_id) = 'admin');

-- =====================================================
-- RLS POLICIES: accounts
-- =====================================================
CREATE POLICY "Usuários podem ver plano de contas"
ON public.accounts FOR SELECT
TO authenticated
USING (public.user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar contas"
ON public.accounts FOR INSERT
TO authenticated
WITH CHECK (public.user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar contas"
ON public.accounts FOR UPDATE
TO authenticated
USING (public.user_can_write(company_id));

CREATE POLICY "Admins podem deletar contas"
ON public.accounts FOR DELETE
TO authenticated
USING (public.get_user_role(company_id) = 'admin');

-- =====================================================
-- RLS POLICIES: cost_centers
-- =====================================================
CREATE POLICY "Usuários podem ver centros de custo"
ON public.cost_centers FOR SELECT
TO authenticated
USING (public.user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar centros de custo"
ON public.cost_centers FOR INSERT
TO authenticated
WITH CHECK (public.user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar centros de custo"
ON public.cost_centers FOR UPDATE
TO authenticated
USING (public.user_can_write(company_id));

CREATE POLICY "Admins podem deletar centros de custo"
ON public.cost_centers FOR DELETE
TO authenticated
USING (public.get_user_role(company_id) = 'admin');

-- =====================================================
-- RLS POLICIES: counterparties
-- =====================================================
CREATE POLICY "Usuários podem ver clientes/fornecedores"
ON public.counterparties FOR SELECT
TO authenticated
USING (public.user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar clientes/fornecedores"
ON public.counterparties FOR INSERT
TO authenticated
WITH CHECK (public.user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar clientes/fornecedores"
ON public.counterparties FOR UPDATE
TO authenticated
USING (public.user_can_write(company_id));

CREATE POLICY "Admins podem deletar clientes/fornecedores"
ON public.counterparties FOR DELETE
TO authenticated
USING (public.get_user_role(company_id) = 'admin');

-- =====================================================
-- RLS POLICIES: payment_methods
-- =====================================================
CREATE POLICY "Usuários podem ver formas de pagamento"
ON public.payment_methods FOR SELECT
TO authenticated
USING (public.user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar formas de pagamento"
ON public.payment_methods FOR INSERT
TO authenticated
WITH CHECK (public.user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar formas de pagamento"
ON public.payment_methods FOR UPDATE
TO authenticated
USING (public.user_can_write(company_id));

CREATE POLICY "Admins podem deletar formas de pagamento"
ON public.payment_methods FOR DELETE
TO authenticated
USING (public.get_user_role(company_id) = 'admin');

-- =====================================================
-- RLS POLICIES: wallets
-- =====================================================
CREATE POLICY "Usuários podem ver carteiras"
ON public.wallets FOR SELECT
TO authenticated
USING (public.user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar carteiras"
ON public.wallets FOR INSERT
TO authenticated
WITH CHECK (public.user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar carteiras"
ON public.wallets FOR UPDATE
TO authenticated
USING (public.user_can_write(company_id));

CREATE POLICY "Admins podem deletar carteiras"
ON public.wallets FOR DELETE
TO authenticated
USING (public.get_user_role(company_id) = 'admin');

-- =====================================================
-- RLS POLICIES: transactions
-- =====================================================
CREATE POLICY "Usuários podem ver transações"
ON public.transactions FOR SELECT
TO authenticated
USING (public.user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar transações"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (public.user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar transações"
ON public.transactions FOR UPDATE
TO authenticated
USING (public.user_can_write(company_id));

CREATE POLICY "Admins podem deletar transações"
ON public.transactions FOR DELETE
TO authenticated
USING (public.get_user_role(company_id) = 'admin');

-- =====================================================
-- RLS POLICIES: installment_plans
-- =====================================================
CREATE POLICY "Usuários podem ver parcelamentos"
ON public.installment_plans FOR SELECT
TO authenticated
USING (public.user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar parcelamentos"
ON public.installment_plans FOR INSERT
TO authenticated
WITH CHECK (public.user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar parcelamentos"
ON public.installment_plans FOR UPDATE
TO authenticated
USING (public.user_can_write(company_id));

CREATE POLICY "Admins podem deletar parcelamentos"
ON public.installment_plans FOR DELETE
TO authenticated
USING (public.get_user_role(company_id) = 'admin');

-- =====================================================
-- RLS POLICIES: budgets
-- =====================================================
CREATE POLICY "Usuários podem ver metas"
ON public.budgets FOR SELECT
TO authenticated
USING (public.user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar metas"
ON public.budgets FOR INSERT
TO authenticated
WITH CHECK (public.user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar metas"
ON public.budgets FOR UPDATE
TO authenticated
USING (public.user_can_write(company_id));

CREATE POLICY "Admins podem deletar metas"
ON public.budgets FOR DELETE
TO authenticated
USING (public.get_user_role(company_id) = 'admin');

-- =====================================================
-- RLS POLICIES: audit_logs
-- =====================================================
CREATE POLICY "Admins podem ver logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.get_user_role(company_id) = 'admin');

CREATE POLICY "Sistema pode inserir logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (public.user_has_company_access(company_id));

-- =====================================================
-- TRIGGER: Criar perfil ao cadastrar usuário
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- TRIGGER: Atualizar updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_company_users_updated_at BEFORE UPDATE ON public.company_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON public.cost_centers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_counterparties_updated_at BEFORE UPDATE ON public.counterparties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_installment_plans_updated_at BEFORE UPDATE ON public.installment_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- VIEW: Fluxo de Caixa Mensal
-- =====================================================
CREATE OR REPLACE VIEW public.v_cashflow_monthly AS
SELECT 
  t.company_id,
  EXTRACT(YEAR FROM COALESCE(t.paid_date, t.due_date))::INTEGER as year,
  EXTRACT(MONTH FROM COALESCE(t.paid_date, t.due_date))::INTEGER as month,
  SUM(CASE WHEN t.direction = 'entrada' AND t.status = 'pago' THEN t.total_amount ELSE 0 END) as entradas_pagas,
  SUM(CASE WHEN t.direction = 'saida' AND t.status = 'pago' THEN t.total_amount ELSE 0 END) as saidas_pagas,
  SUM(CASE WHEN t.direction = 'entrada' AND t.status = 'pago' THEN t.total_amount ELSE 0 END) -
  SUM(CASE WHEN t.direction = 'saida' AND t.status = 'pago' THEN t.total_amount ELSE 0 END) as resultado,
  SUM(CASE WHEN t.direction = 'entrada' AND t.status != 'pago' AND t.status != 'cancelado' THEN t.total_amount ELSE 0 END) as entradas_previstas,
  SUM(CASE WHEN t.direction = 'saida' AND t.status != 'pago' AND t.status != 'cancelado' THEN t.total_amount ELSE 0 END) as saidas_previstas
FROM public.transactions t
WHERE t.status != 'cancelado'
GROUP BY t.company_id, year, month
ORDER BY year, month;

-- =====================================================
-- VIEW: Contas a Receber em Aberto
-- =====================================================
CREATE OR REPLACE VIEW public.v_ar_open AS
SELECT 
  t.*,
  a.name as account_name,
  a.code as account_code,
  w.name as wallet_name,
  c.name as counterparty_name,
  cc.name as cost_center_name,
  CASE 
    WHEN t.due_date < CURRENT_DATE AND t.status != 'pago' THEN true 
    ELSE false 
  END as is_overdue,
  CASE 
    WHEN t.due_date < CURRENT_DATE AND t.status != 'pago' 
    THEN CURRENT_DATE - t.due_date 
    ELSE 0 
  END as days_late
FROM public.transactions t
LEFT JOIN public.accounts a ON t.account_id = a.id
LEFT JOIN public.wallets w ON t.wallet_id = w.id
LEFT JOIN public.counterparties c ON t.counterparty_id = c.id
LEFT JOIN public.cost_centers cc ON t.cost_center_id = cc.id
WHERE t.direction = 'entrada' 
  AND t.status IN ('lancado', 'rascunho')
ORDER BY t.due_date;

-- =====================================================
-- VIEW: Contas a Pagar em Aberto
-- =====================================================
CREATE OR REPLACE VIEW public.v_ap_open AS
SELECT 
  t.*,
  a.name as account_name,
  a.code as account_code,
  w.name as wallet_name,
  c.name as counterparty_name,
  cc.name as cost_center_name,
  CASE 
    WHEN t.due_date < CURRENT_DATE AND t.status != 'pago' THEN true 
    ELSE false 
  END as is_overdue,
  CASE 
    WHEN t.due_date < CURRENT_DATE AND t.status != 'pago' 
    THEN CURRENT_DATE - t.due_date 
    ELSE 0 
  END as days_late
FROM public.transactions t
LEFT JOIN public.accounts a ON t.account_id = a.id
LEFT JOIN public.wallets w ON t.wallet_id = w.id
LEFT JOIN public.counterparties c ON t.counterparty_id = c.id
LEFT JOIN public.cost_centers cc ON t.cost_center_id = cc.id
WHERE t.direction = 'saida' 
  AND t.status IN ('lancado', 'rascunho')
ORDER BY t.due_date;

-- =====================================================
-- VIEW: DRE Mensal
-- =====================================================
CREATE OR REPLACE VIEW public.v_dre_monthly AS
SELECT 
  t.company_id,
  EXTRACT(YEAR FROM COALESCE(t.paid_date, t.due_date))::INTEGER as year,
  EXTRACT(MONTH FROM COALESCE(t.paid_date, t.due_date))::INTEGER as month,
  a.category_type,
  a.code as account_code,
  a.name as account_name,
  SUM(t.total_amount) as total
FROM public.transactions t
JOIN public.accounts a ON t.account_id = a.id
WHERE t.status = 'pago'
GROUP BY t.company_id, year, month, a.category_type, a.code, a.name
ORDER BY year, month, a.code;

-- =====================================================
-- VIEW: Indicadores RC Mensal
-- =====================================================
CREATE OR REPLACE VIEW public.v_rc_indicators_monthly AS
SELECT 
  company_id,
  year,
  month,
  entradas_pagas as receita_realizada,
  saidas_pagas as despesa_realizada,
  resultado as lucro_prejuizo,
  CASE 
    WHEN entradas_pagas > 0 
    THEN ROUND((resultado / entradas_pagas * 100)::numeric, 2)
    ELSE 0 
  END as lucratividade,
  entradas_previstas as receita_prevista,
  saidas_previstas as despesa_prevista
FROM public.v_cashflow_monthly;

-- =====================================================
-- VIEW: RC_FLUXO por Conta
-- =====================================================
CREATE OR REPLACE VIEW public.v_rc_flow_by_account AS
SELECT 
  t.company_id,
  EXTRACT(YEAR FROM COALESCE(t.paid_date, t.due_date))::INTEGER as year,
  EXTRACT(MONTH FROM COALESCE(t.paid_date, t.due_date))::INTEGER as month,
  a.id as account_id,
  a.code as account_code,
  a.name as account_name,
  a.category_type,
  t.direction,
  SUM(CASE WHEN t.status = 'pago' THEN t.total_amount ELSE 0 END) as valor_pago,
  SUM(CASE WHEN t.status != 'pago' AND t.status != 'cancelado' THEN t.total_amount ELSE 0 END) as valor_previsto
FROM public.transactions t
JOIN public.accounts a ON t.account_id = a.id
WHERE t.status != 'cancelado'
GROUP BY t.company_id, year, month, a.id, a.code, a.name, a.category_type, t.direction
ORDER BY year, month, a.code;