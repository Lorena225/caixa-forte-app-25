import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCostCenters } from '@/hooks/useCompanyData';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2 } from 'lucide-react';

export default function CentrosCusto() {
  const { currentCompany } = useAuth();
  const { data: costCenters = [], isLoading } = useCostCenters();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    is_active: true,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = { ...data, company_id: currentCompany?.id };
      if (editingItem) {
        const { error } = await supabase.from('cost_centers').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cost_centers').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost_centers'] });
      setDialogOpen(false);
      setEditingItem(null);
      setFormData({ code: '', name: '', is_active: true });
      toast({ title: editingItem ? 'Centro atualizado!' : 'Centro criado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cost_centers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost_centers'] });
      toast({ title: 'Centro excluído!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ code: item.code, name: item.name, is_active: item.is_active });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', is_active: true });
    setDialogOpen(true);
  };

  const columns = [
    { key: 'code', header: 'Código', className: 'w-32 font-mono' },
    { key: 'name', header: 'Nome' },
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
          title="Centros de Custo"
          description="Gerencie os centros de custo da empresa"
          action={{ label: 'Novo Centro', onClick: handleNew }}
        />

        <DataTable
          columns={columns}
          data={costCenters}
          loading={isLoading}
          emptyMessage="Nenhum centro de custo cadastrado."
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Centro' : 'Novo Centro'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="CC01" required />
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Administrativo" required />
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
