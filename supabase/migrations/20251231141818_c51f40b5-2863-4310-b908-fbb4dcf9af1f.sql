-- =====================================================
-- MÓDULO DE IMPORTAÇÃO/EXPORTAÇÃO EXCEL
-- =====================================================

-- 1. Tipos enums para importação
CREATE TYPE public.import_entity_type AS ENUM (
  'accounts',
  'counterparties', 
  'wallets',
  'cost_centers',
  'transactions_ar',
  'transactions_ap',
  'transactions',
  'budgets'
);

CREATE TYPE public.import_row_status AS ENUM (
  'pending',
  'valid',
  'error',
  'imported',
  'updated',
  'duplicate',
  'skipped'
);

-- 2. Tabela de templates oficiais (definição de colunas por entidade)
CREATE TABLE public.import_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity import_entity_type NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  description TEXT,
  columns_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Formato: [{ "name": "code", "label": "Código", "type": "text", "required": true, "examples": ["1.01", "1.02"] }]
  sample_data_json JSONB DEFAULT '[]'::jsonb,
  instructions_json JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity, version)
);

-- 3. Mapeamentos de importação por empresa (configurações personalizadas)
CREATE TABLE public.import_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity import_entity_type NOT NULL,
  name TEXT NOT NULL,
  mapping_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Formato: { "coluna_excel": "campo_sistema" }
  defaults_json JSONB DEFAULT '{}'::jsonb,
  -- Formato: { "wallet_id": "uuid", "account_id": "uuid" }
  rules_json JSONB DEFAULT '{}'::jsonb,
  -- Formato: { "date_format": "dd/mm/yyyy", "decimal_separator": "," }
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, entity, name)
);

-- 4. Linhas de importação (detalhamento por linha)
CREATE TABLE public.import_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_json JSONB NOT NULL,
  normalized_json JSONB,
  status import_row_status NOT NULL DEFAULT 'pending',
  errors_json JSONB DEFAULT '[]'::jsonb,
  record_id UUID, -- ID do registro criado/atualizado
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Chaves externas para idempotência
CREATE TABLE public.external_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity import_entity_type NOT NULL,
  external_key TEXT NOT NULL,
  record_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'excel',
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, entity, external_key)
);

-- 6. Índices para performance
CREATE INDEX idx_import_rows_batch ON public.import_rows(batch_id);
CREATE INDEX idx_import_rows_status ON public.import_rows(status);
CREATE INDEX idx_external_keys_lookup ON public.external_keys(company_id, entity, external_key);
CREATE INDEX idx_import_mappings_company ON public.import_mappings(company_id, entity);

-- 7. Triggers de updated_at
CREATE TRIGGER update_import_templates_updated_at
  BEFORE UPDATE ON public.import_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_import_mappings_updated_at
  BEFORE UPDATE ON public.import_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_import_rows_updated_at
  BEFORE UPDATE ON public.import_rows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 8. Enable RLS
ALTER TABLE public.import_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_keys ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies - import_templates (leitura pública para templates oficiais)
CREATE POLICY "Todos podem ver templates ativos"
  ON public.import_templates FOR SELECT
  USING (is_active = true);

-- 10. RLS Policies - import_mappings
CREATE POLICY "Usuários podem ver mapeamentos da empresa"
  ON public.import_mappings FOR SELECT
  USING (user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar mapeamentos"
  ON public.import_mappings FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar mapeamentos"
  ON public.import_mappings FOR UPDATE
  USING (user_can_write(company_id));

CREATE POLICY "Admins podem deletar mapeamentos"
  ON public.import_mappings FOR DELETE
  USING (get_user_role(company_id) = 'admin');

-- 11. RLS Policies - import_rows
CREATE POLICY "Usuários podem ver linhas de importação"
  ON public.import_rows FOR SELECT
  USING (user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar linhas"
  ON public.import_rows FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar linhas"
  ON public.import_rows FOR UPDATE
  USING (user_can_write(company_id));

CREATE POLICY "Admins podem deletar linhas"
  ON public.import_rows FOR DELETE
  USING (get_user_role(company_id) = 'admin');

-- 12. RLS Policies - external_keys
CREATE POLICY "Usuários podem ver chaves externas"
  ON public.external_keys FOR SELECT
  USING (user_has_company_access(company_id));

CREATE POLICY "Gestores podem criar chaves"
  ON public.external_keys FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY "Gestores podem atualizar chaves"
  ON public.external_keys FOR UPDATE
  USING (user_can_write(company_id));

CREATE POLICY "Admins podem deletar chaves"
  ON public.external_keys FOR DELETE
  USING (get_user_role(company_id) = 'admin');

-- 13. Adicionar coluna entity na tabela import_batches existente
ALTER TABLE public.import_batches 
  ADD COLUMN IF NOT EXISTS entity import_entity_type,
  ADD COLUMN IF NOT EXISTS mapping_id UUID REFERENCES public.import_mappings(id),
  ADD COLUMN IF NOT EXISTS total_rows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processed_rows INTEGER DEFAULT 0;

-- 14. Inserir templates oficiais
INSERT INTO public.import_templates (entity, version, name, description, columns_json, sample_data_json, instructions_json) VALUES
-- Plano de Contas
('accounts', 1, 'Plano de Contas', 'Modelo para importação do plano de contas contábil/gerencial',
 '[
   {"name": "code", "label": "Código", "type": "text", "required": true, "description": "Código da conta (ex: 1.01.01)"},
   {"name": "name", "label": "Nome", "type": "text", "required": true, "description": "Nome da conta"},
   {"name": "category_type", "label": "Categoria", "type": "enum", "required": true, "options": ["ativo", "passivo", "patrimonio_liquido", "receita", "custo", "despesa"]},
   {"name": "parent_code", "label": "Código Pai", "type": "text", "required": false, "description": "Código da conta pai para hierarquia"},
   {"name": "is_managerial", "label": "Gerencial", "type": "boolean", "required": false, "default": false},
   {"name": "is_active", "label": "Ativo", "type": "boolean", "required": false, "default": true},
   {"name": "external_key", "label": "Chave Externa", "type": "text", "required": false, "description": "Identificador único para evitar duplicatas"}
 ]'::jsonb,
 '[{"code": "1", "name": "ATIVO", "category_type": "ativo"}, {"code": "1.01", "name": "Ativo Circulante", "category_type": "ativo", "parent_code": "1"}]'::jsonb,
 '["Use códigos hierárquicos (1, 1.01, 1.01.01)", "Defina parent_code para criar a árvore de contas", "Categorias: ativo, passivo, patrimonio_liquido, receita, custo, despesa"]'::jsonb
),

-- Fornecedores/Clientes
('counterparties', 1, 'Fornecedores e Clientes', 'Modelo para importação de fornecedores e clientes',
 '[
   {"name": "name", "label": "Nome", "type": "text", "required": true},
   {"name": "type", "label": "Tipo", "type": "enum", "required": true, "options": ["cliente", "fornecedor", "ambos"]},
   {"name": "document", "label": "CPF/CNPJ", "type": "text", "required": false},
   {"name": "email", "label": "Email", "type": "text", "required": false},
   {"name": "phone", "label": "Telefone", "type": "text", "required": false},
   {"name": "address", "label": "Endereço", "type": "text", "required": false},
   {"name": "is_active", "label": "Ativo", "type": "boolean", "required": false, "default": true},
   {"name": "external_key", "label": "Chave Externa", "type": "text", "required": false}
 ]'::jsonb,
 '[{"name": "Cliente Exemplo", "type": "cliente", "document": "123.456.789-00", "email": "cliente@email.com"}]'::jsonb,
 '["Tipo deve ser: cliente, fornecedor ou ambos", "CPF/CNPJ pode ser com ou sem pontuação"]'::jsonb
),

-- Carteiras
('wallets', 1, 'Carteiras e Contas Bancárias', 'Modelo para importação de carteiras, bancos e cartões',
 '[
   {"name": "name", "label": "Nome", "type": "text", "required": true},
   {"name": "type", "label": "Tipo", "type": "enum", "required": true, "options": ["caixa", "banco", "cartao"]},
   {"name": "opening_balance", "label": "Saldo Inicial", "type": "currency", "required": false, "default": 0},
   {"name": "closing_day", "label": "Dia Fechamento", "type": "integer", "required": false, "description": "Para cartões"},
   {"name": "due_day", "label": "Dia Vencimento", "type": "integer", "required": false, "description": "Para cartões"},
   {"name": "external_key", "label": "Chave Externa", "type": "text", "required": false}
 ]'::jsonb,
 '[{"name": "Banco Itaú", "type": "banco", "opening_balance": "10000,00"}]'::jsonb,
 '["Tipos: caixa (dinheiro físico), banco (conta bancária), cartao (cartão de crédito)", "Saldo inicial aceita formato brasileiro (1.000,00) ou internacional (1000.00)"]'::jsonb
),

-- Centros de Custo
('cost_centers', 1, 'Centros de Custo', 'Modelo para importação de centros de custo',
 '[
   {"name": "code", "label": "Código", "type": "text", "required": true},
   {"name": "name", "label": "Nome", "type": "text", "required": true},
   {"name": "is_active", "label": "Ativo", "type": "boolean", "required": false, "default": true},
   {"name": "external_key", "label": "Chave Externa", "type": "text", "required": false}
 ]'::jsonb,
 '[{"code": "ADM", "name": "Administrativo"}, {"code": "COM", "name": "Comercial"}]'::jsonb,
 '["Use códigos curtos e descritivos", "Centros de custo ajudam a rastrear despesas por departamento"]'::jsonb
),

-- Contas a Receber
('transactions_ar', 1, 'Contas a Receber', 'Modelo para importação de contas a receber',
 '[
   {"name": "transaction_date", "label": "Data Lançamento", "type": "date", "required": true},
   {"name": "due_date", "label": "Data Vencimento", "type": "date", "required": true},
   {"name": "paid_date", "label": "Data Recebimento", "type": "date", "required": false},
   {"name": "description", "label": "Descrição", "type": "text", "required": true},
   {"name": "original_amount", "label": "Valor Original", "type": "currency", "required": true},
   {"name": "interest_amount", "label": "Juros", "type": "currency", "required": false, "default": 0},
   {"name": "discount_percent", "label": "Desconto %", "type": "decimal", "required": false, "default": 0},
   {"name": "account_code", "label": "Código Conta", "type": "text", "required": false},
   {"name": "account_name", "label": "Nome Conta", "type": "text", "required": false},
   {"name": "wallet_name", "label": "Carteira", "type": "text", "required": true},
   {"name": "counterparty_name", "label": "Cliente", "type": "text", "required": false},
   {"name": "cost_center_name", "label": "Centro Custo", "type": "text", "required": false},
   {"name": "notes", "label": "Observações", "type": "text", "required": false},
   {"name": "external_key", "label": "Chave Externa", "type": "text", "required": false}
 ]'::jsonb,
 '[{"transaction_date": "01/12/2024", "due_date": "15/12/2024", "description": "Venda Serviço", "original_amount": "1500,00", "wallet_name": "Banco Itaú", "counterparty_name": "Cliente A"}]'::jsonb,
 '["Datas aceitas: dd/mm/aaaa ou aaaa-mm-dd", "Valores aceitos: 1500,00 ou 1500.00 ou R$ 1.500,00", "Se paid_date preenchido, status será PAGO automaticamente", "Informe account_code OU account_name (código tem prioridade)"]'::jsonb
),

-- Contas a Pagar
('transactions_ap', 1, 'Contas a Pagar', 'Modelo para importação de contas a pagar',
 '[
   {"name": "transaction_date", "label": "Data Lançamento", "type": "date", "required": true},
   {"name": "due_date", "label": "Data Vencimento", "type": "date", "required": true},
   {"name": "paid_date", "label": "Data Pagamento", "type": "date", "required": false},
   {"name": "description", "label": "Descrição", "type": "text", "required": true},
   {"name": "original_amount", "label": "Valor Original", "type": "currency", "required": true},
   {"name": "interest_amount", "label": "Juros", "type": "currency", "required": false, "default": 0},
   {"name": "discount_percent", "label": "Desconto %", "type": "decimal", "required": false, "default": 0},
   {"name": "account_code", "label": "Código Conta", "type": "text", "required": false},
   {"name": "account_name", "label": "Nome Conta", "type": "text", "required": false},
   {"name": "wallet_name", "label": "Carteira", "type": "text", "required": true},
   {"name": "counterparty_name", "label": "Fornecedor", "type": "text", "required": false},
   {"name": "cost_center_name", "label": "Centro Custo", "type": "text", "required": false},
   {"name": "notes", "label": "Observações", "type": "text", "required": false},
   {"name": "external_key", "label": "Chave Externa", "type": "text", "required": false}
 ]'::jsonb,
 '[{"transaction_date": "01/12/2024", "due_date": "20/12/2024", "description": "Aluguel Dezembro", "original_amount": "2500,00", "wallet_name": "Banco Itaú", "counterparty_name": "Imobiliária XYZ"}]'::jsonb,
 '["Mesmas regras de Contas a Receber", "Direção (saída) é aplicada automaticamente"]'::jsonb
),

-- Lançamentos Gerais
('transactions', 1, 'Lançamentos Gerais', 'Modelo para importação de lançamentos (entradas e saídas)',
 '[
   {"name": "direction", "label": "Direção", "type": "enum", "required": true, "options": ["entrada", "saida"]},
   {"name": "transaction_date", "label": "Data Lançamento", "type": "date", "required": true},
   {"name": "due_date", "label": "Data Vencimento", "type": "date", "required": false},
   {"name": "paid_date", "label": "Data Pagamento", "type": "date", "required": false},
   {"name": "description", "label": "Descrição", "type": "text", "required": true},
   {"name": "original_amount", "label": "Valor Original", "type": "currency", "required": true},
   {"name": "interest_amount", "label": "Juros", "type": "currency", "required": false, "default": 0},
   {"name": "discount_percent", "label": "Desconto %", "type": "decimal", "required": false, "default": 0},
   {"name": "account_code", "label": "Código Conta", "type": "text", "required": false},
   {"name": "account_name", "label": "Nome Conta", "type": "text", "required": false},
   {"name": "wallet_name", "label": "Carteira", "type": "text", "required": true},
   {"name": "counterparty_name", "label": "Cliente/Fornecedor", "type": "text", "required": false},
   {"name": "cost_center_name", "label": "Centro Custo", "type": "text", "required": false},
   {"name": "notes", "label": "Observações", "type": "text", "required": false},
   {"name": "external_key", "label": "Chave Externa", "type": "text", "required": false}
 ]'::jsonb,
 '[{"direction": "entrada", "transaction_date": "01/12/2024", "due_date": "15/12/2024", "description": "Venda", "original_amount": "1500,00", "wallet_name": "Caixa"}]'::jsonb,
 '["Direção: entrada (receita) ou saida (despesa)", "Se due_date não informado, usa transaction_date"]'::jsonb
),

-- Metas/Orçamento
('budgets', 1, 'Metas e Orçamento', 'Modelo para importação de metas mensais',
 '[
   {"name": "year", "label": "Ano", "type": "integer", "required": true},
   {"name": "month", "label": "Mês", "type": "integer", "required": true, "description": "1-12"},
   {"name": "target_revenue", "label": "Meta Receita", "type": "currency", "required": false, "default": 0},
   {"name": "target_expense", "label": "Meta Despesa", "type": "currency", "required": false, "default": 0},
   {"name": "target_profit", "label": "Meta Lucro", "type": "currency", "required": false, "default": 0},
   {"name": "target_margin", "label": "Meta Margem %", "type": "decimal", "required": false, "default": 0}
 ]'::jsonb,
 '[{"year": 2025, "month": 1, "target_revenue": "50000,00", "target_expense": "35000,00", "target_profit": "15000,00", "target_margin": "30"}]'::jsonb,
 '["Mês deve ser de 1 a 12", "Valores podem ser calculados ou inseridos manualmente", "Se já existir meta para ano/mês, será atualizada"]'::jsonb
);