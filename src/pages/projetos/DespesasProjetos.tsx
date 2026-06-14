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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Check, Loader2, Receipt } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useProjectExpenses, useCreateExpense, useApproveExpense } from '@/hooks/useProjectModule';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';

const statusBadge: Record<string, { label: string; variant: any }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  rejeitado: { label: 'Rejeitado', variant: 'destructive' },
  faturado: { label: 'Faturado', variant: 'outline' },
};

export default function DespesasProjetos() {
  const { data: projects = [] } = useProjects({ status: 'todos', search: '' });
  const { data: expenses = [], isLoading } = useProjectExpenses(null);
  const createExpense = useCreateExpense();
  const approve = useApproveExpense();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    project_id: '', description: '', amount: '', category: 'viagem',
    expense_date: format(new Date(), 'yyyy-MM-dd'), reimbursable: false,
  });

  const submit = () => {
    if (!form.project_id || !form.description || !form.amount) return;
    createExpense.mutate({
      project_id: form.project_id, description: form.description, amount: Number(form.amount),
      expense_date: form.expense_date, reimbursable: form.reimbursable, category: form.category,
    }, { onSuccess: () => { setOpen(false); setForm({ ...form, description: '', amount: '' }); } });
  };

  const total = expenses.filter((e: any) => e.status !== 'rejeitado').reduce((s: number, e: any) => s + Number(e.amount), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Despesas de Projeto"
          description="Despesas e reembolsos vinculados ao projeto — entram no custo e, se reembolsáveis, no faturamento">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Lançar despesa</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Lançar despesa de projeto</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Projeto</Label>
                  <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Descrição</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Passagem aérea SP-RJ" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor (R$)</Label>
                    <Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                  <div><Label>Categoria</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viagem">Viagem</SelectItem>
                        <SelectItem value="software">Software</SelectItem>
                        <SelectItem value="terceiros">Terceiros</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select></div>
                </div>
                <div><Label>Data</Label>
                  <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
                <div className="flex items-center gap-2">
                  <Checkbox id="reemb" checked={form.reimbursable} onCheckedChange={(v) => setForm({ ...form, reimbursable: !!v })} />
                  <Label htmlFor="reemb" className="cursor-pointer">Reembolsável pelo cliente</Label>
                </div>
              </div>
              <DialogFooter><Button onClick={submit} disabled={createExpense.isPending}>
                {createExpense.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Lançar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Receipt className="h-4 w-4" />Despesas</span>
            <span className="text-sm font-normal text-muted-foreground">Total: {formatCurrency(total)}</span>
          </CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : expenses.length === 0 ? <p className="text-center py-10 text-muted-foreground">Nenhuma despesa lançada.</p>
              : <div className="space-y-2">{expenses.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between border rounded-lg p-3 flex-wrap gap-2">
                    <div><p className="font-medium">{e.description}</p>
                      <p className="text-xs text-muted-foreground">{e.project?.name} · {format(new Date(e.expense_date + 'T00:00'), 'dd/MM/yyyy')}
                        {e.reimbursable ? ' · reembolsável' : ''} · {e.category}</p></div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">{formatCurrency(Number(e.amount))}</span>
                      <Badge variant={statusBadge[e.status]?.variant}>{statusBadge[e.status]?.label}</Badge>
                      {e.status === 'pendente' && (
                        <Button size="sm" variant="outline" onClick={() => approve.mutate(e.id)} disabled={approve.isPending}>
                          <Check className="h-4 w-4" /></Button>)}
                    </div>
                  </div>))}</div>}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
