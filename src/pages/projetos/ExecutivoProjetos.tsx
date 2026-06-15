import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, Building2, Users, Loader2, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { useKpiByClient, useKpiByPerson, useRunProjectAgent, useProjectAgentAlerts } from '@/hooks/useProjectModule';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function marginColor(pct: number) {
  if (pct >= 25) return 'text-emerald-600';
  if (pct >= 10) return 'text-amber-600';
  return 'text-red-600';
}

export default function ExecutivoProjetos() {
  const { data: byClient = [], isLoading: loadingClient } = useKpiByClient();
  const { data: byPerson = [], isLoading: loadingPerson } = useKpiByPerson();
  const { data: alerts = [] } = useProjectAgentAlerts();
  const runAgent = useRunProjectAgent();

  const pendingAlerts = alerts.filter((a: any) => a.status === 'pending_approval');

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Visão Executiva de Projetos"
          description="Rentabilidade por cliente, utilização por pessoa e alertas do Agente de Projetos">
          <Button onClick={() => runAgent.mutate()} disabled={runAgent.isPending}>
            {runAgent.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Rodar Agente de Projetos
          </Button>
        </PageHeader>

        {/* Agente de Projetos */}
        <Card className="border-primary/20">
          <CardHeader><CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />Agente de Projetos
            {pendingAlerts.length > 0 && <Badge variant="destructive">{pendingAlerts.length} alerta(s)</Badge>}
          </CardTitle></CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                O agente analisa burn rate e margem de cada projeto. Clique em "Rodar Agente" para gerar alertas.
              </p>
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 10).map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 border rounded-lg p-3">
                    <AlertTriangle className={cn('h-4 w-4 mt-0.5 shrink-0',
                      a.action_key === 'alerta_burn_rate' ? 'text-red-500' : 'text-amber-500')} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{a.action_label}</p>
                      <p className="text-xs text-muted-foreground">{a.reason}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR }) : ''}
                      </p>
                    </div>
                    <Badge variant={a.status === 'pending_approval' ? 'secondary' : 'outline'}>
                      {a.status === 'pending_approval' ? 'Pendente' : 'Visto'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="cliente">
          <TabsList>
            <TabsTrigger value="cliente"><Building2 className="h-4 w-4 mr-1" />Por cliente</TabsTrigger>
            <TabsTrigger value="pessoa"><Users className="h-4 w-4 mr-1" />Por pessoa</TabsTrigger>
          </TabsList>

          <TabsContent value="cliente">
            <Card><CardHeader><CardTitle>Rentabilidade por cliente</CardTitle></CardHeader>
              <CardContent>
                {loadingClient ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  : byClient.length === 0 ? <p className="text-center py-10 text-muted-foreground">Sem dados de faturamento por cliente ainda.</p>
                  : <div className="space-y-2">{byClient.map((c) => (
                      <div key={c.counterparty_id} className="flex items-center justify-between border rounded-lg p-3 flex-wrap gap-2">
                        <div><p className="font-medium">{c.client_name}</p>
                          <p className="text-xs text-muted-foreground">{c.project_count} projeto(s)</p></div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right"><p className="text-xs text-muted-foreground">Receita</p>
                            <p className="font-semibold">{formatCurrency(Number(c.revenue))}</p></div>
                          <div className="text-right"><p className="text-xs text-muted-foreground">Custo</p>
                            <p className="font-semibold">{formatCurrency(Number(c.cost))}</p></div>
                          <div className="text-right"><p className="text-xs text-muted-foreground">Margem</p>
                            <p className={cn('font-semibold', marginColor(Number(c.margin_pct)))}>{Number(c.margin_pct).toFixed(1)}%</p></div>
                        </div>
                      </div>))}</div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pessoa">
            <Card><CardHeader><CardTitle>Utilização e taxa por pessoa (últimos 90 dias)</CardTitle></CardHeader>
              <CardContent>
                {loadingPerson ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  : byPerson.length === 0 ? <p className="text-center py-10 text-muted-foreground">Sem horas aprovadas no período. Aponte e aprove horas para ver a utilização.</p>
                  : <div className="space-y-3">{byPerson.map((p) => (
                      <div key={p.employee_id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{p.full_name}</span>
                          <span className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">{Number(p.billable_hours).toFixed(0)}h faturáveis / {Number(p.total_hours).toFixed(0)}h</span>
                            <span className="text-xs text-muted-foreground">{formatCurrency(Number(p.revenue_generated))}</span>
                            <Badge variant={Number(p.utilization_pct) >= 70 ? 'default' : 'secondary'}>{Number(p.utilization_pct).toFixed(0)}% util.</Badge>
                          </span>
                        </div>
                        <Progress value={Number(p.utilization_pct)} className="h-2" />
                      </div>))}</div>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            Os alertas do Agente de Projetos também aparecem na Caixa de Decisões do Copilot IA, junto aos demais agentes
            (AR, AP, Caixa). Configure um agendamento para rodá-lo automaticamente toda semana.
          </AlertDescription>
        </Alert>
      </div>
    </MainLayout>
  );
}
