/**
 * Performance Tracking Service
 * Módulo 2.8: Escalabilidade e Otimização de Performance
 * Serviço para registrar métricas de performance no banco de dados
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface PerformanceMetric {
  metricType: 'api_latency' | 'db_query' | 'page_load' | 'component_render' | 'cache_operation';
  metricName: string;
  value: number;
  unit?: string;
  metadata?: Json;
}

export interface QueryPerformanceLog {
  queryName: string;
  executionTimeMs: number;
  rowsReturned?: number;
  cacheHit?: boolean;
  parameters?: Json;
}

export interface SlowQueryResult {
  query_name: string;
  execution_count: number;
  avg_time_ms: number;
  p95_time_ms: number;
  max_time_ms: number;
  cache_hit_rate: number;
}

export interface CacheStatsResult {
  total_keys: number;
  total_hits: number;
  total_misses: number;
  hit_rate: number;
  total_size_mb: number;
  avg_load_time_ms: number;
}

export interface SLAMetrics {
  metricDate: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;
  availabilityPct: number;
  errorRatePct: number;
  cacheHitRatePct: number;
  avgDbQueryTimeMs: number | null;
}

class PerformanceTrackingServiceClass {
  private buffer: PerformanceMetric[] = [];
  private queryBuffer: QueryPerformanceLog[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private companyId: string | null = null;
  private isEnabled = true;

  constructor() {
    // Flush buffer every 10 seconds
    this.flushInterval = setInterval(() => this.flush(), 10000);
  }

  setCompanyId(companyId: string | null): void {
    this.companyId = companyId;
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Track a performance metric
   */
  track(metric: PerformanceMetric): void {
    if (!this.isEnabled || !this.companyId) return;
    this.buffer.push(metric);

    // Auto-flush if buffer is large
    if (this.buffer.length >= 50) {
      this.flush();
    }
  }

  /**
   * Track API call latency
   */
  trackAPI(endpoint: string, durationMs: number, metadata?: Json): void {
    this.track({
      metricType: 'api_latency',
      metricName: endpoint,
      value: durationMs,
      unit: 'ms',
      metadata
    });
  }

  /**
   * Track database query performance
   */
  trackQuery(log: QueryPerformanceLog): void {
    if (!this.isEnabled || !this.companyId) return;
    this.queryBuffer.push(log);

    if (this.queryBuffer.length >= 20) {
      this.flushQueries();
    }
  }

  /**
   * Track page load time
   */
  trackPageLoad(pageName: string, durationMs: number): void {
    this.track({
      metricType: 'page_load',
      metricName: pageName,
      value: durationMs,
      unit: 'ms'
    });
  }

  /**
   * Track component render time
   */
  trackRender(componentName: string, durationMs: number): void {
    this.track({
      metricType: 'component_render',
      metricName: componentName,
      value: durationMs,
      unit: 'ms'
    });
  }

  /**
   * Start a timer and return a function to stop it
   */
  startTimer(metricType: PerformanceMetric['metricType'], metricName: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.track({
        metricType,
        metricName,
        value: duration,
        unit: 'ms'
      });
    };
  }

  /**
   * Flush metrics buffer to database
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.companyId) return;

    const metricsToFlush = [...this.buffer];
    this.buffer = [];

    try {
      const inserts = metricsToFlush.map(m => ({
        company_id: this.companyId,
        metric_type: m.metricType,
        metric_name: m.metricName,
        value: m.value,
        unit: m.unit || 'ms',
        metadata: m.metadata || {}
      }));

      const { error } = await supabase
        .from('performance_metrics')
        .insert(inserts);

      if (error) {
        console.warn('[PerformanceTracking] Failed to flush metrics:', error.message);
        // Re-add failed metrics back to buffer (up to a limit)
        if (this.buffer.length < 100) {
          this.buffer.unshift(...metricsToFlush.slice(0, 50));
        }
      }
    } catch (err) {
      console.warn('[PerformanceTracking] Error flushing metrics:', err);
    }
  }

  /**
   * Flush query performance logs to database
   */
  async flushQueries(): Promise<void> {
    if (this.queryBuffer.length === 0 || !this.companyId) return;

    const queriesToFlush = [...this.queryBuffer];
    this.queryBuffer = [];

    try {
      const inserts = queriesToFlush.map(q => ({
        company_id: this.companyId,
        query_name: q.queryName,
        execution_time_ms: q.executionTimeMs,
        rows_returned: q.rowsReturned || 0,
        cache_hit: q.cacheHit || false,
        parameters: q.parameters || null
      }));

      const { error } = await supabase
        .from('query_performance_logs')
        .insert(inserts);

      if (error) {
        console.warn('[PerformanceTracking] Failed to flush query logs:', error.message);
      }
    } catch (err) {
      console.warn('[PerformanceTracking] Error flushing query logs:', err);
    }
  }

  /**
   * Get slow queries for the current company
   */
  async getSlowQueries(thresholdMs = 100, limit = 20): Promise<SlowQueryResult[]> {
    if (!this.companyId) return [];

    const { data, error } = await supabase
      .rpc('get_slow_queries', {
        p_company_id: this.companyId,
        p_threshold_ms: thresholdMs,
        p_limit: limit
      });

    if (error) {
      console.error('[PerformanceTracking] Error fetching slow queries:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get cache statistics for the current company
   */
  async getCacheStats(): Promise<CacheStatsResult | null> {
    if (!this.companyId) return null;

    const { data, error } = await supabase
      .rpc('get_cache_stats', {
        p_company_id: this.companyId
      });

    if (error) {
      console.error('[PerformanceTracking] Error fetching cache stats:', error);
      return null;
    }

    return data?.[0] || null;
  }

  /**
   * Get SLA metrics for a date range
   */
  async getSLAMetrics(startDate: string, endDate: string): Promise<SLAMetrics[]> {
    if (!this.companyId) return [];

    const { data, error } = await supabase
      .from('sla_metrics')
      .select('*')
      .eq('company_id', this.companyId)
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)
      .order('metric_date', { ascending: false });

    if (error) {
      console.error('[PerformanceTracking] Error fetching SLA metrics:', error);
      return [];
    }

    return (data || []).map(row => ({
      metricDate: row.metric_date,
      totalRequests: Number(row.total_requests),
      successfulRequests: Number(row.successful_requests),
      failedRequests: Number(row.failed_requests),
      p50LatencyMs: row.p50_latency_ms ? Number(row.p50_latency_ms) : null,
      p95LatencyMs: row.p95_latency_ms ? Number(row.p95_latency_ms) : null,
      p99LatencyMs: row.p99_latency_ms ? Number(row.p99_latency_ms) : null,
      availabilityPct: Number(row.availability_pct) || 100,
      errorRatePct: Number(row.error_rate_pct) || 0,
      cacheHitRatePct: Number(row.cache_hit_rate_pct) || 0,
      avgDbQueryTimeMs: row.avg_db_query_time_ms ? Number(row.avg_db_query_time_ms) : null
    }));
  }

  /**
   * Refresh performance materialized views
   */
  async refreshViews(): Promise<boolean> {
    const { error } = await supabase.rpc('refresh_performance_views');
    
    if (error) {
      console.error('[PerformanceTracking] Error refreshing views:', error);
      return false;
    }
    
    return true;
  }

  /**
   * Cleanup old performance data
   */
  async cleanup(): Promise<number> {
    const { data, error } = await supabase.rpc('cleanup_old_performance_data');
    
    if (error) {
      console.error('[PerformanceTracking] Error cleaning up data:', error);
      return 0;
    }
    
    return data || 0;
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
    this.flushQueries();
  }
}

// Singleton instance
export const PerformanceTrackingService = new PerformanceTrackingServiceClass();

/**
 * HOC to track query performance
 */
export function withQueryTracking<T>(
  queryName: string,
  queryFn: () => Promise<{ data: T; count?: number }>
): () => Promise<{ data: T; count?: number }> {
  return async () => {
    const startTime = performance.now();
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      
      PerformanceTrackingService.trackQuery({
        queryName,
        executionTimeMs: duration,
        rowsReturned: Array.isArray(result.data) ? result.data.length : (result.count || 1),
        cacheHit: false
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      PerformanceTrackingService.trackQuery({
        queryName,
        executionTimeMs: duration,
        rowsReturned: 0,
        cacheHit: false
      });
      throw error;
    }
  };
}

/**
 * Hook-friendly timer
 */
export function createPerformanceTimer(
  metricType: PerformanceMetric['metricType'],
  metricName: string
): { start: () => void; stop: () => void } {
  let startTime = 0;
  
  return {
    start: () => {
      startTime = performance.now();
    },
    stop: () => {
      if (startTime > 0) {
        const duration = performance.now() - startTime;
        PerformanceTrackingService.track({
          metricType,
          metricName,
          value: duration,
          unit: 'ms'
        });
        startTime = 0;
      }
    }
  };
}
