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
import { Plus, Users, DollarSign, Loader2, Pencil } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useAllocations, useCreateAllocation, useEmployeesWithRates, useSaveCostRate } from '@/hooks/useProjectModule';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';

export default function AlocacaoProjetos() {
  const { data: projects = [] } = useProjects({ status: 'todos', search: '' });
  const { data: employees = [] } = useEmployeesWithRates();
  const { data: allocations = [], isLoading } = useAllocations(null);
  const createAlloc = useCreateAllocation();
  const saveCost = useSaveCostRate();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    project_id: '', employee_id: '', allocation_pct: '100', bill_rate: '',
    start_date: format(new Date(), 'yyyy-MM-dd'), end_date: '',
  });
  const [rateEdit, setRateEdit] = useState<{ id: string; value: string } | null>(null);

  const submit = () => {
    if (!form.project_id || !form.employee_id) return;
    createAlloc.mutate({
      project_id: form.project_id, employee_id: form.employee_id,
      allocation_pct: Number(form.allocation_pct), bill_rate: Number(form.bill_rate || 0),
      start_date: form.start_date, end_date: form.end_date || undefined,
    }, { onSuccess: () => setOpen(false) });
  };

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader title="Alocação & Custo-hora"
          description="Quem está em qual projeto e o custo-hora carregado de cada colaborador">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Alocar pessoa</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Alocar colaborador ao projeto</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Projeto</Label>
                  <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Colaborador</Label>
                  <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Dedicação (%)</Label>
                    <Input type="number" min="1" max="100" value={form.allocation_pct}
                      onChange={(e) => setForm({ ...form, allocation_pct: e.target.value })} /></div>
                  <div><Label>Taxa-hora venda (R$)</Label>
                    <Input type="number" min="0" value={form.bill_rate}
                      onChange={(e) => setForm({ ...form, bill_rate: e.target.value })} placeholder="250" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Início</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><Label>Fim (opcional)</Label>
                    <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={submit} disabled={createAlloc.isPending}>
                {createAlloc.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Alocar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <Tabs defaultValue="alocacao">
          <TabsList>
            <TabsTrigger value="alocacao"><Users className="h-4 w-4 mr-1" />Alocações</TabsTrigger>
            <TabsTrigger value="custo"><DollarSign className="h-4 w-4 mr-1" />Custo-hora</TabsTrigger>
          </TabsList>

          <TabsContent value="alocacao">
            <Card><CardHeader><CardTitle>Alocações ativas</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  : allocations.length === 0 ? <p className="text-center py-10 text-muted-foreground">Nenhuma alocação. Aloque pessoas aos projetos para montar o mapa de capacidade.</p>
                  : <div className="space-y-2">{allocations.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between border rounded-lg p-3 flex-wrap gap-2">
                        <div><p className="font-medium">{a.employee?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{a.project?.name} · desde {format(new Date(a.start_date + 'T00:00'), 'dd/MM/yyyy')}</p></div>
                        <div className="flex items-center gap-4 text-sm">
                          <Badge variant="secondary">{a.allocation_pct}% dedicação</Badge>
                          <span className="text-muted-foreground">Venda: {formatCurrency(a.bill_rate ?? 0)}/h</span>
                        </div>
                      </div>))}</div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custo">
            <Card><CardHeader><CardTitle>Custo-hora carregado por colaborador</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Salário + encargos + benefícios ÷ horas úteis. Alterar cria nova vigência — apontamentos antigos mantêm o custo da época.</p>
                <div className="space-y-2">
                  {employees.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between border rounded-lg p-3">
                      <p className="font-medium">{e.full_name}</p>
                      {rateEdit?.id === e.id ? (
                        <div className="flex items-center gap-2">
                          <Input type="number" className="w-32" value={rateEdit.value}
                            onChange={(ev) => setRateEdit({ id: e.id, value: ev.target.value })} placeholder="0,00" />
                          <Button size="sm" disabled={saveCost.isPending}
                            onClick={() => saveCost.mutate({ employee_id: e.id, cost_per_hour: Number(rateEdit.value) },
                              { onSuccess: () => setRateEdit(null) })}>Salvar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setRateEdit(null)}>Cancelar</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className={e.cost_per_hour == null ? 'text-muted-foreground text-sm' : 'font-mono'}>
                            {e.cost_per_hour == null ? 'Não definido' : `${formatCurrency(e.cost_per_hour)}/h`}</span>
                          <Button size="sm" variant="outline"
                            onClick={() => setRateEdit({ id: e.id, value: String(e.cost_per_hour ?? '') })}>
                            <Pencil className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {employees.length === 0 && <p className="text-center py-10 text-muted-foreground">Cadastre colaboradores em Pessoas para definir o custo-hora.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
