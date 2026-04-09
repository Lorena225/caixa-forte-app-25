import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle, CheckCircle2, Clock, Bell, Plus, Megaphone,
  ListTodo, User, Calendar, Loader2, BookOpen, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTarefas, useTarefasStats, useCreateTarefa, useUpdateTarefa,
  useComunicados, useMarcarLido, useCreateComunicado, type Tarefa
} from '@/hooks/usePainelIndividual';

const PRIORIDADE_COLORS: Record<string, string> = {
  critica: 'bg-red-100 text-red-700 border-red-200',
  alta: 'bg-orange-100 text-orange-700 border-orange-200',
  media: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  baixa: 'bg-green-100 text-green-700 border-green-200',
};

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-gray-100 text-gray-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  concluida: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
};

function KPICard({ title, value, icon: Icon, color, sub }: { title: string; value: number; icon: any; color: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn('text-3xl font-bold mt-1', color)}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={cn('p-3 rounded-xl', color.replace('text-', 'bg-').replace('-700', '-100').replace('-600', '-100'))}>
            <Icon className={cn('h-6 w-6', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TarefaRow({ tarefa, onToggle }: { tarefa: Tarefa; onToggle: (id: string, status: string) => void }) {
  const vencida = tarefa.data_vencimento && isPast(new Date(tarefa.data_vencimento)) && tarefa.status !== 'concluida';
  const hoje = tarefa.data_vencimento && isToday(new Date(tarefa.data_vencimento));
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border transition-all',
      tarefa.status === 'concluida' ? 'opacity-50 bg-muted/30' : 'bg-card hover:bg-muted/20',
      vencida && 'border-red-200 bg-red-50/30'
    )}>
      <Checkbox
        checked={tarefa.status === 'concluida'}
        onCheckedChange={() => onToggle(tarefa.id, tarefa.status === 'concluida' ? 'pendente' : 'concluida')}
      />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', tarefa.status === 'concluida' && 'line-through text-muted-foreground')}>
          {tarefa.titulo}
        </p>
        {tarefa.descricao && <p className="text-xs text-muted-foreground truncate">{tarefa.descricao}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className={cn('text-xs', PRIORIDADE_COLORS[tarefa.prioridade] || '')}>
          {tarefa.prioridade}
        </Badge>
        <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[tarefa.status] || '')}>
          {tarefa.status.replace('_', ' ')}
        </Badge>
        {tarefa.data_vencimento && (
          <span className={cn('text-xs', vencida ? 'text-red-600 font-semibold' : hoje ? 'text-orange-600' : 'text-muted-foreground')}>
            {format(new Date(tarefa.data_vencimento), 'dd/MM', { locale: ptBR })}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PainelIndividual() {
  const { user } = useAuth();
  const [showNovaTarefa, setShowNovaTarefa] = useState(false);
  const [showNovoComunicado, setShowNovoComunicado] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState({ titulo: '', descricao: '', prioridade: 'media', data_vencimento: '' });
  const [novoComunicado, setNovoComunicado] = useState({ titulo: '', conteudo: '', tipo: 'informativo' });

  const { data: stats } = useTarefasStats();
  const { data: tarefas = [], isLoading: loadingTarefas } = useTarefas('todas');
  const { data: comunicados = [], isLoading: loadingComunicados } = useComunicados();
  const createTarefa = useCreateTarefa();
  const updateTarefa = useUpdateTarefa();
  const marcarLido = useMarcarLido();
  const createComunicado = useCreateComunicado();

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const nomeUsuario = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'usuário';

  const handleToggleTarefa = (id: string, newStatus: string) => {
    updateTarefa.mutate({ id, status: newStatus });
  };

  const handleCriarTarefa = async () => {
    if (!novaTarefa.titulo.trim()) return;
    await createTarefa.mutateAsync({
      titulo: novaTarefa.titulo,
      descricao: novaTarefa.descricao || undefined,
      prioridade: novaTarefa.prioridade,
      data_vencimento: novaTarefa.data_vencimento ? new Date(novaTarefa.data_vencimento).toISOString() : undefined,
    });
    setNovaTarefa({ titulo: '', descricao: '', prioridade: 'media', data_vencimento: '' });
    setShowNovaTarefa(false);
  };

  const comunicadosNaoLidos = comunicados.filter(c => !c.lido);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{saudacao}, {nomeUsuario}! 👋</h1>
            <p className="text-muted-foreground capitalize">
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNovoComunicado(true)}>
              <Megaphone className="h-4 w-4 mr-2" />
              Comunicado
            </Button>
            <Button onClick={() => setShowNovaTarefa(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Tarefas Vencidas" value={stats?.vencidas || 0} icon={AlertTriangle} color="text-red-600" sub="Precisam de atenção" />
          <KPICard title="Para Hoje" value={stats?.hoje || 0} icon={Calendar} color="text-blue-600" sub="Vencem hoje" />
          <KPICard title="Em Aberto" value={stats?.pendentes || 0} icon={Clock} color="text-yellow-600" sub="Pendentes + em andamento" />
          <KPICard title="Concluídas" value={stats?.concluidas || 0} icon={CheckCircle2} color="text-green-600" sub="Nos últimos 7 dias" />
        </div>

        <Tabs defaultValue="tarefas">
          <TabsList>
            <TabsTrigger value="tarefas">
              <ListTodo className="h-4 w-4 mr-2" />
              Minhas Tarefas
            </TabsTrigger>
            <TabsTrigger value="comunicados">
              <Bell className="h-4 w-4 mr-2" />
              Comunicados
              {comunicadosNaoLidos.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {comunicadosNaoLidos.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tarefas" className="mt-4">
            {loadingTarefas ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : tarefas.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-400 mb-4" />
                  <h3 className="font-semibold text-lg">Tudo em dia!</h3>
                  <p className="text-muted-foreground mt-1">Nenhuma tarefa pendente no momento.</p>
                  <Button className="mt-4" onClick={() => setShowNovaTarefa(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Criar primeira tarefa
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {/* Vencidas */}
                {tarefas.filter(t => t.data_vencimento && isPast(new Date(t.data_vencimento)) && t.status !== 'concluida').length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wider px-1">Vencidas</p>
                    {tarefas
                      .filter(t => t.data_vencimento && isPast(new Date(t.data_vencimento)) && t.status !== 'concluida')
                      .map(t => <TarefaRow key={t.id} tarefa={t} onToggle={handleToggleTarefa} />)}
                  </div>
                )}
                {/* Hoje */}
                {tarefas.filter(t => t.data_vencimento && isToday(new Date(t.data_vencimento))).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-1">Hoje</p>
                    {tarefas
                      .filter(t => t.data_vencimento && isToday(new Date(t.data_vencimento)))
                      .map(t => <TarefaRow key={t.id} tarefa={t} onToggle={handleToggleTarefa} />)}
                  </div>
                )}
                {/* Demais */}
                {tarefas.filter(t => !t.data_vencimento || (!isPast(new Date(t.data_vencimento)) && !isToday(new Date(t.data_vencimento)))).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Próximas</p>
                    {tarefas
                      .filter(t => !t.data_vencimento || (!isPast(new Date(t.data_vencimento)) && !isToday(new Date(t.data_vencimento))))
                      .map(t => <TarefaRow key={t.id} tarefa={t} onToggle={handleToggleTarefa} />)}
                  </div>
                )}
                {/* Concluídas */}
                {tarefas.filter(t => t.status === 'concluida').length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wider px-1">Concluídas</p>
                    {tarefas
                      .filter(t => t.status === 'concluida')
                      .map(t => <TarefaRow key={t.id} tarefa={t} onToggle={handleToggleTarefa} />)}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="comunicados" className="mt-4">
            {loadingComunicados ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : comunicados.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-semibold text-lg">Nenhum comunicado</h3>
                  <p className="text-muted-foreground mt-1">Nenhum comunicado publicado ainda.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {comunicados.map(c => (
                  <Card key={c.id} className={cn(
                    'transition-all',
                    !c.lido && c.tipo === 'obrigatorio' && 'border-red-300 bg-red-50/30',
                    !c.lido && c.tipo === 'urgente' && 'border-orange-300 bg-orange-50/30',
                    c.lido && 'opacity-60'
                  )}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn(
                              'text-xs',
                              c.tipo === 'obrigatorio' ? 'border-red-300 text-red-700' :
                              c.tipo === 'urgente' ? 'border-orange-300 text-orange-700' :
                              'border-blue-300 text-blue-700'
                            )}>
                              {c.tipo}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(c.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                            {c.lido && <Badge variant="outline" className="text-xs text-green-600 border-green-300">Lido</Badge>}
                          </div>
                          <h4 className="font-semibold">{c.titulo}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{c.conteudo}</p>
                        </div>
                        {!c.lido && (
                          <Button size="sm" variant="outline" onClick={() => marcarLido.mutate(c.id)}>
                            <Check className="h-3 w-3 mr-1" />
                            Marcar como lido
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Nova Tarefa */}
      <Dialog open={showNovaTarefa} onOpenChange={setShowNovaTarefa}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input placeholder="Descreva a tarefa" value={novaTarefa.titulo}
                onChange={e => setNovaTarefa(p => ({ ...p, titulo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea placeholder="Detalhes adicionais..." value={novaTarefa.descricao}
                onChange={e => setNovaTarefa(p => ({ ...p, descricao: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={novaTarefa.prioridade} onValueChange={v => setNovaTarefa(p => ({ ...p, prioridade: v }))}>
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
                <Label>Vencimento</Label>
                <Input type="date" value={novaTarefa.data_vencimento}
                  onChange={e => setNovaTarefa(p => ({ ...p, data_vencimento: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovaTarefa(false)}>Cancelar</Button>
            <Button onClick={handleCriarTarefa} disabled={!novaTarefa.titulo.trim() || createTarefa.isPending}>
              {createTarefa.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Novo Comunicado */}
      <Dialog open={showNovoComunicado} onOpenChange={setShowNovoComunicado}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Comunicado</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input placeholder="Título do comunicado" value={novoComunicado.titulo}
                onChange={e => setNovoComunicado(p => ({ ...p, titulo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo *</Label>
              <Textarea placeholder="Texto do comunicado..." value={novoComunicado.conteudo}
                onChange={e => setNovoComunicado(p => ({ ...p, conteudo: e.target.value }))} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={novoComunicado.tipo} onValueChange={v => setNovoComunicado(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="informativo">Informativo</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                  <SelectItem value="obrigatorio">Leitura Obrigatória</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovoComunicado(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!novoComunicado.titulo.trim() || !novoComunicado.conteudo.trim()) return;
              await createComunicado.mutateAsync(novoComunicado as any);
              setNovoComunicado({ titulo: '', conteudo: '', tipo: 'informativo' });
              setShowNovoComunicado(false);
            }} disabled={createComunicado.isPending}>
              {createComunicado.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
