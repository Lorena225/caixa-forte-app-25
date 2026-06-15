import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Inbox, Loader2, Sparkles, Clock, Wallet } from 'lucide-react';
import { AIActionCard } from '@/components/ia/AIActionCard';
import { useInboxSummary, useInboxActions, useApproveAction, useRejectAction, useRevertAction, useRunAllAgents } from '@/hooks/useAIInbox';
import { formatCurrency } from '@/lib/formatters';

export default function InboxDecisoes() {
  const { data: summary } = useInboxSummary();
  const [tab, setTab] = useState('pending_approval');
  const { data: actions = [], isLoading } = useInboxActions(tab);
  const approve = useApproveAction();
  const reject = useRejectAction();
  const revert = useRevertAction();
  const runAll = useRunAllAgents();

  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [revertTarget, setRevertTarget] = useState<string | null>(null);
  const [revertReason, setRevertReason] = useState('');

  const busy = approve.isPending || reject.isPending || revert.isPending;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Caixa de Decisões"
          description="Fila única de tudo que os agentes de IA propuseram — aprove, rejeite ou reverta com governança">
          <Button onClick={() => runAll.mutate()} disabled={runAll.isPending}>
            {runAll.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Rodar agentes agora
          </Button>
        </PageHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            <Inbox className="h-4 w-4 text-muted-foreground" />Pendentes</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{summary?.pending ?? 0}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />Impacto pendente</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(Number(summary?.pending_amount ?? 0))}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />Ações hoje</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{summary?.today ?? 0}</p></CardContent></Card>
        </div>

        {summary?.by_agent && summary.by_agent.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {summary.by_agent.map((a) => (
              <Badge key={a.agent_type} variant="secondary">{a.agent_type}: {a.n}</Badge>
            ))}
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending_approval">Pendentes</TabsTrigger>
            <TabsTrigger value="executed">Executadas</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
            <TabsTrigger value="todos">Todas</TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            <Card>
              <CardContent className="pt-6">
                {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  : actions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p>{tab === 'pending_approval' ? 'Nenhuma decisão pendente.' : 'Nada aqui.'}</p>
                      <p className="text-sm">Rode os agentes para gerar recomendações sobre projetos, caixa e inadimplência.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {actions.map((action) => (
                        <AIActionCard key={action.id} action={action}
                          onApprove={(id) => approve.mutate({ id })}
                          onReject={(id) => { setRejectTarget(id); setRejectReason(''); }}
                          onRevert={(id) => { setRevertTarget(id); setRevertReason(''); }}
                          busy={busy} />
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog rejeitar */}
        <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rejeitar recomendação</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label>Motivo da rejeição</Label>
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Não se aplica neste caso" />
            </div>
            <DialogFooter>
              <Button disabled={!rejectReason || reject.isPending}
                onClick={() => rejectTarget && reject.mutate({ id: rejectTarget, reason: rejectReason }, { onSuccess: () => setRejectTarget(null) })}>
                {reject.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Rejeitar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog reverter */}
        <Dialog open={!!revertTarget} onOpenChange={(o) => !o && setRevertTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reverter ação executada</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label>Motivo da reversão</Label>
              <Input value={revertReason} onChange={(e) => setRevertReason(e.target.value)} placeholder="Executada por engano" />
            </div>
            <DialogFooter>
              <Button disabled={!revertReason || revert.isPending}
                onClick={() => revertTarget && revert.mutate({ id: revertTarget, reason: revertReason }, { onSuccess: () => setRevertTarget(null) })}>
                {revert.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Reverter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
