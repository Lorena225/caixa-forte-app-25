/**
 * Performance Tracking Hooks
 * Módulo 2.8: Escalabilidade e Otimização de Performance
 */

import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { 
  PerformanceTrackingService, 
  SlowQueryResult, 
  CacheStatsResult,
  SLAMetrics 
} from '@/services/PerformanceTrackingService';
import { format, subDays } from 'date-fns';

/**
 * Initialize performance tracking with company context
 */
export function usePerformanceTrackingInit(): void {
  const { currentCompany } = useAuth();

  useEffect(() => {
    if (currentCompany?.id) {
      PerformanceTrackingService.setCompanyId(currentCompany.id);
    } else {
      PerformanceTrackingService.setCompanyId(null);
    }
  }, [currentCompany?.id]);
}

/**
 * Track page load performance
 */
export function usePageLoadTracking(pageName: string): void {
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    const loadTime = performance.now() - startTimeRef.current;
    PerformanceTrackingService.trackPageLoad(pageName, loadTime);
  }, [pageName]);
}

/**
 * Track component render performance
 */
export function useRenderTracking(componentName: string): void {
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current += 1;
    const renderStart = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStart;
      if (renderTime > 16) { // Only track slow renders (>16ms = <60fps)
        PerformanceTrackingService.trackRender(componentName, renderTime);
      }
    };
  });
}

/**
 * Create a tracked query function
 */
export function useTrackedQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchInterval?: number;
  }
) {
  const wrappedQueryFn = useCallback(async () => {
    const startTime = performance.now();
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      
      PerformanceTrackingService.trackQuery({
        queryName,
        executionTimeMs: duration,
        rowsReturned: Array.isArray(result) ? result.length : 1,
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
  }, [queryName, queryFn]);

  return useQuery({
    queryKey: [queryName],
    queryFn: wrappedQueryFn,
    ...options
  });
}

/**
 * Get slow queries
 */
export function useSlowQueries(thresholdMs = 100) {
  const { currentCompany } = useAuth();

  return useQuery<SlowQueryResult[]>({
    queryKey: ['slow-queries', currentCompany?.id, thresholdMs],
    queryFn: () => PerformanceTrackingService.getSlowQueries(thresholdMs),
    enabled: !!currentCompany?.id,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
}

/**
 * Get cache statistics
 */
export function useCacheStats() {
  const { currentCompany } = useAuth();

  return useQuery<CacheStatsResult | null>({
    queryKey: ['cache-stats', currentCompany?.id],
    queryFn: () => PerformanceTrackingService.getCacheStats(),
    enabled: !!currentCompany?.id,
    refetchInterval: 15000 // Refresh every 15 seconds
  });
}

/**
 * Get SLA metrics for date range
 */
export function useSLAMetrics(days = 7) {
  const { currentCompany } = useAuth();
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

  return useQuery<SLAMetrics[]>({
    queryKey: ['sla-metrics', currentCompany?.id, startDate, endDate],
    queryFn: () => PerformanceTrackingService.getSLAMetrics(startDate, endDate),
    enabled: !!currentCompany?.id,
    staleTime: 60000 // Consider fresh for 1 minute
  });
}

/**
 * Refresh performance views
 */
export function useRefreshPerformanceViews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => PerformanceTrackingService.refreshViews(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slow-queries'] });
      queryClient.invalidateQueries({ queryKey: ['sla-metrics'] });
    }
  });
}

/**
 * Cleanup old performance data
 */
export function useCleanupPerformanceData() {
  return useMutation({
    mutationFn: () => PerformanceTrackingService.cleanup()
  });
}

/**
 * Performance metrics summary for dashboard
 */
export function usePerformanceSummary() {
  const slowQueries = useSlowQueries(100);
  const cacheStats = useCacheStats();
  const slaMetrics = useSLAMetrics(7);

  const latestSLA = slaMetrics.data?.[0];

  return {
    isLoading: slowQueries.isLoading || cacheStats.isLoading || slaMetrics.isLoading,
    slowQueriesCount: slowQueries.data?.length || 0,
    cacheHitRate: cacheStats.data?.hit_rate || 0,
    p50Latency: latestSLA?.p50LatencyMs || 0,
    p95Latency: latestSLA?.p95LatencyMs || 0,
    p99Latency: latestSLA?.p99LatencyMs || 0,
    availability: latestSLA?.availabilityPct || 100,
    errorRate: latestSLA?.errorRatePct || 0,
    avgDbQueryTime: latestSLA?.avgDbQueryTimeMs || 0,
    slowQueries: slowQueries.data || [],
    cacheStats: cacheStats.data,
    slaHistory: slaMetrics.data || []
  };
}
