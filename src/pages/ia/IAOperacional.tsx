import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Sparkles, AlertTriangle, BrainCircuit, Lightbulb, Settings2, Loader2, CheckCircle2, XCircle, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useIARegras, useIAAlertas, useIAInsights, useIAStats,
  useCreateIARegra, useUpdateIARegra, useDeleteIARegra,
  useUpdateIAAlerta, useCreateIAInsight, useGerarAlertasDemo,
  type IAAlerta, type IAInsight, type IARegra
} from '@/hooks/useIAOperacional';

const SEVERIDADE_CONFIG: Record<string, { class: string; bg: string }> = {
  critica: { class: 'bg-red-100 text-red-700 border-red-300', bg: 'border-l-4 border-l-red-500 bg-red-50/40' },
  alta: { class: 'bg-orange-100 text-orange-700 border-orange-300', bg: 'border-l-4 border-l-orange-500 bg-orange-50/30' },
  media: { class: 'bg-yellow-100 text-yellow-700 border-yellow-300', bg: 'border-l-4 border-l-yellow-500 bg-yellow-50/20' },
  baixa: { class: 'bg-blue-100 text-blue-700 border-blue-300', bg: 'border-l-4 border-l-blue-400' },
};

const TENDENCIA_ICON: Record<string, any> = {
  crescente: TrendingUp,
  decrescente: TrendingDown,
  estavel: Minus,
  volatil: Zap,
};

const TIPO_ANALISE_OPTIONS = ['sla_violacao', 'meta_risco', 'tarefa_vencida', 'processo_parado', 'anomalia_financeira', 'ocorrencia_critica'];
const MODULO_OPTIONS = ['processos', 'metas', 'tarefas', 'financeiro', 'falhas', 'hcm'];
const FREQ_OPTIONS = ['tempo_real', 'horaria', 'diaria', 'semanal'];

const emptyRegra = { nome: '', tipo_analise: 'meta_risco', modulo_monitorado: 'metas', frequencia_execucao: 'diaria', severidade_padrao: 'media', canal_notificacao: 'in_app', apenas_sugere: true, abre_tarefa_auto: false, abre_falha_auto: false, escala_automaticamente: false, status: 'ativa' };
const emptyInsight = { titulo: '', descricao: '', tendencia: 'estavel', urgencia: 'media', proxima_acao: '' };

function AlertaCard({ alerta, onAction }: { alerta: IAAlerta; onAction: (id: string, status: string, feedback?: string) => void }) {
  const cfg = SEVERIDADE_CONFIG[alerta.severidade] || SEVERIDADE_CONFIG.media;
  return (
    <div className={cn('p-4 rounded-lg border transition-all', cfg.bg, alerta.status !== 'ativo' && 'opacity-50')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn('text-xs', cfg.class)}>{alerta.severidade}</Badge>
            <Badge variant="outline" className="text-xs">{alerta.tipo.replace('_', ' ')}</Badge>
            {alerta.area_impactada && <span className="text-xs text-muted-foreground">{alerta.area_impactada}</span>}
            <span className="text-xs text-muted-foreground ml-auto">{format(new Date(alerta.created_at), 'dd/MM HH:mm', { locale: ptBR })}</span>
          </div>
          <h4 className="font-semibold text-sm">{alerta.titulo}</h4>
          <p className="text-xs text-muted-foreground mt-1">{alerta.resumo}</p>
          {alerta.causa_provavel && <p className="text-xs mt-1"><span className="text-muted-foreground">Causa provável: </span>{alerta.causa_provavel}</p>}
          {alerta.acao_recomendada && (
            <p className="text-xs mt-1 text-primary font-medium">→ {alerta.acao_recomendada}</p>
          )}
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <span>Confiança: {(alerta.confianca * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
      {alerta.status === 'ativo' && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" className="text-xs h-6 text-green-600 border-green-300" onClick={() => onAction(alerta.id, 'tratado', 'util')}>
            <CheckCircle2 className="h-3 w-3 mr-1" /> Tratar
          </Button>
          <Button size="sm" variant="ghost" className="text-xs h-6 text-muted-foreground" onClick={() => onAction(alerta.id, 'ignorado', 'nao_util')}>
            Ignorar
          </Button>
          <Button size="sm" variant="ghost" className="text-xs h-6 text-red-400" onClick={() => onAction(alerta.id, 'falso_positivo', 'falso_positivo')}>
            <XCircle className="h-3 w-3 mr-1" /> Falso positivo
          </Button>
        </div>
      )}
    </div>
  );
}

export default function IAOperacional() {
  const [showNovaRegra, setShowNovaRegra] = useState(false);
  const [showNovoInsight, setShowNovoInsight] = useState(false);
  const [formRegra, setFormRegra] = useState<Partial<IARegra>>(emptyRegra);
  const [formInsight, setFormInsight] = useState(emptyInsight);

  const { data: stats } = useIAStats();
  const { data: alertas = [], isLoading: loadingAlertas } = useIAAlertas();
  const { data: insights = [] } = useIAInsights();
  const { data: regras = [] } = useIARegras();
  const updateAlerta = useUpdateIAAlerta();
  const createRegra = useCreateIARegra();
  const updateRegra = useUpdateIARegra();
  const deleteRegra = useDeleteIARegra();
  const createInsight = useCreateIAInsight();
  const gerarDemo = useGerarAlertasDemo();

  const alertasAtivos = alertas.filter(a => a.status === 'ativo');
  const alertasCriticos = alertasAtivos.filter(a => a.severidade === 'critica');
  const alertasOrdenados = [...alertasAtivos].sort((a, b) => {
    const order = { critica: 0, alta: 1, media: 2, baixa: 3 };
    return (order[a.severidade as keyof typeof order] || 3) - (order[b.severidade as keyof typeof order] || 3);
  });

  const handleAlertaAction = (id: string, status: string, feedback?: string) => {
    updateAlerta.mutate({ id, status, ...(feedback ? { feedback } : {}) });
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 text-white">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <BrainCircuit className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">IA Operacional</h1>
                  <p className="text-violet-200 text-sm">Monitoramento inteligente e recomendações acionáveis</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">AI POWERED</span>
            </div>
          </div>
          <div className="absolute -right-8 -top-8 h-32 w-32 bg-white/5 rounded-full" />
          <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-white/5 rounded-full" />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Alertas Ativos', value: stats?.alertas_ativos || 0, color: 'text-violet-600', sub: 'aguardando ação' },
            { label: 'Críticos', value: stats?.criticos || 0, color: 'text-red-600', sub: 'prioridade máxima' },
            { label: 'Tratados Hoje', value: stats?.tratados_hoje || 0, color: 'text-green-600', sub: 'resolvidos' },
            { label: 'Taxa Aceitação', value: `${stats?.taxa_aceitacao || 0}%`, color: 'text-blue-600', sub: 'feedback positivo' },
          ].map(({ label, value, color, sub }) => (
            <Card key={label}><CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="central">
          <TabsList>
            <TabsTrigger value="central">
              <Sparkles className="h-4 w-4 mr-2" />
              Central
              {alertasCriticos.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5">{alertasCriticos.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="alertas">Alertas ({alertasAtivos.length})</TabsTrigger>
            <TabsTrigger value="insights">
              <Lightbulb className="h-4 w-4 mr-2" /> Insights
            </TabsTrigger>
            <TabsTrigger value="regras">
              <Settings2 className="h-4 w-4 mr-2" /> Regras
            </TabsTrigger>
          </TabsList>

          {/* CENTRAL */}
          <TabsContent value="central" className="mt-4">
            {loadingAlertas ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : alertasAtivos.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <BrainCircuit className="h-16 w-16 text-violet-200 mb-4" />
                <h3 className="font-semibold text-lg">Sistema operando normalmente</h3>
                <p className="text-muted-foreground mt-1">Nenhum alerta ativo no momento.</p>
                <Button className="mt-4" variant="outline" onClick={() => gerarDemo.mutate()} disabled={gerarDemo.isPending}>
                  {gerarDemo.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  Gerar alertas de demonstração
                </Button>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {alertasCriticos.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    <p className="text-sm text-red-700"><strong>{alertasCriticos.length} alerta(s) crítico(s)</strong> requerem ação imediata.</p>
                  </div>
                )}
                {alertasOrdenados.map(a => (
                  <AlertaCard key={a.id} alerta={a} onAction={handleAlertaAction} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ALERTAS */}
          <TabsContent value="alertas" className="mt-4">
            <div className="space-y-3">
              {alertas.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum alerta gerado ainda.</CardContent></Card>
              ) : (
                alertas.map(a => (
                  <div key={a.id} className={cn('p-3 rounded-lg border text-sm', SEVERIDADE_CONFIG[a.severidade]?.bg || '', a.status !== 'ativo' && 'opacity-60')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex gap-2 mb-1">
                          <Badge variant="outline" className={cn('text-xs', SEVERIDADE_CONFIG[a.severidade]?.class)}>{a.severidade}</Badge>
                          <Badge variant="outline" className={cn('text-xs', a.status === 'tratado' ? 'text-green-600' : a.status === 'ignorado' ? 'text-gray-500' : '')}>{a.status}</Badge>
                          <span className="text-xs text-muted-foreground">{a.tipo.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="font-medium">{a.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{a.resumo}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{format(new Date(a.created_at), 'dd/MM', { locale: ptBR })}</span>
                    </div>
                    {a.status === 'ativo' && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="text-xs h-6 text-green-600" onClick={() => handleAlertaAction(a.id, 'tratado', 'util')}>Tratar</Button>
                        <Button size="sm" variant="ghost" className="text-xs h-6" onClick={() => handleAlertaAction(a.id, 'ignorado')}>Ignorar</Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* INSIGHTS */}
          <TabsContent value="insights" className="mt-4">
            <div className="space-y-4">
              <Button size="sm" onClick={() => { setFormInsight(emptyInsight); setShowNovoInsight(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Insight
              </Button>
              {insights.length === 0 ? (
                <Card><CardContent className="py-12 text-center">
                  <Lightbulb className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum insight registrado.</p>
                </CardContent></Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {insights.map(ins => {
                    const TendIcon = TENDENCIA_ICON[ins.tendencia || 'estavel'] || Minus;
                    return (
                      <Card key={ins.id} className={cn(ins.urgencia === 'alta' ? 'border-orange-200' : ins.urgencia === 'critica' ? 'border-red-200' : '')}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-sm flex-1">{ins.titulo}</h4>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-xs">{ins.urgencia}</Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TendIcon className="h-3 w-3" />
                                <span>{ins.tendencia}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{ins.descricao}</p>
                          {ins.causa_provavel && <p className="text-xs mt-2"><span className="text-muted-foreground">Causa: </span>{ins.causa_provavel}</p>}
                          {ins.proxima_acao && <p className="text-xs mt-1 text-primary">→ {ins.proxima_acao}</p>}
                          <p className="text-xs text-muted-foreground mt-2">{format(new Date(ins.created_at), 'dd/MM/yyyy', { locale: ptBR })}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* REGRAS */}
          <TabsContent value="regras" className="mt-4">
            <div className="space-y-3">
              <Button size="sm" onClick={() => { setFormRegra(emptyRegra); setShowNovaRegra(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Nova Regra
              </Button>
              {regras.length === 0 ? (
                <Card><CardContent className="py-12 text-center">
                  <Settings2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma regra configurada. Crie regras para monitorar automaticamente.</p>
                </CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {regras.map(r => (
                    <div key={r.id} className="p-3 rounded-lg border bg-card text-sm flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{r.nome}</p>
                          <Badge variant="outline" className="text-xs">{r.modulo_monitorado}</Badge>
                          <Badge variant="outline" className={cn('text-xs', r.status === 'ativa' ? 'text-green-600' : 'text-gray-500')}>{r.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.tipo_analise.replace(/_/g, ' ')} • {r.frequencia_execucao} • severidade {r.severidade_padrao}</p>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          {r.apenas_sugere && <span>💡 Apenas sugere</span>}
                          {r.abre_tarefa_auto && <span>📋 Abre tarefa auto</span>}
                          {r.abre_falha_auto && <span>⚠ Abre falha auto</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={r.status === 'ativa'} onCheckedChange={v => updateRegra.mutate({ id: r.id, status: v ? 'ativa' : 'pausada' })} />
                        <Button size="sm" variant="ghost" className="text-red-500 h-7 w-7 p-0" onClick={() => deleteRegra.mutate(r.id)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Nova Regra */}
      <Dialog open={showNovaRegra} onOpenChange={setShowNovaRegra}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Regra de Monitoramento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da Regra *</Label>
              <Input value={formRegra.nome || ''} onChange={e => setFormRegra(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Alerta de meta em risco" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de Análise</Label>
                <Select value={formRegra.tipo_analise || 'meta_risco'} onValueChange={v => setFormRegra(p => ({ ...p, tipo_analise: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPO_ANALISE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Módulo Monitorado</Label>
                <Select value={formRegra.modulo_monitorado || 'metas'} onValueChange={v => setFormRegra(p => ({ ...p, modulo_monitorado: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODULO_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={formRegra.frequencia_execucao || 'diaria'} onValueChange={v => setFormRegra(p => ({ ...p, frequencia_execucao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQ_OPTIONS.map(f => <SelectItem key={f} value={f}>{f.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severidade Padrão</Label>
                <Select value={formRegra.severidade_padrao || 'media'} onValueChange={v => setFormRegra(p => ({ ...p, severidade_padrao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critica">Crítica</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Critério / Condição</Label>
              <Textarea value={formRegra.criterio_disparo || ''} onChange={e => setFormRegra(p => ({ ...p, criterio_disparo: e.target.value }))} rows={2} placeholder="Ex: Atingimento abaixo de 70% nos últimos 30 dias" />
            </div>
            <div className="space-y-3">
              {[
                ['apenas_sugere', 'Apenas sugerir (não executar automaticamente)'],
                ['abre_tarefa_auto', 'Abrir tarefa automaticamente'],
                ['abre_falha_auto', 'Abrir ocorrência de falha automaticamente'],
                ['escala_automaticamente', 'Escalar para gestor automaticamente'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch checked={!!(formRegra as any)[key]} onCheckedChange={v => setFormRegra(p => ({ ...p, [key]: v }))} />
                  <Label className="text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovaRegra(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!formRegra.nome?.trim()) return;
              await createRegra.mutateAsync(formRegra);
              setShowNovaRegra(false);
            }} disabled={createRegra.isPending}>
              {createRegra.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar Regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Novo Insight */}
      <Dialog open={showNovoInsight} onOpenChange={setShowNovoInsight}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar Insight</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={formInsight.titulo} onChange={e => setFormInsight(p => ({ ...p, titulo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea value={formInsight.descricao} onChange={e => setFormInsight(p => ({ ...p, descricao: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tendência</Label>
                <Select value={formInsight.tendencia} onValueChange={v => setFormInsight(p => ({ ...p, tendencia: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crescente">Crescente</SelectItem>
                    <SelectItem value="decrescente">Decrescente</SelectItem>
                    <SelectItem value="estavel">Estável</SelectItem>
                    <SelectItem value="volatil">Volátil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Urgência</Label>
                <Select value={formInsight.urgencia} onValueChange={v => setFormInsight(p => ({ ...p, urgencia: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critica">Crítica</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Próxima Ação Recomendada</Label>
              <Input value={formInsight.proxima_acao} onChange={e => setFormInsight(p => ({ ...p, proxima_acao: e.target.value }))} placeholder="O que fazer?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovoInsight(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!formInsight.titulo.trim() || !formInsight.descricao.trim()) return;
              await createInsight.mutateAsync(formInsight as any);
              setShowNovoInsight(false);
            }} disabled={createInsight.isPending}>
              {createInsight.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
