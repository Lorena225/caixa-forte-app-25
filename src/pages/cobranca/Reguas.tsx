import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Bell, Mail, MessageSquare, Phone, Edit, Trash2, ArrowRight, X } from 'lucide-react';
import { useCollectionRules, useCreateCollectionRule, useUpdateCollectionRule, useDeleteCollectionRule, CollectionStep } from '@/hooks/useCollectionRules';

const tipoIcone: Record<string, any> = {
  email: Mail,
  whatsapp: MessageSquare,
  sms: Phone,
  telefone: Phone,
};

const tipoCor: Record<string, string> = {
  email: 'bg-blue-100 text-blue-800',
  whatsapp: 'bg-green-100 text-green-800',
  sms: 'bg-purple-100 text-purple-800',
  telefone: 'bg-orange-100 text-orange-800',
};

export default function Reguas() {
  const { data: reguas = [], isLoading } = useCollectionRules();
  const createRule = useCreateCollectionRule();
  const updateRule = useUpdateCollectionRule();
  const deleteRule = useDeleteCollectionRule();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    steps: [] as CollectionStep[],
  });
  const [newStep, setNewStep] = useState<CollectionStep>({
    days: 0,
    action: 'email',
    template: '',
    message: '',
  });

  const toggleRegua = async (id: string, currentState: boolean) => {
    await updateRule.mutateAsync({ id, is_active: !currentState });
  };

  const handleAddStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, { ...newStep }],
    }));
    setNewStep({ days: 0, action: 'email', template: '', message: '' });
  };

  const handleRemoveStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const handleCreate = async () => {
    if (!formData.name || formData.steps.length === 0) return;
    await createRule.mutateAsync({
      name: formData.name,
      description: formData.description,
      steps: formData.steps,
    });
    setFormData({ name: '', description: '', steps: [] });
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta régua?')) {
      await deleteRule.mutateAsync(id);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Réguas de Cobrança"
          description="Configure automações de lembretes e notificações"
        />

        <div className="flex justify-end">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Régua
          </Button>
        </div>

        <div className="grid gap-6">
          {reguas.map((regua) => (
            <Card key={regua.id} className={!regua.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {regua.name}
                        <Badge variant={regua.is_active ? 'default' : 'secondary'}>
                          {regua.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{regua.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={regua.is_active}
                      onCheckedChange={() => toggleRegua(regua.id, regua.is_active)}
                    />
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(regua.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  {regua.steps.map((etapa, index) => {
                    const Icon = tipoIcone[etapa.action] || Mail;
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <Badge className={tipoCor[etapa.action] || 'bg-gray-100'} variant="secondary">
                            <Icon className="h-3 w-3 mr-1" />
                            {etapa.days > 0 ? `D+${etapa.days}` : etapa.days === 0 ? 'D' : `D${etapa.days}`}
                          </Badge>
                          <span className="text-xs text-muted-foreground mt-1 max-w-[80px] text-center truncate">
                            {etapa.message}
                          </span>
                        </div>
                        {index < regua.steps.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {reguas.length === 0 && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma régua configurada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crie sua primeira régua de cobrança para automatizar lembretes e notificações.
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Régua
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Modal Nova Régua */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Régua de Cobrança</DialogTitle>
              <DialogDescription>Configure as etapas de notificação automática</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Régua</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Régua Padrão"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição da régua..."
                />
              </div>

              <div className="border-t pt-4">
                <Label className="mb-2 block">Etapas</Label>
                {formData.steps.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Badge className={tipoCor[step.action]}>
                          D{step.days >= 0 ? '+' : ''}{step.days}
                        </Badge>
                        <span className="flex-1">{step.action.toUpperCase()}: {step.message}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveStep(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">Dias</Label>
                    <Input
                      type="number"
                      value={newStep.days}
                      onChange={(e) => setNewStep(prev => ({ ...prev, days: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Canal</Label>
                    <Select value={newStep.action} onValueChange={(v: any) => setNewStep(prev => ({ ...prev, action: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="telefone">Telefone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Mensagem</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newStep.message}
                        onChange={(e) => setNewStep(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Descrição da etapa"
                      />
                      <Button type="button" onClick={handleAddStep}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={createRule.isPending}>
                {createRule.isPending ? 'Salvando...' : 'Criar Régua'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
