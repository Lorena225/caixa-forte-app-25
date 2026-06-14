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
import { Plus, Check, FileText, Loader2, Receipt } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useBillingEvents, useCreateBillingEvent, useApproveBillingEvent, useInvoiceBillingEvent } from '@/hooks/useProjectModule';
import { formatCurrency } from '@/lib/formatters';
import { format, addDays } from 'date-fns';

const statusBadge: Record<string, { label: string; variant: any }> = {
  previsto: { label: 'Previsto', variant: 'secondary' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  faturado: { label: 'Faturado', variant: 'outline' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
};
const typeLabel: Record<string, string> = {
  milestone: 'Milestone', medicao: 'Medição', retainer: 'Retainer', reembolso: 'Reembolso',
};

export default function FaturamentoProjetos() {
  const { data: projects = [] } = useProjects({ status: 'todos', search: '' });
  const { data: events = [], isLoading } = useBillingEvents(null);
  const createEvent = useCreateBillingEvent();
  const approve = useApproveBillingEvent();
  const invoice = useInvoiceBillingEvent();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    project_id: '', event_type: 'milestone', description: '', amount: '',
    reference_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  });

  const submit = () => {
    if (!form.project_id || !form.description || !form.amount) return;
    createEvent.mutate({
      project_id: form.project_id, event_type: form.event_type, description: form.description,
      amount: Number(form.amount), reference_date: form.reference_date, due_date: form.due_date,
    }, { onSuccess: () => { setOpen(false); setForm({ ...form, description: '', amount: '' }); } });
  };

  const aFaturar = events.filter((e: any) => e.status === 'aprovado').reduce((s: number, e: any) => s + Number(e.amount), 0);
  const faturado = events.filter((e: any) => e.status === 'faturado').reduce((s: number, e: any) => s + Number(e.amount), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Faturamento de Projetos"
          description="Eventos de faturamento por milestone, medição ou retainer — aprovar e faturar gera o título no Contas a Receber">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Novo evento</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo evento de faturamento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Projeto</Label>
                  <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Tipo</Label>
                  <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="milestone">Milestone concluído</SelectItem>
                      <SelectItem value="medicao">Medição mensal (T&M)</SelectItem>
                      <SelectItem value="retainer">Retainer mensal</SelectItem>
                      <SelectItem value="reembolso">Reembolso de despesas</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label>Descrição</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Entrega da fase 1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor (R$)</Label>
                    <Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                  <div><Label>Vencimento</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={submit} disabled={createEvent.isPending}>
                {createEvent.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Criar evento</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">A faturar (aprovado)</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-amber-600">{formatCurrency(aFaturar)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Já faturado</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-emerald-600">{formatCurrency(faturado)}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Eventos de faturamento</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : events.length === 0 ? <p className="text-center py-10 text-muted-foreground">Nenhum evento de faturamento. Crie um ao concluir um milestone ou fechar uma medição.</p>
              : <div className="space-y-2">{events.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between border rounded-lg p-3 flex-wrap gap-2">
                    <div><p className="font-medium">{e.description}</p>
                      <p className="text-xs text-muted-foreground">{e.project?.name} · {typeLabel[e.event_type]} · venc. {e.due_date ? format(new Date(e.due_date + 'T00:00'), 'dd/MM/yyyy') : '—'}</p></div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">{formatCurrency(Number(e.amount))}</span>
                      <Badge variant={statusBadge[e.status]?.variant}>{statusBadge[e.status]?.label}</Badge>
                      {e.status === 'previsto' && (
                        <Button size="sm" variant="outline" onClick={() => approve.mutate(e.id)} disabled={approve.isPending}>
                          <Check className="h-4 w-4 mr-1" />Aprovar</Button>)}
                      {e.status === 'aprovado' && (
                        <Button size="sm" onClick={() => invoice.mutate(e.id)} disabled={invoice.isPending}>
                          {invoice.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Receipt className="h-4 w-4 mr-1" />}Faturar (gera AR)</Button>)}
                    </div>
                  </div>))}</div>}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
