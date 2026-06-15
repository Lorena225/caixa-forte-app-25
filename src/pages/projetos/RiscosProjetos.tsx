import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ShieldAlert, Ban, GitBranch, Loader2, Check } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useProjectRisks, useCreateRisk, useUpdateRiskStatus } from '@/hooks/useProjectModule';
import { format } from 'date-fns';

const severityBadge: Record<string, { label: string; variant: any }> = {
  baixa: { label: 'Baixa', variant: 'secondary' },
  media: { label: 'Média', variant: 'default' },
  alta: { label: 'Alta', variant: 'destructive' },
  critica: { label: 'Crítica', variant: 'destructive' },
};
const kindIcon: Record<string, any> = { risco: ShieldAlert, impedimento: Ban, dependencia: GitBranch };
const kindLabel: Record<string, string> = { risco: 'Risco', impedimento: 'Impedimento', dependencia: 'Dependência' };
const statusLabel: Record<string, string> = { aberto: 'Aberto', mitigando: 'Mitigando', resolvido: 'Resolvido' };

export default function RiscosProjetos() {
  const { data: projects = [] } = useProjects({ status: 'todos', search: '' });
  const { data: risks = [], isLoading } = useProjectRisks(null);
  const createRisk = useCreateRisk();
  const updateStatus = useUpdateRiskStatus();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    project_id: '', title: '', description: '', severity: 'media', kind: 'risco', due_date: '',
  });

  const submit = () => {
    if (!form.project_id || !form.title) return;
    createRisk.mutate({
      project_id: form.project_id, title: form.title, description: form.description,
      severity: form.severity, kind: form.kind, due_date: form.due_date || undefined,
    }, { onSuccess: () => { setOpen(false); setForm({ ...form, title: '', description: '' }); } });
  };

  const abertos = risks.filter((r: any) => r.status !== 'resolvido');
  const criticos = abertos.filter((r: any) => r.severity === 'critica' || r.severity === 'alta');

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader title="Riscos & Impedimentos"
          description="Registro de riscos, impedimentos e dependências por projeto, com severidade e dono">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar risco / impedimento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Projeto</Label>
                  <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo</Label>
                    <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="risco">Risco</SelectItem>
                        <SelectItem value="impedimento">Impedimento</SelectItem>
                        <SelectItem value="dependencia">Dependência</SelectItem>
                      </SelectContent>
                    </Select></div>
                  <div><Label>Severidade</Label>
                    <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="critica">Crítica</SelectItem>
                      </SelectContent>
                    </Select></div>
                </div>
                <div><Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Atraso na entrega do cliente" /></div>
                <div><Label>Descrição / mitigação</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <div><Label>Prazo de resolução</Label>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={submit} disabled={createRisk.isPending}>
                {createRisk.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Registrar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Abertos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{abertos.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Alta / Crítica</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-600">{criticos.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Resolvidos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-emerald-600">{risks.length - abertos.length}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Registro de riscos</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : risks.length === 0 ? <p className="text-center py-10 text-muted-foreground">Nenhum risco registrado. Registre riscos para acompanhar a saúde dos projetos.</p>
              : <div className="space-y-2">{risks.map((r: any) => {
                  const Icon = kindIcon[r.kind] ?? ShieldAlert;
                  return (
                    <div key={r.id} className="flex items-start justify-between border rounded-lg p-3 gap-3 flex-wrap">
                      <div className="flex items-start gap-3 min-w-0">
                        <Icon className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium">{r.title}</p>
                          {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {kindLabel[r.kind]}{r.owner?.full_name ? ` · ${r.owner.full_name}` : ''}
                            {r.due_date ? ` · prazo ${format(new Date(r.due_date + 'T00:00'), 'dd/MM/yyyy')}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={severityBadge[r.severity]?.variant}>{severityBadge[r.severity]?.label}</Badge>
                        <Select value={r.status} onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v })}>
                          <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aberto">Aberto</SelectItem>
                            <SelectItem value="mitigando">Mitigando</SelectItem>
                            <SelectItem value="resolvido">Resolvido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}</div>}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
