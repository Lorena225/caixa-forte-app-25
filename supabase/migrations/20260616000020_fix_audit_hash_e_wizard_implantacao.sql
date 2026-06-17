-- BUG DE PRODUÇÃO corrigido: generate_audit_hash fazia COALESCE(NEW.record_id, '')
-- onde record_id é UUID — o literal '' era coagido a UUID e falhava com
-- "invalid input syntax for type uuid", impedindo INSERT/UPDATE em QUALQUER
-- tabela auditada (counterparties incluída). Correção: cast ::text antes do COALESCE.
CREATE OR REPLACE FUNCTION public.generate_audit_hash()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_prev_hash TEXT; v_content TEXT;
BEGIN
  SELECT entry_hash INTO v_prev_hash FROM audit_logs
   WHERE company_id = NEW.company_id ORDER BY created_at DESC, id DESC LIMIT 1;
  NEW.prev_hash := COALESCE(v_prev_hash, 'GENESIS');
  v_content := COALESCE(NEW.prev_hash, '') || '|' ||
               NEW.company_id::text || '|' ||
               COALESCE(NEW.user_id::text, '') || '|' ||
               NEW.table_name || '|' ||
               NEW.action || '|' ||
               COALESCE(NEW.record_id::text, '') || '|' ||
               COALESCE(NEW.old_data::text, '') || '|' ||
               COALESCE(NEW.new_data::text, '') || '|' ||
               NEW.created_at::text;
  NEW.entry_hash := encode(sha256(v_content::bytea), 'hex');
  RETURN NEW;
END;
$function$;
