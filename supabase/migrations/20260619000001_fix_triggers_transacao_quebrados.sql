-- BLOQUEADOR CRÍTICO de go-live: criar QUALQUER título financeiro falhava porque
-- 3 triggers/funções disparados no insert de transactions referenciavam um schema
-- antigo. Descobertos por teste de cadastro real ponta a ponta.

-- 1. detect_transaction_anomaly: NEW.amount → NEW.total_amount
CREATE OR REPLACE FUNCTION public.detect_transaction_anomaly()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_z_score NUMERIC; v_threshold NUMERIC; v_settings RECORD;
BEGIN
  SELECT anomaly_detection_enabled, anomaly_z_score_threshold INTO v_settings
  FROM ai_company_settings WHERE company_id = NEW.company_id;
  IF NOT COALESCE(v_settings.anomaly_detection_enabled, TRUE) THEN RETURN NEW; END IF;
  v_threshold := COALESCE(v_settings.anomaly_z_score_threshold, 3.0);
  v_z_score := calculate_category_z_score(NEW.company_id, NEW.category_id, NEW.total_amount);
  IF v_z_score > v_threshold THEN
    INSERT INTO ai_insights (company_id, insight_type, severity, title, description, data_json,
      entity_type, entity_id, z_score, confidence_score, suggested_action)
    VALUES (NEW.company_id, 'anomaly',
      CASE WHEN v_z_score > 5 THEN 'critical' WHEN v_z_score > 4 THEN 'warning' ELSE 'info' END,
      'Despesa Atípica Detectada',
      format('Transação de %s está %s desvios padrão acima da média para esta categoria.',
        to_char(ABS(NEW.total_amount), 'FM999G999G999D00'), round(v_z_score, 1)),
      jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.total_amount,
        'category_id', NEW.category_id, 'z_score', v_z_score, 'threshold', v_threshold),
      'transaction', NEW.id, v_z_score, LEAST(95, 70 + (v_z_score * 5)),
      'Revisar esta transação para confirmar se está correta.');
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. calculate_category_z_score: amount → total_amount, status 'paid' → 'pago'
CREATE OR REPLACE FUNCTION public.calculate_category_z_score(p_company_id uuid, p_category_id uuid, p_amount numeric, p_months_lookback integer DEFAULT 6)
 RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_mean NUMERIC; v_stddev NUMERIC; v_z_score NUMERIC;
BEGIN
  SELECT COALESCE(AVG(ABS(total_amount)), 0), COALESCE(STDDEV(ABS(total_amount)), 0)
  INTO v_mean, v_stddev FROM transactions
  WHERE company_id = p_company_id AND category_id = p_category_id
    AND transaction_date >= CURRENT_DATE - (p_months_lookback * 30) AND status = 'pago';
  IF v_stddev = 0 OR v_stddev IS NULL THEN RETURN 0; END IF;
  v_z_score := (ABS(p_amount) - v_mean) / v_stddev;
  RETURN ROUND(v_z_score, 4);
END;
$function$;

-- 3. update_credit_utilization: credit_profiles inexistente + direction 'receivable'→'entrada'
CREATE OR REPLACE FUNCTION public.update_credit_utilization()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_counterparty_id UUID; v_company_id UUID;
BEGIN
  v_counterparty_id := COALESCE(NEW.counterparty_id, OLD.counterparty_id);
  v_company_id := COALESCE(NEW.company_id, OLD.company_id);
  IF v_counterparty_id IS NOT NULL AND v_company_id IS NOT NULL
     AND to_regclass('public.credit_profiles') IS NOT NULL THEN
    UPDATE public.credit_profiles cp SET
      credit_utilized = COALESCE((SELECT SUM(balance_amount) FROM public.transactions t
        WHERE t.counterparty_id = cp.counterparty_id AND t.company_id = cp.company_id
          AND t.direction = 'entrada' AND t.status IN ('lancado', 'rascunho')), 0),
      expected_loss = credit_utilized * default_probability, updated_at = now()
    WHERE cp.counterparty_id = v_counterparty_id AND cp.company_id = v_company_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
