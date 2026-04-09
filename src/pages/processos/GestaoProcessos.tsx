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
import { Plus, Search, Loader2, GitBranch, Play, CheckCircle2, Clock, AlertTriangle, Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useProcessos, useProcessosStats, useCreateProcesso, useUpdateProcesso, useDeleteProcesso,
  useEtapas, useCreateEtapa, useDeleteEtapa, useInstancias, useCreateInstancia, useUpdateInstancia,
  type Processo, type ProcessoEtapa
} from '@/hooks/useGestaoProcessos';

const STATUS_CONFIG: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-600',
  ativo: 'bg-green-100 text-green-700',
  em_revisao: 'bg-yellow-100 text-yellow-700',
  obsoleto: 'bg-red-100 text-red-600',
};

const TIPO_ETAPA_ICON: Record<string, any> = {
  inicio: Play,
  atividade: GitBranch,
  decisao: AlertTriangle,
  aprovacao: CheckCircle2,
  fim: CheckCircle2,
};

const TIPO_OPTIONS = ['estrategico', 'gerencial', 'operacional', 'suporte'];
const CRITICIDADE_OPTIONS = ['critica', 'alta', 'media', 'baixa'];
const FREQUENCIA_OPTIONS = ['diario', 'semanal', 'mensal', 'continuo', 'sob_demanda'];
const TIPO_ETAPA_OPTIONS = ['inicio', 'atividade', 'decisao', 'aprovacao', 'fim'];

const emptyProcesso = { nome: '', tipo: 'operacional', criticidade: 'media', frequencia: 'continuo', status: 'rascunho', versao: 1, versao_publicada: 0, exige_aprovacao_final: false, exige_evidencia_final: false, permite_reabertura: true };
const emptyEtapa = { nome: '', tipo: 'atividade', ordem: 1, cor: '#3b82f6', exige_checklist: false, exige_aprovacao: false, exige_anexo: false, exige_comentario: false };
const emptyInstancia = { prioridade: 'media', previsao_conclusao: '', observacoes: '' };

function EtapaCard({ etapa, onDelete }: { etapa: ProcessoEtapa; onDelete: () => void }) {
  const Icon = TIPO_ETAPA_ICON[etapa.tipo] || GitBranch;
  return (
    <div className="flex items-center gap-0">
      <div className="flex flex-col items-center p-3 rounded-lg border bg-card shadow-sm min-w-[140px] relative" style={{ borderTopColor: etapa.cor, borderTopWidth: 3 }}>
        <div className="flex items-center justify-between w-full mb-1">
          <span className="text-[10px] text-muted-foreground">#{etapa.ordem}</span>
          <button onClick={onDelete} className="text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        <Icon className="h-4 w-4 mb-1" style={{ color: etapa.cor }} />
        <p className="text-xs font-medium text-center leading-tight">{etapa.nome}</p>
        {etapa.responsavel_papel && <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-full">{etapa.responsavel_papel}</p>}
        {etapa.sla_horas && <p className="text-[10px] text-muted-foreground">{etapa.sla_horas}h SLA</p>}
        <div className="flex gap-1 mt-1 flex-wrap justify-center">
          {etapa.exige_checklist && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded">✓ checklist</span>}
          {etapa.exige_aprovacao && <span className="text-[9px] bg-purple-100 text-purple-600 px-1 rounded">✓ aprovação</span>}
          {etapa.exige_anexo && <span className="text-[9px] bg-green-100 text-green-600 px-1 rounded">✓ anexo</span>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />
    </div>
  );
}

export default function GestaoProcessos() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showNovoProcesso, setShowNovoProcesso] = useState(false);
  const [showNovaEtapa, setShowNovaEtapa] = useState(false);
  const [showNovaInstancia, setShowNovaInstancia] = useState(false);
  const [formProcesso, setFormProcesso] = useState<Partial<Processo>>(emptyProcesso);
  const [formEtapa, setFormEtapa] = useState<Partial<ProcessoEtapa>>(emptyEtapa);
  const [formInstancia, setFormInstancia] = useState(emptyInstancia);

  const { data: stats } = useProcessosStats();
  const { data: processos = [], isLoading } = useProcessos();
  const { data: etapas = [] } = useEtapas(selectedId || undefined);
  const { data: instancias = [] } = useInstancias(selectedId || undefined);
  const createProcesso = useCreateProcesso();
  const updateProcesso = useUpdateProcesso();
  const deleteProcesso = useDeleteProcesso();
  const createEtapa = useCreateEtapa();
  const deleteEtapa = useDeleteEtapa();
  const createInstancia = useCreateInstancia();
  const updateInstancia = useUpdateInstancia();

  const filtered = processos.filter(p =>
    !search || p.nome.toLowerCase().includes(search.toLowerCase()) || p.area?.toLowerCase().includes(search.toLowerCase())
  );
  const selected = processos.find(p => p.id === selectedId);

  const nextOrdem = etapas.length > 0 ? Math.max(...etapas.map(e => e.ordem)) + 1 : 1;

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestão de Processos</h1>
            <p className="text-muted-foreground">Padronize, execute e monitore processos operacionais</p>
          </div>
          <Button onClick={() => { setFormProcesso(emptyProcesso); setShowNovoProcesso(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Processo
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats?.total || 0, color: 'text-blue-600' },
            { label: 'Ativos', value: stats?.ativos || 0, color: 'text-green-600' },
            { label: 'Em Revisão', value: stats?.em_revisao || 0, color: 'text-yellow-600' },
            { label: 'Instâncias Abertas', value: stats?.instancias_abertas || 0, color: 'text-purple-600' },
            { label: 'Instâncias Atrasadas', value: stats?.instancias_atrasadas || 0, color: 'text-red-600' },
          ].map(({ label, value, color }) => (
            <Card key={label}><CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
            </CardContent></Card>
          ))}
        </div>

        {/* Main */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Lista */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar processos..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <GitBranch className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum processo encontrado</p>
                <Button className="mt-3" size="sm" onClick={() => setShowNovoProcesso(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Criar primeiro processo
                </Button>
              </CardContent></Card>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filtered.map(p => (
                  <div key={p.id} onClick={() => setSelectedId(p.id)}
                    className={cn('p-3 rounded-lg border cursor-pointer transition-all',
                      p.id === selectedId ? 'border-primary bg-primary/5' : 'bg-card hover:border-primary/30'
                    )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p.nome}</p>
                        <p className="text-xs text-muted-foreground">{p.area || p.tipo} • v{p.versao}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Badge variant="outline" className={cn('text-xs', STATUS_CONFIG[p.status] || '')}>{p.status}</Badge>
                        <Badge variant="outline" className="text-xs">{p.criticidade}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detalhe */}
          <div className="lg:col-span-3">
            {!selected ? (
              <Card className="h-full"><CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <GitBranch className="h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground">Selecione um processo</p>
              </CardContent></Card>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{selected.nome}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className={cn('text-xs', STATUS_CONFIG[selected.status] || '')}>{selected.status}</Badge>
                        <Badge variant="outline" className="text-xs">{selected.tipo}</Badge>
                        <Badge variant="outline" className="text-xs">{selected.criticidade}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {selected.status === 'rascunho' && (
                        <Button size="sm" variant="outline" className="text-xs text-green-600" onClick={() => updateProcesso.mutate({ id: selected.id, status: 'ativo', versao_publicada: selected.versao })}>
                          Publicar
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setFormProcesso(selected); setShowNovoProcesso(true); }}>Editar</Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { deleteProcesso.mutate(selected.id); setSelectedId(null); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="dados">
                    <TabsList className="mb-4">
                      <TabsTrigger value="dados">Dados</TabsTrigger>
                      <TabsTrigger value="etapas">Etapas ({etapas.length})</TabsTrigger>
                      <TabsTrigger value="instancias">Instâncias ({instancias.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dados">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {[
                          ['Tipo', selected.tipo], ['Criticidade', selected.criticidade],
                          ['Frequência', selected.frequencia], ['Área', selected.area || '-'],
                          ['SLA Global', selected.sla_global_horas ? `${selected.sla_global_horas}h` : '-'],
                          ['Versão', `v${selected.versao} (pub: v${selected.versao_publicada})`],
                        ].map(([label, value]) => (
                          <div key={label as string} className="p-2 bg-muted/30 rounded-lg">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="font-medium capitalize">{value}</p>
                          </div>
                        ))}
                      </div>
                      {selected.objetivo && (
                        <div className="mt-3 p-3 bg-muted/20 rounded-lg">
                          <p className="text-xs text-muted-foreground">Objetivo</p>
                          <p className="text-sm mt-1">{selected.objetivo}</p>
                        </div>
                      )}
                      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                        {selected.exige_aprovacao_final && <span>✓ Exige aprovação final</span>}
                        {selected.exige_evidencia_final && <span>✓ Exige evidência final</span>}
                        {selected.permite_reabertura && <span>✓ Permite reabertura</span>}
                      </div>
                    </TabsContent>

                    <TabsContent value="etapas">
                      <div className="space-y-4">
                        <Button size="sm" onClick={() => { setFormEtapa({ ...emptyEtapa, processo_id: selected.id, ordem: nextOrdem }); setShowNovaEtapa(true); }}>
                          <Plus className="h-3 w-3 mr-1" /> Nova Etapa
                        </Button>
                        {etapas.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma etapa cadastrada. Adicione etapas para modelar o fluxo.</p>
                        ) : (
                          <div className="overflow-x-auto pb-2">
                            <div className="flex items-center flex-nowrap min-w-max">
                              {etapas.map((e, i) => (
                                <EtapaCard key={e.id} etapa={e}
                                  onDelete={() => deleteEtapa.mutate({ id: e.id, processo_id: e.processo_id })} />
                              ))}
                              <div className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed border-muted-foreground/20 min-w-[80px] cursor-pointer hover:border-primary/40 transition-colors"
                                onClick={() => { setFormEtapa({ ...emptyEtapa, processo_id: selected.id, ordem: nextOrdem }); setShowNovaEtapa(true); }}>
                                <Plus className="h-4 w-4 text-muted-foreground/40" />
                                <span className="text-[10px] text-muted-foreground/40 mt-1">Etapa</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="instancias">
                      <div className="space-y-3">
                        <Button size="sm" onClick={() => { setFormInstancia(emptyInstancia); setShowNovaInstancia(true); }}>
                          <Plus className="h-3 w-3 mr-1" /> Nova Instância
                        </Button>
                        {instancias.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma instância aberta.</p>
                        ) : (
                          <div className="space-y-2">
                            {instancias.map(inst => (
                              <div key={inst.id} className={cn('p-3 rounded-lg border text-sm', inst.atrasado && 'border-red-200 bg-red-50/30')}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-mono text-xs text-muted-foreground">{inst.numero}</span>
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="outline" className={cn('text-xs',
                                        inst.status === 'concluida' ? 'text-green-600' :
                                        inst.status === 'em_andamento' ? 'text-blue-600' : 'text-gray-600'
                                      )}>{inst.status}</Badge>
                                      <Badge variant="outline" className="text-xs">{inst.prioridade}</Badge>
                                      {inst.atrasado && <Badge variant="outline" className="text-xs text-red-600">Atrasada</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Aberta: {format(new Date(inst.data_abertura), 'dd/MM/yyyy', { locale: ptBR })}
                                      {inst.previsao_conclusao && ` • Prev: ${format(new Date(inst.previsao_conclusao), 'dd/MM/yyyy', { locale: ptBR })}`}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    {inst.status === 'aberta' && <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => updateInstancia.mutate({ id: inst.id, processo_id: inst.processo_id, status: 'em_andamento' })}>Iniciar</Button>}
                                    {inst.status === 'em_andamento' && <Button size="sm" variant="outline" className="text-xs h-6 text-green-600" onClick={() => updateInstancia.mutate({ id: inst.id, processo_id: inst.processo_id, status: 'concluida', data_conclusao: new Date().toISOString() })}>Concluir</Button>}
                                  </div>
                                </div>
                                {inst.observacoes && <p className="text-xs text-muted-foreground mt-1">{inst.observacoes}</p>}
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

      {/* Dialog Processo */}
      <Dialog open={showNovoProcesso} onOpenChange={setShowNovoProcesso}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{formProcesso.id ? 'Editar Processo' : 'Novo Processo'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label>Nome do Processo *</Label>
              <Input value={formProcesso.nome || ''} onChange={e => setFormProcesso(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Onboarding de Clientes" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formProcesso.tipo || 'operacional'} onValueChange={v => setFormProcesso(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPO_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Criticidade</Label>
              <Select value={formProcesso.criticidade || 'media'} onValueChange={v => setFormProcesso(p => ({ ...p, criticidade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CRITICIDADE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={formProcesso.frequencia || 'continuo'} onValueChange={v => setFormProcesso(p => ({ ...p, frequencia: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQUENCIA_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Área</Label>
              <Input value={formProcesso.area || ''} onChange={e => setFormProcesso(p => ({ ...p, area: e.target.value }))} placeholder="Ex: Vendas, TI..." />
            </div>
            <div className="space-y-2">
              <Label>SLA Global (horas)</Label>
              <Input type="number" value={formProcesso.sla_global_horas || ''} onChange={e => setFormProcesso(p => ({ ...p, sla_global_horas: Number(e.target.value) || undefined }))} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Objetivo</Label>
              <Textarea value={formProcesso.objetivo || ''} onChange={e => setFormProcesso(p => ({ ...p, objetivo: e.target.value }))} rows={2} />
            </div>
            <div className="col-span-2 flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={!!formProcesso.exige_aprovacao_final} onCheckedChange={v => setFormProcesso(p => ({ ...p, exige_aprovacao_final: v }))} />
                <Label className="text-sm">Exige aprovação final</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!formProcesso.exige_evidencia_final} onCheckedChange={v => setFormProcesso(p => ({ ...p, exige_evidencia_final: v }))} />
                <Label className="text-sm">Exige evidência final</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formProcesso.permite_reabertura !== false} onCheckedChange={v => setFormProcesso(p => ({ ...p, permite_reabertura: v }))} />
                <Label className="text-sm">Permite reabertura</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovoProcesso(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!formProcesso.nome?.trim()) return;
              if (formProcesso.id) await updateProcesso.mutateAsync({ id: formProcesso.id, ...formProcesso } as any);
              else await createProcesso.mutateAsync(formProcesso);
              setShowNovoProcesso(false);
            }} disabled={createProcesso.isPending || updateProcesso.isPending}>
              {(createProcesso.isPending || updateProcesso.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {formProcesso.id ? 'Salvar' : 'Criar Processo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Etapa */}
      <Dialog open={showNovaEtapa} onOpenChange={setShowNovaEtapa}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Etapa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da Etapa *</Label>
              <Input value={formEtapa.nome || ''} onChange={e => setFormEtapa(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Análise do pedido" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formEtapa.tipo || 'atividade'} onValueChange={v => setFormEtapa(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPO_ETAPA_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input type="number" value={formEtapa.ordem || nextOrdem} onChange={e => setFormEtapa(p => ({ ...p, ordem: Number(e.target.value) }))} min={1} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Responsável (papel)</Label>
                <Input value={formEtapa.responsavel_papel || ''} onChange={e => setFormEtapa(p => ({ ...p, responsavel_papel: e.target.value }))} placeholder="Ex: Gerente, Analista..." />
              </div>
              <div className="space-y-2">
                <Label>SLA (horas)</Label>
                <Input type="number" value={formEtapa.sla_horas || ''} onChange={e => setFormEtapa(p => ({ ...p, sla_horas: Number(e.target.value) || undefined }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input type="color" value={formEtapa.cor || '#3b82f6'} onChange={e => setFormEtapa(p => ({ ...p, cor: e.target.value }))} className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['exige_checklist', 'Checklist'], ['exige_aprovacao', 'Aprovação'], ['exige_anexo', 'Anexo'], ['exige_comentario', 'Comentário']].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch checked={!!(formEtapa as any)[key]} onCheckedChange={v => setFormEtapa(p => ({ ...p, [key]: v }))} />
                  <Label className="text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovaEtapa(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!formEtapa.nome?.trim() || !formEtapa.processo_id) return;
              await createEtapa.mutateAsync(formEtapa);
              setFormEtapa({ ...emptyEtapa, processo_id: formEtapa.processo_id, ordem: nextOrdem + 1 });
              setShowNovaEtapa(false);
            }} disabled={createEtapa.isPending}>
              {createEtapa.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Adicionar Etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Instância */}
      <Dialog open={showNovaInstancia} onOpenChange={setShowNovaInstancia}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Abrir Instância</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={formInstancia.prioridade} onValueChange={v => setFormInstancia(p => ({ ...p, prioridade: v }))}>
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
              <Label>Previsão de Conclusão</Label>
              <Input type="date" value={formInstancia.previsao_conclusao} onChange={e => setFormInstancia(p => ({ ...p, previsao_conclusao: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formInstancia.observacoes} onChange={e => setFormInstancia(p => ({ ...p, observacoes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovaInstancia(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!selectedId) return;
              await createInstancia.mutateAsync({
                processo_id: selectedId,
                prioridade: formInstancia.prioridade,
                previsao_conclusao: formInstancia.previsao_conclusao ? new Date(formInstancia.previsao_conclusao).toISOString() : undefined,
                observacoes: formInstancia.observacoes || undefined,
              } as any);
              setShowNovaInstancia(false);
            }} disabled={createInstancia.isPending}>
              {createInstancia.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Abrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
