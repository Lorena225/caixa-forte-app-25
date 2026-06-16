-- Performance: remove 11 índices duplicados (advisor: duplicate_index).
-- Em cada par mantém-se o índice composto (company+campo) que serve mais
-- queries, ou a constraint única. Nunca se remove índice de suporte a constraint.
DROP INDEX IF EXISTS public.idx_boletos_due_date;
DROP INDEX IF EXISTS public.idx_boletos_status;
DROP INDEX IF EXISTS public.idx_counterparties_type;
DROP INDEX IF EXISTS public.idx_fiscal_documents_status;
DROP INDEX IF EXISTS public.idx_transactions_status;
DROP INDEX IF EXISTS public.idx_audit_logs_cursor;
DROP INDEX IF EXISTS public.company_bank_accounts_bank_idx;
DROP INDEX IF EXISTS public.idx_transactions_active;
DROP INDEX IF EXISTS public.idx_loan_contracts_number;
DROP INDEX IF EXISTS public.idx_loan_runs_idempotency;
DROP INDEX IF EXISTS public.idx_loan_installments_unique;
