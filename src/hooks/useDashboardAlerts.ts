import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertaDashboard, AlertUrgency } from "@/types/dashboard";
import { format, addDays } from "date-fns";
import { formatCurrency } from "@/lib/formatters";

const URGENCY_ORDER: Record<AlertUrgency, number> = { alta: 1, media: 2, baixa: 3 };

export function useDashboardAlerts(maxAlerts = 10) {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['dashboard-alerts', companyId],
    queryFn: async (): Promise<AlertaDashboard[]> => {
      if (!companyId) return [];

      const alerts: AlertaDashboard[] = [];
      const hoje = new Date();
      const hojeStr = format(hoje, 'yyyy-MM-dd');

      // 1. Contas a Receber Vencidas
      const { data: arVencidas } = await supabase.from('transactions').select('*').eq('company_id', companyId).eq('direction', 'entrada').in('status', ['lancado'] as any).lt('due_date', hojeStr);
      if ((arVencidas as any[])?.length > 0) {
        const totalVencido = (arVencidas as any[]).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        alerts.push({ id: 'ar-vencidas', tipo: 'contas_receber_vencidas', titulo: 'Contas a Receber Vencidas', mensagem: `${arVencidas?.length} título(s): ${formatCurrency(totalVencido)}`, urgencia: (arVencidas?.length || 0) > 10 ? 'alta' : 'media', valor: totalVencido, quantidade: arVencidas?.length, actionLabel: 'Ver', actionRoute: '/contas-receber', createdAt: new Date() });
      }

      // 2. Contas a Pagar Vencidas
      const { data: apVencidas } = await supabase.from('transactions').select('*').eq('company_id', companyId).eq('direction', 'saida').in('status', ['lancado'] as any).lt('due_date', hojeStr);
      if ((apVencidas as any[])?.length > 0) {
        const totalVencido = (apVencidas as any[]).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        alerts.push({ id: 'ap-vencidas', tipo: 'contas_pagar_vencidas', titulo: 'Contas a Pagar Vencidas', mensagem: `${apVencidas?.length} conta(s): ${formatCurrency(totalVencido)}`, urgencia: (apVencidas?.length || 0) > 10 ? 'alta' : 'media', valor: totalVencido, quantidade: apVencidas?.length, actionLabel: 'Ver', actionRoute: '/contas-pagar', createdAt: new Date() });
      }

      // 3. Fluxo Negativo Projetado
      const { data: wallets } = await supabase.from('wallets').select('*').eq('company_id', companyId).eq('is_active', true);
      const saldoAtual = (wallets as any[])?.reduce((sum, w) => sum + (Number(w.current_balance || w.balance) || 0), 0) || 0;
      const proximo30Dias = format(addDays(hoje, 30), 'yyyy-MM-dd');

      const { data: entradas } = await supabase.from('transactions').select('*').eq('company_id', companyId).eq('direction', 'entrada').in('status', ['lancado'] as any).gte('due_date', hojeStr).lte('due_date', proximo30Dias);
      const { data: saidas } = await supabase.from('transactions').select('*').eq('company_id', companyId).eq('direction', 'saida').in('status', ['lancado'] as any).gte('due_date', hojeStr).lte('due_date', proximo30Dias);

      const totalEntradas = (entradas as any[])?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
      const totalSaidas = (saidas as any[])?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
      const saldoProjetado = saldoAtual + totalEntradas - totalSaidas;

      if (saldoProjetado < 0) {
        alerts.push({ id: 'fluxo-negativo', tipo: 'fluxo_negativo', titulo: 'Fluxo Negativo Projetado', mensagem: `Saldo projetado: ${formatCurrency(saldoProjetado)}`, urgencia: 'alta', valor: saldoProjetado, actionLabel: 'Ver Fluxo', actionRoute: '/dashboards/cashflow', createdAt: new Date() });
      }

      return alerts.sort((a, b) => URGENCY_ORDER[a.urgencia] - URGENCY_ORDER[b.urgencia]).slice(0, maxAlerts);
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
