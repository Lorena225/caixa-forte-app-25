import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, Loader2, ShieldAlert, Sparkles, TrendingDown } from 'lucide-react';
import { useDelinquencyForecast, useRunDelinquencyAgent, useDelinquencyAlerts } from '@/hooks/useFinanceModule';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const riskBadge: Record<string, { label: string; variant: any; color: string }> = {
  alto: { label: 'Alto', variant: 'destructive', color: 'bg-red-500' },
  medio: { label: 'Médio', variant: 'secondary', color: 'bg-amber-500' },
  baixo: { label: 'Baixo', variant: 'outline', color: 'bg-emerald-500' },
};

export default function PrevisaoInadimplencia() {
  const { data: forecast = [], isLoading } = useDelinquencyForecast();
  const { data: alerts = [] } = useDelinquencyAlerts();
  const runAgent = useRunDelinquencyAgent();

  const totalRisk = forecast.filter((f) => f.risk_level === 'alto').reduce((s, f) => s + Number(f.open_amount), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Previsão de Inadimplência"
          description="Score de risco por cliente calculado sobre histórico real de atraso de pagamento">
          <Button onClick={() => runAgent.mutate()} disabled={runAgent.isPending}>
            {runAgent.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Rodar análise de risco
          </Button>
        </PageHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />Em aberto de alto risco</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(totalRisk)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Clientes analisados</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{forecast.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Alto risco</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-600">{forecast.filter((f) => f.risk_level === 'alto').length}</p></CardContent></Card>
        </div>

        {alerts.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-4 w-4 text-primary" />Alertas do agente</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.slice(0, 8).map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 border rounded-lg p-3">
                    <ShieldAlert className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{a.action_label}</p>
                      <p className="text-xs text-muted-foreground">{a.reason}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR }) : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Ranking de risco por cliente</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : forecast.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Sem clientes com saldo em aberto.</p>
                  <p className="text-sm">O score é calculado a partir do histórico de pagamentos — aparece conforme houver títulos pagos e em aberto.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {forecast.map((f) => (
                    <div key={f.counterparty_id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div><p className="font-medium">{f.client_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Atraso médio {Number(f.avg_delay_days).toFixed(0)}d · {Number(f.paid_late_ratio).toFixed(0)}% pagos com atraso
                          </p></div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm">{formatCurrency(Number(f.open_amount))}</span>
                          <Badge variant={riskBadge[f.risk_level]?.variant}>{riskBadge[f.risk_level]?.label}</Badge>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={f.risk_score} className={cn('h-2', '[&>div]:' + (riskBadge[f.risk_level]?.color ?? 'bg-slate-400'))} />
                        <span className="text-xs text-muted-foreground w-12 text-right">{f.risk_score}/100</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        <Alert>
          <AlertDescription>
            O score combina a taxa de pagamentos em atraso (peso 60%) e o atraso médio em dias (peso 40%) do histórico do cliente.
            É um cálculo determinístico sobre dados reais — não uma estimativa. Os alertas de alto risco aparecem também na Caixa de Decisões do Copilot.
          </AlertDescription>
        </Alert>
      </div>
    </MainLayout>
  );
}
