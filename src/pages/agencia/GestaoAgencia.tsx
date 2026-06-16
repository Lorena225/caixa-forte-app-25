import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormBody, FormSection, FormGrid, FormField } from '@/components/ui/form-layout';
import { EmptyState } from '@/components/ui/empty-state';
import { Building2, Plus, Loader2, AlertTriangle, TrendingUp, Users, Sparkles, ArrowRight } from 'lucide-react';
import { useAgencyOverview, useAgencyAccounts, useProvisionAccount, useRunAgencyAgent, serviceLabel } from '@/hooks/useAgencyModule';
import { useCounterparties } from '@/hooks/useCompanyData';
import { formatCurrency } from '@/lib/formatters';

const healthDot: Record<string, string> = { verde: 'bg-emerald-500', amarelo: 'bg-amber-500', vermelho: 'bg-red-500' };
const statusBadge: Record<string, { label: string; variant: any }> = {
  onboarding: { label: 'Onboarding', variant: 'secondary' },
  ativa: { label: 'Ativa', variant: 'default' },
  em_risco: { label: 'Em risco', variant: 'destructive' },
  pausada: { label: 'Pausada', variant: 'outline' },
  encerrada: { label: 'Encerrada', variant: 'outline' },
};

export default function GestaoAgencia() {
  const navigate = useNavigate();
  const { data: overview } = useAgencyOverview();
  const { data: accounts = [], isLoading } = useAgencyAccounts();
  const { data: counterparties = [] } = useCounterparties();
  const provision = useProvisionAccount();
  const runAgent = useRunAgencyAgent();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ counterparty_id: '', account_name: '', service_type: 'full_service', monthly_value: '' });

  const submit = () => {
    if (!form.counterparty_id || !form.account_name) return;
    provision.mutate({
      counterparty_id: form.counterparty_id, account_name: form.account_name,
      service_type: form.service_type, monthly_value: Number(form.monthly_value) || 0,
    }, { onSuccess: () => { setOpen(false); setForm({ counterparty_id: '', account_name: '', service_type: 'full_service', monthly_value: '' }); } });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Gestão da Agência"
          description="Operação completa das contas — do onboarding às entregas, aprovações e resultados">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => runAgent.mutate()} disabled={runAgent.isPending}>
              {runAgent.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Rodar agente
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova conta</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova conta de cliente</DialogTitle>
              </DialogHeader>
              <FormBody>
                <FormSection title="Cliente e serviço" description="Ao criar, o sistema gera automaticamente o projeto, o onboarding, as entregas recorrentes e o kickoff.">
                  <FormGrid cols={2}>
                    <FormField label="Cliente" required fullWidth>
                      <Select value={form.counterparty_id} onValueChange={(v) => setForm({ ...form, counterparty_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                        <SelectContent>
                          {counterparties.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Nome da conta" required fullWidth>
                      <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="Ex: Marca X — Social + Tráfego" />
                    </FormField>
                    <FormField label="Tipo de serviço" required>
                      <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_service">Full Service</SelectItem>
                          <SelectItem value="social_media">Social Media</SelectItem>
                          <SelectItem value="trafego">Tráfego</SelectItem>
                          <SelectItem value="branding">Branding</SelectItem>
                          <SelectItem value="conteudo">Conteúdo</SelectItem>
                          <SelectItem value="landing_page">Landing Page</SelectItem>
                          <SelectItem value="consultoria">Consultoria</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Valor mensal (R$)" hint="Fee recorrente da conta">
                      <Input type="number" value={form.monthly_value} onChange={(e) => setForm({ ...form, monthly_value: e.target.value })} placeholder="0,00" />
                    </FormField>
                  </FormGrid>
                </FormSection>
              </FormBody>
              <DialogFooter>
                <Button onClick={submit} disabled={provision.isPending}>
                  {provision.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Criar conta e provisionar operação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </PageHeader>

        {/* Visão geral */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Contas ativas</span><Building2 className="h-4 w-4 text-muted-foreground" /></div>
            <p className="text-2xl font-bold">{overview?.accounts_active ?? 0}<span className="text-sm font-normal text-muted-foreground"> / {overview?.accounts_total ?? 0}</span></p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Receita recorrente</span><TrendingUp className="h-4 w-4 text-muted-foreground" /></div>
            <p className="text-2xl font-bold">{formatCurrency(Number(overview?.mrr ?? 0))}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Entregas atrasadas</span><AlertTriangle className="h-4 w-4 text-muted-foreground" /></div>
            <p className={`text-2xl font-bold ${(overview?.deliverables_overdue ?? 0) > 0 ? 'text-red-600' : ''}`}>{overview?.deliverables_overdue ?? 0}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Contas em risco</span><Users className="h-4 w-4 text-muted-foreground" /></div>
            <p className={`text-2xl font-bold ${(overview?.accounts_at_risk ?? 0) > 0 ? 'text-amber-600' : ''}`}>{overview?.accounts_at_risk ?? 0}</p>
          </CardContent></Card>
        </div>

        {/* Lista de contas */}
        <Card>
          <CardHeader><CardTitle>Contas</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : accounts.length === 0 ? (
                <EmptyState icon={Building2}
                  title="Nenhuma conta ainda"
                  description="Crie a primeira conta de cliente. O sistema provisiona automaticamente o projeto, o onboarding, as entregas recorrentes e a reunião de kickoff conforme o tipo de serviço."
                  action={{ label: 'Criar primeira conta', onClick: () => setOpen(true) }}
                />
              ) : (
                <div className="space-y-2">
                  {accounts.map((a) => (
                    <div key={a.id} onClick={() => navigate(`/agencia/conta/${a.id}`)}
                      className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-muted/40 transition-colors flex-wrap gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${healthDot[a.health] ?? 'bg-slate-400'}`} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{a.account_name}</p>
                          <p className="text-xs text-muted-foreground">{a.counterparty?.name ?? 'Cliente'} · {serviceLabel(a.service_type)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono">{formatCurrency(Number(a.monthly_value))}/mês</span>
                        <Badge variant={statusBadge[a.status]?.variant}>{statusBadge[a.status]?.label}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
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
