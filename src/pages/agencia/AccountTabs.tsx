import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormBody, FormSection, FormGrid, FormField } from '@/components/ui/form-layout';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Loader2, CalendarDays, Megaphone, CheckCircle2, Users, TrendingUp, FileText } from 'lucide-react';
import {
  useCalendarPosts, useCreateCalendarPost, useMediaCampaigns, useCreateCampaign,
  useApprovals, useRespondApproval, useMeetings, useCreateMeeting, useSaveMeetingMinutes,
  useAccountEconomics,
} from '@/hooks/useAgencyModule';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// ============ CALENDÁRIO EDITORIAL ============
const channelBadge: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  tiktok: 'TikTok', youtube: 'YouTube', blog: 'Blog', email: 'E-mail', outro: 'Outro',
};
const postStatus: Record<string, any> = {
  planejado: 'outline', producao: 'secondary', aprovacao: 'default', agendado: 'default', publicado: 'outline',
};

export function CalendarTab({ accountId }: { accountId: string }) {
  const { data: posts = [], isLoading } = useCalendarPosts(accountId);
  const create = useCreateCalendarPost();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', channel: 'instagram', scheduled_for: '' });

  const submit = () => {
    if (!form.title) return;
    create.mutate({ account_id: accountId, ...form, scheduled_for: form.scheduled_for || new Date().toISOString() },
      { onSuccess: () => { setOpen(false); setForm({ title: '', channel: 'instagram', scheduled_for: '' }); } });
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4" />Calendário editorial</span>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Post</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo post</DialogTitle></DialogHeader>
            <FormBody><FormSection>
              <FormGrid cols={2}>
                <FormField label="Título" required fullWidth>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Carrossel — dicas de marca" />
                </FormField>
                <FormField label="Canal">
                  <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(channelBadge).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="Data de publicação">
                  <Input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} />
                </FormField>
              </FormGrid>
            </FormSection></FormBody>
            <DialogFooter><Button onClick={submit} disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Adicionar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          : posts.length === 0 ? <EmptyState icon={CalendarDays} compact title="Calendário vazio" description="Adicione posts e organize a pauta do mês." />
          : <div className="space-y-2">{posts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between border rounded-lg p-3 flex-wrap gap-2">
                <div><p className="font-medium text-sm">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{channelBadge[p.channel] ?? p.channel}{p.scheduled_for ? ` · ${format(new Date(p.scheduled_for), 'dd/MM HH:mm')}` : ''}</p></div>
                <Badge variant={postStatus[p.status]}>{p.status}</Badge>
              </div>
            ))}</div>}
      </CardContent>
    </Card>
  );
}

// ============ MÍDIA PAGA ============
const platformLabel: Record<string, string> = { meta: 'Meta', google: 'Google', tiktok: 'TikTok', linkedin: 'LinkedIn', outro: 'Outro' };

export function MediaTab({ accountId }: { accountId: string }) {
  const { data: campaigns = [], isLoading } = useMediaCampaigns(accountId);
  const create = useCreateCampaign();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ platform: 'meta', campaign_name: '', budget_month: '', objective: '' });

  const submit = () => {
    if (!form.campaign_name) return;
    create.mutate({ account_id: accountId, platform: form.platform, campaign_name: form.campaign_name, budget_month: Number(form.budget_month) || 0, objective: form.objective },
      { onSuccess: () => { setOpen(false); setForm({ platform: 'meta', campaign_name: '', budget_month: '', objective: '' }); } });
  };

  const totalBudget = campaigns.reduce((s: number, c: any) => s + Number(c.budget_month), 0);
  const totalSpend = campaigns.reduce((s: number, c: any) => s + Number(c.spend_month), 0);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4" />Mídia paga</span>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Campanha</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova campanha</DialogTitle></DialogHeader>
            <FormBody><FormSection>
              <FormGrid cols={2}>
                <FormField label="Nome da campanha" required fullWidth>
                  <Input value={form.campaign_name} onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} placeholder="Ex: Captação de leads — Q3" />
                </FormField>
                <FormField label="Plataforma">
                  <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(platformLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="Budget mensal (R$)">
                  <Input type="number" value={form.budget_month} onChange={(e) => setForm({ ...form, budget_month: e.target.value })} />
                </FormField>
                <FormField label="Objetivo" fullWidth>
                  <Input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Ex: conversões, alcance" />
                </FormField>
              </FormGrid>
            </FormSection></FormBody>
            <DialogFooter><Button onClick={submit} disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardTitle></CardHeader>
      <CardContent>
        {campaigns.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border rounded-lg p-3"><p className="text-xs text-muted-foreground">Budget total</p><p className="font-bold">{formatCurrency(totalBudget)}</p></div>
            <div className="border rounded-lg p-3"><p className="text-xs text-muted-foreground">Investido</p><p className="font-bold">{formatCurrency(totalSpend)}</p></div>
          </div>
        )}
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          : campaigns.length === 0 ? <EmptyState icon={Megaphone} compact title="Sem campanhas" description="Cadastre as campanhas de mídia paga da conta." />
          : <div className="space-y-2">{campaigns.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between border rounded-lg p-3 flex-wrap gap-2">
                <div><p className="font-medium text-sm">{c.campaign_name}</p>
                  <p className="text-xs text-muted-foreground">{platformLabel[c.platform]}{c.objective ? ` · ${c.objective}` : ''}</p></div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono">{formatCurrency(Number(c.spend_month))} / {formatCurrency(Number(c.budget_month))}</span>
                  <Badge variant={c.status === 'ativa' ? 'default' : 'outline'}>{c.status}</Badge>
                </div>
              </div>
            ))}</div>}
      </CardContent>
    </Card>
  );
}

// ============ APROVAÇÕES ============
const levelLabel: Record<string, string> = { interna: 'Interna', estrategica: 'Estratégica', lideranca: 'Liderança', cliente: 'Cliente' };
const apStatus: Record<string, { label: string; variant: any }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  ajustes: { label: 'Ajustes', variant: 'outline' },
  rejeitado: { label: 'Rejeitado', variant: 'destructive' },
};

export function ApprovalsTab({ accountId }: { accountId: string }) {
  const { data: approvals = [], isLoading } = useApprovals(accountId);
  const respond = useRespondApproval();

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-4 w-4" />Aprovações</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          : approvals.length === 0 ? <EmptyState icon={CheckCircle2} compact title="Sem aprovações" description="As aprovações de entregas aparecem aqui conforme avançam no fluxo." />
          : <div className="space-y-2">{approvals.map((a: any) => (
              <div key={a.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div><p className="font-medium text-sm">{a.deliverable?.title ?? 'Entrega'}</p>
                    <p className="text-xs text-muted-foreground">{levelLabel[a.level]} · v{a.version}</p></div>
                  <div className="flex items-center gap-2">
                    <Badge variant={apStatus[a.status]?.variant}>{apStatus[a.status]?.label}</Badge>
                    {a.status === 'pendente' && (
                      <>
                        <Button size="sm" onClick={() => respond.mutate({ id: a.id, status: 'aprovado' })}>Aprovar</Button>
                        <Button size="sm" variant="outline" onClick={() => respond.mutate({ id: a.id, status: 'ajustes' })}>Ajustes</Button>
                      </>
                    )}
                  </div>
                </div>
                {a.feedback && <p className="text-xs text-muted-foreground mt-2">{a.feedback}</p>}
              </div>
            ))}</div>}
      </CardContent>
    </Card>
  );
}

// ============ REUNIÕES ============
const meetingKind: Record<string, string> = {
  kickoff: 'Kickoff', alinhamento: 'Alinhamento', estrategica: 'Estratégica',
  mensal: 'Mensal', resultados: 'Resultados', followup: 'Follow-up',
};

export function MeetingsTab({ accountId }: { accountId: string }) {
  const { data: meetings = [], isLoading } = useMeetings(accountId);
  const create = useCreateMeeting();
  const saveMinutes = useSaveMeetingMinutes();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kind: 'alinhamento', title: '', scheduled_for: '' });
  const [minutesFor, setMinutesFor] = useState<string | null>(null);
  const [minutesText, setMinutesText] = useState('');

  const submit = () => {
    if (!form.title) return;
    create.mutate({ account_id: accountId, ...form, scheduled_for: form.scheduled_for || undefined },
      { onSuccess: () => { setOpen(false); setForm({ kind: 'alinhamento', title: '', scheduled_for: '' }); } });
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Reuniões & atas</span>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Reunião</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova reunião</DialogTitle></DialogHeader>
            <FormBody><FormSection>
              <FormGrid cols={2}>
                <FormField label="Título" required fullWidth>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Alinhamento mensal" />
                </FormField>
                <FormField label="Tipo">
                  <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(meetingKind).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="Data e hora">
                  <Input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} />
                </FormField>
              </FormGrid>
            </FormSection></FormBody>
            <DialogFooter><Button onClick={submit} disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Agendar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          : meetings.length === 0 ? <EmptyState icon={Users} compact title="Sem reuniões" description="Agende kickoffs, alinhamentos e apresentações de resultados." />
          : <div className="space-y-2">{meetings.map((m: any) => (
              <div key={m.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div><p className="font-medium text-sm">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{meetingKind[m.kind]}{m.scheduled_for ? ` · ${format(new Date(m.scheduled_for), 'dd/MM/yyyy HH:mm')}` : ''}</p></div>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.status === 'realizada' ? 'default' : m.status === 'cancelada' ? 'outline' : 'secondary'}>{m.status}</Badge>
                    <Button size="sm" variant="outline" onClick={() => { setMinutesFor(m.id); setMinutesText(m.minutes ?? ''); }}>
                      <FileText className="h-3.5 w-3.5 mr-1" />Ata</Button>
                  </div>
                </div>
                {m.minutes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.minutes}</p>}
              </div>
            ))}</div>}

        <Dialog open={!!minutesFor} onOpenChange={(o) => !o && setMinutesFor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Ata da reunião</DialogTitle></DialogHeader>
            <Textarea rows={8} value={minutesText} onChange={(e) => setMinutesText(e.target.value)}
              placeholder="Registre as decisões, próximos passos e responsáveis..." />
            <DialogFooter>
              <Button disabled={saveMinutes.isPending} onClick={() => minutesFor && saveMinutes.mutate({ id: minutesFor, minutes: minutesText }, { onSuccess: () => setMinutesFor(null) })}>
                {saveMinutes.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar ata
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ============ RENTABILIDADE ============
export function EconomicsTab({ accountId }: { accountId: string }) {
  const { data: econ, isLoading } = useAccountEconomics(accountId);
  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!econ) return null;

  const marginColor = econ.margin_pct >= 30 ? 'text-emerald-600' : econ.margin_pct >= 15 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Receita (fee)</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(econ.revenue)}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Custo total</p><p className="text-2xl font-bold text-red-600">{formatCurrency(econ.cost)}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Margem</p><p className={cn('text-2xl font-bold', marginColor)}>{econ.margin_pct.toFixed(1)}%</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">LTV estimado</p><p className="text-2xl font-bold">{formatCurrency(econ.ltv_estimate)}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" />Composição do custo</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between border rounded-lg p-3">
              <span className="text-sm">Custo de equipe ({econ.hours.toFixed(0)}h aprovadas)</span>
              <span className="font-mono">{formatCurrency(econ.hour_cost)}</span>
            </div>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <span className="text-sm">Investimento em mídia</span>
              <span className="font-mono">{formatCurrency(econ.media_spend)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            A margem cruza o fee mensal com o custo real de horas aprovadas (do módulo de Projetos) e o gasto de mídia. LTV estimado em 18 meses de retenção média.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
