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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Plus, AlertTriangle, Search, Loader2, ShieldAlert, ClipboardCheck, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useOcorrencias, useOcorrenciasStats, useCreateOcorrencia, useUpdateOcorrencia,
  useCausas, useCreateCausa, useAcoes, useCreateAcao, useUpdateAcao,
  type Ocorrencia
} from '@/hooks/useInvestigacaoFalhas';

const GRAVIDADE_CONFIG: Record<string, { label: string; class: string }> = {
  critica: { label: 'Crítica', class: 'bg-red-100 text-red-700 border-red-300' },
  alta: { label: 'Alta', class: 'bg-orange-100 text-orange-700 border-orange-300' },
  media: { label: 'Média', class: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  baixa: { label: 'Baixa', class: 'bg-green-100 text-green-700 border-green-300' },
};

const STATUS_CONFIG: Record<string, string> = {
  aberta: 'bg-blue-100 text-blue-700',
  em_investigacao: 'bg-purple-100 text-purple-700',
  aguardando_validacao: 'bg-yellow-100 text-yellow-700',
  encerrada: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-500',
};

const TIPO_OPTIONS = ['processo', 'sistema', 'humano', 'fornecedor', 'equipamento'];
const CATEGORIA_OPTIONS = ['qualidade', 'prazo', 'custo', 'seguranca', 'compliance'];
const METODO_OPTIONS = ['5_porques', 'ishikawa', 'fta'];
const CAUSA_CAT_OPTIONS = ['mao_de_obra', 'maquina', 'metodo', 'material', 'medicao', 'meio_ambiente'];
const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#6366f1'];

const emptyForm = { tipo_falha: '', categoria: '', gravidade: 'media', impacto: 'medio', descricao: '', area: '', prazo_tratamento: '' };
const emptyCausa = { metodo: '5_porques', problema_definido: '', causa_imediata: '', causa_raiz: '', categoria_causa: '', evidencia: '', necessita_revisao_processo: false, necessita_treinamento: false };
const emptyAcao = { tipo: 'corretiva', descricao: '', prazo_final: '', prioridade: 'media' };

export default function InvestigacaoFalhas() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroGravidade, setFiltroGravidade] = useState('');
  const [showNova, setShowNova] = useState(false);
  const [showCausa, setShowCausa] = useState(false);
  const [showAcao, setShowAcao] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formCausa, setFormCausa] = useState(emptyCausa);
  const [formAcao, setFormAcao] = useState(emptyAcao);

  const { data: stats } = useOcorrenciasStats();
  const { data: ocorrencias = [], isLoading } = useOcorrencias();
  const { data: causas = [] } = useCausas(selectedId || undefined);
  const { data: acoes = [] } = useAcoes(selectedId || undefined);
  const createOcorrencia = useCreateOcorrencia();
  const updateOcorrencia = useUpdateOcorrencia();
  const createCausa = useCreateCausa();
  const createAcao = useCreateAcao();
  const updateAcao = useUpdateAcao();

  const filtered = ocorrencias.filter(o => {
    const matchSearch = !search || o.descricao.toLowerCase().includes(search.toLowerCase()) || o.area?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filtroStatus || o.status === filtroStatus;
    const matchGrav = !filtroGravidade || o.gravidade === filtroGravidade;
    return matchSearch && matchStatus && matchGrav;
  });

  const selected = ocorrencias.find(o => o.id === selectedId);

  // Chart data
  const tipoData = TIPO_OPTIONS.map(t => ({ name: t, value: ocorrencias.filter(o => o.tipo_falha === t).length })).filter(d => d.value > 0);
  const gravidadeData = Object.entries(GRAVIDADE_CONFIG).map(([key, cfg]) => ({ name: cfg.label, value: ocorrencias.filter(o => o.gravidade === key).length }));

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Investigação de Falhas</h1>
            <p className="text-muted-foreground">Registre, investigue e corrija falhas operacionais</p>
          </div>
          <Button onClick={() => { setForm(emptyForm); setShowNova(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova Ocorrência
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats?.total || 0, icon: ClipboardCheck, color: 'text-blue-600' },
            { label: 'Abertas', value: stats?.abertas || 0, icon: AlertTriangle, color: 'text-yellow-600' },
            { label: 'Em Investigação', value: stats?.em_investigacao || 0, icon: Search, color: 'text-purple-600' },
            { label: 'Críticas', value: stats?.criticas || 0, icon: ShieldAlert, color: 'text-red-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}><CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">{label}</p><p className={cn('text-2xl font-bold', color)}>{value}</p></div>
                <Icon className={cn('h-8 w-8 opacity-20', color)} />
              </div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="lista">
          <TabsList>
            <TabsTrigger value="lista">Ocorrências</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Lista */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <Select value={filtroGravidade || 'todas'} onValueChange={v => setFiltroGravidade(v === 'todas' ? '' : v)}>
                    <SelectTrigger className="w-28"><SelectValue placeholder="Gravidade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {Object.entries(GRAVIDADE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : filtered.length === 0 ? (
                  <Card><CardContent className="py-12 text-center">
                    <ShieldAlert className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhuma ocorrência encontrada</p>
                  </CardContent></Card>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {filtered.map(o => (
                      <div key={o.id} onClick={() => setSelectedId(o.id)}
                        className={cn('p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm',
                          o.id === selectedId ? 'border-primary bg-primary/5' : 'bg-card hover:border-primary/30',
                          o.gravidade === 'critica' && 'border-l-4 border-l-red-500'
                        )}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{o.descricao}</p>
                            <p className="text-xs text-muted-foreground">{o.area} • {format(new Date(o.data_ocorrencia), 'dd/MM/yyyy', { locale: ptBR })}</p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <Badge variant="outline" className={cn('text-xs', GRAVIDADE_CONFIG[o.gravidade]?.class)}>{GRAVIDADE_CONFIG[o.gravidade]?.label}</Badge>
                            <Badge variant="outline" className={cn('text-xs', STATUS_CONFIG[o.status] || '')}>{o.status.replace('_', ' ')}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Detail */}
              <div className="lg:col-span-3">
                {!selected ? (
                  <Card className="h-full"><CardContent className="flex flex-col items-center justify-center h-64 text-center">
                    <ShieldAlert className="h-12 w-12 text-muted-foreground/20 mb-3" />
                    <p className="text-muted-foreground">Selecione uma ocorrência</p>
                  </CardContent></Card>
                ) : (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">OCR-{String(selected.numero).padStart(5, '0')}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-0.5">{selected.descricao}</p>
                        </div>
                        <div className="flex gap-1">
                          {selected.status === 'aberta' && (
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => updateOcorrencia.mutate({ id: selected.id, status: 'em_investigacao' })}>
                              Iniciar Investigação
                            </Button>
                          )}
                          {selected.status === 'em_investigacao' && (
                            <Button size="sm" variant="outline" className="text-xs text-green-600" onClick={() => updateOcorrencia.mutate({ id: selected.id, status: 'encerrada' })}>
                              Encerrar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="ocorrencia">
                        <TabsList className="mb-3">
                          <TabsTrigger value="ocorrencia">Ocorrência</TabsTrigger>
                          <TabsTrigger value="causa">Causa Raiz</TabsTrigger>
                          <TabsTrigger value="acoes">Ações ({acoes.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="ocorrencia">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {[
                              ['Tipo', selected.tipo_falha],
                              ['Categoria', selected.categoria || '-'],
                              ['Gravidade', selected.gravidade],
                              ['Impacto', selected.impacto],
                              ['Área', selected.area || '-'],
                              ['Status', selected.status],
                              ['Data', format(new Date(selected.data_ocorrencia), 'dd/MM/yyyy HH:mm')],
                              ['Prazo', selected.prazo_tratamento ? format(new Date(selected.prazo_tratamento), 'dd/MM/yyyy') : '-'],
                            ].map(([label, value]) => (
                              <div key={label as string} className="p-2 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <p className="font-medium capitalize">{value}</p>
                              </div>
                            ))}
                          </div>
                          {selected.cliente_afetado && <p className="text-sm mt-3"><span className="text-muted-foreground">Cliente afetado: </span>{selected.cliente_afetado}</p>}
                        </TabsContent>

                        <TabsContent value="causa">
                          <div className="space-y-3">
                            <Button size="sm" onClick={() => { setFormCausa(emptyCausa); setShowCausa(true); }} disabled={causas.length > 0}>
                              <Plus className="h-3 w-3 mr-1" /> {causas.length > 0 ? 'Causa já registrada' : 'Registrar Causa Raiz'}
                            </Button>
                            {causas.map(c => (
                              <div key={c.id} className="space-y-2 p-3 rounded-lg border bg-muted/20 text-sm">
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="text-xs">{c.metodo.replace('_', ' ')}</Badge>
                                  {c.categoria_causa && <Badge variant="outline" className="text-xs">{c.categoria_causa.replace('_', ' ')}</Badge>}
                                </div>
                                {c.problema_definido && <div><p className="text-xs text-muted-foreground">Problema</p><p>{c.problema_definido}</p></div>}
                                {c.causa_imediata && <div><p className="text-xs text-muted-foreground">Causa Imediata</p><p>{c.causa_imediata}</p></div>}
                                <div><p className="text-xs text-muted-foreground font-semibold">Causa Raiz</p><p className="font-medium">{c.causa_raiz}</p></div>
                                {c.evidencia && <div><p className="text-xs text-muted-foreground">Evidência</p><p>{c.evidencia}</p></div>}
                                <div className="flex gap-4 text-xs">
                                  {c.necessita_revisao_processo && <span className="text-orange-600">⚠ Revisar processo</span>}
                                  {c.necessita_treinamento && <span className="text-blue-600">📚 Necessita treinamento</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="acoes">
                          <div className="space-y-3">
                            <Button size="sm" onClick={() => { setFormAcao(emptyAcao); setShowAcao(true); }}>
                              <Plus className="h-3 w-3 mr-1" /> Nova Ação
                            </Button>
                            {acoes.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ação registrada.</p>
                            ) : (
                              <div className="space-y-2">
                                {acoes.map(a => (
                                  <div key={a.id} className="p-3 rounded-lg border bg-muted/20 text-sm">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <div className="flex gap-2 mb-1">
                                          <Badge variant="outline" className="text-xs">{a.tipo}</Badge>
                                          <Badge variant="outline" className={cn('text-xs',
                                            a.status === 'concluida' ? 'text-green-600' :
                                            a.status === 'em_andamento' ? 'text-blue-600' : 'text-gray-500'
                                          )}>{a.status}</Badge>
                                        </div>
                                        <p>{a.descricao}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Prazo: {format(new Date(a.prazo_final), 'dd/MM/yyyy')}</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                      {a.status === 'pendente' && <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => updateAcao.mutate({ id: a.id, ocorrencia_id: a.ocorrencia_id, status: 'em_andamento' })}>Iniciar</Button>}
                                      {a.status === 'em_andamento' && <Button size="sm" variant="outline" className="text-xs h-6 text-green-600" onClick={() => updateAcao.mutate({ id: a.id, ocorrencia_id: a.ocorrencia_id, status: 'concluida' })}>Concluir</Button>}
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
          </TabsContent>

          <TabsContent value="dashboard" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Ocorrências por Tipo</CardTitle></CardHeader>
                <CardContent>
                  {tipoData.length === 0 ? <p className="text-center text-muted-foreground py-8">Sem dados</p> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={tipoData}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Distribuição por Gravidade</CardTitle></CardHeader>
                <CardContent>
                  {gravidadeData.every(d => d.value === 0) ? <p className="text-center text-muted-foreground py-8">Sem dados</p> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={gravidadeData.filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                          {gravidadeData.filter(d => d.value > 0).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Nova Ocorrência */}
      <Dialog open={showNova} onOpenChange={setShowNova}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nova Ocorrência</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva o que aconteceu..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de Falha *</Label>
                <Select value={form.tipo_falha} onValueChange={v => setForm(p => ({ ...p, tipo_falha: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{TIPO_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{CATEGORIA_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gravidade</Label>
                <Select value={form.gravidade} onValueChange={v => setForm(p => ({ ...p, gravidade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critica">Crítica</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Impacto</Label>
                <Select value={form.impacto} onValueChange={v => setForm(p => ({ ...p, impacto: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alto">Alto</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="baixo">Baixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Área</Label>
                <Input value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} placeholder="Ex: Financeiro, TI..." />
              </div>
              <div className="space-y-2">
                <Label>Prazo para Tratar</Label>
                <Input type="date" value={form.prazo_tratamento} onChange={e => setForm(p => ({ ...p, prazo_tratamento: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNova(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!form.descricao.trim() || !form.tipo_falha) return;
              await createOcorrencia.mutateAsync({ ...form, prazo_tratamento: form.prazo_tratamento || undefined } as any);
              setShowNova(false);
            }} disabled={createOcorrencia.isPending}>
              {createOcorrencia.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Causa Raiz */}
      <Dialog open={showCausa} onOpenChange={setShowCausa}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Análise de Causa Raiz</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Método</Label>
                <Select value={formCausa.metodo} onValueChange={v => setFormCausa(p => ({ ...p, metodo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METODO_OPTIONS.map(m => <SelectItem key={m} value={m}>{m.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria da Causa</Label>
                <Select value={formCausa.categoria_causa} onValueChange={v => setFormCausa(p => ({ ...p, categoria_causa: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{CAUSA_CAT_OPTIONS.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Problema Definido</Label>
              <Textarea value={formCausa.problema_definido} onChange={e => setFormCausa(p => ({ ...p, problema_definido: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Causa Imediata</Label>
              <Textarea value={formCausa.causa_imediata} onChange={e => setFormCausa(p => ({ ...p, causa_imediata: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Causa Raiz *</Label>
              <Textarea value={formCausa.causa_raiz} onChange={e => setFormCausa(p => ({ ...p, causa_raiz: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Evidência</Label>
              <Input value={formCausa.evidencia} onChange={e => setFormCausa(p => ({ ...p, evidencia: e.target.value }))} placeholder="Descreva ou link para evidência..." />
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={formCausa.necessita_revisao_processo} onCheckedChange={v => setFormCausa(p => ({ ...p, necessita_revisao_processo: v }))} />
                <Label className="text-xs">Revisar processo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formCausa.necessita_treinamento} onCheckedChange={v => setFormCausa(p => ({ ...p, necessita_treinamento: v }))} />
                <Label className="text-xs">Necessita treinamento</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCausa(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!formCausa.causa_raiz.trim() || !selectedId) return;
              await createCausa.mutateAsync({ ...formCausa, ocorrencia_id: selectedId } as any);
              setShowCausa(false);
            }} disabled={createCausa.isPending}>
              {createCausa.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ação */}
      <Dialog open={showAcao} onOpenChange={setShowAcao}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Ação Corretiva</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formAcao.tipo} onValueChange={v => setFormAcao(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contencao">Contenção</SelectItem>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea value={formAcao.descricao} onChange={e => setFormAcao(p => ({ ...p, descricao: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={formAcao.prioridade} onValueChange={v => setFormAcao(p => ({ ...p, prioridade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critica">Crítica</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo *</Label>
                <Input type="date" value={formAcao.prazo_final} onChange={e => setFormAcao(p => ({ ...p, prazo_final: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcao(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!formAcao.descricao.trim() || !formAcao.prazo_final || !selectedId) return;
              await createAcao.mutateAsync({ ...formAcao, ocorrencia_id: selectedId } as any);
              setShowAcao(false);
            }} disabled={createAcao.isPending}>
              {createAcao.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar Ação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
