import { useState, useEffect, useCallback, useRef } from 'react';

interface MetricsData {
  transactions?: Array<{
    amount: number;
    type: 'income' | 'expense';
    date: string;
    status: string;
    category?: string;
  }>;
  invoices?: Array<{
    amount: number;
    due_date: string;
    status: string;
    paid_date?: string;
  }>;
  period?: {
    start: string;
    end: string;
  };
}

interface CalculatedMetrics {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
  averageTransaction: number;
  categoryBreakdown: Record<string, number>;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expense: number;
    net: number;
  }>;
  overdueSummary: {
    count: number;
    totalAmount: number;
    averageDaysOverdue: number;
  };
  cashFlowProjection: Array<{
    date: string;
    projected: number;
    cumulative: number;
  }>;
}

interface TrendsData {
  growthRate: number;
  volatility: number;
  seasonalityIndex: Record<string, number>;
}

interface WorkerResult {
  metrics: CalculatedMetrics | null;
  trends: TrendsData | null;
  isCalculating: boolean;
  error: string | null;
}

/**
 * Hook to use Web Worker for heavy metrics calculations
 * Offloads CPU-intensive work from the main thread
 */
export function useMetricsWorker(data: MetricsData | null): WorkerResult {
  const [metrics, setMetrics] = useState<CalculatedMetrics | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker
  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL('../workers/metricsWorker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (event) => {
        const { success, metrics: resultMetrics, trends: resultTrends, error: workerError } = event.data;
        
        if (success) {
          if (resultMetrics) setMetrics(resultMetrics);
          if (resultTrends) setTrends(resultTrends);
          setError(null);
        } else {
          setError(workerError || 'Unknown worker error');
        }
        setIsCalculating(false);
      };

      workerRef.current.onerror = (e) => {
        console.error('Metrics worker error:', e);
        setError('Worker error: ' + e.message);
        setIsCalculating(false);
      };
    } catch (e) {
      console.warn('Web Worker not supported, falling back to main thread');
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Calculate when data changes
  useEffect(() => {
    if (!data || (!data.transactions?.length && !data.invoices?.length)) {
      setMetrics(null);
      setTrends(null);
      return;
    }

    if (workerRef.current) {
      setIsCalculating(true);
      workerRef.current.postMessage({ type: 'calculate', data });
    }
  }, [data]);

  return { metrics, trends, isCalculating, error };
}

/**
 * Hook for on-demand calculations with manual trigger
 */
export function useMetricsWorkerManual() {
  const [result, setResult] = useState<{
    metrics: CalculatedMetrics | null;
    trends: TrendsData | null;
  }>({ metrics: null, trends: null });
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL('../workers/metricsWorker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (event) => {
        const { success, metrics, trends, error: workerError } = event.data;
        
        if (success) {
          setResult({ metrics: metrics || null, trends: trends || null });
          setError(null);
        } else {
          setError(workerError);
        }
        setIsCalculating(false);
      };

      workerRef.current.onerror = (e) => {
        setError('Worker error: ' + e.message);
        setIsCalculating(false);
      };
    } catch (e) {
      console.warn('Web Worker not supported');
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const calculate = useCallback((data: MetricsData, type: 'calculate' | 'metrics-only' | 'trends-only' = 'calculate') => {
    if (workerRef.current) {
      setIsCalculating(true);
      setError(null);
      workerRef.current.postMessage({ type, data });
    }
  }, []);

  return {
    ...result,
    isCalculating,
    error,
    calculate,
  };
}
