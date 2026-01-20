import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertaDashboard, AlertUrgency } from "@/types/dashboard";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
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
      const inicioMes = startOfMonth(hoje);
      const fimMes = endOfMonth(hoje);
      const proximos7Dias = format(addDays(hoje, 7), 'yyyy-MM-dd');

      // 1. Contas a Receber Vencidas
      const { data: arVencidas } = await supabase
        .from('transactions')
        .select('id, valor, due_date')
        .eq('company_id', companyId)
        .eq('direcao', 'entrada')
        .in('status', ['lancado', 'rascunho'])
        .lt('due_date', hojeStr);

      if (arVencidas && arVencidas.length > 0) {
        const totalVencido = arVencidas.reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
        const urgencia: AlertUrgency = arVencidas.length > 10 ? 'alta' : arVencidas.length > 5 ? 'media' : 'baixa';
        alerts.push({
          id: 'ar-vencidas', tipo: 'contas_receber_vencidas', titulo: 'Contas a Receber Vencidas',
          mensagem: `${arVencidas.length} título(s) vencido(s): ${formatCurrency(totalVencido)}`,
          urgencia, valor: totalVencido, quantidade: arVencidas.length,
          actionLabel: 'Ver Contas', actionRoute: '/contas-receber', createdAt: new Date(),
        });
      }

      // 2. Contas a Pagar Vencidas
      const { data: apVencidas } = await supabase
        .from('transactions')
        .select('id, valor, due_date')
        .eq('company_id', companyId)
        .eq('direcao', 'saida')
        .in('status', ['lancado', 'rascunho'])
        .lt('due_date', hojeStr);

      if (apVencidas && apVencidas.length > 0) {
        const totalVencido = apVencidas.reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
        const urgencia: AlertUrgency = apVencidas.length > 10 ? 'alta' : apVencidas.length > 5 ? 'media' : 'baixa';
        alerts.push({
          id: 'ap-vencidas', tipo: 'contas_pagar_vencidas', titulo: 'Contas a Pagar Vencidas',
          mensagem: `${apVencidas.length} conta(s) vencida(s): ${formatCurrency(totalVencido)}`,
          urgencia, valor: totalVencido, quantidade: apVencidas.length,
          actionLabel: 'Ver Contas', actionRoute: '/contas-pagar', createdAt: new Date(),
        });
      }

      // 3. Orçamento estourado
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('planned_amount')
        .eq('company_id', companyId)
        .eq('year', hoje.getFullYear())
        .eq('month', hoje.getMonth() + 1);

      const orcadoMes = budgetData?.reduce((sum, b) => sum + (Number(b.planned_amount) || 0), 0) || 0;

      const { data: realizadoData } = await supabase
        .from('transactions')
        .select('valor')
        .eq('company_id', companyId)
        .eq('direcao', 'saida')
        .eq('status', 'pago')
        .gte('paid_at', format(inicioMes, 'yyyy-MM-dd'))
        .lte('paid_at', format(fimMes, 'yyyy-MM-dd'));

      const realizadoMes = realizadoData?.reduce((sum, t) => sum + (Number(t.valor) || 0), 0) || 0;
      
      if (orcadoMes > 0 && realizadoMes > orcadoMes) {
        alerts.push({
          id: 'orcamento-estourado', tipo: 'orcamento_estourado', titulo: 'Orçamento Estourado',
          mensagem: `Execução em ${((realizadoMes / orcadoMes) * 100).toFixed(1)}%`,
          urgencia: 'alta', valor: realizadoMes - orcadoMes,
          actionLabel: 'Ver Orçamento', actionRoute: '/financeiro/orcamento-real', createdAt: new Date(),
        });
      }

      // 4. Fluxo Negativo
      const { data: wallets } = await supabase
        .from('wallets')
        .select('current_balance')
        .eq('company_id', companyId)
        .eq('is_active', true);

      const saldoAtual = wallets?.reduce((sum, w) => sum + (Number(w.current_balance) || 0), 0) || 0;
      const proximo30Dias = format(addDays(hoje, 30), 'yyyy-MM-dd');

      const { data: entradas30d } = await supabase
        .from('transactions')
        .select('valor')
        .eq('company_id', companyId)
        .eq('direcao', 'entrada')
        .in('status', ['lancado', 'rascunho'])
        .gte('due_date', hojeStr)
        .lte('due_date', proximo30Dias);

      const { data: saidas30d } = await supabase
        .from('transactions')
        .select('valor')
        .eq('company_id', companyId)
        .eq('direcao', 'saida')
        .in('status', ['lancado', 'rascunho'])
        .gte('due_date', hojeStr)
        .lte('due_date', proximo30Dias);

      const totalEntradas = entradas30d?.reduce((sum, t) => sum + (Number(t.valor) || 0), 0) || 0;
      const totalSaidas = saidas30d?.reduce((sum, t) => sum + (Number(t.valor) || 0), 0) || 0;
      const saldoProjetado = saldoAtual + totalEntradas - totalSaidas;

      if (saldoProjetado < 0) {
        alerts.push({
          id: 'fluxo-negativo', tipo: 'fluxo_negativo', titulo: 'Fluxo Negativo Projetado',
          mensagem: `Saldo projetado: ${formatCurrency(saldoProjetado)}`,
          urgencia: 'alta', valor: saldoProjetado,
          actionLabel: 'Ver Fluxo', actionRoute: '/dashboards/cashflow', createdAt: new Date(),
        });
      }

      return alerts.sort((a, b) => URGENCY_ORDER[a.urgencia] - URGENCY_ORDER[b.urgencia]).slice(0, maxAlerts);
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
