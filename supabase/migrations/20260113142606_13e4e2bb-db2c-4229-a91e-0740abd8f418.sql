-- =====================================================
-- CADASTRO DE BANCOS FEBRABAN/BACEN - TABELAS BASE
-- =====================================================

-- 1. Tabela global: banks_reference (lista oficial FEBRABAN)
CREATE TABLE IF NOT EXISTS public.banks_reference (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  compe_code VARCHAR(3) NOT NULL,
  ispb VARCHAR(8) NULL,
  name VARCHAR(200) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  bank_type VARCHAR(10) NOT NULL DEFAULT 'official',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source VARCHAR(50) NOT NULL DEFAULT 'FEBRABAN/BACEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices e constraints para banks_reference
CREATE UNIQUE INDEX IF NOT EXISTS banks_reference_compe_code_unique ON public.banks_reference(compe_code);
CREATE INDEX IF NOT EXISTS banks_reference_name_idx ON public.banks_reference(name);
CREATE INDEX IF NOT EXISTS banks_reference_display_name_idx ON public.banks_reference(display_name);
CREATE INDEX IF NOT EXISTS banks_reference_ispb_idx ON public.banks_reference(ispb);
CREATE INDEX IF NOT EXISTS banks_reference_active_idx ON public.banks_reference(is_active);

-- 2. Tabela por empresa: company_bank_branches (agências)
CREATE TABLE IF NOT EXISTS public.company_bank_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_id UUID NOT NULL REFERENCES public.banks_reference(id) ON DELETE RESTRICT,
  agency_number VARCHAR(10) NOT NULL,
  agency_digit VARCHAR(2) NULL,
  agency_name VARCHAR(120) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para company_bank_branches
CREATE UNIQUE INDEX IF NOT EXISTS company_bank_branches_unique ON public.company_bank_branches(company_id, bank_id, agency_number, COALESCE(agency_digit, ''));
CREATE INDEX IF NOT EXISTS company_bank_branches_company_idx ON public.company_bank_branches(company_id);
CREATE INDEX IF NOT EXISTS company_bank_branches_bank_idx ON public.company_bank_branches(bank_id);

-- 3. Tabela por empresa: company_bank_accounts (contas bancárias vinculadas ao banco de referência)
CREATE TABLE IF NOT EXISTS public.company_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_id UUID NOT NULL REFERENCES public.banks_reference(id) ON DELETE RESTRICT,
  branch_id UUID NULL REFERENCES public.company_bank_branches(id) ON DELETE SET NULL,
  wallet_id UUID NULL REFERENCES public.wallets(id) ON DELETE SET NULL,
  account_number VARCHAR(20) NOT NULL,
  account_digit VARCHAR(3) NULL,
  account_type VARCHAR(20) NOT NULL DEFAULT 'corrente',
  nickname VARCHAR(80) NULL,
  holder_name VARCHAR(200) NULL,
  holder_document VARCHAR(20) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default_receipts BOOLEAN NOT NULL DEFAULT FALSE,
  is_default_payments BOOLEAN NOT NULL DEFAULT FALSE,
  cnab_agreement VARCHAR(20) NULL,
  cnab_wallet VARCHAR(10) NULL,
  cnab_layout VARCHAR(10) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para company_bank_accounts
CREATE UNIQUE INDEX IF NOT EXISTS company_bank_accounts_unique ON public.company_bank_accounts(company_id, bank_id, COALESCE(branch_id::text, ''), account_number, COALESCE(account_digit, ''));
CREATE INDEX IF NOT EXISTS company_bank_accounts_company_idx ON public.company_bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS company_bank_accounts_bank_idx ON public.company_bank_accounts(bank_id);
CREATE INDEX IF NOT EXISTS company_bank_accounts_wallet_idx ON public.company_bank_accounts(wallet_id);
CREATE INDEX IF NOT EXISTS company_bank_accounts_active_idx ON public.company_bank_accounts(company_id, is_active);

-- 4. Tabela: bank_requests (solicitações de novos bancos)
CREATE TABLE IF NOT EXISTS public.bank_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_name VARCHAR(200) NOT NULL,
  website VARCHAR(200) NULL,
  cnpj_ispb VARCHAR(30) NULL,
  requested_by_user_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  admin_notes TEXT NULL,
  approved_bank_id UUID NULL REFERENCES public.banks_reference(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para bank_requests
CREATE INDEX IF NOT EXISTS bank_requests_company_idx ON public.bank_requests(company_id);
CREATE INDEX IF NOT EXISTS bank_requests_status_idx ON public.bank_requests(status);
CREATE INDEX IF NOT EXISTS bank_requests_user_idx ON public.bank_requests(requested_by_user_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- banks_reference: leitura global para autenticados
ALTER TABLE public.banks_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Banks reference readable by authenticated users"
ON public.banks_reference FOR SELECT
TO authenticated
USING (true);

-- company_bank_branches: RLS por company_id
ALTER TABLE public.company_bank_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bank branches viewable by company members"
ON public.company_bank_branches FOR SELECT
USING (company_id IN (
  SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
));

CREATE POLICY "Bank branches insertable by company members"
ON public.company_bank_branches FOR INSERT
WITH CHECK (company_id IN (
  SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
));

CREATE POLICY "Bank branches updatable by company members"
ON public.company_bank_branches FOR UPDATE
USING (company_id IN (
  SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
));

CREATE POLICY "Bank branches deletable by company members"
ON public.company_bank_branches FOR DELETE
USING (company_id IN (
  SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
));

-- company_bank_accounts: RLS por company_id
ALTER TABLE public.company_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bank accounts viewable by company members"
ON public.company_bank_accounts FOR SELECT
USING (company_id IN (
  SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
));

CREATE POLICY "Bank accounts insertable by company members"
ON public.company_bank_accounts FOR INSERT
WITH CHECK (company_id IN (
  SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
));

CREATE POLICY "Bank accounts updatable by company members"
ON public.company_bank_accounts FOR UPDATE
USING (company_id IN (
  SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
));

CREATE POLICY "Bank accounts deletable by company members"
ON public.company_bank_accounts FOR DELETE
USING (company_id IN (
  SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
));

-- bank_requests: RLS por company_id
ALTER TABLE public.bank_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bank requests viewable by company members"
ON public.bank_requests FOR SELECT
USING (company_id IN (
  SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
));

CREATE POLICY "Bank requests insertable by company members"
ON public.bank_requests FOR INSERT
WITH CHECK (company_id IN (
  SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
));

CREATE POLICY "Bank requests updatable by company members"
ON public.bank_requests FOR UPDATE
USING (company_id IN (
  SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
));

-- =====================================================
-- SEED: Lista oficial de bancos FEBRABAN (75 bancos)
-- =====================================================

INSERT INTO public.banks_reference (compe_code, name, display_name, bank_type, is_active, source)
VALUES
  ('001', 'Banco do Brasil S.A.', '001 - Banco do Brasil', 'official', true, 'FEBRABAN/BACEN'),
  ('070', 'BRB - BANCO DE BRASILIA S.A.', '070 - BRB', 'official', true, 'FEBRABAN/BACEN'),
  ('104', 'CAIXA ECONOMICA FEDERAL', '104 - Caixa Econômica Federal', 'official', true, 'FEBRABAN/BACEN'),
  ('077', 'Banco Inter S.A.', '077 - Banco Inter', 'official', true, 'FEBRABAN/BACEN'),
  ('743', 'Banco Semear S.A.', '743 - Banco Semear', 'official', true, 'FEBRABAN/BACEN'),
  ('136', 'COOPERATIVA CENTRAL DE CRÉDITO UNICRED DO BRASIL', '136 - UNICRED', 'official', true, 'FEBRABAN/BACEN'),
  ('748', 'BANCO COOPERATIVO SICREDI S.A.', '748 - Sicredi', 'official', true, 'FEBRABAN/BACEN'),
  ('752', 'Banco BNP Paribas Brasil S.A.', '752 - BNP Paribas', 'official', true, 'FEBRABAN/BACEN'),
  ('756', 'BANCO COOPERATIVO SICOOB S.A.', '756 - Sicoob', 'official', true, 'FEBRABAN/BACEN'),
  ('757', 'BANCO KEB HANA DO BRASIL S.A.', '757 - KEB Hana', 'official', true, 'FEBRABAN/BACEN'),
  ('074', 'Banco J. Safra S.A.', '074 - J. Safra', 'official', true, 'FEBRABAN/BACEN'),
  ('099', 'UNIPRIME CENTRAL NACIONAL', '099 - Uniprime', 'official', true, 'FEBRABAN/BACEN'),
  ('025', 'Banco Alfa S.A.', '025 - Banco Alfa', 'official', true, 'FEBRABAN/BACEN'),
  ('063', 'Banco Bradescard S.A.', '063 - Bradescard', 'official', true, 'FEBRABAN/BACEN'),
  ('097', 'Credisis - Central de Cooperativas de Crédito Ltda.', '097 - Credisis', 'official', true, 'FEBRABAN/BACEN'),
  ('003', 'BANCO DA AMAZONIA S.A.', '003 - Banco da Amazônia', 'official', true, 'FEBRABAN/BACEN'),
  ('037', 'Banco do Estado do Pará S.A.', '037 - Banpará', 'official', true, 'FEBRABAN/BACEN'),
  ('085', 'Cooperativa Central de Crédito - Ailos', '085 - Ailos', 'official', true, 'FEBRABAN/BACEN'),
  ('036', 'Banco Bradesco BBI S.A.', '036 - Bradesco BBI', 'official', true, 'FEBRABAN/BACEN'),
  ('394', 'Banco Bradesco Financiamentos S.A.', '394 - Bradesco Financiamentos', 'official', true, 'FEBRABAN/BACEN'),
  ('004', 'Banco do Nordeste do Brasil S.A.', '004 - Banco do Nordeste', 'official', true, 'FEBRABAN/BACEN'),
  ('021', 'BANESTES S.A.', '021 - Banestes', 'official', true, 'FEBRABAN/BACEN'),
  ('208', 'Banco BTG Pactual S.A.', '208 - BTG Pactual', 'official', true, 'FEBRABAN/BACEN'),
  ('241', 'BANCO CLASSICO S.A.', '241 - Banco Clássico', 'official', true, 'FEBRABAN/BACEN'),
  ('612', 'Banco Guanabara S.A.', '612 - Banco Guanabara', 'official', true, 'FEBRABAN/BACEN'),
  ('604', 'Banco Industrial do Brasil S.A.', '604 - Banco Industrial', 'official', true, 'FEBRABAN/BACEN'),
  ('505', 'BANCO UBS (BRASIL) S.A.', '505 - UBS Brasil', 'official', true, 'FEBRABAN/BACEN'),
  ('341', 'ITAÚ UNIBANCO S.A.', '341 - Itaú Unibanco', 'official', true, 'FEBRABAN/BACEN'),
  ('237', 'Banco Bradesco S.A.', '237 - Bradesco', 'official', true, 'FEBRABAN/BACEN'),
  ('611', 'BANCO PAULISTA S.A.', '611 - Banco Paulista', 'official', true, 'FEBRABAN/BACEN'),
  ('249', 'Banco Investcred Unibanco S.A.', '249 - Investcred', 'official', true, 'FEBRABAN/BACEN'),
  ('318', 'Banco BMG S.A.', '318 - BMG', 'official', true, 'FEBRABAN/BACEN'),
  ('033', 'BANCO SANTANDER (BRASIL) S.A.', '033 - Santander', 'official', true, 'FEBRABAN/BACEN'),
  ('041', 'BANCO DO ESTADO DO RS S.A.', '041 - Banrisul', 'official', true, 'FEBRABAN/BACEN'),
  ('212', 'BANCO ORIGINAL', '212 - Banco Original', 'official', true, 'FEBRABAN/BACEN'),
  ('047', 'Banco do Estado de Sergipe S.A.', '047 - Banese', 'official', true, 'FEBRABAN/BACEN'),
  ('254', 'PARANÁ BANCO S.A.', '254 - Paraná Banco', 'official', true, 'FEBRABAN/BACEN'),
  ('107', 'Banco Bocom BBM S.A.', '107 - Bocom BBM', 'official', true, 'FEBRABAN/BACEN'),
  ('124', 'Banco Woori Bank do Brasil S.A.', '124 - Woori Bank', 'official', true, 'FEBRABAN/BACEN'),
  ('389', 'Banco Mercantil do Brasil S.A.', '389 - Mercantil do Brasil', 'official', true, 'FEBRABAN/BACEN'),
  ('634', 'BANCO TRIANGULO S.A.', '634 - Banco Triângulo', 'official', true, 'FEBRABAN/BACEN'),
  ('435', 'DELCRED SOCIEDADE DE CRÉDITO DIRETO S.A.', '435 - Delcred', 'official', true, 'FEBRABAN/BACEN'),
  ('421', 'LAR COOPERATIVA DE CRÉDITO', '421 - Lar Credi', 'official', true, 'FEBRABAN/BACEN'),
  ('511', 'MAGNUM SOCIEDADE DE CRÉDITO DIRETO S.A.', '511 - Magnum', 'official', true, 'FEBRABAN/BACEN'),
  ('065', 'Banco AndBank (Brasil) S.A.', '065 - AndBank', 'official', true, 'FEBRABAN/BACEN'),
  ('250', 'BANCO BMG CONSIGNADO S.A.', '250 - BMG Consignado', 'official', true, 'FEBRABAN/BACEN'),
  ('125', 'BANCO GENIAL S.A.', '125 - Banco Genial', 'official', true, 'FEBRABAN/BACEN'),
  ('018', 'Banco Tricury S.A.', '018 - Tricury', 'official', true, 'FEBRABAN/BACEN'),
  ('422', 'Banco Safra S.A.', '422 - Safra', 'official', true, 'FEBRABAN/BACEN'),
  ('224', 'Banco Fibra S.A.', '224 - Fibra', 'official', true, 'FEBRABAN/BACEN'),
  ('600', 'Banco Luso Brasileiro S.A.', '600 - Luso Brasileiro', 'official', true, 'FEBRABAN/BACEN'),
  ('623', 'Banco Pan S.A.', '623 - Banco Pan', 'official', true, 'FEBRABAN/BACEN'),
  ('655', 'Banco Votorantim S.A.', '655 - Votorantim', 'official', true, 'FEBRABAN/BACEN'),
  ('456', 'Banco MUFG Brasil S.A.', '456 - MUFG Brasil', 'official', true, 'FEBRABAN/BACEN'),
  ('464', 'Banco Sumitomo Mitsui Brasileiro S.A.', '464 - Sumitomo Mitsui', 'official', true, 'FEBRABAN/BACEN'),
  ('069', 'Banco Crefisa S.A.', '069 - Crefisa', 'official', true, 'FEBRABAN/BACEN'),
  ('637', 'BANCO SOFISA S.A.', '637 - Sofisa', 'official', true, 'FEBRABAN/BACEN'),
  ('643', 'BANCO PINE S.A.', '643 - Pine', 'official', true, 'FEBRABAN/BACEN'),
  ('707', 'BANCO DAYCOVAL S.A.', '707 - Daycoval', 'official', true, 'FEBRABAN/BACEN'),
  ('633', 'BANCO RENDIMENTO S.A.', '633 - Rendimento', 'official', true, 'FEBRABAN/BACEN'),
  ('218', 'BANCO BS2 S.A.', '218 - BS2', 'official', true, 'FEBRABAN/BACEN'),
  ('753', 'NOVO BANCO CONTINENTAL S.A.', '753 - Continental', 'official', true, 'FEBRABAN/BACEN'),
  ('222', 'BANCO CRÉDIT AGRICOLE BR S.A.', '222 - Crédit Agricole', 'official', true, 'FEBRABAN/BACEN'),
  ('098', 'CREDIALIANÇA CCR', '098 - Credialiança', 'official', true, 'FEBRABAN/BACEN'),
  ('010', 'CREDICOAMO', '010 - Credicoamo', 'official', true, 'FEBRABAN/BACEN'),
  ('089', 'CREDISAN CC', '089 - Credisan', 'official', true, 'FEBRABAN/BACEN'),
  ('281', 'CCR COOPAVEL', '281 - Coopavel', 'official', true, 'FEBRABAN/BACEN'),
  ('213', 'Banco Arbi S.A.', '213 - Arbi', 'official', true, 'FEBRABAN/BACEN'),
  ('133', 'CONFEDERAÇÃO NACIONAL DAS COOPERATIVAS - CRESOL', '133 - Cresol', 'official', true, 'FEBRABAN/BACEN'),
  ('260', 'NU PAGAMENTOS S.A.', '260 - Nubank', 'official', true, 'FEBRABAN/BACEN'),
  ('290', 'PAGSEGURO INTERNET S.A.', '290 - PagSeguro', 'official', true, 'FEBRABAN/BACEN'),
  ('380', 'PICPAY SERVICOS S.A.', '380 - PicPay', 'official', true, 'FEBRABAN/BACEN'),
  ('323', 'MERCADO PAGO INSTITUIÇÃO DE PAGAMENTO LTDA.', '323 - Mercado Pago', 'official', true, 'FEBRABAN/BACEN'),
  ('336', 'C6 BANK S.A.', '336 - C6 Bank', 'official', true, 'FEBRABAN/BACEN')
ON CONFLICT (compe_code) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  updated_at = now();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_banks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_banks_reference_updated_at
BEFORE UPDATE ON public.banks_reference
FOR EACH ROW EXECUTE FUNCTION public.update_banks_updated_at();

CREATE TRIGGER trigger_company_bank_branches_updated_at
BEFORE UPDATE ON public.company_bank_branches
FOR EACH ROW EXECUTE FUNCTION public.update_banks_updated_at();

CREATE TRIGGER trigger_company_bank_accounts_updated_at
BEFORE UPDATE ON public.company_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_banks_updated_at();

CREATE TRIGGER trigger_bank_requests_updated_at
BEFORE UPDATE ON public.bank_requests
FOR EACH ROW EXECUTE FUNCTION public.update_banks_updated_at();