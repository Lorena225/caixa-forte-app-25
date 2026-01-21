import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { PerformanceMonitor } from './performanceMonitor';

/**
 * Web Vitals Integration
 * Tracks Core Web Vitals metrics for real-user monitoring
 * 
 * Metrics tracked:
 * - LCP (Largest Contentful Paint): Loading performance
 * - INP (Interaction to Next Paint): Interactivity (replaces FID)
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FCP (First Contentful Paint): First render
 * - TTFB (Time to First Byte): Server response
 */

// Thresholds based on Google's recommendations
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // ms
  INP: { good: 200, needsImprovement: 500 },   // ms (replaced FID)
  CLS: { good: 0.1, needsImprovement: 0.25 },  // score
  FCP: { good: 1800, needsImprovement: 3000 }, // ms
  TTFB: { good: 800, needsImprovement: 1800 }, // ms
};

type Rating = 'good' | 'needs-improvement' | 'poor';

function getRating(name: string, value: number): Rating {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

function handleMetric(metric: Metric) {
  const rating = getRating(metric.name, metric.value);
  
  // Log to performance monitor
  PerformanceMonitor.trackPageLoad(
    `web-vital:${metric.name}`,
    metric.value
  );

  // Console log for development
  if (import.meta.env.DEV) {
    const color = rating === 'good' ? '🟢' : rating === 'needs-improvement' ? '🟡' : '🔴';
    console.log(
      `${color} ${metric.name}: ${metric.value.toFixed(2)}${metric.name === 'CLS' ? '' : 'ms'} (${rating})`
    );
  }

  // Send to analytics endpoint if in production
  if (import.meta.env.PROD) {
    sendToAnalytics(metric, rating);
  }
}

async function sendToAnalytics(metric: Metric, rating: Rating) {
  try {
    // Use sendBeacon for reliable delivery even during page unload
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating,
      id: metric.id,
      page: window.location.pathname,
      navigationType: metric.navigationType,
      timestamp: Date.now(),
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/vitals', body);
    } else {
      // Fallback for older browsers
      fetch('/api/vitals', {
        method: 'POST',
        body,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    // Silently fail - vitals reporting should not break the app
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this once in your app's entry point
 */
export function initWebVitals() {
  try {
    // Core Web Vitals (2024: LCP, INP, CLS)
    onCLS(handleMetric);
    onINP(handleMetric);
    onLCP(handleMetric);
    
    // Additional metrics
    onFCP(handleMetric);
    onTTFB(handleMetric);

    console.log('📊 Web Vitals tracking initialized');
  } catch (e) {
    console.warn('Web Vitals initialization failed:', e);
  }
}

/**
 * Get current Web Vitals summary
 * Useful for displaying in admin dashboards
 */
export function getWebVitalsSummary(): Record<string, { value: number; rating: Rating } | null> {
  const vitals: Record<string, { value: number; rating: Rating } | null> = {
    LCP: null,
    INP: null,
    CLS: null,
    FCP: null,
    TTFB: null,
  };

  // Extract vitals from performance entries
  const entries = PerformanceMonitor.exportEntries()
    .filter(e => e.name.startsWith('web-vital:'));

  for (const entry of entries) {
    const name = entry.name.replace('web-vital:', '');
    if (name in vitals) {
      vitals[name] = {
        value: entry.duration,
        rating: getRating(name, entry.duration),
      };
    }
  }

  return vitals;
}

/**
 * Check if current session meets performance SLAs
 */
export function checkPerformanceSLA(): {
  meets: boolean;
  details: Record<string, { target: number; actual: number | null; met: boolean }>;
} {
  const summary = getWebVitalsSummary();
  
  const details = {
    LCP: {
      target: THRESHOLDS.LCP.good,
      actual: summary.LCP?.value ?? null,
      met: summary.LCP ? summary.LCP.value <= THRESHOLDS.LCP.good : true,
    },
    INP: {
      target: THRESHOLDS.INP.good,
      actual: summary.INP?.value ?? null,
      met: summary.INP ? summary.INP.value <= THRESHOLDS.INP.good : true,
    },
    CLS: {
      target: THRESHOLDS.CLS.good,
      actual: summary.CLS?.value ?? null,
      met: summary.CLS ? summary.CLS.value <= THRESHOLDS.CLS.good : true,
    },
  };

  const meets = Object.values(details).every(d => d.met);

  return { meets, details };
}

export { THRESHOLDS };
