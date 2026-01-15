
-- Corrigir funções sem search_path definido

-- 1. create_periodo_aquisitivo_on_hire
CREATE OR REPLACE FUNCTION public.create_periodo_aquisitivo_on_hire()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.data_admissao IS NOT NULL THEN
    INSERT INTO public.periodos_aquisitivos (
      funcionario_id, data_inicio, data_fim, dias_direito, status
    ) VALUES (
      NEW.id,
      NEW.data_admissao,
      NEW.data_admissao + interval '1 year' - interval '1 day',
      30,
      'em_andamento'
    ) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. generate_api_key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN 'cf_' || encode(gen_random_bytes(32), 'hex');
END;
$function$;

-- 3. generate_audit_hash
CREATE OR REPLACE FUNCTION public.generate_audit_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prev_hash TEXT;
  v_content TEXT;
BEGIN
  SELECT entry_hash INTO v_prev_hash
  FROM audit_logs
  WHERE company_id = NEW.company_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;
  
  NEW.prev_hash := COALESCE(v_prev_hash, 'GENESIS');
  
  v_content := COALESCE(NEW.prev_hash, '') || '|' || 
               NEW.company_id::text || '|' ||
               COALESCE(NEW.user_id::text, '') || '|' ||
               NEW.table_name || '|' ||
               NEW.action || '|' ||
               COALESCE(NEW.record_id, '') || '|' ||
               COALESCE(NEW.old_data::text, '') || '|' ||
               COALESCE(NEW.new_data::text, '') || '|' ||
               NEW.created_at::text;
  
  NEW.entry_hash := encode(sha256(v_content::bytea), 'hex');
  
  RETURN NEW;
END;
$function$;

-- 4. hash_api_key
CREATE OR REPLACE FUNCTION public.hash_api_key(key text)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN encode(sha256(key::bytea), 'hex');
END;
$function$;

-- 5. update_banks_updated_at
CREATE OR REPLACE FUNCTION public.update_banks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 6. update_rh_updated_at
CREATE OR REPLACE FUNCTION public.update_rh_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 7. validate_bank_account
CREATE OR REPLACE FUNCTION public.validate_bank_account()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
$function$;
