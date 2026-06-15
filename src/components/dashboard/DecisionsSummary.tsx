import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Inbox, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { useInboxSummary, useRunAllAgents } from '@/hooks/useAIInbox';
import { formatCurrency } from '@/lib/formatters';

export function DecisionsSummary() {
  const { data: summary, isLoading } = useInboxSummary();
  const runAll = useRunAllAgents();
  const navigate = useNavigate();

  const pending = summary?.pending ?? 0;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base"><Inbox className="h-4 w-4 text-primary" />Caixa de Decisões</span>
          {pending > 0 && <Badge variant="destructive">{pending} pendente{pending > 1 ? 's' : ''}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : pending === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">Nenhuma decisão pendente. Os agentes analisam projetos, caixa e inadimplência.</p>
            <Button size="sm" variant="outline" onClick={() => runAll.mutate()} disabled={runAll.isPending}>
              {runAll.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Rodar agentes
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Impacto financeiro</span>
              <span className="font-semibold">{formatCurrency(Number(summary?.pending_amount ?? 0))}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(summary?.by_agent ?? []).map((a) => (
                <Badge key={a.agent_type} variant="secondary">{a.agent_type}: {a.n}</Badge>
              ))}
            </div>
            <Button size="sm" className="w-full" onClick={() => navigate('/autopiloto/caixa-entrada')}>
              Revisar decisões <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
