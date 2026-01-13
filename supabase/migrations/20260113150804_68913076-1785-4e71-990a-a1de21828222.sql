-- Adicionar coluna agency_number e agency_digit na tabela company_bank_accounts
ALTER TABLE public.company_bank_accounts 
ADD COLUMN IF NOT EXISTS agency_number VARCHAR(10),
ADD COLUMN IF NOT EXISTS agency_digit VARCHAR(2);

-- Atualizar registros existentes com valor padrão para agency_number (para não quebrar dados existentes)
UPDATE public.company_bank_accounts 
SET agency_number = '0001' 
WHERE agency_number IS NULL;

-- Agora tornar agency_number NOT NULL
ALTER TABLE public.company_bank_accounts 
ALTER COLUMN agency_number SET NOT NULL;

-- Criar função de validação para account (usando TRIGGER em vez de CHECK para evitar problemas de imutabilidade)
CREATE OR REPLACE FUNCTION public.validate_bank_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar agency_number (somente números)
  IF NEW.agency_number !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'agency_number deve conter apenas números';
  END IF;
  
  -- Validar account_number (somente números)
  IF NEW.account_number !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'account_number deve conter apenas números';
  END IF;
  
  -- Validar agency_digit (opcional, 1-2 números)
  IF NEW.agency_digit IS NOT NULL AND NEW.agency_digit !~ '^[0-9]{1,2}$' THEN
    RAISE EXCEPTION 'agency_digit deve conter 1-2 números';
  END IF;
  
  -- Validar account_digit (opcional, 1-3 números)
  IF NEW.account_digit IS NOT NULL AND NEW.account_digit !~ '^[0-9]{1,3}$' THEN
    RAISE EXCEPTION 'account_digit deve conter 1-3 números';
  END IF;
  
  -- Validar account_type (enum controlado)
  IF NEW.account_type NOT IN ('corrente', 'poupanca', 'universitaria', 'pagamentos', 'caixa') THEN
    RAISE EXCEPTION 'account_type inválido';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger de validação
DROP TRIGGER IF EXISTS trg_validate_bank_account ON public.company_bank_accounts;
CREATE TRIGGER trg_validate_bank_account
  BEFORE INSERT OR UPDATE ON public.company_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_bank_account();

-- Criar índice único para evitar duplicatas (company + bank + agency + account)
DROP INDEX IF EXISTS idx_company_bank_accounts_unique;
CREATE UNIQUE INDEX idx_company_bank_accounts_unique 
ON public.company_bank_accounts (
  company_id, 
  bank_id, 
  agency_number, 
  COALESCE(agency_digit, ''), 
  account_number, 
  COALESCE(account_digit, '')
);

-- Índice para busca por banco
CREATE INDEX IF NOT EXISTS idx_company_bank_accounts_bank_id 
ON public.company_bank_accounts (bank_id);

-- Comentários para documentação
COMMENT ON COLUMN public.company_bank_accounts.agency_number IS 'Número da agência (obrigatório, somente números, preserva zeros à esquerda)';
COMMENT ON COLUMN public.company_bank_accounts.agency_digit IS 'Dígito verificador da agência (opcional, 1-2 números)';
COMMENT ON COLUMN public.company_bank_accounts.account_number IS 'Número da conta (obrigatório, somente números, preserva zeros à esquerda)';
COMMENT ON COLUMN public.company_bank_accounts.account_digit IS 'Dígito verificador da conta (opcional, 1-3 números)';
COMMENT ON COLUMN public.company_bank_accounts.account_type IS 'Tipo de conta: corrente, poupanca, universitaria, pagamentos, caixa';