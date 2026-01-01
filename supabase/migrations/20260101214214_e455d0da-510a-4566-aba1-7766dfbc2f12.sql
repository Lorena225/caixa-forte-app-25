-- BLOCO 1: Ajuste de Modelo de Dados

-- 1.0 Criar enum document_type
CREATE TYPE public.document_type AS ENUM ('nf', 'nfe', 'fatura', 'recibo', 'boleto', 'outro');

-- 1.1 Nova tabela: account_categories (Categorias/Grupos)
CREATE TABLE public.account_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category_type public.account_category NOT NULL,
  parent_id UUID REFERENCES public.account_categories(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Constraint única: company + code
ALTER TABLE public.account_categories ADD CONSTRAINT account_categories_company_code_unique UNIQUE(company_id, code);

-- Índices
CREATE INDEX idx_account_categories_company_type ON public.account_categories(company_id, category_type);
CREATE INDEX idx_account_categories_parent ON public.account_categories(parent_id) WHERE parent_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.account_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Usuários podem ver categorias" ON public.account_categories
  FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar categorias" ON public.account_categories
  FOR INSERT WITH CHECK (user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar categorias" ON public.account_categories
  FOR UPDATE USING (user_can_write(company_id));

CREATE POLICY "Admins podem deletar categorias" ON public.account_categories
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- Trigger updated_at
CREATE TRIGGER update_account_categories_updated_at
  BEFORE UPDATE ON public.account_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 1.2 Ajuste da tabela accounts: adicionar category_id
ALTER TABLE public.accounts ADD COLUMN category_id UUID REFERENCES public.account_categories(id);

-- Índice para category_id em accounts
CREATE INDEX idx_accounts_category ON public.accounts(category_id) WHERE category_id IS NOT NULL;

-- 1.3 Ajuste da tabela transactions: adicionar campos
ALTER TABLE public.transactions ADD COLUMN category_id UUID REFERENCES public.account_categories(id);
ALTER TABLE public.transactions ADD COLUMN document_number TEXT;
ALTER TABLE public.transactions ADD COLUMN document_type public.document_type;
ALTER TABLE public.transactions ADD COLUMN document_series TEXT;

-- Índices para transactions
CREATE INDEX idx_transactions_category ON public.transactions(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_transactions_document ON public.transactions(company_id, document_number) WHERE document_number IS NOT NULL;

-- Adicionar 'account_categories' ao enum import_entity_type
ALTER TYPE public.import_entity_type ADD VALUE IF NOT EXISTS 'account_categories';

-- Função para validar consistência categoria<->conta
CREATE OR REPLACE FUNCTION public.validate_transaction_category_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Se ambos category_id e account_id estão presentes, validar consistência
  IF NEW.category_id IS NOT NULL AND NEW.account_id IS NOT NULL THEN
    -- Verificar se a conta pertence à categoria
    IF NOT EXISTS (
      SELECT 1 FROM public.accounts 
      WHERE id = NEW.account_id 
      AND (category_id = NEW.category_id OR category_id IS NULL)
    ) THEN
      -- Obter a categoria correta da conta e usar ela
      SELECT category_id INTO NEW.category_id 
      FROM public.accounts 
      WHERE id = NEW.account_id;
    END IF;
  -- Se só account_id está presente, preencher category_id automaticamente
  ELSIF NEW.account_id IS NOT NULL AND NEW.category_id IS NULL THEN
    SELECT category_id INTO NEW.category_id 
    FROM public.accounts 
    WHERE id = NEW.account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para validação
CREATE TRIGGER validate_transaction_category_before_insert_update
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_category_account();