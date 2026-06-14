import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, LayoutTemplate, Loader2 } from 'lucide-react';
import { useTemplates, useCreateTemplate } from '@/hooks/useProjectModule';

type Item = { item_type: string; title: string; day_offset: number; duration_days: number; estimated_hours: number; is_billable: boolean };

export default function TemplatesProjetos() {
  const { data: templates = [], isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState<Item>({ item_type: 'task', title: '', day_offset: 0, duration_days: 1, estimated_hours: 0, is_billable: false });

  const addItem = () => {
    if (!draft.title) return;
    setItems([...items, draft]);
    setDraft({ item_type: 'task', title: '', day_offset: 0, duration_days: 1, estimated_hours: 0, is_billable: false });
  };

  const save = () => {
    if (!name || items.length === 0) return;
    createTemplate.mutate({ name, description, items }, {
      onSuccess: () => { setOpen(false); setName(''); setDescription(''); setItems([]); },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Templates de Projeto"
          description="Estruturas reutilizáveis de milestones e tarefas para criar projetos em 1 clique">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Novo template</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Criar template de projeto</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nome</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Implantação padrão 90 dias" /></div>
                  <div><Label>Descrição</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                </div>

                <div className="border rounded-lg p-3 space-y-3">
                  <p className="text-sm font-medium">Itens do template</p>
                  <div className="grid grid-cols-[100px_1fr_70px_70px_70px] gap-2 items-end">
                    <div><Label className="text-xs">Tipo</Label>
                      <Select value={draft.item_type} onValueChange={(v) => setDraft({ ...draft, item_type: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="task">Tarefa</SelectItem>
                          <SelectItem value="milestone">Milestone</SelectItem>
                        </SelectContent>
                      </Select></div>
                    <div><Label className="text-xs">Título</Label>
                      <Input className="h-9" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
                    <div><Label className="text-xs">Dia+</Label>
                      <Input className="h-9" type="number" value={draft.day_offset} onChange={(e) => setDraft({ ...draft, day_offset: Number(e.target.value) })} /></div>
                    <div><Label className="text-xs">Dur.</Label>
                      <Input className="h-9" type="number" value={draft.duration_days} onChange={(e) => setDraft({ ...draft, duration_days: Number(e.target.value) })} /></div>
                    <div><Label className="text-xs">Horas</Label>
                      <Input className="h-9" type="number" value={draft.estimated_hours} onChange={(e) => setDraft({ ...draft, estimated_hours: Number(e.target.value) })} /></div>
                  </div>
                  <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Adicionar item</Button>

                  {items.length > 0 && (
                    <div className="space-y-1 pt-2">
                      {items.map((it, i) => (
                        <div key={i} className="flex items-center justify-between text-sm border rounded p-2">
                          <span>
                            <Badge variant={it.item_type === 'milestone' ? 'default' : 'secondary'} className="mr-2">
                              {it.item_type === 'milestone' ? 'MS' : 'T'}</Badge>
                            {it.title} <span className="text-muted-foreground text-xs">· dia +{it.day_offset} · {it.duration_days}d · {it.estimated_hours}h</span>
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
                            <Trash2 className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter><Button onClick={save} disabled={createTemplate.isPending || !name || items.length === 0}>
                {createTemplate.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar template</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <Card>
          <CardHeader><CardTitle>Templates cadastrados</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <LayoutTemplate className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Nenhum template ainda.</p>
                  <p className="text-sm">Crie templates para padronizar projetos recorrentes (implantação, consultoria, treinamento).</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="font-medium">{t.name}</p>
                        {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                      </div>
                      <Badge variant="secondary">{t.items?.[0]?.count ?? 0} itens</Badge>
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
