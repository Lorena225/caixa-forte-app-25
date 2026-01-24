import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, addDays, differenceInDays } from 'date-fns';

interface HealthMetrics {
  totalReceitas: number;
  totalDespesas: number;
  saldoAtual: number;
  despesasFixas: number;
  diasRestantesMes: number;
  mediaGastosDiarios: number;
  contasAVencer3Dias: Array<{
    id: string;
    description: string;
    amount: number;
    dueDate: Date;
  }>;
}

export function useFinancialHealthMetrics() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['financial-health-metrics', currentCompany?.id],
    queryFn: async (): Promise<HealthMetrics> => {
      if (!currentCompany?.id) {
        return {
          totalReceitas: 0,
          totalDespesas: 0,
          saldoAtual: 0,
          despesasFixas: 0,
          diasRestantesMes: 0,
          mediaGastosDiarios: 0,
          contasAVencer3Dias: [],
        };
      }
      
      const hoje = new Date();
      const inicioMes = startOfMonth(hoje);
      const fimMes = endOfMonth(hoje);
      const em3Dias = addDays(hoje, 3);
      const diasDoMes = differenceInDays(fimMes, inicioMes) + 1;
      const diasPassados = differenceInDays(hoje, inicioMes) + 1;
      const diasRestantesMes = differenceInDays(fimMes, hoje);
      
      // Fetch receitas do mês (pagas)
      const { data: receitasData } = await supabase
        .from('transactions')
        .select('total_amount')
        .eq('company_id', currentCompany.id)
        .eq('direction', 'entrada')
        .eq('status', 'pago')
        .gte('transaction_date', inicioMes.toISOString().split('T')[0])
        .lte('transaction_date', fimMes.toISOString().split('T')[0]);
      
      // Fetch despesas do mês (pagas)
      const { data: despesasData } = await supabase
        .from('transactions')
        .select('total_amount, is_recurring')
        .eq('company_id', currentCompany.id)
        .eq('direction', 'saida')
        .eq('status', 'pago')
        .gte('transaction_date', inicioMes.toISOString().split('T')[0])
        .lte('transaction_date', fimMes.toISOString().split('T')[0]);
      
      // Fetch saldo atual das carteiras (opening_balance + transações pagas)
      const { data: walletsData } = await supabase
        .from('wallets')
        .select('id, opening_balance')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true);
      
      // Calculate current balance from opening + transactions
      let saldoAtual = 0;
      for (const wallet of walletsData || []) {
        const { data: walletTransactions } = await supabase
          .from('transactions')
          .select('direction, total_amount')
          .eq('wallet_id', wallet.id)
          .eq('status', 'pago');
        
        const entradas = (walletTransactions || [])
          .filter(t => t.direction === 'entrada')
          .reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);
        
        const saidas = (walletTransactions || [])
          .filter(t => t.direction === 'saida')
          .reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);
        
        saldoAtual += (Number(wallet.opening_balance) || 0) + entradas - saidas;
      }
      
      // Fetch contas a pagar nos próximos 3 dias (não pagas)
      const { data: contasVencendo } = await supabase
        .from('transactions')
        .select('id, description, total_amount, due_date')
        .eq('company_id', currentCompany.id)
        .eq('direction', 'saida')
        .neq('status', 'pago')
        .gte('due_date', hoje.toISOString().split('T')[0])
        .lte('due_date', em3Dias.toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(10);
      
      const totalReceitas = (receitasData || []).reduce(
        (sum, t) => sum + (Number(t.total_amount) || 0), 
        0
      );
      
      const totalDespesas = (despesasData || []).reduce(
        (sum, t) => sum + (Number(t.total_amount) || 0), 
        0
      );
      
      // Despesas fixas = despesas recorrentes
      const despesasFixas = (despesasData || [])
        .filter(t => t.is_recurring)
        .reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);
      
      // Média de gastos diários baseada nos dias passados
      const mediaGastosDiarios = diasPassados > 0 
        ? totalDespesas / diasPassados 
        : 0;
      
      const contasAVencer3Dias = (contasVencendo || []).map(c => ({
        id: c.id,
        description: c.description || 'Sem descrição',
        amount: Number(c.total_amount) || 0,
        dueDate: new Date(c.due_date),
      }));
      
      return {
        totalReceitas,
        totalDespesas,
        saldoAtual,
        despesasFixas,
        diasRestantesMes,
        mediaGastosDiarios,
        contasAVencer3Dias,
      };
    },
    enabled: !!currentCompany?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}
