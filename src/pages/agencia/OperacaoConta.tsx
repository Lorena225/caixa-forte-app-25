import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowLeft, ClipboardList, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAgencyAccount, useAccountHealth, useOnboardingSteps, useToggleOnboardingStep, useDeliverables, useUpdateDeliverableStage, serviceLabel } from '@/hooks/useAgencyModule';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const STAGES = [
  { key: 'pauta', label: 'Pauta' },
  { key: 'copy', label: 'Copy' },
  { key: 'design', label: 'Design' },
  { key: 'revisao', label: 'Revisão' },
  { key: 'aprovacao_interna', label: 'Aprov. interna' },
  { key: 'aprovacao_cliente', label: 'Aprov. cliente' },
  { key: 'publicacao', label: 'Publicação' },
  { key: 'concluido', label: 'Concluído' },
];
const healthLabel: Record<string, { label: string; cls: string }> = {
  verde: { label: 'Saudável', cls: 'text-emerald-600 bg-emerald-500/10' },
  amarelo: { label: 'Atenção', cls: 'text-amber-600 bg-amber-500/10' },
  vermelho: { label: 'Crítica', cls: 'text-red-600 bg-red-500/10' },
};
const prioBadge: Record<string, any> = { baixa: 'outline', media: 'secondary', alta: 'default', urgente: 'destructive' };

export default function OperacaoConta() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { data: account, isLoading } = useAgencyAccount(accountId);
  const { data: health } = useAccountHealth(accountId);
  const { data: onboarding = [] } = useOnboardingSteps(accountId);
  const toggleStep = useToggleOnboardingStep();
  const { data: deliverables = [] } = useDeliverables(accountId);
  const updateStage = useUpdateDeliverableStage();

  if (isLoading) return <MainLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div></MainLayout>;
  if (!account) return <MainLayout><p className="text-center py-20 text-muted-foreground">Conta não encontrada.</p></MainLayout>;

  const onbDone = onboarding.filter((s: any) => s.is_done).length;
  const onbPct = onboarding.length ? Math.round((onbDone / onboarding.length) * 100) : 0;
  const h = healthLabel[health?.health ?? 'verde'];

  return (
    <MainLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/agencia')} className="mb-1">
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar para contas
        </Button>

        <PageHeader title={account.account_name}
          description={`${account.counterparty?.name ?? 'Cliente'} · ${serviceLabel(account.service_type)} · ${formatCurrency(Number(account.monthly_value))}/mês`}>
          {h && <span className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', h.cls)}>{h.label}</span>}
        </PageHeader>

        {/* Saúde da conta */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Entregas</p>
            <p className="text-2xl font-bold">{health?.deliverables_total ?? 0}</p></CardContent></Card>
          <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Atrasadas</p>
            <p className={cn('text-2xl font-bold', (health?.deliverables_overdue ?? 0) > 0 && 'text-red-600')}>{health?.deliverables_overdue ?? 0}</p></CardContent></Card>
          <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Aprovações pend.</p>
            <p className={cn('text-2xl font-bold', (health?.approvals_pending ?? 0) > 0 && 'text-amber-600')}>{health?.approvals_pending ?? 0}</p></CardContent></Card>
          <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Reuniões futuras</p>
            <p className="text-2xl font-bold">{health?.meetings_upcoming ?? 0}</p></CardContent></Card>
        </div>

        {/* Onboarding */}
        {account.status === 'onboarding' && onboarding.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4 text-primary" />Onboarding</span>
                <span className="text-sm font-normal text-muted-foreground">{onbDone}/{onboarding.length}</span>
              </CardTitle>
              <Progress value={onbPct} className="h-2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {onboarding.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 border rounded-lg p-3">
                    <Checkbox checked={s.is_done} onCheckedChange={(v) => toggleStep.mutate({ id: s.id, done: !!v })} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium', s.is_done && 'line-through text-muted-foreground')}>{s.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{s.category}</p>
                    </div>
                    {s.is_blocking && !s.is_done && <Badge variant="outline" className="text-amber-600 border-amber-300">bloqueia produção</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Kanban de entregas */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" />Produção — entregas</CardTitle></CardHeader>
          <CardContent>
            {deliverables.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhuma entrega nesta conta.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex gap-3 min-w-max pb-2">
                  {STAGES.map((stage) => {
                    const items = deliverables.filter((d: any) => d.stage === stage.key);
                    return (
                      <div key={stage.key} className="w-56 shrink-0">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{stage.label}</span>
                          <span className="text-xs text-muted-foreground">{items.length}</span>
                        </div>
                        <div className="space-y-2">
                          {items.map((d: any) => {
                            const overdue = d.due_date && new Date(d.due_date) < new Date() && d.stage !== 'concluido';
                            return (
                              <div key={d.id} className={cn('rounded-lg border p-2.5 bg-card', d.is_blocked && 'border-l-4 border-l-red-500')}>
                                <p className="text-sm font-medium leading-snug">{d.title}</p>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  <Badge variant={prioBadge[d.priority]} className="text-[10px] px-1.5 py-0">{d.priority}</Badge>
                                  <span className="text-[10px] text-muted-foreground capitalize">{d.discipline}</span>
                                  {overdue && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                </div>
                                {stage.key !== 'concluido' && (
                                  <select
                                    className="mt-2 w-full text-[11px] rounded border bg-background px-1 py-0.5 text-muted-foreground"
                                    value={d.stage}
                                    onChange={(e) => updateStage.mutate({ id: d.id, stage: e.target.value })}>
                                    {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                                  </select>
                                )}
                                {stage.key === 'concluido' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-1.5" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
