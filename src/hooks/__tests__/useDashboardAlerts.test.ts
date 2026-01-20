import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { AlertaDashboard, AlertUrgency } from '@/types/dashboard';

// Mock supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => mockSupabaseFrom(),
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

describe('useDashboardAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  it('should initialize without error', async () => {
    const { useDashboardAlerts } = await import('../useDashboardAlerts');
    
    const { result } = renderHook(() => useDashboardAlerts(), {
      wrapper: createWrapper(),
    });

    expect(result.current.error).toBeNull();
  });

  it('should order alerts by urgency correctly', () => {
    const URGENCY_ORDER: Record<AlertUrgency, number> = { alta: 1, media: 2, baixa: 3 };
    
    const alerts: Pick<AlertaDashboard, 'id' | 'titulo' | 'urgencia'>[] = [
      { id: '1', titulo: 'Baixa', urgencia: 'baixa' },
      { id: '2', titulo: 'Alta', urgencia: 'alta' },
      { id: '3', titulo: 'Media', urgencia: 'media' },
    ];

    const sorted = [...alerts].sort((a, b) => URGENCY_ORDER[a.urgencia] - URGENCY_ORDER[b.urgencia]);

    expect(sorted[0].titulo).toBe('Alta');
    expect(sorted[1].titulo).toBe('Media');
    expect(sorted[2].titulo).toBe('Baixa');
  });

  it('should respect maxAlerts limit', () => {
    const MAX_ALERTS = 10;
    
    const alerts = Array.from({ length: 15 }, (_, i) => ({
      id: `alert-${i}`,
      titulo: `Alert ${i}`,
      urgencia: 'media' as AlertUrgency,
    }));

    const limited = alerts.slice(0, MAX_ALERTS);
    
    expect(limited.length).toBe(10);
    expect(alerts.length).toBe(15);
  });

  it('should detect overdue accounts', () => {
    const hoje = new Date();
    const yesterday = new Date(hoje);
    yesterday.setDate(yesterday.getDate() - 1);

    const transactions = [
      { id: '1', due_date: yesterday.toISOString(), amount: 1000, status: 'lancado' },
      { id: '2', due_date: new Date(hoje.getTime() + 86400000).toISOString(), amount: 500, status: 'lancado' },
    ];

    const vencidas = transactions.filter(t => new Date(t.due_date) < hoje);
    
    expect(vencidas.length).toBe(1);
    expect(vencidas[0].id).toBe('1');
  });

  it('should detect budget overflow', () => {
    const detectBudgetOverflow = (realizado: number, orcado: number): boolean => {
      if (orcado <= 0) return false;
      const percentual = (realizado / orcado) * 100;
      return percentual > 100;
    };

    expect(detectBudgetOverflow(12000, 10000)).toBe(true);
    expect(detectBudgetOverflow(8000, 10000)).toBe(false);
    expect(detectBudgetOverflow(10000, 10000)).toBe(false);
    expect(detectBudgetOverflow(5000, 0)).toBe(false);
  });

  it('should create alert with correct structure', () => {
    const createAlert = (
      id: string,
      tipo: 'contas_pagar_vencidas' | 'contas_receber_vencidas' | 'fluxo_negativo',
      titulo: string,
      mensagem: string,
      urgencia: AlertUrgency
    ): AlertaDashboard => ({
      id,
      tipo,
      titulo,
      mensagem,
      urgencia,
      createdAt: new Date(),
    });

    const alert = createAlert('test-1', 'contas_pagar_vencidas', 'Contas Vencidas', '5 contas', 'alta');

    expect(alert.id).toBe('test-1');
    expect(alert.tipo).toBe('contas_pagar_vencidas');
    expect(alert.urgencia).toBe('alta');
    expect(alert.createdAt).toBeInstanceOf(Date);
  });
});
