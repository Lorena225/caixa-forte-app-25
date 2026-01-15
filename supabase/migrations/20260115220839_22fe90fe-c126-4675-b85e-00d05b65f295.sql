-- Remover função existente com assinatura diferente
DROP FUNCTION IF EXISTS public.check_rate_limit(uuid);

-- Função para verificar rate limit com parâmetros de limite
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_api_key_id uuid, 
  p_limit_per_minute integer, 
  p_limit_per_day integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count_minute integer;
  v_count_day integer;
BEGIN
  -- Contar requisições no último minuto
  SELECT COUNT(*) INTO v_count_minute
  FROM api_logs
  WHERE api_key_id = p_api_key_id
    AND created_at > now() - interval '1 minute';
  
  IF v_count_minute >= p_limit_per_minute THEN
    RETURN false;
  END IF;
  
  -- Contar requisições no último dia
  SELECT COUNT(*) INTO v_count_day
  FROM api_logs
  WHERE api_key_id = p_api_key_id
    AND created_at > now() - interval '1 day';
  
  IF v_count_day >= p_limit_per_day THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Função para registrar requisições de API
CREATE OR REPLACE FUNCTION public.log_api_request(
  p_api_key_id uuid,
  p_company_id uuid,
  p_method text,
  p_endpoint text,
  p_status_code integer,
  p_request_body jsonb DEFAULT NULL,
  p_response_body jsonb DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_latency_ms integer DEFAULT NULL,
  p_ip_address inet DEFAULT '0.0.0.0'::inet,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO api_logs (
    api_key_id,
    company_id,
    method,
    endpoint,
    status_code,
    request_body,
    response_body,
    error_message,
    latency_ms,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_api_key_id,
    p_company_id,
    p_method,
    p_endpoint,
    p_status_code,
    p_request_body,
    p_response_body,
    p_error_message,
    p_latency_ms,
    p_ip_address,
    p_user_agent,
    now()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION public.check_rate_limit(uuid, integer, integer) IS 'Verifica se a API key excedeu os limites de requisições por minuto ou por dia';
COMMENT ON FUNCTION public.log_api_request IS 'Registra uma requisição de API no log com todos os detalhes';