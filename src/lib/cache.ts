/**
 * Cache Layer - High-performance in-memory cache with TTL
 * Optimized for dashboard metrics and frequently accessed data
 */

interface CacheEntry<T> {
  value: T;
  expires: number;
  hits: number;
  createdAt: number;
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: string;
}

class CacheLayerClass {
  private store = new Map<string, CacheEntry<unknown>>();
  private totalHits = 0;
  private totalMisses = 0;
  private maxSize = 1000; // Maximum cache entries
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Auto-cleanup expired entries every 60 seconds
    if (typeof window !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }
  }

  /**
   * Get cached value by key
   */
  get<T>(key: string): T | null {
    const item = this.store.get(key) as CacheEntry<T> | undefined;
    
    if (!item) {
      this.totalMisses++;
      return null;
    }

    if (Date.now() > item.expires) {
      this.store.delete(key);
      this.totalMisses++;
      return null;
    }

    item.hits++;
    this.totalHits++;
    return item.value;
  }

  /**
   * Set cache value with TTL
   */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    // Evict LRU entries if cache is full
    if (this.store.size >= this.maxSize) {
      this.evictLRU();
    }

    this.store.set(key, {
      value,
      expires: Date.now() + (ttlSeconds * 1000),
      hits: 0,
      createdAt: Date.now(),
    });
  }

  /**
   * Get or set - returns cached value or executes getter and caches result
   */
  async getOrSet<T>(
    key: string, 
    getter: () => Promise<T>, 
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await getter();
    this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Invalidate keys matching pattern
   */
  invalidate(pattern: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate by prefix (more efficient for company-specific data)
   */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.totalHits + this.totalMisses;
    return {
      totalEntries: this.store.size,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRate: totalRequests > 0 ? (this.totalHits / totalRequests) * 100 : 0,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expires) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    const entries = Array.from(this.store.entries())
      .sort((a, b) => a[1].hits - b[1].hits);
    
    // Remove bottom 10% of entries
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    for (let i = 0; i < toRemove; i++) {
      this.store.delete(entries[i][0]);
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): string {
    let bytes = 0;
    for (const [key, entry] of this.store.entries()) {
      bytes += key.length * 2; // UTF-16
      bytes += JSON.stringify(entry.value).length * 2;
      bytes += 24; // metadata overhead
    }
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Dispose cache layer
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton export
export const CacheLayer = new CacheLayerClass();

/**
 * Cache key generators for consistent naming
 */
export const CacheKeys = {
  dashboard: (companyId: string) => `dashboard:${companyId}`,
  dashboardMetrics: (companyId: string, period: string) => 
    `dashboard:${companyId}:metrics:${period}`,
  kpis: (companyId: string) => `kpis:${companyId}`,
  cashflow: (companyId: string, year: number) => 
    `cashflow:${companyId}:${year}`,
  arAging: (companyId: string) => `ar-aging:${companyId}`,
  apAging: (companyId: string) => `ap-aging:${companyId}`,
  budgets: (companyId: string, year: number) => 
    `budgets:${companyId}:${year}`,
  transactions: (companyId: string, filters: string) => 
    `transactions:${companyId}:${filters}`,
  counterparties: (companyId: string) => `counterparties:${companyId}`,
  accounts: (companyId: string) => `accounts:${companyId}`,
  wallets: (companyId: string) => `wallets:${companyId}`,
  costCenters: (companyId: string) => `cost-centers:${companyId}`,
  users: (companyId: string) => `users:${companyId}`,
  permissions: (userId: string) => `permissions:${userId}`,
};

/**
 * Cache TTL presets (in seconds)
 */
export const CacheTTL = {
  SHORT: 60,        // 1 minute - real-time data
  MEDIUM: 300,      // 5 minutes - dashboard metrics
  LONG: 900,        // 15 minutes - semi-static data
  EXTENDED: 3600,   // 1 hour - reference data
  DAY: 86400,       // 24 hours - static data
};

/**
 * Hook for React Query integration with cache layer
 */
export function createCachedQueryFn<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM
): () => Promise<T> {
  return async () => {
    return CacheLayer.getOrSet(cacheKey, queryFn, ttl);
  };
}

/**
 * Decorator for caching async functions
 */
export function withCache<T extends (...args: unknown[]) => Promise<unknown>>(
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number = CacheTTL.MEDIUM
) {
  return function(target: T): T {
    return (async (...args: Parameters<T>) => {
      const key = keyGenerator(...args);
      return CacheLayer.getOrSet(key, () => target(...args), ttl);
    }) as T;
  };
}
