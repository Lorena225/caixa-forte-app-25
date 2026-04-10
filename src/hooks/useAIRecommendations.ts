import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Recommendation {
  id: string;
  category: 'cash_management' | 'cost_reduction' | 'receivables' | 'investment' | 'optimization';
  title: string;
  description: string;
  impact: { value: number; unit: 'monthly' | 'weekly' | 'yearly' | 'one_time' };
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}

export interface ActionImpact {
  financialImpact: number;
  cashFlowImpact: number;
  timeToImplement: string;
  riskLevel: 'low' | 'medium' | 'high';
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function useAIRecommendations() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['ai_recommendations_data', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const isoToday = today.toISOString().split('T')[0];
      const iso30 = thirtyDaysAgo.toISOString().split('T')[0];

      const [walletsRes, overdueRes, expensesRes, prevMonthRes] = await Promise.all([
        // Saldo total em carteiras
        supabase.from('wallets').select('name, opening_balance, type').eq('company_id', companyId).eq('is_active', true),
        // Contas a receber vencidas
        supabase.from('transactions')
          .select('total_amount, due_date, counterparty_id')
          .eq('company_id', companyId)
          .eq('direction', 'entrada')
          .in('status', ['lancado', 'rascunho'])
          .lt('due_date', isoToday),
        // Maiores despesas do mês
        supabase.from('transactions')
          .select('total_amount, account_id, accounts:account_id(name)')
          .eq('company_id', companyId)
          .eq('direction', 'saida')
          .eq('status', 'pago')
          .gte('paid_date', iso30),
        // Receita mês anterior
        supabase.from('transactions')
          .select('total_amount')
          .eq('company_id', companyId)
          .eq('direction', 'entrada')
          .eq('status', 'pago')
          .gte('paid_date', iso30),
      ]);

      const totalBalance = (walletsRes.data || []).reduce((s, w) => s + (w.opening_balance || 0), 0);
      const overdueTotal = (overdueRes.data || []).reduce((s, t) => s + (t.total_amount || 0), 0);
      const overdueCount = overdueRes.data?.length || 0;
      const totalExpenses = (expensesRes.data || []).reduce((s, t) => s + (t.total_amount || 0), 0);
      const totalRevenue = (prevMonthRes.data || []).reduce((s, t) => s + (t.total_amount || 0), 0);

      // Top categoria de despesas
      const expenseByAccount: Record<string, number> = {};
      for (const t of expensesRes.data || []) {
        const name = (t as any).accounts?.name || 'Outros';
        expenseByAccount[name] = (expenseByAccount[name] || 0) + t.total_amount;
      }
      const topExpense = Object.entries(expenseByAccount).sort((a, b) => b[1] - a[1])[0];

      return { totalBalance, overdueTotal, overdueCount, totalExpenses, totalRevenue, topExpense };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });

  const generateRecommendations = (): Recommendation[] => {
    if (!data) return [];
    const recs: Recommendation[] = [];

    // 1. Caixa alto → aplicar
    if (data.totalBalance > 50000) {
      const monthly = data.totalBalance * 0.005;
      recs.push({
        id: 'rec_cash',
        category: 'cash_management',
        title: 'Otimizar aplicações de curto prazo',
        description: `Saldo disponível de ${formatCurrency(data.totalBalance)}. Aplicar em CDB pós-fixado (CDI) pode render ~${formatCurrency(monthly)}/mês.`,
        impact: { value: monthly, unit: 'monthly' },
        effort: 'low',
        priority: 'high',
        estimatedImpact: `${formatCurrency(monthly * 12)}/ano`,
      });
    }

    // 2. Inadimplência
    if (data.overdueTotal > 0) {
      const weeklyRecovery = data.overdueTotal * 0.15;
      recs.push({
        id: 'rec_overdue',
        category: 'receivables',
        title: 'Cobrar contas vencidas',
        description: `${data.overdueCount} título(s) vencido(s) totalizando ${formatCurrency(data.overdueTotal)}. Ação de cobrança pode recuperar até 15%/semana.`,
        impact: { value: weeklyRecovery, unit: 'weekly' },
        effort: 'low',
        priority: data.overdueTotal > 10000 ? 'high' : 'medium',
        estimatedImpact: `Recuperar ${formatCurrency(data.overdueTotal)} em 4-8 semanas`,
      });
    }

    // 3. Maior despesa — renegociar
    if (data.topExpense && data.topExpense[1] > 5000) {
      const saving = data.topExpense[1] * 0.1;
      recs.push({
        id: 'rec_cost',
        category: 'cost_reduction',
        title: `Renegociar: ${data.topExpense[0]}`,
        description: `Maior categoria de despesa no período: ${formatCurrency(data.topExpense[1])}. Negociação de 10% de desconto representa ${formatCurrency(saving)}/mês.`,
        impact: { value: saving, unit: 'monthly' },
        effort: 'medium',
        priority: 'high',
        estimatedImpact: `${formatCurrency(saving * 12)}/ano`,
      });
    }

    // 4. Margem baixa
    if (data.totalRevenue > 0 && data.totalExpenses > 0) {
      const margin = (data.totalRevenue - data.totalExpenses) / data.totalRevenue;
      if (margin < 0.2) {
        recs.push({
          id: 'rec_margin',
          category: 'optimization',
          title: 'Margem abaixo de 20% — revisar precificação',
          description: `Margem atual: ${(margin * 100).toFixed(1)}%. Revisar precificação ou reduzir custos pode melhorar a lucratividade.`,
          impact: { value: data.totalRevenue * 0.05, unit: 'monthly' },
          effort: 'high',
          priority: 'medium',
          estimatedImpact: 'Aumento de 5% na margem',
        });
      }
    }

    return recs;
  };

  const calculateActionImpact = (rec: Recommendation): ActionImpact => {
    const effortToTime: Record<string, string> = {
      low: '1-3 dias',
      medium: '1-2 semanas',
      high: '1-2 meses',
    };
    return {
      financialImpact: rec.impact.value * (rec.impact.unit === 'monthly' ? 12 : rec.impact.unit === 'weekly' ? 52 : 1),
      cashFlowImpact: rec.impact.value,
      timeToImplement: effortToTime[rec.effort] || '1 semana',
      riskLevel: rec.effort === 'low' ? 'low' : rec.effort === 'medium' ? 'medium' : 'high',
    };
  };

  return { generateRecommendations, calculateActionImpact, isLoading };
}
