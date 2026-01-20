import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FluxoProjetado } from "@/types/dashboard";
import { format, addDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useDashboardFluxo(diasProjecao = 30) {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['dashboard-fluxo', companyId, diasProjecao],
    queryFn: async (): Promise<FluxoProjetado[]> => {
      if (!companyId) return [];

      const hoje = new Date();
      const hojeStr = format(hoje, 'yyyy-MM-dd');
      const fimProjecao = addDays(hoje, diasProjecao);
      const fimProjecaoStr = format(fimProjecao, 'yyyy-MM-dd');

      const { data: wallets } = await supabase.from('wallets').select('*').eq('company_id', companyId).eq('is_active', true);
      const saldoInicial = (wallets as any[])?.reduce((sum, w) => sum + (Number(w.current_balance || w.balance) || 0), 0) || 0;

      const { data: transactions } = await supabase.from('transactions').select('*').eq('company_id', companyId).in('status', ['lancado'] as any).gte('due_date', hojeStr).lte('due_date', fimProjecaoStr);

      const transactionsByDate = new Map<string, { inflow: number; outflow: number }>();
      ((transactions as any[]) || []).forEach((t) => {
        if (!t.due_date) return;
        const dateKey = t.due_date.split('T')[0];
        const existing = transactionsByDate.get(dateKey) || { inflow: 0, outflow: 0 };
        if (t.direction === 'entrada') existing.inflow += Number(t.amount) || 0;
        else existing.outflow += Number(t.amount) || 0;
        transactionsByDate.set(dateKey, existing);
      });

      const dias = eachDayOfInterval({ start: hoje, end: fimProjecao });
      let saldoAcumulado = saldoInicial;

      return dias.map((dia) => {
        const dateKey = format(dia, 'yyyy-MM-dd');
        const dayData = transactionsByDate.get(dateKey) || { inflow: 0, outflow: 0 };
        saldoAcumulado += dayData.inflow - dayData.outflow;
        return { data: dateKey, dataFormatada: format(dia, "dd/MM", { locale: ptBR }), inflow: dayData.inflow, outflow: dayData.outflow, saldo: dayData.inflow - dayData.outflow, saldoAcumulado };
      });
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
