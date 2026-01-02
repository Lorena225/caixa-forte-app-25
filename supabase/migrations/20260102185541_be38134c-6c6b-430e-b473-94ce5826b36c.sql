-- ============================================
-- CADASTRO UNIFICADO DE PARCEIROS (CLIENTE/FORNECEDOR/AMBOS)
-- Campos dinâmicos, validações contextuais e prontidão fiscal
-- ============================================

-- Adicionar novos campos à tabela counterparties
ALTER TABLE public.counterparties
  -- Flags de papel (substituem o enum 'type')
  ADD COLUMN IF NOT EXISTS is_client boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_supplier boolean NOT NULL DEFAULT false,
  
  -- Tipo de pessoa
  ADD COLUMN IF NOT EXISTS person_type text NOT NULL DEFAULT 'pj' CHECK (person_type IN ('pf', 'pj')),
  
  -- Campos PJ específicos
  ADD COLUMN IF NOT EXISTS legal_name text, -- Razão Social
  ADD COLUMN IF NOT EXISTS trade_name text, -- Nome Fantasia
  ADD COLUMN IF NOT EXISTS ie text, -- Inscrição Estadual
  ADD COLUMN IF NOT EXISTS ie_is_exempt boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS im text, -- Inscrição Municipal
  
  -- Endereço principal (cobrança/fiscal)
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  
  -- Endereço de entrega (opcional)
  ADD COLUMN IF NOT EXISTS delivery_address_street text,
  ADD COLUMN IF NOT EXISTS delivery_address_number text,
  ADD COLUMN IF NOT EXISTS delivery_address_complement text,
  ADD COLUMN IF NOT EXISTS delivery_address_neighborhood text,
  ADD COLUMN IF NOT EXISTS delivery_address_city text,
  ADD COLUMN IF NOT EXISTS delivery_address_state text,
  ADD COLUMN IF NOT EXISTS delivery_address_zip text,
  ADD COLUMN IF NOT EXISTS delivery_same_as_billing boolean DEFAULT true,
  
  -- Contatos
  ADD COLUMN IF NOT EXISTS contact_name text, -- Contato principal
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS finance_contact_name text, -- Contato financeiro
  ADD COLUMN IF NOT EXISTS finance_contact_phone text,
  ADD COLUMN IF NOT EXISTS finance_contact_email text,
  ADD COLUMN IF NOT EXISTS nf_email text, -- E-mail para recebimento de NF
  
  -- Dados bancários (fornecedor)
  ADD COLUMN IF NOT EXISTS bank_code text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_agency text,
  ADD COLUMN IF NOT EXISTS bank_agency_digit text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS bank_account_digit text,
  ADD COLUMN IF NOT EXISTS bank_account_type text CHECK (bank_account_type IS NULL OR bank_account_type IN ('corrente', 'poupanca', 'pagamento')),
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS pix_key_type text CHECK (pix_key_type IS NULL OR pix_key_type IN ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')),
  
  -- Condições comerciais
  ADD COLUMN IF NOT EXISTS payment_terms_payable integer, -- Prazo padrão para AP (dias)
  ADD COLUMN IF NOT EXISTS payment_terms_receivable integer, -- Prazo padrão para AR (dias)
  ADD COLUMN IF NOT EXISTS credit_limit numeric(18,2), -- Limite de crédito (cliente)
  
  -- Observações
  ADD COLUMN IF NOT EXISTS supplier_notes text, -- Observações de fornecedor
  ADD COLUMN IF NOT EXISTS client_notes text, -- Observações comerciais (cliente)
  
  -- Prontidão (calculados/gerenciados)
  ADD COLUMN IF NOT EXISTS fiscal_ready boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_ready boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS collection_ready boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS missing_fields_json jsonb DEFAULT '{}';

-- Validação: pelo menos um papel deve estar marcado
ALTER TABLE public.counterparties
  ADD CONSTRAINT counterparties_has_role CHECK (is_client OR is_supplier);

-- Migrar dados existentes: converter 'type' para is_client/is_supplier
UPDATE public.counterparties SET
  is_client = CASE WHEN type IN ('cliente', 'ambos') THEN true ELSE false END,
  is_supplier = CASE WHEN type IN ('fornecedor', 'ambos') THEN true ELSE false END
WHERE is_client = true AND is_supplier = false; -- default values

-- Função para calcular prontidão
CREATE OR REPLACE FUNCTION public.calculate_counterparty_readiness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_missing jsonb := '{}';
  v_fiscal_missing text[] := ARRAY[]::text[];
  v_payment_missing text[] := ARRAY[]::text[];
  v_collection_missing text[] := ARRAY[]::text[];
BEGIN
  -- Fiscal readiness
  IF NEW.person_type = 'pf' THEN
    IF NEW.document IS NULL OR NEW.document = '' THEN
      v_fiscal_missing := array_append(v_fiscal_missing, 'CPF');
    END IF;
    IF NEW.name IS NULL OR NEW.name = '' THEN
      v_fiscal_missing := array_append(v_fiscal_missing, 'Nome');
    END IF;
  ELSE -- PJ
    IF NEW.document IS NULL OR NEW.document = '' THEN
      v_fiscal_missing := array_append(v_fiscal_missing, 'CNPJ');
    END IF;
    IF NEW.legal_name IS NULL OR NEW.legal_name = '' THEN
      v_fiscal_missing := array_append(v_fiscal_missing, 'Razão Social');
    END IF;
    IF NOT COALESCE(NEW.ie_is_exempt, false) AND (NEW.ie IS NULL OR NEW.ie = '') THEN
      v_fiscal_missing := array_append(v_fiscal_missing, 'Inscrição Estadual');
    END IF;
  END IF;
  
  -- Endereço obrigatório para fiscal
  IF NEW.address_street IS NULL OR NEW.address_street = '' THEN
    v_fiscal_missing := array_append(v_fiscal_missing, 'Endereço (rua)');
  END IF;
  IF NEW.address_number IS NULL OR NEW.address_number = '' THEN
    v_fiscal_missing := array_append(v_fiscal_missing, 'Número');
  END IF;
  IF NEW.address_city IS NULL OR NEW.address_city = '' THEN
    v_fiscal_missing := array_append(v_fiscal_missing, 'Cidade');
  END IF;
  IF NEW.address_state IS NULL OR NEW.address_state = '' THEN
    v_fiscal_missing := array_append(v_fiscal_missing, 'UF');
  END IF;
  IF NEW.address_zip IS NULL OR NEW.address_zip = '' THEN
    v_fiscal_missing := array_append(v_fiscal_missing, 'CEP');
  END IF;
  
  NEW.fiscal_ready := (array_length(v_fiscal_missing, 1) IS NULL);
  
  -- Payment readiness (apenas para fornecedores)
  IF NEW.is_supplier THEN
    -- Precisa ter dados bancários OU chave pix
    IF (NEW.bank_code IS NULL OR NEW.bank_code = '' OR 
        NEW.bank_agency IS NULL OR NEW.bank_agency = '' OR
        NEW.bank_account IS NULL OR NEW.bank_account = '') AND
       (NEW.pix_key IS NULL OR NEW.pix_key = '') THEN
      v_payment_missing := array_append(v_payment_missing, 'Dados bancários ou Chave PIX');
    END IF;
  END IF;
  
  NEW.payment_ready := (array_length(v_payment_missing, 1) IS NULL);
  
  -- Collection readiness (apenas para clientes)
  IF NEW.is_client THEN
    IF (NEW.phone IS NULL OR NEW.phone = '') AND 
       (NEW.email IS NULL OR NEW.email = '') AND
       (NEW.contact_phone IS NULL OR NEW.contact_phone = '') AND
       (NEW.contact_email IS NULL OR NEW.contact_email = '') THEN
      v_collection_missing := array_append(v_collection_missing, 'Telefone ou E-mail para cobrança');
    END IF;
  END IF;
  
  NEW.collection_ready := (array_length(v_collection_missing, 1) IS NULL);
  
  -- Montar JSON de campos faltantes
  v_missing := jsonb_build_object(
    'fiscal', v_fiscal_missing,
    'payment', v_payment_missing,
    'collection', v_collection_missing
  );
  NEW.missing_fields_json := v_missing;
  
  RETURN NEW;
END;
$$;

-- Trigger para calcular prontidão automaticamente
DROP TRIGGER IF EXISTS trg_calculate_counterparty_readiness ON public.counterparties;
CREATE TRIGGER trg_calculate_counterparty_readiness
  BEFORE INSERT OR UPDATE ON public.counterparties
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_counterparty_readiness();

-- Atualizar registros existentes para calcular prontidão
UPDATE public.counterparties SET updated_at = now();

-- Índices para filtragem eficiente
CREATE INDEX IF NOT EXISTS idx_counterparties_is_client ON public.counterparties (company_id, is_client) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_counterparties_is_supplier ON public.counterparties (company_id, is_supplier) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_counterparties_document ON public.counterparties (company_id, document) WHERE document IS NOT NULL;