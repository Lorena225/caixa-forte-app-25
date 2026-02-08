-- ===========================================================
-- CORREÇÃO: Recriar extensão pg_trgm no schema extensions
-- ===========================================================

-- Garantir que o schema extensions existe
CREATE SCHEMA IF NOT EXISTS extensions;

-- Criar a extensão no schema extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Conceder acesso ao schema
GRANT USAGE ON SCHEMA extensions TO authenticated, anon, service_role;

-- Recriar índices de busca textual
-- Produtos
CREATE INDEX IF NOT EXISTS idx_products_name_trgm 
ON products USING gin (name extensions.gin_trgm_ops);

-- Counterparties  
CREATE INDEX IF NOT EXISTS idx_counterparties_name_trgm 
ON counterparties USING gin (name extensions.gin_trgm_ops);

-- Transactions (usando coluna correta: description)
CREATE INDEX IF NOT EXISTS idx_transactions_description_trgm 
ON transactions USING gin (description extensions.gin_trgm_ops);