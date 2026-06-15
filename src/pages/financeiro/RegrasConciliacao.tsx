import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, ListChecks, Zap } from 'lucide-react';
import { useReconciliationRules, useCreateReconRule, useToggleReconRule } from '@/hooks/useFinanceModule';

export default function RegrasConciliacao() {
  const { data: rules = [], isLoading } = useReconciliationRules();
  const createRule = useCreateReconRule();
  const toggleRule = useToggleReconRule();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', priority: 10,
    contains: '', amount: '', tolerance: '0.01', action_type: 'categorize', action_value: '',
  });

  const submit = () => {
    if (!form.name || !form.contains) return;
    createRule.mutate({
      name: form.name, description: form.description, priority: Number(form.priority),
      match_criteria: {
        description_contains: form.contains,
        amount: form.amount ? Number(form.amount) : null,
        tolerance: Number(form.tolerance),
      },
      action: { type: form.action_type, value: form.action_value },
    }, { onSuccess: () => { setOpen(false); setForm({ ...form, name: '', contains: '', amount: '', action_value: '' }); } });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Regras de Conciliação"
          description="Regras que classificam linhas de extrato automaticamente antes do match manual — torna a conciliação por IA configurável e auditável">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova regra</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova regra de conciliação</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_90px] gap-3">
                  <div><Label>Nome da regra</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tarifa bancária mensal" /></div>
                  <div><Label>Prioridade</Label>
                    <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></div>
                </div>
                <div className="border rounded-lg p-3 space-y-3">
                  <p className="text-sm font-medium">Se a linha do extrato…</p>
                  <div><Label className="text-xs">Descrição contém</Label>
                    <Input value={form.contains} onChange={(e) => setForm({ ...form, contains: e.target.value })} placeholder="TARIFA" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Valor aprox. (opcional)</Label>
                      <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                    <div><Label className="text-xs">Tolerância (R$)</Label>
                      <Input type="number" step="0.01" value={form.tolerance} onChange={(e) => setForm({ ...form, tolerance: e.target.value })} /></div>
                  </div>
                </div>
                <div className="border rounded-lg p-3 space-y-3">
                  <p className="text-sm font-medium">…então</p>
                  <div><Label className="text-xs">Ação</Label>
                    <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="categorize">Categorizar</SelectItem>
                        <SelectItem value="match_counterparty">Vincular contraparte</SelectItem>
                        <SelectItem value="ignore">Ignorar (não concilia)</SelectItem>
                      </SelectContent>
                    </Select></div>
                  <div><Label className="text-xs">Valor da ação (categoria/contraparte)</Label>
                    <Input value={form.action_value} onChange={(e) => setForm({ ...form, action_value: e.target.value })} placeholder="Despesas bancárias" /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={submit} disabled={createRule.isPending || !form.name || !form.contains}>
                {createRule.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Criar regra</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-4 w-4" />Regras ativas (por prioridade)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : rules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Nenhuma regra de conciliação.</p>
                  <p className="text-sm">Crie regras para classificar tarifas, impostos e recebimentos recorrentes automaticamente.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rules.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between border rounded-lg p-3 gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-medium flex items-center gap-2">
                          <Badge variant="outline">P{r.priority}</Badge>{r.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          contém "{r.match_criteria?.description_contains}" → {r.action?.type} {r.action?.value ? `· ${r.action.value}` : ''}
                          {r.matches_count ? ` · ${r.matches_count} match(es)` : ''}
                        </p>
                      </div>
                      <Switch checked={r.is_active} onCheckedChange={(v) => toggleRule.mutate({ id: r.id, isActive: v })} />
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
