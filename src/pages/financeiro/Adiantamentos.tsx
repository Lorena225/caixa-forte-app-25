import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, HandCoins, ArrowDownLeft } from 'lucide-react';
import { useAdvances, useCreateAdvance, useCompensateAdvance } from '@/hooks/useFinanceModule';
import { useCounterparties } from '@/hooks/useCompanyData';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';

const statusBadge: Record<string, { label: string; variant: any }> = {
  aberto: { label: 'Aberto', variant: 'default' },
  compensado_parcial: { label: 'Parcial', variant: 'secondary' },
  compensado: { label: 'Compensado', variant: 'outline' },
};

export default function Adiantamentos() {
  const { data: advances = [], isLoading } = useAdvances();
  const { data: counterparties = [] } = useCounterparties();
  const createAdvance = useCreateAdvance();
  const compensate = useCompensateAdvance();
  const [open, setOpen] = useState(false);
  const [comp, setComp] = useState<{ id: string; max: number } | null>(null);
  const [compValue, setCompValue] = useState('');
  const [form, setForm] = useState({ kind: 'fornecedor', description: '', amount: '', counterparty_id: '', advance_date: format(new Date(), 'yyyy-MM-dd') });

  const submit = () => {
    if (!form.description || !form.amount) return;
    createAdvance.mutate({
      kind: form.kind, description: form.description, amount: Number(form.amount),
      counterparty_id: form.counterparty_id || undefined, advance_date: form.advance_date,
    }, { onSuccess: () => { setOpen(false); setForm({ ...form, description: '', amount: '' }); } });
  };

  const totalOpen = advances.filter((a: any) => a.status !== 'compensado').reduce((s: number, a: any) => s + Number(a.balance), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Adiantamentos"
          description="Adiantamentos a fornecedores e colaboradores, com compensação contra despesas reais">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Novo adiantamento</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar adiantamento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Tipo</Label>
                  <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fornecedor">Fornecedor</SelectItem>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                    </SelectContent>
                  </Select></div>
                {form.kind === 'fornecedor' && (
                  <div><Label>Fornecedor</Label>
                    <Select value={form.counterparty_id} onValueChange={(v) => setForm({ ...form, counterparty_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{counterparties.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select></div>
                )}
                <div><Label>Descrição</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Adiantamento p/ compra de material" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor (R$)</Label>
                    <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                  <div><Label>Data</Label>
                    <Input type="date" value={form.advance_date} onChange={(e) => setForm({ ...form, advance_date: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={submit} disabled={createAdvance.isPending}>
                {createAdvance.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Registrar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><HandCoins className="h-4 w-4" />Adiantamentos</span>
            <span className="text-sm font-normal text-muted-foreground">Saldo em aberto: {formatCurrency(totalOpen)}</span>
          </CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : advances.length === 0 ? <p className="text-center py-10 text-muted-foreground">Nenhum adiantamento registrado.</p>
              : <div className="space-y-2">{advances.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between border rounded-lg p-3 flex-wrap gap-2">
                    <div><p className="font-medium">{a.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.kind === 'fornecedor' ? (a.counterparty?.name ?? 'Fornecedor') : (a.employee?.full_name ?? 'Colaborador')}
                        · {format(new Date(a.advance_date + 'T00:00'), 'dd/MM/yyyy')}
                      </p></div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-mono font-semibold">{formatCurrency(Number(a.balance))}</p>
                        <p className="text-[11px] text-muted-foreground">de {formatCurrency(Number(a.amount))}</p>
                      </div>
                      <Badge variant={statusBadge[a.status]?.variant}>{statusBadge[a.status]?.label}</Badge>
                      {a.status !== 'compensado' && (
                        <Button size="sm" variant="outline" onClick={() => { setComp({ id: a.id, max: Number(a.balance) }); setCompValue(String(a.balance)); }}>
                          <ArrowDownLeft className="h-4 w-4 mr-1" />Compensar</Button>
                      )}
                    </div>
                  </div>
                ))}</div>}
          </CardContent>
        </Card>

        <Dialog open={!!comp} onOpenChange={(o) => !o && setComp(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Compensar adiantamento</DialogTitle></DialogHeader>
            {comp && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Saldo disponível: {formatCurrency(comp.max)}</p>
                <div><Label>Valor a compensar</Label>
                  <Input type="number" max={comp.max} value={compValue} onChange={(e) => setCompValue(e.target.value)} /></div>
              </div>
            )}
            <DialogFooter>
              <Button disabled={compensate.isPending || !comp || Number(compValue) <= 0 || Number(compValue) > (comp?.max ?? 0)}
                onClick={() => comp && compensate.mutate({ advanceId: comp.id, amount: Number(compValue) }, { onSuccess: () => setComp(null) })}>
                {compensate.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Compensar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
