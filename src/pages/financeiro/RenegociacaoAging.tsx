import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Loader2, HandCoins, TrendingDown, RefreshCw } from 'lucide-react';
import { useTransactions, useAgingReport, useRenegotiate } from '@/hooks/useFinanceModule';
import { formatCurrency } from '@/lib/formatters';
import { format, addDays, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function RenegociacaoAging() {
  const { data: aging } = useAgingReport('entrada');
  const { data: titulos = [], isLoading } = useTransactions('entrada', 'lancado');
  const renegotiate = useRenegotiate();
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ entry: '0', installments: '3', firstDue: format(addDays(new Date(), 30), 'yyyy-MM-dd'), interest: '0' });

  const hoje = new Date();
  const vencidos = titulos.filter((t: any) => t.due_date && parseISO(t.due_date) < hoje && Number(t.balance_amount) > 0);

  const agingBands = aging ? [
    { label: 'A vencer', value: aging.current, color: 'bg-emerald-500' },
    { label: '1-30 dias', value: aging.d30, color: 'bg-amber-400' },
    { label: '31-60 dias', value: aging.d60, color: 'bg-orange-500' },
    { label: '61-90 dias', value: aging.d90, color: 'bg-red-500' },
    { label: '+90 dias', value: aging.d90plus, color: 'bg-red-700' },
  ] : [];
  const agingTotal = agingBands.reduce((s, b) => s + Number(b.value), 0);

  const submit = () => {
    if (!selected) return;
    renegotiate.mutate({
      transactionId: selected.id, entryAmount: Number(form.entry),
      installments: Number(form.installments), firstDueDate: form.firstDue, interestPct: Number(form.interest),
    }, { onSuccess: () => setSelected(null) });
  };

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader title="Cobrança & Renegociação"
          description="Aging de recebíveis por faixa de atraso e renegociação de títulos vencidos em novas parcelas" />

        {/* Aging */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="h-4 w-4" />Aging de recebíveis</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-5">
              {agingBands.map((b) => (
                <div key={b.label} className="border rounded-lg p-3 text-center">
                  <div className={cn('h-1.5 rounded-full mb-2', b.color)} />
                  <p className="text-xs text-muted-foreground">{b.label}</p>
                  <p className="font-bold">{formatCurrency(Number(b.value))}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Total em aberto: <span className="font-semibold text-foreground">{formatCurrency(agingTotal)}</span>
              {agingTotal > 0 && <> · Vencido: <span className="font-semibold text-red-600">{formatCurrency(agingTotal - Number(aging?.current ?? 0))}</span></>}
            </p>
          </CardContent>
        </Card>

        {/* Vencidos para renegociar */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><HandCoins className="h-4 w-4" />Títulos vencidos</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : vencidos.length === 0 ? <p className="text-center py-10 text-muted-foreground">Nenhum título vencido. 🎉</p>
              : <div className="space-y-2">{vencidos.map((t: any) => {
                  const dias = differenceInDays(hoje, parseISO(t.due_date));
                  return (
                    <div key={t.id} className="flex items-center justify-between border rounded-lg p-3 flex-wrap gap-2">
                      <div><p className="font-medium">{t.counterparty?.name ?? t.description}</p>
                        <p className="text-xs text-muted-foreground">
                          venc. {format(parseISO(t.due_date), 'dd/MM/yyyy')} · <span className="text-red-600">D+{dias}</span>
                        </p></div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold">{formatCurrency(Number(t.balance_amount))}</span>
                        <Button size="sm" variant="outline" onClick={() => {
                          setSelected(t);
                          setForm({ ...form, entry: '0', installments: '3' });
                        }}><RefreshCw className="h-4 w-4 mr-1" />Renegociar</Button>
                      </div>
                    </div>
                  );
                })}</div>}
          </CardContent>
        </Card>

        {/* Dialog de renegociação */}
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Renegociar título</DialogTitle></DialogHeader>
            {selected && (
              <div className="space-y-3">
                <div className="bg-muted/40 rounded-lg p-3 text-sm">
                  <p className="font-medium">{selected.counterparty?.name ?? selected.description}</p>
                  <p className="text-muted-foreground">Saldo: {formatCurrency(Number(selected.balance_amount))}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Entrada (R$)</Label>
                    <Input type="number" value={form.entry} onChange={(e) => setForm({ ...form, entry: e.target.value })} /></div>
                  <div><Label>Nº de parcelas</Label>
                    <Input type="number" min="1" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>1º vencimento</Label>
                    <Input type="date" value={form.firstDue} onChange={(e) => setForm({ ...form, firstDue: e.target.value })} /></div>
                  <div><Label>Juros (%)</Label>
                    <Input type="number" step="0.1" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} /></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  O título original será baixado como renegociado (com rastro de auditoria) e {form.installments} nova(s) parcela(s) serão criadas.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button onClick={submit} disabled={renegotiate.isPending}>
                {renegotiate.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Confirmar renegociação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
