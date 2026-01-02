-- ==========================================
-- 1. ENUMS para accounts
-- ==========================================
CREATE TYPE public.contra_mode AS ENUM ('reduce_parent', 'reduce_classification');
CREATE TYPE public.normal_balance AS ENUM ('debit', 'credit');
CREATE TYPE public.posting_policy AS ENUM ('leaf_only', 'allows_posting_flag', 'leaf_or_flag');
CREATE TYPE public.doc_group AS ENUM ('fiscal', 'financeiro', 'comprovante', 'contrato', 'titulo', 'movimento', 'ajuste', 'outros');

-- ==========================================
-- 2. ATUALIZAR tabela accounts
-- ==========================================
-- Renomear code para account_code se necessário (preservar compatibilidade)
ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS account_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS account_name TEXT,
  ADD COLUMN IF NOT EXISTS allows_posting BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS posting_block_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_contra_account BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS contra_mode public.contra_mode DEFAULT 'reduce_parent',
  ADD COLUMN IF NOT EXISTS contra_target_account_id UUID REFERENCES public.accounts(id),
  ADD COLUMN IF NOT EXISTS financial_classification_code VARCHAR(60),
  ADD COLUMN IF NOT EXISTS financial_classification_reducer BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS normal_balance public.normal_balance;

-- Migrar dados existentes
UPDATE public.accounts SET 
  account_code = COALESCE(account_code, LEFT(code, 30)),
  account_name = COALESCE(account_name, name)
WHERE account_code IS NULL OR account_name IS NULL;

-- Adicionar constraints
ALTER TABLE public.accounts 
  ALTER COLUMN account_code SET NOT NULL,
  ALTER COLUMN account_name SET NOT NULL;

-- Constraint de tamanho máximo
ALTER TABLE public.accounts 
  ADD CONSTRAINT accounts_code_max_length CHECK (char_length(account_code) <= 30);

-- Unique constraint case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS accounts_company_code_unique 
  ON public.accounts (company_id, LOWER(account_code));

-- Índices adicionais
CREATE INDEX IF NOT EXISTS idx_accounts_company_parent ON public.accounts(company_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_company_allows_posting ON public.accounts(company_id, allows_posting);
CREATE INDEX IF NOT EXISTS idx_accounts_company_fin_class ON public.accounts(company_id, financial_classification_code);

-- ==========================================
-- 3. TABELA chart_of_accounts_settings
-- ==========================================
CREATE TABLE IF NOT EXISTS public.chart_of_accounts_settings (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  posting_policy public.posting_policy DEFAULT 'leaf_or_flag',
  max_code_length INT DEFAULT 30,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chart_of_accounts_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company settings" ON public.chart_of_accounts_settings
  FOR SELECT USING (public.user_has_company_access(company_id));

CREATE POLICY "Admins can manage settings" ON public.chart_of_accounts_settings
  FOR ALL USING (public.user_can_write(company_id));

-- ==========================================
-- 4. TABELA document_types
-- ==========================================
CREATE TABLE IF NOT EXISTS public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_code VARCHAR(50) NOT NULL,
  doc_name TEXT NOT NULL,
  doc_group public.doc_group NOT NULL DEFAULT 'outros',
  requires_number BOOLEAN DEFAULT FALSE,
  number_label TEXT DEFAULT 'Número do documento',
  requires_counterparty BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT document_types_unique_code UNIQUE (company_id, doc_code)
);

-- Permitir doc_code global (company_id NULL)
ALTER TABLE public.document_types 
  DROP CONSTRAINT IF EXISTS document_types_unique_code;
CREATE UNIQUE INDEX document_types_code_unique 
  ON public.document_types (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(doc_code));

CREATE INDEX idx_document_types_company ON public.document_types(company_id);
CREATE INDEX idx_document_types_group ON public.document_types(doc_group);

ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document types" ON public.document_types
  FOR SELECT USING (company_id IS NULL OR public.user_has_company_access(company_id));

CREATE POLICY "Admins can manage company document types" ON public.document_types
  FOR ALL USING (company_id IS NOT NULL AND public.user_can_write(company_id));

-- ==========================================
-- 5. TABELA documents
-- ==========================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_type_id UUID NOT NULL REFERENCES public.document_types(id),
  document_number VARCHAR(80),
  document_series VARCHAR(20),
  issue_date DATE,
  counterparty_id UUID REFERENCES public.counterparties(id),
  amount NUMERIC(18,2),
  notes TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_company ON public.documents(company_id);
CREATE INDEX idx_documents_type ON public.documents(document_type_id);
CREATE INDEX idx_documents_number ON public.documents(company_id, document_number);
CREATE INDEX idx_documents_counterparty ON public.documents(counterparty_id);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company documents" ON public.documents
  FOR SELECT USING (public.user_has_company_access(company_id));

CREATE POLICY "Users with write access can manage documents" ON public.documents
  FOR ALL USING (public.user_can_write(company_id));

-- ==========================================
-- 6. ATUALIZAR transactions com campos de documento
-- ==========================================
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS document_type_id UUID REFERENCES public.document_types(id),
  ADD COLUMN IF NOT EXISTS document_number VARCHAR(80),
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id);

-- ==========================================
-- 7. FUNÇÃO de validação de lançamento em conta
-- ==========================================
CREATE OR REPLACE FUNCTION public.validate_account_posting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_account RECORD;
  v_settings RECORD;
  v_has_children BOOLEAN;
BEGIN
  -- Buscar conta
  SELECT * INTO v_account FROM accounts WHERE id = NEW.account_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta não encontrada';
  END IF;
  
  -- Verificar conta ativa
  IF NOT COALESCE(v_account.is_active, true) THEN
    RAISE EXCEPTION 'Conta "%" está inativa e não aceita lançamentos', v_account.account_name;
  END IF;
  
  -- Verificar allows_posting
  IF NOT COALESCE(v_account.allows_posting, true) THEN
    RAISE EXCEPTION 'Conta "%" não permite lançamentos. %', 
      v_account.account_name, 
      COALESCE(v_account.posting_block_reason, 'Selecione uma conta analítica.');
  END IF;
  
  -- Buscar configurações
  SELECT * INTO v_settings FROM chart_of_accounts_settings WHERE company_id = v_account.company_id;
  
  -- Verificar política leaf_only
  IF v_settings.posting_policy IN ('leaf_only', 'leaf_or_flag') THEN
    SELECT EXISTS(SELECT 1 FROM accounts WHERE parent_id = v_account.id LIMIT 1) INTO v_has_children;
    
    IF v_has_children AND v_settings.posting_policy = 'leaf_only' THEN
      RAISE EXCEPTION 'Conta "%" possui contas filhas. Selecione uma conta analítica (folha).', v_account.account_name;
    END IF;
    
    IF v_has_children AND v_settings.posting_policy = 'leaf_or_flag' AND NOT COALESCE(v_account.allows_posting, true) THEN
      RAISE EXCEPTION 'Conta "%" possui filhas e não está habilitada para lançamentos.', v_account.account_name;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger na transactions
DROP TRIGGER IF EXISTS trg_validate_account_posting ON public.transactions;
CREATE TRIGGER trg_validate_account_posting
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  WHEN (NEW.account_id IS NOT NULL)
  EXECUTE FUNCTION public.validate_account_posting();

-- ==========================================
-- 8. FUNÇÃO para validar conta redutora
-- ==========================================
CREATE OR REPLACE FUNCTION public.validate_contra_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se é conta redutora, validar configuração
  IF NEW.is_contra_account = TRUE THEN
    -- Se modo é reduce_classification, exigir alvo
    IF NEW.contra_mode = 'reduce_classification' THEN
      IF NEW.contra_target_account_id IS NULL AND (NEW.financial_classification_code IS NULL OR NEW.financial_classification_code = '') THEN
        RAISE EXCEPTION 'Conta redutora com modo "reduce_classification" requer alvo (contra_target_account_id ou financial_classification_code)';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_contra_account ON public.accounts;
CREATE TRIGGER trg_validate_contra_account
  BEFORE INSERT OR UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_contra_account();

-- ==========================================
-- 9. AUDITORIA para campos críticos
-- ==========================================
CREATE OR REPLACE FUNCTION public.audit_account_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_changes JSONB := '{}';
BEGIN
  -- Comparar campos críticos
  IF OLD.allows_posting IS DISTINCT FROM NEW.allows_posting THEN
    v_changes := v_changes || jsonb_build_object('allows_posting', jsonb_build_object('old', OLD.allows_posting, 'new', NEW.allows_posting));
  END IF;
  
  IF OLD.is_contra_account IS DISTINCT FROM NEW.is_contra_account THEN
    v_changes := v_changes || jsonb_build_object('is_contra_account', jsonb_build_object('old', OLD.is_contra_account, 'new', NEW.is_contra_account));
  END IF;
  
  IF OLD.contra_mode IS DISTINCT FROM NEW.contra_mode THEN
    v_changes := v_changes || jsonb_build_object('contra_mode', jsonb_build_object('old', OLD.contra_mode, 'new', NEW.contra_mode));
  END IF;
  
  IF OLD.financial_classification_code IS DISTINCT FROM NEW.financial_classification_code THEN
    v_changes := v_changes || jsonb_build_object('financial_classification_code', jsonb_build_object('old', OLD.financial_classification_code, 'new', NEW.financial_classification_code));
  END IF;
  
  IF OLD.financial_classification_reducer IS DISTINCT FROM NEW.financial_classification_reducer THEN
    v_changes := v_changes || jsonb_build_object('financial_classification_reducer', jsonb_build_object('old', OLD.financial_classification_reducer, 'new', NEW.financial_classification_reducer));
  END IF;
  
  -- Logar se houve mudanças críticas
  IF v_changes != '{}' THEN
    INSERT INTO audit_logs (company_id, table_name, record_id, action, old_data, new_data, user_id)
    VALUES (NEW.company_id, 'accounts', NEW.id, 'UPDATE', v_changes, v_changes, auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_account_changes ON public.accounts;
CREATE TRIGGER trg_audit_account_changes
  AFTER UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_account_changes();