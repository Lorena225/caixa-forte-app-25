-- ============================================================
-- LOAN CONTRACTS MODULE - COMPLETE CONSTRAINTS & GUARDS
-- ============================================================

-- 1. ADD MISSING COLUMNS TO loan_contracts
-- ============================================================
ALTER TABLE public.loan_contracts 
  ADD COLUMN IF NOT EXISTS needs_recalc BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recalc_reason TEXT,
  ADD COLUMN IF NOT EXISTS has_generated_titles BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS installments_calculated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_by UUID;

-- 2. ADD NOT NULL CONSTRAINTS TO ESSENTIAL FIELDS
-- ============================================================
-- First set default values for existing rows
UPDATE public.loan_contracts SET 
  creditor_partner_id = COALESCE(creditor_partner_id, (SELECT id FROM public.counterparties WHERE company_id = loan_contracts.company_id LIMIT 1)),
  bank_id = COALESCE(bank_id, (SELECT id FROM public.banks_reference LIMIT 1)),
  company_bank_account_id = COALESCE(company_bank_account_id, (SELECT id FROM public.bank_accounts WHERE company_id = loan_contracts.company_id LIMIT 1))
WHERE creditor_partner_id IS NULL OR bank_id IS NULL OR company_bank_account_id IS NULL;

-- Apply NOT NULL constraints
ALTER TABLE public.loan_contracts
  ALTER COLUMN principal_amount SET NOT NULL,
  ALTER COLUMN amortization_system SET NOT NULL,
  ALTER COLUMN nominal_rate SET NOT NULL,
  ALTER COLUMN rate_period SET NOT NULL,
  ALTER COLUMN installments_count SET NOT NULL,
  ALTER COLUMN contract_date SET NOT NULL,
  ALTER COLUMN disbursement_date SET NOT NULL,
  ALTER COLUMN first_due_date SET NOT NULL,
  ALTER COLUMN installment_period SET NOT NULL,
  ALTER COLUMN grace_periods SET DEFAULT 0,
  ALTER COLUMN grace_type SET DEFAULT 'SEM_CARENCIA';

-- 3. ADD CHECK CONSTRAINTS (SANITY VALIDATIONS)
-- ============================================================
ALTER TABLE public.loan_contracts 
  DROP CONSTRAINT IF EXISTS chk_principal_positive,
  ADD CONSTRAINT chk_principal_positive CHECK (principal_amount > 0);

ALTER TABLE public.loan_contracts 
  DROP CONSTRAINT IF EXISTS chk_installments_positive,
  ADD CONSTRAINT chk_installments_positive CHECK (installments_count > 0);

ALTER TABLE public.loan_contracts 
  DROP CONSTRAINT IF EXISTS chk_nominal_rate_valid,
  ADD CONSTRAINT chk_nominal_rate_valid CHECK (nominal_rate >= 0);

ALTER TABLE public.loan_contracts 
  DROP CONSTRAINT IF EXISTS chk_grace_periods_valid,
  ADD CONSTRAINT chk_grace_periods_valid CHECK (grace_periods >= 0 AND grace_periods <= installments_count);

ALTER TABLE public.loan_contracts 
  DROP CONSTRAINT IF EXISTS chk_first_due_after_contract,
  ADD CONSTRAINT chk_first_due_after_contract CHECK (first_due_date >= contract_date);

ALTER TABLE public.loan_contracts 
  DROP CONSTRAINT IF EXISTS chk_disbursement_after_contract,
  ADD CONSTRAINT chk_disbursement_after_contract CHECK (disbursement_date >= contract_date);

ALTER TABLE public.loan_contracts 
  DROP CONSTRAINT IF EXISTS chk_currency_brl,
  ADD CONSTRAINT chk_currency_brl CHECK (currency = 'BRL');

-- 4. ADD UNIQUE CONSTRAINTS (ANTI-DUPLICITY)
-- ============================================================
ALTER TABLE public.loan_contracts 
  DROP CONSTRAINT IF EXISTS uq_contract_number_per_company,
  ADD CONSTRAINT uq_contract_number_per_company UNIQUE (company_id, contract_number);

ALTER TABLE public.loan_installments 
  DROP CONSTRAINT IF EXISTS uq_installment_per_contract,
  ADD CONSTRAINT uq_installment_per_contract UNIQUE (company_id, contract_id, installment_no);

ALTER TABLE public.loan_generation_runs
  DROP CONSTRAINT IF EXISTS uq_generation_run_idempotency,
  ADD CONSTRAINT uq_generation_run_idempotency UNIQUE (company_id, idempotency_key);

-- 5. ADD FOREIGN KEY CONSTRAINTS
-- ============================================================
-- loan_installments.contract_id FK (already exists but ensure NOT NULL)
ALTER TABLE public.loan_installments 
  ALTER COLUMN contract_id SET NOT NULL;

-- 6. CREATE TRIGGER TO BLOCK STRUCTURAL EDITS WHEN INSTALLMENTS EXIST
-- ============================================================
CREATE OR REPLACE FUNCTION public.block_loan_contract_structural_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_installments BOOLEAN;
  v_has_generated_titles BOOLEAN;
  v_structural_fields TEXT[] := ARRAY[
    'principal_amount', 'amortization_system', 'nominal_rate', 'rate_type', 'rate_index',
    'installments_count', 'installment_period', 'first_due_date', 'grace_periods', 'grace_type'
  ];
  v_field TEXT;
  v_changed_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Only check on UPDATE
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;
  
  -- Check if contract has installments
  SELECT EXISTS(
    SELECT 1 FROM public.loan_installments 
    WHERE contract_id = NEW.id AND company_id = NEW.company_id
  ) INTO v_has_installments;
  
  -- Check if contract has generated titles
  SELECT EXISTS(
    SELECT 1 FROM public.loan_installments 
    WHERE contract_id = NEW.id 
    AND company_id = NEW.company_id 
    AND ap_transaction_id IS NOT NULL
  ) INTO v_has_generated_titles;
  
  -- If no installments, allow all changes
  IF NOT v_has_installments THEN
    RETURN NEW;
  END IF;
  
  -- Check which structural fields changed
  IF OLD.principal_amount IS DISTINCT FROM NEW.principal_amount THEN
    v_changed_fields := array_append(v_changed_fields, 'principal_amount');
  END IF;
  IF OLD.amortization_system IS DISTINCT FROM NEW.amortization_system THEN
    v_changed_fields := array_append(v_changed_fields, 'amortization_system');
  END IF;
  IF OLD.nominal_rate IS DISTINCT FROM NEW.nominal_rate THEN
    v_changed_fields := array_append(v_changed_fields, 'nominal_rate');
  END IF;
  IF OLD.rate_type IS DISTINCT FROM NEW.rate_type THEN
    v_changed_fields := array_append(v_changed_fields, 'rate_type');
  END IF;
  IF OLD.rate_index IS DISTINCT FROM NEW.rate_index THEN
    v_changed_fields := array_append(v_changed_fields, 'rate_index');
  END IF;
  IF OLD.installments_count IS DISTINCT FROM NEW.installments_count THEN
    v_changed_fields := array_append(v_changed_fields, 'installments_count');
  END IF;
  IF OLD.installment_period IS DISTINCT FROM NEW.installment_period THEN
    v_changed_fields := array_append(v_changed_fields, 'installment_period');
  END IF;
  IF OLD.first_due_date IS DISTINCT FROM NEW.first_due_date THEN
    v_changed_fields := array_append(v_changed_fields, 'first_due_date');
  END IF;
  IF OLD.grace_periods IS DISTINCT FROM NEW.grace_periods THEN
    v_changed_fields := array_append(v_changed_fields, 'grace_periods');
  END IF;
  IF OLD.grace_type IS DISTINCT FROM NEW.grace_type THEN
    v_changed_fields := array_append(v_changed_fields, 'grace_type');
  END IF;
  
  -- If no structural fields changed, allow
  IF array_length(v_changed_fields, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- If has generated titles, block entirely
  IF v_has_generated_titles THEN
    RAISE EXCEPTION 'Não é possível alterar campos estruturais (%) pois já existem títulos AP gerados. Use a rotina de recálculo/regeneração.', 
      array_to_string(v_changed_fields, ', ');
  END IF;
  
  -- If has installments but no titles, allow only if status is EDICAO and allow_recalculate is true
  IF NEW.status != 'EDICAO' THEN
    RAISE EXCEPTION 'Não é possível alterar campos estruturais (%) em contratos com status %. Retorne para EDICAO primeiro.', 
      array_to_string(v_changed_fields, ', '), NEW.status;
  END IF;
  
  -- Mark as needing recalculation
  NEW.needs_recalc := TRUE;
  NEW.recalc_reason := 'Campos alterados: ' || array_to_string(v_changed_fields, ', ');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_loan_contract_structural_edit ON public.loan_contracts;
CREATE TRIGGER trg_block_loan_contract_structural_edit
  BEFORE UPDATE ON public.loan_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.block_loan_contract_structural_edit();

-- 7. CREATE TRIGGER TO BLOCK DIRECT DELETE OF LOAN-ORIGINATED TRANSACTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.block_loan_transaction_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.origin_type = 'CONTRATO_EMPRESTIMO' THEN
    RAISE EXCEPTION 'Não é permitido excluir títulos originados de contratos de empréstimo. Use a rotina de cancelamento no módulo de contratos.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_loan_transaction_delete ON public.transactions;
CREATE TRIGGER trg_block_loan_transaction_delete
  BEFORE DELETE ON public.transactions
  FOR EACH ROW
  WHEN (OLD.origin_type = 'CONTRATO_EMPRESTIMO')
  EXECUTE FUNCTION public.block_loan_transaction_delete();

-- 8. CREATE TRIGGER TO AUDIT LOAN CONTRACT CHANGES
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_loan_contract_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action TEXT;
  v_before_json JSONB;
  v_after_json JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'LOAN_CONTRACT_CREATED';
    v_before_json := NULL;
    v_after_json := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'LOAN_CONTRACT_UPDATED';
    v_before_json := to_jsonb(OLD);
    v_after_json := to_jsonb(NEW);
    
    -- Specific actions for status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'ATIVO' THEN
        v_action := 'LOAN_CONTRACT_ACTIVATED';
      ELSIF NEW.status = 'CANCELADO' THEN
        v_action := 'LOAN_CONTRACT_CANCELLED';
      ELSIF NEW.status = 'ENCERRADO' THEN
        v_action := 'LOAN_CONTRACT_CLOSED';
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'LOAN_CONTRACT_DELETED';
    v_before_json := to_jsonb(OLD);
    v_after_json := NULL;
  END IF;
  
  INSERT INTO public.audit_logs (
    company_id, table_name, record_id, action, 
    old_data, new_data, user_id, sensitivity_level
  ) VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    'loan_contracts',
    COALESCE(NEW.id, OLD.id)::TEXT,
    v_action,
    v_before_json,
    v_after_json,
    auth.uid(),
    'high'
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_loan_contracts ON public.loan_contracts;
CREATE TRIGGER trg_audit_loan_contracts
  AFTER INSERT OR UPDATE OR DELETE ON public.loan_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_loan_contract_changes();

-- 9. CREATE TRIGGER TO AUDIT INSTALLMENT GENERATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_loan_installment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'INSTALLMENT_CREATED';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'GERADA' THEN
        v_action := 'INSTALLMENT_TITLE_GENERATED';
      ELSIF NEW.status = 'BAIXADA' THEN
        v_action := 'INSTALLMENT_PAID';
      ELSIF NEW.status = 'CANCELADA' THEN
        v_action := 'INSTALLMENT_CANCELLED';
      ELSE
        v_action := 'INSTALLMENT_STATUS_CHANGED';
      END IF;
    ELSE
      v_action := 'INSTALLMENT_UPDATED';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'INSTALLMENT_DELETED';
  END IF;
  
  INSERT INTO public.audit_logs (
    company_id, table_name, record_id, action, 
    old_data, new_data, user_id, sensitivity_level
  ) VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    'loan_installments',
    COALESCE(NEW.id, OLD.id)::TEXT,
    v_action,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    'normal'
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_loan_installments ON public.loan_installments;
CREATE TRIGGER trg_audit_loan_installments
  AFTER INSERT OR UPDATE OR DELETE ON public.loan_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_loan_installment_changes();

-- 10. CREATE FUNCTION TO CLEAR RECALC FLAG AFTER RECALCULATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.clear_loan_needs_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When installments are inserted for a contract, clear the needs_recalc flag
  UPDATE public.loan_contracts
  SET 
    needs_recalc = FALSE,
    recalc_reason = NULL,
    installments_calculated_at = now()
  WHERE id = NEW.contract_id AND needs_recalc = TRUE;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_loan_needs_recalc ON public.loan_installments;
CREATE TRIGGER trg_clear_loan_needs_recalc
  AFTER INSERT ON public.loan_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_loan_needs_recalc();

-- 11. CREATE FUNCTION TO UPDATE has_generated_titles FLAG
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_loan_generated_titles_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When an installment gets ap_transaction_id, update contract flag
  IF NEW.ap_transaction_id IS NOT NULL AND (OLD.ap_transaction_id IS NULL OR TG_OP = 'INSERT') THEN
    UPDATE public.loan_contracts
    SET has_generated_titles = TRUE
    WHERE id = NEW.contract_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_loan_generated_titles ON public.loan_installments;
CREATE TRIGGER trg_update_loan_generated_titles
  AFTER INSERT OR UPDATE ON public.loan_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_loan_generated_titles_flag();

-- 12. ADD PERMISSIONS FOR LOAN MODULE
-- ============================================================
INSERT INTO public.permissions (code, name, description, module, created_at)
VALUES 
  ('loan.create', 'Criar Contrato de Empréstimo', 'Permite criar novos contratos de empréstimo/financiamento', 'tesouraria', now()),
  ('loan.edit', 'Editar Contrato de Empréstimo', 'Permite editar contratos em edição', 'tesouraria', now()),
  ('loan.calculate', 'Calcular Parcelas', 'Permite calcular/recalcular parcelas de contratos', 'tesouraria', now()),
  ('loan.generate_ap', 'Gerar Títulos AP', 'Permite gerar títulos no Contas a Pagar', 'tesouraria', now()),
  ('loan.activate', 'Ativar Contrato', 'Permite ativar contratos de empréstimo', 'tesouraria', now()),
  ('loan.cancel', 'Cancelar Contrato', 'Permite cancelar contratos de empréstimo', 'tesouraria', now()),
  ('loan.view', 'Visualizar Contratos', 'Permite visualizar contratos e parcelas (somente leitura)', 'tesouraria', now())
ON CONFLICT (code) DO NOTHING;

-- 13. GRANT PERMISSIONS TO EXISTING ROLES
-- ============================================================
-- Admin role gets all permissions
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin' AND p.code LIKE 'loan.%'
ON CONFLICT DO NOTHING;

-- Gestor role gets all except cancel
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'gestor' AND p.code LIKE 'loan.%' AND p.code != 'loan.cancel'
ON CONFLICT DO NOTHING;

-- Operador gets view only
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'operador' AND p.code = 'loan.view'
ON CONFLICT DO NOTHING;