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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Plus, Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Loader2, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMetas, useMetasStats, useCreateMeta, useUpdateMeta, useDeleteMeta,
  useApuracoes, useCreateApuracao, usePlanosAcao, useCreatePlanoAcao, useUpdatePlanoAcao,
  calcularSemaforo, type Meta, type PlanoAcao
} from '@/hooks/useGestaoMetas';

const SEMAFORO_CONFIG = {
  verde: { label: 'No alvo', class: 'bg-green-100 text-green-700 border-green-200', bar: 'bg-green-500' },
  amarelo: { label: 'Atenção', class: 'bg-yellow-100 text-yellow-700 border-yellow-200', bar: 'bg-yellow-500' },
  vermelho: { label: 'Em risco', class: 'bg-red-100 text-red-700 border-red-200', bar: 'bg-red-500' },
  cinza: { label: 'Sem meta', class: 'bg-gray-100 text-gray-500 border-gray-200', bar: 'bg-gray-300' },
};

const TIPO_OPTIONS = ['estrategica', 'tatica', 'operacional', 'individual', 'financeira'];
const PERSPECTIVA_OPTIONS = ['financeiro', 'clientes', 'processos', 'aprendizado'];
const STATUS_OPTIONS = ['rascunho', 'ativa', 'pausada', 'concluida', 'cancelada'];

function MetaCard({ meta, selected, onClick }: { meta: Meta; selected: boolean; onClick: () => void }) {
  const semaforo = calcularSemaforo(meta);
  const cfg = SEMAFORO_CONFIG[semaforo];
  const pct = meta.meta_alvo > 0 ? Math.min(100, (meta.valor_atual / meta.meta_alvo) * 100) : 0;

  return (
    <div onClick={onClick} className={cn(
      'p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm',
      selected ? 'border-primary bg-primary/5 shadow-sm' : 'bg-card hover:border-primary/30'
    )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{meta.nome}</p>
          {meta.area && <p className="text-xs text-muted-foreground">{meta.area}</p>}
        </div>
        <Badge variant="outline" className={cn('text-xs shrink-0', cfg.class)}>{cfg.label}</Badge>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{meta.indicador_nome || 'Indicador'}</span>
          <span>{meta.valor_atual} / {meta.meta_alvo} {meta.unidade_medida}</span>
        </div>
        <Progress value={pct} className="h-1.5" />
        <div className="flex justify-between text-xs">
          <Badge variant="outline" className="text-[10px]">{meta.tipo}</Badge>
          <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

const emptyMeta = { nome: '', tipo: 'operacional', prioridade: 'media', status: 'rascunho', meta_alvo: 0, valor_atual: 0, peso: 1, frequencia_apuracao: 'mensal' };

export default function GestaoMetas() {
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNovaMeta, setShowNovaMeta] = useState(false);
  const [showApuracao, setShowApuracao] = useState(false);
  const [showPlano, setShowPlano] = useState(false);
  const [formMeta, setFormMeta] = useState<Partial<Meta>>(emptyMeta);
  const [formApuracao, setFormApuracao] = useState({ periodo: '', valor_realizado: '', comentario: '' });
  const [formPlano, setFormPlano] = useState({ titulo: '', tipo: 'corretivo', prioridade: 'media', data_fim: '', descricao: '' });

  const { data: stats } = useMetasStats();
  const { data: metas = [], isLoading } = useMetas();
  const { data: apuracoes = [] } = useApuracoes(selectedId || undefined);
  const { data: planos = [] } = usePlanosAcao(selectedId || undefined);
  const createMeta = useCreateMeta();
  const updateMeta = useUpdateMeta();
  const deleteMeta = useDeleteMeta();
  const createApuracao = useCreateApuracao();
  const createPlano = useCreatePlanoAcao();
  const updatePlano = useUpdatePlanoAcao();

  const metasFiltradas = metas.filter(m => {
    const matchSearch = !search || m.nome.toLowerCase().includes(search.toLowerCase()) || m.area?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filtroStatus || m.status === filtroStatus;
    const matchTipo = !filtroTipo || m.tipo === filtroTipo;
    return matchSearch && matchStatus && matchTipo;
  });

  const selectedMeta = metas.find(m => m.id === selectedId);

  const chartData = apuracoes.slice(0, 6).reverse().map(a => ({
    mes: format(new Date(a.periodo), 'MMM/yy', { locale: ptBR }),
    realizado: a.valor_realizado,
    alvo: selectedMeta?.meta_alvo || 0,
  }));

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestão por Metas</h1>
            <p className="text-muted-foreground">Acompanhe objetivos, indicadores e planos de ação</p>
          </div>
          <Button onClick={() => { setFormMeta(emptyMeta); setShowNovaMeta(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova Meta
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats?.total || 0, icon: Target, color: 'text-blue-600' },
            { label: 'Ativas', value: stats?.ativas || 0, icon: TrendingUp, color: 'text-green-600' },
            { label: 'Em Risco', value: stats?.risco || 0, icon: AlertTriangle, color: 'text-red-600' },
            { label: 'Concluídas', value: stats?.concluidas || 0, icon: CheckCircle2, color: 'text-purple-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs text-muted-foreground">{label}</p><p className={cn('text-2xl font-bold', color)}>{value}</p></div>
                  <Icon className={cn('h-8 w-8 opacity-20', color)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar metas..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filtroStatus || 'todos'} onValueChange={v => setFiltroStatus(v === 'todos' ? '' : v)}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : metasFiltradas.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma meta encontrada</p>
                <Button className="mt-3" size="sm" onClick={() => setShowNovaMeta(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Criar primeira meta
                </Button>
              </CardContent></Card>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {metasFiltradas.map(m => (
                  <MetaCard key={m.id} meta={m} selected={m.id === selectedId} onClick={() => setSelectedId(m.id)} />
                ))}
              </div>
            )}
          </div>

          {/* Detail */}
          <div className="lg:col-span-3">
            {!selectedMeta ? (
              <Card className="h-full">
                <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                  <Target className="h-12 w-12 text-muted-foreground/20 mb-3" />
                  <p className="text-muted-foreground">Selecione uma meta para ver os detalhes</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedMeta.nome}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{selectedMeta.tipo}</Badge>
                        <Badge variant="outline" className={cn('text-xs', SEMAFORO_CONFIG[calcularSemaforo(selectedMeta)].class)}>
                          {SEMAFORO_CONFIG[calcularSemaforo(selectedMeta)].label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{selectedMeta.status}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setFormMeta(selectedMeta); setShowNovaMeta(true); }}>Editar</Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { deleteMeta.mutate(selectedMeta.id); setSelectedId(null); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="visao">
                    <TabsList className="mb-4">
                      <TabsTrigger value="visao">Visão Geral</TabsTrigger>
                      <TabsTrigger value="apuracoes">Apurações</TabsTrigger>
                      <TabsTrigger value="planos">Plano de Ação</TabsTrigger>
                    </TabsList>

                    <TabsContent value="visao">
                      <div className="space-y-4">
                        {selectedMeta.descricao && <p className="text-sm text-muted-foreground">{selectedMeta.descricao}</p>}
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="p-3 bg-muted/40 rounded-lg">
                            <p className="text-xs text-muted-foreground">Atual</p>
                            <p className="text-xl font-bold">{selectedMeta.valor_atual} <span className="text-xs font-normal">{selectedMeta.unidade_medida}</span></p>
                          </div>
                          <div className="p-3 bg-muted/40 rounded-lg">
                            <p className="text-xs text-muted-foreground">Alvo</p>
                            <p className="text-xl font-bold text-green-600">{selectedMeta.meta_alvo} <span className="text-xs font-normal">{selectedMeta.unidade_medida}</span></p>
                          </div>
                          <div className="p-3 bg-muted/40 rounded-lg">
                            <p className="text-xs text-muted-foreground">Atingimento</p>
                            <p className="text-xl font-bold">{selectedMeta.meta_alvo > 0 ? ((selectedMeta.valor_atual / selectedMeta.meta_alvo) * 100).toFixed(1) : 0}%</p>
                          </div>
                        </div>
                        <Progress value={selectedMeta.meta_alvo > 0 ? Math.min(100, (selectedMeta.valor_atual / selectedMeta.meta_alvo) * 100) : 0} className="h-2" />
                        {chartData.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Evolução das apurações</p>
                            <ResponsiveContainer width="100%" height={160}>
                              <AreaChart data={chartData}>
                                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <ReferenceLine y={selectedMeta.meta_alvo} stroke="#22c55e" strokeDasharray="4 2" label={{ value: 'Alvo', fontSize: 10 }} />
                                <Area type="monotone" dataKey="realizado" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="apuracoes">
                      <div className="space-y-3">
                        <Button size="sm" onClick={() => setShowApuracao(true)}>
                          <Plus className="h-3 w-3 mr-1" /> Nova Apuração
                        </Button>
                        {apuracoes.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma apuração registrada.</p>
                        ) : (
                          <div className="space-y-2">
                            {apuracoes.map(a => (
                              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 text-sm">
                                <div>
                                  <p className="font-medium">{format(new Date(a.periodo), 'MMMM yyyy', { locale: ptBR })}</p>
                                  {a.comentario && <p className="text-xs text-muted-foreground">{a.comentario}</p>}
                                </div>
                                <span className="font-bold text-lg">{a.valor_realizado} <span className="text-xs font-normal">{selectedMeta.unidade_medida}</span></span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="planos">
                      <div className="space-y-3">
                        <Button size="sm" onClick={() => setShowPlano(true)}>
                          <Plus className="h-3 w-3 mr-1" /> Nova Ação
                        </Button>
                        {planos.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum plano de ação.</p>
                        ) : (
                          <div className="space-y-2">
                            {planos.map(p => (
                              <div key={p.id} className="p-3 rounded-lg border bg-muted/20">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-sm">{p.titulo}</p>
                                  <div className="flex gap-2">
                                    <Badge variant="outline" className="text-xs">{p.tipo}</Badge>
                                    <Badge variant="outline" className={cn('text-xs',
                                      p.status === 'concluido' ? 'text-green-600' :
                                      p.status === 'em_andamento' ? 'text-blue-600' : 'text-gray-600'
                                    )}>{p.status}</Badge>
                                  </div>
                                </div>
                                {p.data_fim && <p className="text-xs text-muted-foreground mt-1">Prazo: {format(new Date(p.data_fim), 'dd/MM/yyyy')}</p>}
                                <div className="flex gap-2 mt-2">
                                  {p.status === 'pendente' && <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => updatePlano.mutate({ id: p.id, meta_id: p.meta_id, status: 'em_andamento' })}>Iniciar</Button>}
                                  {p.status === 'em_andamento' && <Button size="sm" variant="outline" className="text-xs h-6 text-green-600" onClick={() => updatePlano.mutate({ id: p.id, meta_id: p.meta_id, status: 'concluido' })}>Concluir</Button>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Nova Meta */}
      <Dialog open={showNovaMeta} onOpenChange={setShowNovaMeta}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{formMeta.id ? 'Editar Meta' : 'Nova Meta'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label>Nome da Meta *</Label>
              <Input value={formMeta.nome || ''} onChange={e => setFormMeta(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Aumentar receita mensal em 20%" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formMeta.tipo || 'operacional'} onValueChange={v => setFormMeta(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPO_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Perspectiva</Label>
              <Select value={formMeta.perspectiva || ''} onValueChange={v => setFormMeta(p => ({ ...p, perspectiva: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>{PERSPECTIVA_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Área</Label>
              <Input value={formMeta.area || ''} onChange={e => setFormMeta(p => ({ ...p, area: e.target.value }))} placeholder="Ex: Vendas, TI, RH..." />
            </div>
            <div className="space-y-2">
              <Label>Indicador</Label>
              <Input value={formMeta.indicador_nome || ''} onChange={e => setFormMeta(p => ({ ...p, indicador_nome: e.target.value }))} placeholder="Ex: Receita, NPS, Leads..." />
            </div>
            <div className="space-y-2">
              <Label>Unidade de Medida</Label>
              <Input value={formMeta.unidade_medida || ''} onChange={e => setFormMeta(p => ({ ...p, unidade_medida: e.target.value }))} placeholder="R$, %, unidades..." />
            </div>
            <div className="space-y-2">
              <Label>Meta Alvo *</Label>
              <Input type="number" value={formMeta.meta_alvo || ''} onChange={e => setFormMeta(p => ({ ...p, meta_alvo: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Valor Atual</Label>
              <Input type="number" value={formMeta.valor_atual || ''} onChange={e => setFormMeta(p => ({ ...p, valor_atual: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Faixa Verde (% mínimo)</Label>
              <Input type="number" value={formMeta.faixa_verde_min || 90} onChange={e => setFormMeta(p => ({ ...p, faixa_verde_min: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Faixa Amarela (% mínimo)</Label>
              <Input type="number" value={formMeta.faixa_amarela_min || 70} onChange={e => setFormMeta(p => ({ ...p, faixa_amarela_min: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="date" value={formMeta.data_inicio || ''} onChange={e => setFormMeta(p => ({ ...p, data_inicio: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input type="date" value={formMeta.data_fim || ''} onChange={e => setFormMeta(p => ({ ...p, data_fim: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formMeta.status || 'rascunho'} onValueChange={v => setFormMeta(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequência de Apuração</Label>
              <Select value={formMeta.frequencia_apuracao || 'mensal'} onValueChange={v => setFormMeta(p => ({ ...p, frequencia_apuracao: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['diaria','semanal','mensal','trimestral','semestral','anual'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Descrição</Label>
              <Textarea value={formMeta.descricao || ''} onChange={e => setFormMeta(p => ({ ...p, descricao: e.target.value }))} rows={2} placeholder="Objetivo detalhado..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovaMeta(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!formMeta.nome?.trim()) return;
              if (formMeta.id) await updateMeta.mutateAsync({ id: formMeta.id, ...formMeta } as any);
              else await createMeta.mutateAsync(formMeta);
              setShowNovaMeta(false);
            }} disabled={createMeta.isPending || updateMeta.isPending}>
              {(createMeta.isPending || updateMeta.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {formMeta.id ? 'Salvar' : 'Criar Meta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Apuração */}
      <Dialog open={showApuracao} onOpenChange={setShowApuracao}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Apuração</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Período *</Label>
              <Input type="month" value={formApuracao.periodo} onChange={e => setFormApuracao(p => ({ ...p, periodo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Valor Realizado *</Label>
              <Input type="number" value={formApuracao.valor_realizado} onChange={e => setFormApuracao(p => ({ ...p, valor_realizado: e.target.value }))} placeholder={`Em ${selectedMeta?.unidade_medida || 'unidades'}`} />
            </div>
            <div className="space-y-2">
              <Label>Comentário</Label>
              <Textarea value={formApuracao.comentario} onChange={e => setFormApuracao(p => ({ ...p, comentario: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApuracao(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!formApuracao.periodo || !formApuracao.valor_realizado || !selectedId) return;
              await createApuracao.mutateAsync({ meta_id: selectedId, periodo: formApuracao.periodo + '-01', valor_realizado: Number(formApuracao.valor_realizado), comentario: formApuracao.comentario || undefined });
              setFormApuracao({ periodo: '', valor_realizado: '', comentario: '' });
              setShowApuracao(false);
            }} disabled={createApuracao.isPending}>
              {createApuracao.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Plano de Ação */}
      <Dialog open={showPlano} onOpenChange={setShowPlano}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Ação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={formPlano.titulo} onChange={e => setFormPlano(p => ({ ...p, titulo: e.target.value }))} placeholder="Descreva a ação..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formPlano.tipo} onValueChange={v => setFormPlano(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corretivo">Corretivo</SelectItem>
                    <SelectItem value="preventivo">Preventivo</SelectItem>
                    <SelectItem value="expansao">Expansão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={formPlano.prioridade} onValueChange={v => setFormPlano(p => ({ ...p, prioridade: v }))}>
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
              <Label>Prazo</Label>
              <Input type="date" value={formPlano.data_fim} onChange={e => setFormPlano(p => ({ ...p, data_fim: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={formPlano.descricao} onChange={e => setFormPlano(p => ({ ...p, descricao: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlano(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!formPlano.titulo.trim() || !selectedId) return;
              await createPlano.mutateAsync({ meta_id: selectedId, ...formPlano, data_fim: formPlano.data_fim || undefined } as any);
              setFormPlano({ titulo: '', tipo: 'corretivo', prioridade: 'media', data_fim: '', descricao: '' });
              setShowPlano(false);
            }} disabled={createPlano.isPending}>
              {createPlano.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar Ação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
