import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plug, Webhook, AlertTriangle, Users, CreditCard, CheckCircle2, ArrowRight } from 'lucide-react';
import { CONNECTOR_CATALOG, useIntegrationsHubOverview, useConnectedProviders, useLeadSources, usePaymentEvents, useSubscriptionsSummary } from '@/hooks/useIntegrationsHub';

const categoryColor: Record<string, string> = {
  Comercial: 'bg-blue-500/10 text-blue-600',
  Financeiro: 'bg-emerald-500/10 text-emerald-600',
  Marketing: 'bg-purple-500/10 text-purple-600',
  Analytics: 'bg-amber-500/10 text-amber-600',
};

export default function HubConectores() {
  const navigate = useNavigate();
  const { data: overview } = useIntegrationsHubOverview();
  const { data: connected = [], isLoading } = useConnectedProviders();
  const { data: leads = [] } = useLeadSources();
  const { data: payments = [] } = usePaymentEvents();
  const { data: subs } = useSubscriptionsSummary();

  const isConnected = (provider: string) =>
    connected.some((c: any) => c.provider === provider && c.is_active);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Hub de Conectores"
          description="Conecte o Vitrio aos sistemas que operam seu negócio — CRM, pagamentos e mídia. O ERP vira o centro da operação." />

        {/* Saúde das integrações */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <Card><CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Conectores ativos</span><Plug className="h-4 w-4 text-muted-foreground" /></div>
            <p className="text-2xl font-bold">{overview?.integrations_active ?? 0}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Recorrência (MRR)</span><CreditCard className="h-4 w-4 text-muted-foreground" /></div>
            <p className="text-2xl font-bold">R$ {Number(subs?.mrr ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Webhooks (24h)</span><Webhook className="h-4 w-4 text-muted-foreground" /></div>
            <p className="text-2xl font-bold">{overview?.webhooks_24h ?? 0}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Leads abertos</span><Users className="h-4 w-4 text-muted-foreground" /></div>
            <p className="text-2xl font-bold">{overview?.leads_open ?? 0}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Erros (24h)</span><AlertTriangle className="h-4 w-4 text-muted-foreground" /></div>
            <p className={`text-2xl font-bold ${(overview?.errors_24h ?? 0) > 0 ? 'text-red-600' : ''}`}>{overview?.errors_24h ?? 0}</p>
          </CardContent></Card>
        </div>

        {/* Catálogo de conectores */}
        <Card>
          <CardHeader><CardTitle>Conectores disponíveis</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
              <div className="grid gap-3 md:grid-cols-2">
                {CONNECTOR_CATALOG.map((c) => {
                  const conn = isConnected(c.provider);
                  return (
                    <div key={c.provider} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{c.name}</span>
                          {conn
                            ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Conectado</Badge>
                            : <Badge variant="outline">Não conectado</Badge>}
                        </div>
                        <span className={`text-[11px] rounded px-2 py-0.5 ${categoryColor[c.category]}`}>{c.category}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{c.description}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {c.syncs.map((s) => <span key={s} className="text-[11px] bg-muted rounded px-1.5 py-0.5">{s}</span>)}
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant={c.priority === 'Essencial' ? 'default' : 'secondary'} className="text-[10px]">{c.priority}</Badge>
                        <Button size="sm" variant="outline" onClick={() => navigate('/integracoes/configurar')}>
                          {conn ? 'Gerenciar' : 'Configurar'}<ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              A conexão real de cada conector requer credenciais (OAuth ou API key) configuradas na empresa e o recebimento de webhooks. As tabelas de dados (origem de leads, eventos de pagamento, métricas de anúncio) já estão preparadas para receber e persistir os dados de cada provedor.
            </p>
          </CardContent>
        </Card>

        {/* Atividade recente das integrações */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Leads recebidos</CardTitle></CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum lead recebido ainda. Quando o CRM estiver conectado, os leads aparecem aqui com origem e UTMs.</p>
              ) : (
                <div className="space-y-2">
                  {leads.slice(0, 6).map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between border rounded-lg p-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{l.source ?? 'Origem desconhecida'}{l.campaign ? ` · ${l.campaign}` : ''}</p>
                        <p className="text-xs text-muted-foreground">{l.utm_source ?? '—'}{l.utm_medium ? ` / ${l.utm_medium}` : ''}</p>
                      </div>
                      <Badge variant={l.status === 'ganho' ? 'default' : l.status === 'perdido' ? 'outline' : 'secondary'}>{l.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4" />Eventos de pagamento</CardTitle></CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum evento de pagamento ainda. Quando o Pagar.me estiver conectado, os webhooks de cobrança aparecem aqui e dão baixa automática em contas a receber.</p>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 6).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between border rounded-lg p-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.event_type}</p>
                        <p className="text-xs text-muted-foreground">{p.external_charge_id ?? '—'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.amount != null && <span className="text-sm font-mono">R$ {Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                        {p.processed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Loader2 className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
