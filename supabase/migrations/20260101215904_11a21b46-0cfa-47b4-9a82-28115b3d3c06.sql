-- Criar trigger para validar category_id e account_id em transactions
CREATE TRIGGER trg_validate_transaction_category_account
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_category_account();