-- Enum para tipos de integração
CREATE TYPE integration_provider AS ENUM (
  'ofx', 'csv', 'stripe', 'mercadopago', 'asaas', 'pagarme', 'omie', 'tiny', 'bling', 'openfinance', 'other'
);

CREATE TYPE integration_auth_type AS ENUM (
  'file', 'oauth', 'api_key', 'webhook'
);

CREATE TYPE integration_status AS ENUM (
  'disconnected', 'connected', 'error', 'disabled'
);

CREATE TYPE import_batch_status AS ENUM (
  'processing', 'success', 'partial', 'error'
);

CREATE TYPE import_source_type AS ENUM (
  'manual_upload', 'scheduled_sync', 'webhook'
);

CREATE TYPE match_type AS ENUM (
  'exact', 'fuzzy', 'manual'
);

CREATE TYPE reconciliation_action AS ENUM (
  'mark_paid', 'create', 'ignore', 'pending'
);

-- Tabela principal de integrações
CREATE TABLE public.integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  name TEXT NOT NULL,
  status integration_status NOT NULL DEFAULT 'disconnected',
  auth_type integration_auth_type NOT NULL DEFAULT 'file',
  credentials_encrypted TEXT,
  settings_json JSONB DEFAULT '{}',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT,
  sync_interval_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Mapeamento de contas externas para carteiras internas
CREATE TABLE public.integration_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  external_account_id TEXT NOT NULL,
  external_account_name TEXT,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  currency TEXT DEFAULT 'BRL',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(integration_id, external_account_id)
);

-- Batches de importação
CREATE TABLE public.import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  source_type import_source_type NOT NULL DEFAULT 'manual_upload',
  source_filename TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  status import_batch_status NOT NULL DEFAULT 'processing',
  summary_json JSONB DEFAULT '{"imported": 0, "reconciled": 0, "created": 0, "duplicates": 0, "errors": 0}',
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Transações importadas (espelho do extrato)
CREATE TABLE public.imported_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  external_id TEXT,
  external_hash TEXT NOT NULL,
  external_account_id TEXT,
  posted_at DATE NOT NULL,
  amount NUMERIC NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  description_raw TEXT,
  counterparty_raw TEXT,
  fit_id TEXT,
  raw_json JSONB,
  duplicate_of_id UUID REFERENCES public.imported_transactions(id),
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Matches de conciliação
CREATE TABLE public.reconciliation_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  imported_transaction_id UUID NOT NULL REFERENCES public.imported_transactions(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  match_type match_type NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  rules_applied_json JSONB DEFAULT '[]',
  action_taken reconciliation_action NOT NULL DEFAULT 'pending',
  approved_by_user_id UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Regras de categorização automática
CREATE TABLE public.categorization_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  conditions_json JSONB NOT NULL DEFAULT '{}',
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  counterparty_id UUID REFERENCES public.counterparties(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Eventos de webhook
CREATE TABLE public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  provider_event_id TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  payload_json JSONB,
  processed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chaves de idempotência
CREATE TABLE public.idempotency_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  scope TEXT NOT NULL,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, key, scope)
);

-- Índices para performance
CREATE INDEX idx_integrations_company ON public.integrations(company_id);
CREATE INDEX idx_integration_accounts_integration ON public.integration_accounts(integration_id);
CREATE INDEX idx_import_batches_integration ON public.import_batches(integration_id);
CREATE INDEX idx_imported_transactions_batch ON public.imported_transactions(batch_id);
CREATE INDEX idx_imported_transactions_hash ON public.imported_transactions(external_hash);
CREATE INDEX idx_imported_transactions_processed ON public.imported_transactions(processed);
CREATE INDEX idx_reconciliation_matches_imported ON public.reconciliation_matches(imported_transaction_id);
CREATE INDEX idx_reconciliation_matches_action ON public.reconciliation_matches(action_taken);
CREATE INDEX idx_categorization_rules_company ON public.categorization_rules(company_id);

-- Enable RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies para integrations
CREATE POLICY "Usuários podem ver integrações" ON public.integrations
FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar integrações" ON public.integrations
FOR INSERT WITH CHECK (user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar integrações" ON public.integrations
FOR UPDATE USING (user_can_write(company_id));

CREATE POLICY "Admins podem deletar integrações" ON public.integrations
FOR DELETE USING (get_user_role(company_id) = 'admin');

-- RLS Policies para integration_accounts
CREATE POLICY "Usuários podem ver mapeamentos" ON public.integration_accounts
FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar mapeamentos" ON public.integration_accounts
FOR INSERT WITH CHECK (user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar mapeamentos" ON public.integration_accounts
FOR UPDATE USING (user_can_write(company_id));

CREATE POLICY "Admins podem deletar mapeamentos" ON public.integration_accounts
FOR DELETE USING (get_user_role(company_id) = 'admin');

-- RLS Policies para import_batches
CREATE POLICY "Usuários podem ver batches" ON public.import_batches
FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar batches" ON public.import_batches
FOR INSERT WITH CHECK (user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar batches" ON public.import_batches
FOR UPDATE USING (user_can_write(company_id));

CREATE POLICY "Admins podem deletar batches" ON public.import_batches
FOR DELETE USING (get_user_role(company_id) = 'admin');

-- RLS Policies para imported_transactions
CREATE POLICY "Usuários podem ver transações importadas" ON public.imported_transactions
FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar transações importadas" ON public.imported_transactions
FOR INSERT WITH CHECK (user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar transações importadas" ON public.imported_transactions
FOR UPDATE USING (user_can_write(company_id));

CREATE POLICY "Admins podem deletar transações importadas" ON public.imported_transactions
FOR DELETE USING (get_user_role(company_id) = 'admin');

-- RLS Policies para reconciliation_matches
CREATE POLICY "Usuários podem ver matches" ON public.reconciliation_matches
FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar matches" ON public.reconciliation_matches
FOR INSERT WITH CHECK (user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar matches" ON public.reconciliation_matches
FOR UPDATE USING (user_can_write(company_id));

CREATE POLICY "Admins podem deletar matches" ON public.reconciliation_matches
FOR DELETE USING (get_user_role(company_id) = 'admin');

-- RLS Policies para categorization_rules
CREATE POLICY "Usuários podem ver regras" ON public.categorization_rules
FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar regras" ON public.categorization_rules
FOR INSERT WITH CHECK (user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar regras" ON public.categorization_rules
FOR UPDATE USING (user_can_write(company_id));

CREATE POLICY "Admins podem deletar regras" ON public.categorization_rules
FOR DELETE USING (get_user_role(company_id) = 'admin');

-- RLS Policies para webhook_events
CREATE POLICY "Usuários podem ver eventos" ON public.webhook_events
FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Sistema pode inserir eventos" ON public.webhook_events
FOR INSERT WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Gestores podem atualizar eventos" ON public.webhook_events
FOR UPDATE USING (user_can_write(company_id));

-- RLS Policies para idempotency_keys
CREATE POLICY "Usuários podem ver chaves" ON public.idempotency_keys
FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar chaves" ON public.idempotency_keys
FOR INSERT WITH CHECK (user_can_write(company_id));

-- Triggers para updated_at
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_integration_accounts_updated_at BEFORE UPDATE ON public.integration_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_import_batches_updated_at BEFORE UPDATE ON public.import_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_imported_transactions_updated_at BEFORE UPDATE ON public.imported_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_reconciliation_matches_updated_at BEFORE UPDATE ON public.reconciliation_matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_categorization_rules_updated_at BEFORE UPDATE ON public.categorization_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();