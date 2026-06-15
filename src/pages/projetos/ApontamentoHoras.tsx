import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Check, X, Clock, Loader2 } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useTimeEntries, useCreateTimeEntry, useApproveTimeEntry, useRejectTimeEntry, useEmployeesWithRates } from '@/hooks/useProjectModule';
import { format } from 'date-fns';

const statusBadge: Record<string, { label: string; variant: any }> = {
  rascunho: { label: 'Rascunho', variant: 'outline' },
  enviado: { label: 'Aguardando', variant: 'secondary' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  rejeitado: { label: 'Rejeitado', variant: 'destructive' },
};

export default function ApontamentoHoras() {
  const { data: projects = [] } = useProjects({ status: 'todos', search: '' });
  const { data: employees = [] } = useEmployeesWithRates();
  const [tab, setTab] = useState('aprovacao');
  const { data: pending = [], isLoading: loadingPending } = useTimeEntries(null, 'enviado');
  const { data: all = [], isLoading: loadingAll } = useTimeEntries(null, 'todos');
  const createEntry = useCreateTimeEntry();
  const approve = useApproveTimeEntry();
  const reject = useRejectTimeEntry();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    project_id: '', employee_id: '', entry_date: format(new Date(), 'yyyy-MM-dd'),
    hours: '', billable: true, description: '',
  });

  const submit = () => {
    if (!form.project_id || !form.employee_id || !form.hours) return;
    createEntry.mutate(
      { ...form, hours: Number(form.hours) },
      { onSuccess: () => { setOpen(false); setForm({ ...form, hours: '', description: '' }); } }
    );
  };

  const NewEntryDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" />Apontar horas</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Apontar horas</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Projeto</Label>
            <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Colaborador</Label>
            <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data</Label>
              <Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></div>
            <div><Label>Horas</Label>
              <Input type="number" step="0.5" min="0" max="24" value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="8" /></div>
          </div>
          <div><Label>Descrição</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="O que foi feito" /></div>
          <div className="flex items-center gap-2">
            <Checkbox id="bill" checked={form.billable}
              onCheckedChange={(v) => setForm({ ...form, billable: !!v })} />
            <Label htmlFor="bill" className="cursor-pointer">Faturável ao cliente</Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={createEntry.isPending}>
            {createEntry.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Enviar para aprovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderRow = (e: any, showActions: boolean) => (
    <div key={e.id} className="flex items-center justify-between gap-4 border rounded-lg p-3 flex-wrap">
      <div className="min-w-0">
        <p className="font-medium truncate">{e.project?.name} · {e.employee?.full_name}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(e.entry_date + 'T00:00'), 'dd/MM/yyyy')} · {e.hours}h
          {e.billable ? ' · faturável' : ' · não faturável'}
          {e.description ? ` · ${e.description}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={statusBadge[e.status]?.variant}>{statusBadge[e.status]?.label}</Badge>
        {showActions && (
          <>
            <Button size="sm" variant="outline" onClick={() => approve.mutate(e.id)} disabled={approve.isPending}>
              <Check className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline"
              onClick={() => reject.mutate({ id: e.id, reason: 'Rejeitado na revisão' })} disabled={reject.isPending}>
              <X className="h-4 w-4" /></Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader title="Apontamento de Horas"
          description="Registro semanal de horas por projeto, com aprovação que converte hora em custo realizado">
          {NewEntryDialog}
        </PageHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="aprovacao">
              Aprovação <Badge variant="secondary" className="ml-2">{pending.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="todos">Todos os apontamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="aprovacao">
            <Card><CardHeader><CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />Horas aguardando aprovação</CardTitle></CardHeader>
              <CardContent>
                {loadingPending ? (
                  <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : pending.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground">Nenhuma hora pendente de aprovação.</p>
                ) : (
                  <div className="space-y-2">{pending.map((e: any) => renderRow(e, true))}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="todos">
            <Card><CardHeader><CardTitle>Histórico de apontamentos</CardTitle></CardHeader>
              <CardContent>
                {loadingAll ? (
                  <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : all.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground">Nenhum apontamento ainda.</p>
                ) : (
                  <div className="space-y-2">{all.map((e: any) => renderRow(e, e.status === 'enviado'))}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
