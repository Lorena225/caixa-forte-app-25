import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Clock, Flame, Loader2, FolderKanban } from 'lucide-react';
import { usePortfolioEconomics, useProjectSnapshots } from '@/hooks/useProjectModule';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

function marginColor(pct: number) {
  if (pct >= 25) return 'text-emerald-600';
  if (pct >= 10) return 'text-amber-600';
  return 'text-red-600';
}

export default function RentabilidadeProjetos() {
  const { data: portfolio = [], isLoading } = usePortfolioEconomics();
  const [sortBy] = useState<'margin' | 'wip'>('margin');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: snapshots = [] } = useProjectSnapshots(expandedId);

  const totals = portfolio.reduce(
    (acc: any, p: any) => {
      const e = p.econ ?? {};
      acc.revenue += e.revenue_billed ?? 0;
      acc.cost += e.cost_actual ?? 0;
      acc.wip += e.wip ?? 0;
      acc.budget += e.budget_revenue ?? 0;
      return acc;
    },
    { revenue: 0, cost: 0, wip: 0, budget: 0 }
  );
  const totalMargin = totals.revenue > 0 ? ((totals.revenue - totals.cost) / totals.revenue) * 100 : 0;

  const sorted = [...portfolio].sort((a: any, b: any) =>
    sortBy === 'margin'
      ? (a.econ?.margin_real_pct ?? 0) - (b.econ?.margin_real_pct ?? 0)
      : (b.econ?.wip ?? 0) - (a.econ?.wip ?? 0)
  );
  const atRisk = portfolio.filter((p: any) => (p.econ?.burn_pct ?? 0) > (p.econ?.progress_pct ?? 0) + 15);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Rentabilidade de Projetos"
          description="Margem prevista × realizada, burn rate e trabalho não faturado (WIP) por projeto"
        />

        {/* KPIs da firma */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />Receita faturada</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(totals.revenue)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />Custo realizado</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(totals.cost)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />Margem da firma</CardTitle></CardHeader>
            <CardContent><p className={cn('text-2xl font-bold', marginColor(totalMargin))}>
              {totalMargin.toFixed(1)}%</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />WIP (não faturado)</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(totals.wip)}</p></CardContent>
          </Card>
        </div>

        {atRisk.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {atRisk.length} projeto(s) com <strong>burn acima do avanço físico</strong> — risco de estouro de margem:{' '}
              {atRisk.map((p: any) => p.name).join(', ')}.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader><CardTitle>Projetos por margem realizada</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />Calculando economia dos projetos…
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Nenhum projeto ativo ainda.</p>
                <p className="text-sm">Crie um projeto no Portfólio e defina o orçamento para ver a rentabilidade aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sorted.map((p: any) => {
                  const e = p.econ ?? {};
                  const burnOver = (e.burn_pct ?? 0) > (e.progress_pct ?? 0) + 15;
                  return (
                    <div key={p.id} className="border rounded-lg p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.counterparty?.name ?? 'Sem cliente'}</p>
                        </div>
                        <div className="flex items-center gap-6 text-sm flex-wrap">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Prevista</p>
                            <p className={cn('font-semibold', marginColor(e.margin_plan_pct ?? 0))}>
                              {(e.margin_plan_pct ?? 0).toFixed(1)}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Realizada</p>
                            <p className={cn('font-semibold', marginColor(e.margin_real_pct ?? 0))}>
                              {(e.margin_real_pct ?? 0).toFixed(1)}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">WIP</p>
                            <p className="font-semibold">{formatCurrency(e.wip ?? 0)}</p>
                          </div>
                          <div className="text-right min-w-[90px]">
                            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                              <Flame className="h-3 w-3" />Burn</p>
                            <p className={cn('font-semibold', burnOver ? 'text-red-600' : 'text-foreground')}>
                              {(e.burn_pct ?? 0).toFixed(0)}%</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Avanço {e.progress_pct ?? 0}%</span>
                            <span>{formatCurrency(e.cost_actual ?? 0)} de {formatCurrency(e.budget_cost ?? 0)} orçado</span>
                          </div>
                          <Progress value={e.progress_pct ?? 0} className="h-2" />
                        </div>
                        {burnOver && <Badge variant="destructive">Atenção</Badge>}
                      </div>
                      {expandedId === p.id && (
                        <div className="mt-4 pt-4 border-t" onClick={(ev) => ev.stopPropagation()}>
                          {snapshots.length < 2 ? (
                            <p className="text-xs text-muted-foreground text-center py-6">
                              Histórico insuficiente. Capture snapshots semanais em Capacidade da Equipe para ver a evolução de margem e burn.
                            </p>
                          ) : (
                            <div className="h-48">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Evolução de margem realizada (%)</p>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={snapshots.map((s: any) => ({
                                  date: format(new Date(s.snapshot_date + 'T00:00'), 'dd/MM'),
                                  margem: Number(s.margin_pct),
                                  custo: Number(s.cost_actual),
                                }))}>
                                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                  <YAxis tick={{ fontSize: 11 }} />
                                  <Tooltip />
                                  <Line type="monotone" dataKey="margem" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
