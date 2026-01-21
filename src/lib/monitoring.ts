/**
 * Centralized Monitoring System
 * Error tracking, event logging, and alerting
 */

import { supabase } from '@/integrations/supabase/client';
import { PerformanceMonitor } from './performanceMonitor';

// Log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  userId?: string;
  companyId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
}

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  companyId?: string;
  metadata?: Record<string, unknown>;
}

interface AlertConfig {
  channel: 'console' | 'api' | 'all';
  minLevel: LogLevel;
  throttleMs?: number;
}

// Session ID for tracking
const sessionId = crypto.randomUUID();

// Throttle map for alerts
const alertThrottleMap = new Map<string, number>();

class MonitorClass {
  private config: AlertConfig = {
    channel: 'all',
    minLevel: 'warn',
    throttleMs: 60000, // 1 minute throttle for same error
  };

  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start buffer flush interval
    if (typeof window !== 'undefined') {
      this.flushInterval = setInterval(() => this.flushLogs(), 30000); // Every 30 seconds
      
      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flushLogs());
    }
  }

  /**
   * Configure monitor settings
   */
  configure(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Log an error with context
   */
  async logError(error: Error | string, context: ErrorContext = {}): Promise<void> {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    const entry = this.createLogEntry('error', errorObj.message, {
      stack: errorObj.stack,
      name: errorObj.name,
      ...context,
    });

    // Console output
    console.error('[Monitor ERROR]', {
      message: errorObj.message,
      stack: errorObj.stack,
      context,
    });

    // Add to buffer
    this.addToBuffer(entry);

    // Send critical errors immediately
    if (context.metadata?.critical) {
      await this.sendToAPI(entry);
    }

    // Track in performance monitor
    PerformanceMonitor.trackQuery(`error:${context.component || 'unknown'}`, 0, {
      error: errorObj.message,
    });
  }

  /**
   * Log a warning
   */
  async logWarning(message: string, data?: Record<string, unknown>): Promise<void> {
    const entry = this.createLogEntry('warn', message, data);

    console.warn('[Monitor WARN]', message, data);
    this.addToBuffer(entry);
  }

  /**
   * Log info message
   */
  async logInfo(message: string, data?: Record<string, unknown>): Promise<void> {
    const entry = this.createLogEntry('info', message, data);

    if (process.env.NODE_ENV === 'development') {
      console.info('[Monitor INFO]', message, data);
    }
    this.addToBuffer(entry);
  }

  /**
   * Log debug message (only in development)
   */
  async logDebug(message: string, data?: Record<string, unknown>): Promise<void> {
    if (process.env.NODE_ENV !== 'development') return;

    const entry = this.createLogEntry('debug', message, data);
    console.debug('[Monitor DEBUG]', message, data);
  }

  /**
   * Track user events for analytics
   */
  async trackEvent(
    event: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    const entry = this.createLogEntry('info', `EVENT: ${event}`, properties);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Monitor EVENT]', event, properties);
    }

    this.addToBuffer(entry);
  }

  /**
   * Track page views
   */
  async trackPageView(pageName: string, metadata?: Record<string, unknown>): Promise<void> {
    const startTime = performance.now();

    await this.trackEvent('page_view', {
      page: pageName,
      ...metadata,
    });

    // Track page load performance
    PerformanceMonitor.trackPageLoad(pageName, Math.round(performance.now() - startTime));
  }

  /**
   * Track feature usage
   */
  async trackFeature(featureName: string, action: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.trackEvent('feature_usage', {
      feature: featureName,
      action,
      ...metadata,
    });
  }

  /**
   * Send alert for critical issues
   */
  async sendAlert(
    title: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: Record<string, unknown>
  ): Promise<void> {
    // Throttle check
    const alertKey = `${title}:${severity}`;
    const lastSent = alertThrottleMap.get(alertKey);
    const now = Date.now();

    if (lastSent && now - lastSent < (this.config.throttleMs || 60000)) {
      console.log('[Monitor] Alert throttled:', alertKey);
      return;
    }

    alertThrottleMap.set(alertKey, now);

    const entry = this.createLogEntry('critical', `ALERT: ${title} - ${message}`, {
      severity,
      ...context,
    });

    console.error('[Monitor ALERT]', { title, message, severity, context });

    // Send immediately
    await this.sendToAPI(entry);
  }

  /**
   * Get session ID for tracking
   */
  getSessionId(): string {
    return sessionId;
  }

  /**
   * Get buffered logs
   */
  getBufferedLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  /**
   * Clear buffered logs
   */
  clearBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * Dispose monitor
   */
  dispose(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushLogs();
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      sessionId,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // Keep buffer size under limit
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    // Filter by min level
    const levelPriority: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4,
    };

    const minPriority = levelPriority[this.config.minLevel];
    const filteredLogs = logsToSend.filter(
      (log) => levelPriority[log.level] >= minPriority
    );

    if (filteredLogs.length > 0 && this.config.channel !== 'console') {
      // Batch send to API
      await this.sendBatchToAPI(filteredLogs);
    }
  }

  private async sendToAPI(entry: LogEntry): Promise<void> {
    if (this.config.channel === 'console') return;

    try {
      // Store in ai_logs table for monitoring
      await supabase.from('ai_logs').insert({
        company_id: entry.context?.companyId as string || '00000000-0000-0000-0000-000000000000',
        agent_type: 'monitor',
        origin: 'frontend',
        input_text: entry.message,
        input_raw: entry.context ? JSON.parse(JSON.stringify(entry.context)) : null,
        status: entry.level,
      });
    } catch (error) {
      console.error('[Monitor] Failed to send log to API:', error);
    }
  }

  private async sendBatchToAPI(entries: LogEntry[]): Promise<void> {
    if (this.config.channel === 'console') return;

    try {
      const records = entries.map((entry) => ({
        company_id: entry.context?.companyId as string || '00000000-0000-0000-0000-000000000000',
        agent_type: 'monitor',
        origin: 'frontend',
        input_text: entry.message,
        input_raw: entry.context ? JSON.parse(JSON.stringify(entry.context)) : null,
        status: entry.level,
      }));

      await supabase.from('ai_logs').insert(records);
    } catch (error) {
      console.error('[Monitor] Failed to batch send logs to API:', error);
    }
  }
}

// Singleton export
export const Monitor = new MonitorClass();

/**
 * React Error Boundary integration helper
 */
export function captureException(error: Error, context?: ErrorContext): void {
  Monitor.logError(error, context);
}

/**
 * Global error handler setup
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  // Catch unhandled errors
  window.onerror = (message, source, lineno, colno, error) => {
    Monitor.logError(error || String(message), {
      component: 'global',
      action: 'unhandled_error',
      metadata: { source, lineno, colno },
    });
    return false;
  };

  // Catch unhandled promise rejections
  window.onunhandledrejection = (event) => {
    Monitor.logError(event.reason || 'Unhandled Promise Rejection', {
      component: 'global',
      action: 'unhandled_rejection',
    });
  };
}

/**
 * Performance metrics summary
 */
export function getPerformanceSummary(): {
  queries: { avg: number; p95: number; slow: number };
  pages: { avg: number; p95: number };
} {
  const summary = PerformanceMonitor.getSummary();

  return {
    queries: {
      avg: summary.query.avgDuration,
      p95: summary.query.p95,
      slow: PerformanceMonitor.getSlowQueries(5).length,
    },
    pages: {
      avg: summary.page.avgDuration,
      p95: summary.page.p95,
    },
  };
}
