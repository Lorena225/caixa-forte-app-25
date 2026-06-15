import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, ArrowDownLeft, ArrowUpRight, TrendingUp, Loader2 } from 'lucide-react';
import { useDashboardPulse } from '@/hooks/useFinanceModule';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface KPI {
  label: string; value: string; sub?: string; subColor?: string;
  icon: any; route: string;
}

export function PulseKPIs() {
  const { data: pulse, isLoading } = useDashboardPulse();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const empty = !pulse?.has_data;

  const kpis: KPI[] = [
    {
      label: 'Saldo em caixa', value: empty ? '—' : formatCurrency(pulse!.cash),
      sub: empty ? 'Sem movimentações ainda' : undefined,
      icon: Wallet, route: '/financeiro/fluxo-projetado',
    },
    {
      label: 'A receber', value: empty ? '—' : formatCurrency(pulse!.receivable),
      sub: !empty && pulse!.receivable_overdue > 0 ? `${formatCurrency(pulse!.receivable_overdue)} vencido` : (empty ? 'Sem títulos' : 'Em dia'),
      subColor: !empty && pulse!.receivable_overdue > 0 ? 'text-red-600' : 'text-muted-foreground',
      icon: ArrowDownLeft, route: '/financeiro/renegociacao',
    },
    {
      label: 'A pagar', value: empty ? '—' : formatCurrency(pulse!.payable),
      sub: !empty && pulse!.payable_7d > 0 ? `${formatCurrency(pulse!.payable_7d)} em 7 dias` : (empty ? 'Sem títulos' : undefined),
      subColor: 'text-amber-600',
      icon: ArrowUpRight, route: '/ap/bordero',
    },
    {
      label: 'Margem do mês', value: empty ? '—' : `${pulse!.margin_pct.toFixed(1)}%`,
      sub: empty ? 'Sem receita no mês' : formatCurrency(pulse!.revenue_month - pulse!.cost_month),
      subColor: !empty && pulse!.margin_pct >= 20 ? 'text-emerald-600' : !empty && pulse!.margin_pct < 0 ? 'text-red-600' : 'text-muted-foreground',
      icon: TrendingUp, route: '/projetos/rentabilidade',
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <Card key={k.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(k.route)}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{k.label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className={cn('text-2xl font-bold', empty && 'text-muted-foreground')}>{k.value}</p>
              {k.sub && <p className={cn('text-xs mt-1', k.subColor ?? 'text-muted-foreground')}>{k.sub}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
