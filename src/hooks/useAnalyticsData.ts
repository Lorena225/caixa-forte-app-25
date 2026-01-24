import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

interface MonthlyRevenueExpense {
  month: string;
  receitas: number;
  despesas: number;
}

interface CategoryExpense {
  name: string;
  value: number;
  color: string;
}

const CATEGORY_COLORS = [
  'hsl(221, 83%, 53%)', // Blue
  'hsl(142, 76%, 36%)', // Green
  'hsl(45, 93%, 47%)',  // Yellow
  'hsl(0, 84%, 60%)',   // Red
  'hsl(262, 83%, 58%)', // Purple
  'hsl(187, 85%, 43%)', // Cyan
  'hsl(24, 95%, 53%)',  // Orange
  'hsl(330, 81%, 60%)', // Pink
];

export function useRevenueExpensesData(dateRange?: DateRange) {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['revenue-expenses-chart', companyId, dateRange?.from, dateRange?.to],
    queryFn: async (): Promise<MonthlyRevenueExpense[]> => {
      if (!companyId) return [];

      // Default to last 6 months if no range specified
      const endDate = dateRange?.to || new Date();
      const startDate = dateRange?.from || startOfMonth(subMonths(new Date(), 5));

      const { data, error } = await supabase
        .from('transactions')
        .select('transaction_date, direction, total_amount')
        .eq('company_id', companyId)
        .neq('status', 'cancelado')
        .gte('transaction_date', format(startDate, 'yyyy-MM-dd'))
        .lte('transaction_date', format(endDate, 'yyyy-MM-dd'));

      if (error) throw error;

      // Group by month
      const monthlyData: Record<string, { receitas: number; despesas: number }> = {};
      
      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(endDate, i);
        const monthKey = format(monthDate, 'yyyy-MM');
        monthlyData[monthKey] = { receitas: 0, despesas: 0 };
      }

      // Aggregate data
      (data || []).forEach((t) => {
        const monthKey = format(new Date(t.transaction_date), 'yyyy-MM');
        if (monthlyData[monthKey]) {
          if (t.direction === 'entrada') {
            monthlyData[monthKey].receitas += Number(t.total_amount) || 0;
          } else {
            monthlyData[monthKey].despesas += Number(t.total_amount) || 0;
          }
        }
      });

      // Convert to array with formatted month names
      return Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, values]) => ({
          month: format(new Date(monthKey + '-01'), 'MMM', { locale: ptBR }),
          receitas: values.receitas,
          despesas: values.despesas,
        }));
    },
    enabled: !!companyId,
  });
}

export function useExpensesByCategory(dateRange?: DateRange) {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['expenses-by-category', companyId, dateRange?.from, dateRange?.to],
    queryFn: async (): Promise<CategoryExpense[]> => {
      if (!companyId) return [];

      // Default to current month if no range specified
      const endDate = dateRange?.to || endOfMonth(new Date());
      const startDate = dateRange?.from || startOfMonth(new Date());

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          total_amount,
          category:category_id(id, name)
        `)
        .eq('company_id', companyId)
        .eq('direction', 'saida')
        .neq('status', 'cancelado')
        .gte('transaction_date', format(startDate, 'yyyy-MM-dd'))
        .lte('transaction_date', format(endDate, 'yyyy-MM-dd'));

      if (error) throw error;

      // Group by category
      const categoryTotals: Record<string, { name: string; value: number }> = {};

      (data || []).forEach((t: any) => {
        const categoryName = t.category?.name || 'Sem categoria';
        const categoryId = t.category?.id || 'uncategorized';
        
        if (!categoryTotals[categoryId]) {
          categoryTotals[categoryId] = { name: categoryName, value: 0 };
        }
        categoryTotals[categoryId].value += Number(t.total_amount) || 0;
      });

      // Convert to array and sort by value
      return Object.values(categoryTotals)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
        .map((cat, index) => ({
          ...cat,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }));
    },
    enabled: !!companyId,
  });
}

export function useRecentTransactions(limit: number = 10) {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['recent-transactions-export', companyId, limit],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          description,
          direction,
          total_amount,
          transaction_date,
          status,
          category:category_id(name)
        `)
        .eq('company_id', companyId)
        .neq('status', 'cancelado')
        .order('transaction_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
}
