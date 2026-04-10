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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Bell, Mail, MessageSquare, Phone, Edit, Trash2 } from 'lucide-react';
import { useCollectionRules, useCreateCollectionRule, useUpdateCollectionRule, useDeleteCollectionRule, CollectionRule } from '@/hooks/useCollectionRules';

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

const canalLabel: Record<string, string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  telefone: 'Telefone',
};

export default function Reguas() {
  const { data: reguas = [], isLoading } = useCollectionRules();
  const createRule = useCreateCollectionRule();
  const updateRule = useUpdateCollectionRule();
  const deleteRule = useDeleteCollectionRule();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CollectionRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    channel: 'email',
    days_before_due: '',
    days_after_due: '',
  });

  const resetForm = () => {
    setFormData({ name: '', channel: 'email', days_before_due: '', days_after_due: '' });
    setEditingRule(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (rule: CollectionRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      channel: rule.channel,
      days_before_due: rule.days_before_due?.toString() || '',
      days_after_due: rule.days_after_due?.toString() || '',
    });
    setIsModalOpen(true);
  };

  const toggleRegua = async (id: string, currentState: boolean) => {
    await updateRule.mutateAsync({ id, is_active: !currentState });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.channel) return;

    const payload = {
      name: formData.name,
      channel: formData.channel,
      days_before_due: formData.days_before_due ? parseInt(formData.days_before_due) : null,
      days_after_due: formData.days_after_due ? parseInt(formData.days_after_due) : null,
    };

    if (editingRule) {
      await updateRule.mutateAsync({ id: editingRule.id, ...payload });
    } else {
      await createRule.mutateAsync(payload);
    }

    resetForm();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta régua?')) {
      await deleteRule.mutateAsync(id);
    }
  };

  const formatDays = (rule: CollectionRule) => {
    const parts: string[] = [];
    if (rule.days_before_due) {
      parts.push(`D-${rule.days_before_due}`);
    }
    if (rule.days_after_due) {
      parts.push(`D+${rule.days_after_due}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'No vencimento';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Réguas de Cobrança"
          description="Configure automações de lembretes e notificações"
        />

        <div className="flex justify-end">
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Régua
          </Button>
        </div>

        <div className="grid gap-6">
          {reguas.map((regua) => {
            const Icon = tipoIcone[regua.channel] || Mail;
            return (
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
                        <CardDescription>
                          {canalLabel[regua.channel] || regua.channel} • {formatDays(regua)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={regua.is_active}
                        onCheckedChange={() => toggleRegua(regua.id, regua.is_active)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(regua)}>
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
                    <Badge className={tipoCor[regua.channel] || 'bg-gray-100'} variant="secondary">
                      <Icon className="h-3 w-3 mr-1" />
                      {canalLabel[regua.channel] || regua.channel}
                    </Badge>
                    {regua.days_before_due && (
                      <Badge variant="outline">
                        {regua.days_before_due} dias antes do vencimento
                      </Badge>
                    )}
                    {regua.days_after_due && (
                      <Badge variant="outline">
                        {regua.days_after_due} dias após vencimento
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {reguas.length === 0 && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma régua configurada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crie sua primeira régua de cobrança para automatizar lembretes e notificações.
              </p>
              <Button onClick={openCreateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Régua
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Modal Nova/Editar Régua */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Editar Régua' : 'Nova Régua de Cobrança'}</DialogTitle>
              <DialogDescription>Configure a notificação automática</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Régua</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Lembrete WhatsApp D-3"
                />
              </div>

              <div>
                <Label>Canal de Notificação</Label>
                <Select value={formData.channel} onValueChange={(v) => setFormData(prev => ({ ...prev, channel: v }))}>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Dias antes do vencimento</Label>
                  <Input
                    type="number"
                    value={formData.days_before_due}
                    onChange={(e) => setFormData(prev => ({ ...prev, days_before_due: e.target.value }))}
                    placeholder="Ex: 3"
                    min={0}
                  />
                </div>
                <div>
                  <Label>Dias após vencimento</Label>
                  <Input
                    type="number"
                    value={formData.days_after_due}
                    onChange={(e) => setFormData(prev => ({ ...prev, days_after_due: e.target.value }))}
                    placeholder="Ex: 5"
                    min={0}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={createRule.isPending || updateRule.isPending}>
                {(createRule.isPending || updateRule.isPending) ? 'Salvando...' : editingRule ? 'Salvar' : 'Criar Régua'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
