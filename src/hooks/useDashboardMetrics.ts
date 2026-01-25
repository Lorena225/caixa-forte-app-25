import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardMetrics, KPIStatus, ContasResumo, ExecucaoOrcamentaria } from "@/types/dashboard";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { formatCurrency } from "@/lib/formatters";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Percent, DollarSign } from "lucide-react";

function getStatus(value: number, warningThreshold: number, dangerThreshold: number, inverted = false): KPIStatus {
  if (inverted) {
    if (value >= dangerThreshold) return 'danger';
    if (value >= warningThreshold) return 'warning';
    return 'success';
  }
  if (value <= dangerThreshold) return 'danger';
  if (value <= warningThreshold) return 'warning';
  return 'success';
}

function getStatusColor(status: KPIStatus): string {
  switch (status) {
    case 'success': return 'text-green-600';
    case 'warning': return 'text-yellow-600';
    case 'danger': return 'text-red-600';
    default: return 'text-muted-foreground';
  }
}

export function useDashboardMetrics() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['dashboard-metrics', companyId],
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!companyId) throw new Error('Company not selected');

      const hoje = new Date();
      const inicioMes = startOfMonth(hoje);
      const fimMes = endOfMonth(hoje);

      // 1. Saldo em Caixa
      const { data: wallets } = await supabase
        .from('wallets')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      const saldoCaixaTotal = (wallets as any[])?.reduce((sum, w) => sum + (Number(w.current_balance || w.balance) || 0), 0) || 0;

      // 2. Contas a Receber
      const { data: arTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', companyId)
        .eq('direction', 'entrada')
        .in('status', ['lancado', 'rascunho'] as any);

      const contasReceberDetalhe = calcularResumoContas((arTransactions as any[]) || [], hoje);
      const arStatus = getStatus(contasReceberDetalhe.vencidoPercentual, 10, 25, true);

      // 3. Contas a Pagar
      const { data: apTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', companyId)
        .eq('direction', 'saida')
        .in('status', ['lancado', 'rascunho'] as any);

      const contasPagarDetalhe = calcularResumoContas((apTransactions as any[]) || [], hoje);
      const apStatus = getStatus(contasPagarDetalhe.vencidoPercentual, 10, 25, true);

      // 4. Execução Orçamentária
      const { data: realizadoData } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', companyId)
        .eq('direction', 'saida')
        .eq('status', 'pago')
        .gte('paid_date', format(inicioMes, 'yyyy-MM-dd'))
        .lte('paid_date', format(fimMes, 'yyyy-MM-dd'));

      const realizadoMes = (realizadoData as any[])?.reduce((sum, t) => sum + (Number(t.total_amount) || Number(t.amount) || 0), 0) || 0;
      const orcadoMes = realizadoMes * 1.2; // Placeholder
      const percentualExecucao = orcadoMes > 0 ? (realizadoMes / orcadoMes) * 100 : 0;
      const execucaoStatus = getStatus(percentualExecucao, 90, 100, true);

      const execucaoDetalhe: ExecucaoOrcamentaria = { orcado: orcadoMes, realizado: realizadoMes, percentual: percentualExecucao, variacao: orcadoMes - realizadoMes, status: execucaoStatus };

      // 5. Lucro do Mês
      const { data: receitasMes } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', companyId)
        .eq('direction', 'entrada')
        .eq('status', 'pago')
        .gte('paid_date', format(inicioMes, 'yyyy-MM-dd'))
        .lte('paid_date', format(fimMes, 'yyyy-MM-dd'));

      const totalReceitas = (receitasMes as any[])?.reduce((sum, t) => sum + (Number(t.total_amount) || Number(t.amount) || 0), 0) || 0;
      const lucroMes = totalReceitas - realizadoMes;
      const margemLiquida = totalReceitas > 0 ? (lucroMes / totalReceitas) * 100 : 0;

      return {
        saldoCaixa: { titulo: 'Saldo em Caixa', valor: saldoCaixaTotal, valorFormatado: formatCurrency(saldoCaixaTotal), variacao: 0, variacaoLabel: 'atual', status: getStatus(saldoCaixaTotal, 10000, 5000, false), cor: getStatusColor(getStatus(saldoCaixaTotal, 10000, 5000, false)), icon: Wallet },
        contasReceber: { titulo: 'Contas a Receber', valor: contasReceberDetalhe.total, valorFormatado: formatCurrency(contasReceberDetalhe.total), variacao: -contasReceberDetalhe.vencidoPercentual, variacaoLabel: `${contasReceberDetalhe.quantidadeVencida} vencidas`, status: arStatus, cor: getStatusColor(arStatus), icon: TrendingUp, detalhe: contasReceberDetalhe },
        contasPagar: { titulo: 'Contas a Pagar', valor: contasPagarDetalhe.total, valorFormatado: formatCurrency(contasPagarDetalhe.total), variacao: -contasPagarDetalhe.vencidoPercentual, variacaoLabel: `${contasPagarDetalhe.quantidadeVencida} vencidas`, status: apStatus, cor: getStatusColor(apStatus), icon: TrendingDown, detalhe: contasPagarDetalhe },
        execucaoOrcamento: { titulo: 'Execução Orçamentária', valor: percentualExecucao, valorFormatado: `${percentualExecucao.toFixed(1)}%`, variacao: 100 - percentualExecucao, variacaoLabel: 'disponível', status: execucaoStatus, cor: getStatusColor(execucaoStatus), icon: PiggyBank, detalhe: execucaoDetalhe },
        lucroMes: { titulo: 'Lucro do Mês', valor: lucroMes, valorFormatado: formatCurrency(lucroMes), variacao: 0, variacaoLabel: 'do mês', status: getStatus(lucroMes, 0, -1000, false), cor: getStatusColor(getStatus(lucroMes, 0, -1000, false)), icon: DollarSign },
        margemLiquida: { titulo: 'Margem Líquida', valor: margemLiquida, valorFormatado: `${margemLiquida.toFixed(1)}%`, variacao: 0, variacaoLabel: 'do mês', status: getStatus(margemLiquida, 10, 5, false), cor: getStatusColor(getStatus(margemLiquida, 10, 5, false)), icon: Percent },
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

function calcularResumoContas(transactions: any[], hoje: Date): ContasResumo {
  const total = transactions.reduce((sum, t) => sum + (Number(t.total_amount) || Number(t.amount) || 0), 0);
  const vencidas = transactions.filter(t => t.due_date && new Date(t.due_date) < hoje);
  const vencidoValor = vencidas.reduce((sum, t) => sum + (Number(t.total_amount) || Number(t.amount) || 0), 0);
  return { total, vencidoPercentual: total > 0 ? (vencidoValor / total) * 100 : 0, vencidoValor, aVencerPercentual: total > 0 ? ((total - vencidoValor) / total) * 100 : 0, aVencerValor: total - vencidoValor, quantidade: transactions.length, quantidadeVencida: vencidas.length };
}
