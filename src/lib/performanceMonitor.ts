/**
 * Performance Monitoring Utilities
 * Tracks query times, page loads, and component renders
 * 
 * Targets:
 * - Dashboard load: < 2 seconds
 * - Query time: < 500ms
 * - API response: < 100ms (P95)
 * - Bundle size: < 500KB
 * - Lighthouse score: >= 80
 */

interface PerformanceEntry {
  name: string;
  duration: number;
  timestamp: number;
  type: 'query' | 'page' | 'api' | 'render';
  metadata?: Record<string, unknown>;
}

interface PerformanceStats {
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
}

// Thresholds for warnings
const THRESHOLDS = {
  query: 500,      // 500ms
  page: 2000,      // 2 seconds
  api: 100,        // 100ms
  render: 50,      // 50ms
} as const;

class PerformanceMonitorClass {
  private entries: PerformanceEntry[] = [];
  private maxEntries = 1000;
  private isEnabled = true;
  private slowQueryCallback?: (entry: PerformanceEntry) => void;

  constructor() {
    // Cleanup old entries periodically
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 60000); // Every minute
    }
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Set callback for slow queries (for alerting)
   */
  onSlowQuery(callback: (entry: PerformanceEntry) => void): void {
    this.slowQueryCallback = callback;
  }

  /**
   * Track a database query
   */
  trackQuery(queryName: string, duration: number, metadata?: Record<string, unknown>): void {
    if (!this.isEnabled) return;

    const entry: PerformanceEntry = {
      name: queryName,
      duration,
      timestamp: Date.now(),
      type: 'query',
      metadata,
    };

    this.addEntry(entry);

    if (duration > THRESHOLDS.query) {
      console.warn(`[SLOW QUERY] ${queryName} took ${duration}ms (threshold: ${THRESHOLDS.query}ms)`);
      this.slowQueryCallback?.(entry);
    }
  }

  /**
   * Track page load time
   */
  trackPageLoad(pageName: string, duration: number): void {
    if (!this.isEnabled) return;

    const entry: PerformanceEntry = {
      name: pageName,
      duration,
      timestamp: Date.now(),
      type: 'page',
    };

    this.addEntry(entry);

    if (duration > THRESHOLDS.page) {
      console.warn(`[SLOW PAGE] ${pageName} took ${duration}ms (threshold: ${THRESHOLDS.page}ms)`);
    }
  }

  /**
   * Track API call duration
   */
  trackAPI(endpoint: string, duration: number, metadata?: Record<string, unknown>): void {
    if (!this.isEnabled) return;

    const entry: PerformanceEntry = {
      name: endpoint,
      duration,
      timestamp: Date.now(),
      type: 'api',
      metadata,
    };

    this.addEntry(entry);

    if (duration > THRESHOLDS.api) {
      console.warn(`[SLOW API] ${endpoint} took ${duration}ms (threshold: ${THRESHOLDS.api}ms)`);
    }
  }

  /**
   * Track component render time
   */
  trackRender(componentName: string, duration: number): void {
    if (!this.isEnabled) return;

    const entry: PerformanceEntry = {
      name: componentName,
      duration,
      timestamp: Date.now(),
      type: 'render',
    };

    this.addEntry(entry);

    if (duration > THRESHOLDS.render) {
      console.warn(`[SLOW RENDER] ${componentName} took ${duration}ms`);
    }
  }

  /**
   * Create a timer for measuring duration
   */
  startTimer(): () => number {
    const start = performance.now();
    return () => Math.round(performance.now() - start);
  }

  /**
   * Measure async operation
   */
  async measure<T>(
    name: string,
    type: PerformanceEntry['type'],
    operation: () => Promise<T>
  ): Promise<T> {
    const stopTimer = this.startTimer();
    try {
      const result = await operation();
      const duration = stopTimer();
      
      switch (type) {
        case 'query':
          this.trackQuery(name, duration);
          break;
        case 'api':
          this.trackAPI(name, duration);
          break;
        case 'page':
          this.trackPageLoad(name, duration);
          break;
        default:
          this.trackRender(name, duration);
      }
      
      return result;
    } catch (error) {
      const duration = stopTimer();
      this.trackQuery(`${name} (error)`, duration, { error: String(error) });
      throw error;
    }
  }

  /**
   * Get statistics for a specific metric type
   */
  getStats(type?: PerformanceEntry['type']): PerformanceStats {
    const filtered = type 
      ? this.entries.filter(e => e.type === type)
      : this.entries;

    if (filtered.length === 0) {
      return {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const durations = filtered.map(e => e.duration).sort((a, b) => a - b);
    const count = durations.length;
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      count,
      totalDuration,
      avgDuration: Math.round(totalDuration / count),
      minDuration: durations[0],
      maxDuration: durations[count - 1],
      p50: durations[Math.floor(count * 0.5)],
      p95: durations[Math.floor(count * 0.95)],
      p99: durations[Math.floor(count * 0.99)],
    };
  }

  /**
   * Get slow queries in the last N minutes
   */
  getSlowQueries(minutes: number = 5): PerformanceEntry[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.entries
      .filter(e => e.type === 'query' && e.timestamp > cutoff && e.duration > THRESHOLDS.query)
      .sort((a, b) => b.duration - a.duration);
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, PerformanceStats> {
    return {
      query: this.getStats('query'),
      page: this.getStats('page'),
      api: this.getStats('api'),
      render: this.getStats('render'),
    };
  }

  /**
   * Export entries for analysis
   */
  exportEntries(): PerformanceEntry[] {
    return [...this.entries];
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  private addEntry(entry: PerformanceEntry): void {
    this.entries.push(entry);
    
    // Keep only the most recent entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  private cleanup(): void {
    // Remove entries older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.entries = this.entries.filter(e => e.timestamp > oneHourAgo);
  }
}

// Singleton export
export const PerformanceMonitor = new PerformanceMonitorClass();

/**
 * React hook for component render tracking
 */
export function usePerformanceTracking(componentName: string): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const startTime = performance.now();
    
    // Track on next tick after render
    Promise.resolve().then(() => {
      const duration = Math.round(performance.now() - startTime);
      PerformanceMonitor.trackRender(componentName, duration);
    });
  }
}

/**
 * Higher-order function to wrap async functions with performance tracking
 */
export function withPerformanceTracking<T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
  name: string,
  type: PerformanceEntry['type'],
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    return PerformanceMonitor.measure(name, type, () => fn(...args));
  }) as T;
}

/**
 * Decorator for tracking query performance
 */
export function trackQueryPerformance(queryName: string) {
  return function <T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
    fn: T
  ): T {
    return withPerformanceTracking(queryName, 'query', fn);
  };
}
