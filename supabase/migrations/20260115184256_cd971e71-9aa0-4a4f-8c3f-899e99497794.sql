-- Corrigir a última função sem search_path: generate_matricula

CREATE OR REPLACE FUNCTION public.generate_matricula()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_year text;
  v_seq int;
  v_new_matricula text;
BEGIN
  v_company_id := NEW.company_id;
  v_year := to_char(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN matricula ~ ('^' || v_year || '[0-9]{4}$') 
      THEN substring(matricula from 3 for 4)::int 
      ELSE 0 
    END
  ), 0) + 1
  INTO v_seq
  FROM funcionarios
  WHERE company_id = v_company_id
    AND matricula IS NOT NULL;
  
  v_new_matricula := v_year || lpad(v_seq::text, 4, '0');
  
  NEW.matricula := v_new_matricula;
  RETURN NEW;
END;
$function$;