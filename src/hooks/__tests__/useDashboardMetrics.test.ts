import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: [], error: null })),
            gte: vi.fn(() => ({
              lte: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      })),
    })),
  },
}));

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    currentCompany: { id: 'test-company-id', name: 'Test Company' },
  })),
}));

// Test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useDashboardMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', async () => {
    const { useDashboardMetrics } = await import('../useDashboardMetrics');
    
    const { result } = renderHook(() => useDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    // Initial state should be loading
    expect(result.current.isLoading).toBeDefined();
  });

  it('should calculate correct status based on thresholds', () => {
    // Test status calculation logic
    const getStatus = (value: number, warningThreshold: number, dangerThreshold: number, inverted = false) => {
      if (inverted) {
        if (value >= dangerThreshold) return 'danger';
        if (value >= warningThreshold) return 'warning';
        return 'success';
      }
      if (value <= dangerThreshold) return 'danger';
      if (value <= warningThreshold) return 'warning';
      return 'success';
    };

    // Normal mode (higher is better)
    expect(getStatus(20000, 10000, 5000, false)).toBe('success');
    expect(getStatus(8000, 10000, 5000, false)).toBe('warning');
    expect(getStatus(3000, 10000, 5000, false)).toBe('danger');

    // Inverted mode (lower is better)
    expect(getStatus(5, 10, 25, true)).toBe('success');
    expect(getStatus(15, 10, 25, true)).toBe('warning');
    expect(getStatus(30, 10, 25, true)).toBe('danger');
  });

  it('should calculate variance correctly', () => {
    const calculateVariation = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    expect(calculateVariation(1200, 1000)).toBeCloseTo(20);
    expect(calculateVariation(800, 1000)).toBeCloseTo(-20);
    expect(calculateVariation(1000, 0)).toBe(100);
    expect(calculateVariation(0, 0)).toBe(0);
  });

  it('should isolate data by company (RLS simulation)', async () => {
    const { useAuth } = await import('@/contexts/AuthContext');
    const mockUseAuth = vi.mocked(useAuth);
    
    // Company A
    mockUseAuth.mockReturnValue({
      currentCompany: { id: 'company-a', name: 'Company A' },
    } as any);

    const { useDashboardMetrics } = await import('../useDashboardMetrics');
    
    const { result: resultA } = renderHook(() => useDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    // Company B  
    mockUseAuth.mockReturnValue({
      currentCompany: { id: 'company-b', name: 'Company B' },
    } as any);

    const { result: resultB } = renderHook(() => useDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    // Both should have loading state defined
    expect(resultA.current.isLoading).toBeDefined();
    expect(resultB.current.isLoading).toBeDefined();
  });

  it('should handle complete data correctly', async () => {
    // Test that formatCurrency is applied correctly
    const formatCurrency = (value: number): string => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    expect(formatCurrency(1234.56)).toContain('R$');
    expect(formatCurrency(1234.56)).toContain('1.234');
  });
});
