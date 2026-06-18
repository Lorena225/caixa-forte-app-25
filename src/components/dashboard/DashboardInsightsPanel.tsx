import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertTriangle, TrendingUp, TrendingDown, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardInsights, type DashboardInsight } from '@/hooks/useDashboardInsights';

const ROUTE_BY_SCOPE: Record<string, string> = {
  ar: '/ar', cashflow: '/dashboards/cashflow', executive: '/contratos', agency: '/agencia',
};

const iconFor = (icon: string) => {
  switch (icon) {
    case 'alert': return AlertTriangle;
    case 'trending-up': return TrendingUp;
    case 'trending-down': return TrendingDown;
    case 'clock': return Clock;
    default: return Sparkles;
  }
};

const styleFor = (severity: string) => {
  switch (severity) {
    case 'alta': return 'border-red-500/30 bg-red-500/5';
    case 'media': return 'border-amber-500/30 bg-amber-500/5';
    case 'positiva': return 'border-emerald-500/30 bg-emerald-500/5';
    default: return 'border-border bg-muted/30';
  }
};
const iconColorFor = (severity: string) => {
  switch (severity) {
    case 'alta': return 'text-red-600';
    case 'media': return 'text-amber-600';
    case 'positiva': return 'text-emerald-600';
    default: return 'text-muted-foreground';
  }
};

/**
 * Faixa de insights de IA para dashboards. Análise determinística em tempo real
 * (reavalia a cada minuto). Só aparece quando há dados E há algo a dizer —
 * nunca polui a tela com insight vazio.
 */
export function DashboardInsightsPanel({ scope = 'executive' }: { scope?: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useDashboardInsights(scope);

  // sem dados ou nada relevante: não renderiza nada (evita ruído visual)
  if (isLoading || !data?.has_data || data.insights.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        Análise em tempo real
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {data.insights.map((insight: DashboardInsight, i: number) => {
          const Icon = iconFor(insight.icon);
          return (
            <div key={i} className={cn('rounded-lg border p-3 flex gap-3', styleFor(insight.severity))}>
              <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconColorFor(insight.severity))} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                {insight.action && (
                  <button
                    onClick={() => navigate(ROUTE_BY_SCOPE[insight.scope] ?? '/')}
                    className="text-xs font-medium text-primary mt-1.5 inline-flex items-center gap-1 hover:underline">
                    {insight.action}<ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
