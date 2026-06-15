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
import { Plus, Loader2, PiggyBank } from 'lucide-react';
import { useProvisions, useCreateProvision } from '@/hooks/useFinanceModule';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';

const kindLabel: Record<string, string> = {
  ferias: 'Férias', decimo_terceiro: '13º salário', irpj_csll: 'IRPJ/CSLL', contingencia: 'Contingência', outras: 'Outras',
};
const statusBadge: Record<string, { label: string; variant: any }> = {
  provisionado: { label: 'Provisionado', variant: 'default' },
  revertido: { label: 'Revertido', variant: 'secondary' },
  realizado: { label: 'Realizado', variant: 'outline' },
};

export default function ProvisoesContabeis() {
  const { data: provisions = [], isLoading } = useProvisions();
  const createProvision = useCreateProvision();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kind: 'ferias', description: '', amount: '', competence: format(new Date(), 'yyyy-MM') });

  const submit = () => {
    if (!form.description || !form.amount) return;
    createProvision.mutate({
      kind: form.kind, description: form.description, amount: Number(form.amount), competence: form.competence + '-01',
    }, { onSuccess: () => { setOpen(false); setForm({ ...form, description: '', amount: '' }); } });
  };

  const total = provisions.filter((p: any) => p.status === 'provisionado').reduce((s: number, p: any) => s + Number(p.amount), 0);

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader title="Provisões"
          description="Provisões contábeis de férias, 13º, IRPJ/CSLL e contingências por competência">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova provisão</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Lançar provisão</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Tipo</Label>
                  <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ferias">Férias</SelectItem>
                      <SelectItem value="decimo_terceiro">13º salário</SelectItem>
                      <SelectItem value="irpj_csll">IRPJ/CSLL</SelectItem>
                      <SelectItem value="contingencia">Contingência</SelectItem>
                      <SelectItem value="outras">Outras</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label>Descrição</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Provisão de férias - junho" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor (R$)</Label>
                    <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                  <div><Label>Competência</Label>
                    <Input type="month" value={form.competence} onChange={(e) => setForm({ ...form, competence: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={submit} disabled={createProvision.isPending}>
                {createProvision.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Lançar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><PiggyBank className="h-4 w-4" />Provisões</span>
            <span className="text-sm font-normal text-muted-foreground">Constituído: {formatCurrency(total)}</span>
          </CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : provisions.length === 0 ? <p className="text-center py-10 text-muted-foreground">Nenhuma provisão lançada.</p>
              : <div className="space-y-2">{provisions.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between border rounded-lg p-3 flex-wrap gap-2">
                    <div><p className="font-medium">{p.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {kindLabel[p.kind]} · {format(new Date(p.competence + 'T00:00'), 'MM/yyyy')}
                      </p></div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">{formatCurrency(Number(p.amount))}</span>
                      <Badge variant={statusBadge[p.status]?.variant}>{statusBadge[p.status]?.label}</Badge>
                    </div>
                  </div>
                ))}</div>}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
