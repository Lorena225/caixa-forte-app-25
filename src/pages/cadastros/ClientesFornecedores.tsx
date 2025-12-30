import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCounterparties } from '@/hooks/useCompanyData';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2 } from 'lucide-react';

const typeLabels: Record<string, string> = {
  cliente: 'Cliente',
  fornecedor: 'Fornecedor',
  ambos: 'Ambos',
};

const typeColors: Record<string, string> = {
  cliente: 'bg-success/10 text-success',
  fornecedor: 'bg-destructive/10 text-destructive',
  ambos: 'bg-primary/10 text-primary',
};

export default function ClientesFornecedores() {
  const { currentCompany } = useAuth();
  const { data: counterparties = [], isLoading } = useCounterparties();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'ambos' as 'cliente' | 'fornecedor' | 'ambos',
    document: '',
    email: '',
    phone: '',
    is_active: true,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = { ...data, company_id: currentCompany?.id };
      if (editingItem) {
        const { error } = await supabase.from('counterparties').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('counterparties').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      setDialogOpen(false);
      setEditingItem(null);
      resetForm();
      toast({ title: editingItem ? 'Registro atualizado!' : 'Registro criado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('counterparties').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      toast({ title: 'Registro excluído!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', type: 'ambos', document: '', email: '', phone: '', is_active: true });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      document: item.document || '',
      email: item.email || '',
      phone: item.phone || '',
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    resetForm();
    setDialogOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    {
      key: 'type',
      header: 'Tipo',
      render: (item: any) => (
        <Badge variant="outline" className={typeColors[item.type]}>
          {typeLabels[item.type]}
        </Badge>
      ),
      className: 'w-28',
    },
    { key: 'document', header: 'CPF/CNPJ', render: (item: any) => item.document || '-' },
    { key: 'email', header: 'Email', render: (item: any) => item.email || '-' },
    { key: 'phone', header: 'Telefone', render: (item: any) => item.phone || '-', className: 'w-32' },
    {
      key: 'is_active',
      header: 'Status',
      render: (item: any) => (
        <Badge variant={item.is_active ? 'default' : 'secondary'}>
          {item.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
      className: 'w-24',
    },
    {
      key: 'actions',
      header: '',
      render: (item: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(item.id); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
      className: 'w-24',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Clientes e Fornecedores"
          description="Gerencie seus clientes e fornecedores"
          action={{ label: 'Novo Cadastro', onClick: handleNew }}
        />

        <DataTable
          columns={columns}
          data={counterparties}
          loading={isLoading}
          emptyMessage="Nenhum cliente ou fornecedor cadastrado."
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Cadastro' : 'Novo Cadastro'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as 'cliente' | 'fornecedor' | 'ambos' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Input value={formData.document} onChange={(e) => setFormData({ ...formData, document: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                <Label>Ativo</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
