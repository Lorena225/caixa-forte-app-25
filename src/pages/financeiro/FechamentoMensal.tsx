import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Lock, LockOpen, Check, X, Loader2, CalendarCheck, Plus } from 'lucide-react';
import { useFinancialPeriods, useOpenPeriod, useClosingChecklist, useClosePeriod, useReopenPeriod } from '@/hooks/useFinanceModule';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FechamentoMensal() {
  const { data: periods = [], isLoading } = useFinancialPeriods();
  const openPeriod = useOpenPeriod();
  const closePeriod = useClosePeriod();
  const reopenPeriod = useReopenPeriod();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: checklist } = useClosingChecklist(selectedId);
  const [newMonth, setNewMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [reopenReason, setReopenReason] = useState('');

  const selected = periods.find((p: any) => p.id === selectedId);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Fechamento Mensal"
          description="Trava a competência do mês: nenhum título do período pode ser alterado após o fechamento">
          <Dialog>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Abrir período</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Abrir período financeiro</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Mês de competência</Label>
                  <Input type="month" value={newMonth} onChange={(e) => setNewMonth(e.target.value)} /></div>
              </div>
              <DialogFooter><Button onClick={() => openPeriod.mutate(newMonth + '-01')} disabled={openPeriod.isPending}>
                {openPeriod.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Abrir</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
          <Card>
            <CardHeader><CardTitle>Períodos</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                : periods.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">Nenhum período. Abra um para começar o controle de competência.</p>
                : <div className="space-y-2">{periods.map((p: any) => (
                    <button key={p.id} onClick={() => setSelectedId(p.id)}
                      className={`w-full flex items-center justify-between border rounded-lg p-3 text-left hover:bg-muted/40 transition-colors ${selectedId === p.id ? 'ring-2 ring-primary' : ''}`}>
                      <span className="font-medium capitalize">
                        {format(new Date(p.period_month + 'T00:00'), 'MMMM yyyy', { locale: ptBR })}
                      </span>
                      {p.status === 'fechado'
                        ? <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />Fechado</Badge>
                        : <Badge variant="default"><LockOpen className="h-3 w-3 mr-1" />Aberto</Badge>}
                    </button>))}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CalendarCheck className="h-4 w-4" />Checklist de fechamento</CardTitle></CardHeader>
            <CardContent>
              {!selected ? <p className="text-center py-8 text-muted-foreground text-sm">Selecione um período para ver o checklist.</p>
                : !checklist ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {(checklist.checks ?? []).map((c: any) => (
                        <div key={c.code} className="flex items-center gap-3 border rounded-lg p-3">
                          {c.ok ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <X className="h-4 w-4 text-red-600 shrink-0" />}
                          <div className="flex-1"><p className="text-sm font-medium">{c.label}</p>
                            <p className="text-xs text-muted-foreground">{c.detail}</p></div>
                        </div>
                      ))}
                    </div>

                    {selected.status === 'aberto' ? (
                      <>
                        {!checklist.can_close && (
                          <Alert variant="destructive"><X className="h-4 w-4" />
                            <AlertDescription>Resolva os bloqueios acima (títulos pendentes de aprovação) antes de fechar.</AlertDescription>
                          </Alert>)}
                        <Button className="w-full" disabled={!checklist.can_close || closePeriod.isPending}
                          onClick={() => closePeriod.mutate(selected.id)}>
                          {closePeriod.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Lock className="h-4 w-4 mr-1" />}
                          Fechar período
                        </Button>
                      </>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full"><LockOpen className="h-4 w-4 mr-1" />Reabrir período</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Reabrir período fechado</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <Alert><AlertDescription>A reabertura é auditada. Informe o motivo.</AlertDescription></Alert>
                            <div><Label>Motivo</Label>
                              <Input value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="Ajuste de lançamento retroativo" /></div>
                          </div>
                          <DialogFooter>
                            <Button disabled={!reopenReason || reopenPeriod.isPending}
                              onClick={() => reopenPeriod.mutate({ periodId: selected.id, reason: reopenReason })}>
                              {reopenPeriod.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Reabrir
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
