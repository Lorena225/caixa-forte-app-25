import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardMetrics, KPIStatus, ContasResumo, ExecucaoOrcamentaria } from "@/types/dashboard";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
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
      const mesAnteriorInicio = startOfMonth(subMonths(hoje, 1));
      const mesAnteriorFim = endOfMonth(subMonths(hoje, 1));

      // 1. Saldo em Caixa (wallets) - usando current_balance
      const { data: wallets } = await supabase
        .from('wallets')
        .select('current_balance')
        .eq('company_id', companyId)
        .eq('is_active', true);

      const saldoCaixaTotal = wallets?.reduce((sum, w) => sum + (Number(w.current_balance) || 0), 0) || 0;
      const saldoAnterior = saldoCaixaTotal; // Simplificado
      const variacaoSaldo = 0;

      // 2. Contas a Receber - usando valor e direcao
      const { data: arTransactions } = await supabase
        .from('transactions')
        .select('id, valor, due_date, status')
        .eq('company_id', companyId)
        .eq('direcao', 'entrada')
        .in('status', ['lancado', 'rascunho']);

      const contasReceberDetalhe = calcularResumoContas(arTransactions || [], hoje);
      const arStatus = getStatus(contasReceberDetalhe.vencidoPercentual, 10, 25, true);

      // 3. Contas a Pagar
      const { data: apTransactions } = await supabase
        .from('transactions')
        .select('id, valor, due_date, status')
        .eq('company_id', companyId)
        .eq('direcao', 'saida')
        .in('status', ['lancado', 'rascunho']);

      const contasPagarDetalhe = calcularResumoContas(apTransactions || [], hoje);
      const apStatus = getStatus(contasPagarDetalhe.vencidoPercentual, 10, 25, true);

      // 4. Execução Orçamentária
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
      const percentualExecucao = orcadoMes > 0 ? (realizadoMes / orcadoMes) * 100 : 0;
      const execucaoStatus = getStatus(percentualExecucao, 90, 100, true);

      const execucaoDetalhe: ExecucaoOrcamentaria = {
        orcado: orcadoMes,
        realizado: realizadoMes,
        percentual: percentualExecucao,
        variacao: orcadoMes - realizadoMes,
        status: execucaoStatus,
      };

      // 5. Lucro do Mês
      const { data: receitasMes } = await supabase
        .from('transactions')
        .select('valor')
        .eq('company_id', companyId)
        .eq('direcao', 'entrada')
        .eq('status', 'pago')
        .gte('paid_at', format(inicioMes, 'yyyy-MM-dd'))
        .lte('paid_at', format(fimMes, 'yyyy-MM-dd'));

      const totalReceitas = receitasMes?.reduce((sum, t) => sum + (Number(t.valor) || 0), 0) || 0;
      const lucroMes = totalReceitas - realizadoMes;
      const margemLiquida = totalReceitas > 0 ? (lucroMes / totalReceitas) * 100 : 0;
      const variacaoLucro = 0;

      const lucroStatus = getStatus(lucroMes, 0, -1000, false);
      const margemStatus = getStatus(margemLiquida, 10, 5, false);

      return {
        saldoCaixa: {
          titulo: 'Saldo em Caixa',
          valor: saldoCaixaTotal,
          valorFormatado: formatCurrency(saldoCaixaTotal),
          variacao: variacaoSaldo,
          variacaoLabel: 'vs mês anterior',
          status: getStatus(saldoCaixaTotal, 10000, 5000, false),
          cor: getStatusColor(getStatus(saldoCaixaTotal, 10000, 5000, false)),
          icon: Wallet,
        },
        contasReceber: {
          titulo: 'Contas a Receber',
          valor: contasReceberDetalhe.total,
          valorFormatado: formatCurrency(contasReceberDetalhe.total),
          variacao: -contasReceberDetalhe.vencidoPercentual,
          variacaoLabel: `${contasReceberDetalhe.quantidadeVencida} vencidas`,
          status: arStatus,
          cor: getStatusColor(arStatus),
          icon: TrendingUp,
          detalhe: contasReceberDetalhe,
        },
        contasPagar: {
          titulo: 'Contas a Pagar',
          valor: contasPagarDetalhe.total,
          valorFormatado: formatCurrency(contasPagarDetalhe.total),
          variacao: -contasPagarDetalhe.vencidoPercentual,
          variacaoLabel: `${contasPagarDetalhe.quantidadeVencida} vencidas`,
          status: apStatus,
          cor: getStatusColor(apStatus),
          icon: TrendingDown,
          detalhe: contasPagarDetalhe,
        },
        execucaoOrcamento: {
          titulo: 'Execução Orçamentária',
          valor: percentualExecucao,
          valorFormatado: `${percentualExecucao.toFixed(1)}%`,
          variacao: 100 - percentualExecucao,
          variacaoLabel: 'disponível',
          status: execucaoStatus,
          cor: getStatusColor(execucaoStatus),
          icon: PiggyBank,
          detalhe: execucaoDetalhe,
        },
        lucroMes: {
          titulo: 'Lucro do Mês',
          valor: lucroMes,
          valorFormatado: formatCurrency(lucroMes),
          variacao: variacaoLucro,
          variacaoLabel: 'vs mês anterior',
          status: lucroStatus,
          cor: getStatusColor(lucroStatus),
          icon: DollarSign,
        },
        margemLiquida: {
          titulo: 'Margem Líquida',
          valor: margemLiquida,
          valorFormatado: `${margemLiquida.toFixed(1)}%`,
          variacao: 0,
          variacaoLabel: 'do mês',
          status: margemStatus,
          cor: getStatusColor(margemStatus),
          icon: Percent,
        },
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

function calcularResumoContas(
  transactions: Array<{ id: string; valor: number | null; due_date: string | null; status: string | null }>,
  hoje: Date
): ContasResumo {
  const total = transactions.reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
  const quantidade = transactions.length;

  const vencidas = transactions.filter(t => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < hoje;
  });

  const vencidoValor = vencidas.reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
  const aVencerValor = total - vencidoValor;

  return {
    total,
    vencidoPercentual: total > 0 ? (vencidoValor / total) * 100 : 0,
    vencidoValor,
    aVencerPercentual: total > 0 ? (aVencerValor / total) * 100 : 0,
    aVencerValor,
    quantidade,
    quantidadeVencida: vencidas.length,
  };
}
