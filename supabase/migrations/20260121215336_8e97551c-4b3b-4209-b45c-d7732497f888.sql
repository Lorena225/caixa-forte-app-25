-- =============================================
-- MÓDULO 2.8: ESCALABILIDADE E PERFORMANCE
-- =============================================

-- 1. INDEXAÇÃO ESTRATÉGICA
-- =============================================

CREATE INDEX IF NOT EXISTS idx_transactions_company_status_date 
ON public.transactions (company_id, status, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_company_direction_date 
ON public.transactions (company_id, direction, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_company_counterparty 
ON public.transactions (company_id, counterparty_id) WHERE counterparty_id IS NOT NULL;

-- Partial indexes para dados ativos
CREATE INDEX IF NOT EXISTS idx_transactions_active 
ON public.transactions (company_id, due_date) 
WHERE status IN ('rascunho', 'lancado');

-- BRIN indexes para ranges de data
CREATE INDEX IF NOT EXISTS idx_transactions_created_brin 
ON public.transactions USING BRIN (created_at) WITH (pages_per_range = 128);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp_brin 
ON public.audit_logs USING BRIN (created_at) WITH (pages_per_range = 128);

-- Índices em counterparties
CREATE INDEX IF NOT EXISTS idx_counterparties_company_type 
ON public.counterparties (company_id, type);

CREATE INDEX IF NOT EXISTS idx_counterparties_company_active 
ON public.counterparties (company_id) WHERE is_active = true;

-- Índices em accounts
CREATE INDEX IF NOT EXISTS idx_accounts_company_category 
ON public.accounts (company_id, category_type);

CREATE INDEX IF NOT EXISTS idx_accounts_company_active 
ON public.accounts (company_id) WHERE is_active = true;

-- Índices em jobs_queue
CREATE INDEX IF NOT EXISTS idx_jobs_queue_pending 
ON public.jobs_queue (company_id, priority DESC, scheduled_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_jobs_queue_processing 
ON public.jobs_queue (company_id, started_at) 
WHERE status = 'processing';

-- 2. TABELA DE MÉTRICAS DE PERFORMANCE
-- =============================================

CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT DEFAULT 'ms',
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company isolation for performance_metrics" ON public.performance_metrics;
CREATE POLICY "Company isolation for performance_metrics"
ON public.performance_metrics FOR ALL
USING (public.user_has_company_access(company_id));

CREATE INDEX IF NOT EXISTS idx_performance_metrics_company_type 
ON public.performance_metrics (company_id, metric_type, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_brin 
ON public.performance_metrics USING BRIN (recorded_at) WITH (pages_per_range = 64);

-- 3. TABELA DE CACHE STATISTICS
-- =============================================

CREATE TABLE IF NOT EXISTS public.cache_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  cache_key TEXT NOT NULL,
  hits BIGINT DEFAULT 0,
  misses BIGINT DEFAULT 0,
  avg_load_time_ms NUMERIC DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  ttl_seconds INTEGER DEFAULT 300,
  size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cache_statistics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company isolation for cache_statistics" ON public.cache_statistics;
CREATE POLICY "Company isolation for cache_statistics"
ON public.cache_statistics FOR ALL
USING (public.user_has_company_access(company_id));

CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_statistics_company_key 
ON public.cache_statistics (company_id, cache_key);

-- 4. TABELA DE QUERY PERFORMANCE
-- =============================================

CREATE TABLE IF NOT EXISTS public.query_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  query_name TEXT NOT NULL,
  query_hash TEXT,
  execution_time_ms NUMERIC NOT NULL,
  rows_returned INTEGER DEFAULT 0,
  rows_scanned INTEGER DEFAULT 0,
  cache_hit BOOLEAN DEFAULT false,
  query_plan JSONB,
  parameters JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.query_performance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company isolation for query_performance_logs" ON public.query_performance_logs;
CREATE POLICY "Company isolation for query_performance_logs"
ON public.query_performance_logs FOR ALL
USING (public.user_has_company_access(company_id));

CREATE INDEX IF NOT EXISTS idx_query_performance_company_name 
ON public.query_performance_logs (company_id, query_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_query_performance_slow 
ON public.query_performance_logs (company_id, execution_time_ms DESC) 
WHERE execution_time_ms > 100;

CREATE INDEX IF NOT EXISTS idx_query_performance_created_brin 
ON public.query_performance_logs USING BRIN (created_at) WITH (pages_per_range = 64);

-- 5. MATERIALIZED VIEW PARA DASHBOARD CONSOLIDADO
-- =============================================

DROP MATERIALIZED VIEW IF EXISTS public.mv_performance_summary CASCADE;

CREATE MATERIALIZED VIEW public.mv_performance_summary AS
SELECT 
  company_id,
  metric_type,
  DATE_TRUNC('hour', recorded_at) as hour,
  COUNT(*) as sample_count,
  AVG(value) as avg_value,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value) as p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) as p99,
  MIN(value) as min_value,
  MAX(value) as max_value
FROM public.performance_metrics
WHERE recorded_at >= NOW() - INTERVAL '7 days'
GROUP BY company_id, metric_type, DATE_TRUNC('hour', recorded_at)
WITH NO DATA;

CREATE UNIQUE INDEX idx_mv_performance_summary_pk 
ON public.mv_performance_summary (company_id, metric_type, hour);

-- 6. MATERIALIZED VIEW PARA QUERY ANALYTICS
-- =============================================

DROP MATERIALIZED VIEW IF EXISTS public.mv_query_analytics CASCADE;

CREATE MATERIALIZED VIEW public.mv_query_analytics AS
SELECT 
  company_id,
  query_name,
  COUNT(*) as execution_count,
  AVG(execution_time_ms) as avg_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_time_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY execution_time_ms) as p99_time_ms,
  MAX(execution_time_ms) as max_time_ms,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100 as cache_hit_rate,
  SUM(rows_returned) as total_rows_returned,
  DATE_TRUNC('day', MIN(created_at)) as first_seen,
  DATE_TRUNC('day', MAX(created_at)) as last_seen
FROM public.query_performance_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY company_id, query_name
WITH NO DATA;

CREATE UNIQUE INDEX idx_mv_query_analytics_pk 
ON public.mv_query_analytics (company_id, query_name);

-- 7. FUNÇÕES DE OTIMIZAÇÃO
-- =============================================

CREATE OR REPLACE FUNCTION public.refresh_performance_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_performance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_query_analytics;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_performance_metric(
  p_company_id UUID,
  p_metric_type TEXT,
  p_metric_name TEXT,
  p_value NUMERIC,
  p_unit TEXT DEFAULT 'ms',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.performance_metrics (
    company_id, metric_type, metric_name, value, unit, metadata, recorded_at
  ) VALUES (
    p_company_id, p_metric_type, p_metric_name, p_value, p_unit, p_metadata, now()
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_query_performance(
  p_company_id UUID,
  p_query_name TEXT,
  p_execution_time_ms NUMERIC,
  p_rows_returned INTEGER DEFAULT 0,
  p_cache_hit BOOLEAN DEFAULT false,
  p_parameters JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.query_performance_logs (
    company_id, query_name, execution_time_ms, rows_returned, cache_hit, parameters
  ) VALUES (
    p_company_id, p_query_name, p_execution_time_ms, p_rows_returned, p_cache_hit, p_parameters
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_slow_queries(
  p_company_id UUID,
  p_threshold_ms NUMERIC DEFAULT 100,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  query_name TEXT,
  execution_count BIGINT,
  avg_time_ms NUMERIC,
  p95_time_ms NUMERIC,
  max_time_ms NUMERIC,
  cache_hit_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    query_name,
    COUNT(*) as execution_count,
    AVG(execution_time_ms) as avg_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_time_ms,
    MAX(execution_time_ms) as max_time_ms,
    (SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as cache_hit_rate
  FROM public.query_performance_logs
  WHERE company_id = p_company_id
    AND created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY query_name
  HAVING AVG(execution_time_ms) > p_threshold_ms
  ORDER BY avg_time_ms DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_cache_stats(p_company_id UUID)
RETURNS TABLE (
  total_keys BIGINT,
  total_hits BIGINT,
  total_misses BIGINT,
  hit_rate NUMERIC,
  total_size_mb NUMERIC,
  avg_load_time_ms NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) as total_keys,
    SUM(hits) as total_hits,
    SUM(misses) as total_misses,
    CASE 
      WHEN SUM(hits) + SUM(misses) > 0 
      THEN (SUM(hits)::NUMERIC / (SUM(hits) + SUM(misses)) * 100)
      ELSE 0 
    END as hit_rate,
    (SUM(size_bytes) / 1024.0 / 1024.0) as total_size_mb,
    AVG(avg_load_time_ms) as avg_load_time_ms
  FROM public.cache_statistics
  WHERE company_id = p_company_id;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_performance_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER := 0;
  v_count INTEGER;
BEGIN
  DELETE FROM public.performance_metrics 
  WHERE recorded_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted + v_count;
  
  DELETE FROM public.query_performance_logs 
  WHERE created_at < NOW() - INTERVAL '14 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted + v_count;
  
  ANALYZE public.performance_metrics;
  ANALYZE public.query_performance_logs;
  
  RETURN v_deleted;
END;
$$;

-- 8. TABELA DE SLA TRACKING
-- =============================================

CREATE TABLE IF NOT EXISTS public.sla_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_requests BIGINT DEFAULT 0,
  successful_requests BIGINT DEFAULT 0,
  failed_requests BIGINT DEFAULT 0,
  p50_latency_ms NUMERIC,
  p95_latency_ms NUMERIC,
  p99_latency_ms NUMERIC,
  availability_pct NUMERIC,
  error_rate_pct NUMERIC,
  cache_hit_rate_pct NUMERIC,
  avg_db_query_time_ms NUMERIC,
  peak_concurrent_users INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, metric_date)
);

ALTER TABLE public.sla_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company isolation for sla_metrics" ON public.sla_metrics;
CREATE POLICY "Company isolation for sla_metrics"
ON public.sla_metrics FOR ALL
USING (public.user_has_company_access(company_id));

CREATE INDEX IF NOT EXISTS idx_sla_metrics_company_date 
ON public.sla_metrics (company_id, metric_date DESC);

CREATE OR REPLACE FUNCTION public.update_daily_sla_metrics(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
  v_successful BIGINT;
  v_p50 NUMERIC;
  v_p95 NUMERIC;
  v_p99 NUMERIC;
  v_cache_hit_rate NUMERIC;
  v_avg_db_time NUMERIC;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE value < 500),
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value),
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value),
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value)
  INTO v_total, v_successful, v_p50, v_p95, v_p99
  FROM public.performance_metrics
  WHERE company_id = p_company_id
    AND metric_type = 'api_latency'
    AND recorded_at >= CURRENT_DATE;
  
  SELECT 
    CASE 
      WHEN SUM(hits) + SUM(misses) > 0 
      THEN (SUM(hits)::NUMERIC / (SUM(hits) + SUM(misses)) * 100)
      ELSE 0 
    END
  INTO v_cache_hit_rate
  FROM public.cache_statistics
  WHERE company_id = p_company_id;
  
  SELECT AVG(execution_time_ms)
  INTO v_avg_db_time
  FROM public.query_performance_logs
  WHERE company_id = p_company_id
    AND created_at >= CURRENT_DATE;
  
  INSERT INTO public.sla_metrics (
    company_id, metric_date, total_requests, successful_requests, failed_requests,
    p50_latency_ms, p95_latency_ms, p99_latency_ms, availability_pct, error_rate_pct,
    cache_hit_rate_pct, avg_db_query_time_ms, updated_at
  ) VALUES (
    p_company_id, CURRENT_DATE, COALESCE(v_total, 0), COALESCE(v_successful, 0), 
    COALESCE(v_total - v_successful, 0),
    v_p50, v_p95, v_p99,
    CASE WHEN v_total > 0 THEN (v_successful::NUMERIC / v_total * 100) ELSE 100 END,
    CASE WHEN v_total > 0 THEN ((v_total - v_successful)::NUMERIC / v_total * 100) ELSE 0 END,
    COALESCE(v_cache_hit_rate, 0),
    v_avg_db_time,
    now()
  )
  ON CONFLICT (company_id, metric_date) DO UPDATE SET
    total_requests = EXCLUDED.total_requests,
    successful_requests = EXCLUDED.successful_requests,
    failed_requests = EXCLUDED.failed_requests,
    p50_latency_ms = EXCLUDED.p50_latency_ms,
    p95_latency_ms = EXCLUDED.p95_latency_ms,
    p99_latency_ms = EXCLUDED.p99_latency_ms,
    availability_pct = EXCLUDED.availability_pct,
    error_rate_pct = EXCLUDED.error_rate_pct,
    cache_hit_rate_pct = EXCLUDED.cache_hit_rate_pct,
    avg_db_query_time_ms = EXCLUDED.avg_db_query_time_ms,
    updated_at = now();
END;
$$;

-- 9. REFRESH INICIAL DAS MATERIALIZED VIEWS
-- =============================================

REFRESH MATERIALIZED VIEW public.mv_performance_summary;
REFRESH MATERIALIZED VIEW public.mv_query_analytics;