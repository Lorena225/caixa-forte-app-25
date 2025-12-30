import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccounts } from '@/hooks/useCompanyData';
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

const categoryLabels: Record<string, string> = {
  ativo: 'Ativo',
  passivo: 'Passivo',
  patrimonio_liquido: 'Patrimônio Líquido',
  receita: 'Receita',
  custo: 'Custo',
  despesa: 'Despesa',
};

const categoryColors: Record<string, string> = {
  ativo: 'bg-info/10 text-info',
  passivo: 'bg-warning/10 text-warning',
  patrimonio_liquido: 'bg-primary/10 text-primary',
  receita: 'bg-success/10 text-success',
  custo: 'bg-destructive/10 text-destructive',
  despesa: 'bg-destructive/10 text-destructive',
};

export default function PlanoContas() {
  const { currentCompany } = useAuth();
  const { data: accounts = [], isLoading } = useAccounts();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category_type: 'despesa' as 'ativo' | 'passivo' | 'patrimonio_liquido' | 'receita' | 'custo' | 'despesa',
    parent_id: '',
    is_managerial: false,
    is_active: true,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        company_id: currentCompany?.id,
        parent_id: data.parent_id || null,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('accounts')
          .update(payload)
          .eq('id', editingAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('accounts').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDialogOpen(false);
      setEditingAccount(null);
      resetForm();
      toast({ title: editingAccount ? 'Conta atualizada!' : 'Conta criada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Conta excluída!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      category_type: 'despesa',
      parent_id: '',
      is_managerial: false,
      is_active: true,
    });
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      category_type: account.category_type,
      parent_id: account.parent_id || '',
      is_managerial: account.is_managerial,
      is_active: account.is_active,
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingAccount(null);
    resetForm();
    setDialogOpen(true);
  };

  const columns = [
    { key: 'code', header: 'Código', className: 'w-32 font-mono' },
    { key: 'name', header: 'Nome' },
    {
      key: 'category_type',
      header: 'Categoria',
      render: (item: any) => (
        <Badge variant="outline" className={categoryColors[item.category_type]}>
          {categoryLabels[item.category_type]}
        </Badge>
      ),
    },
    {
      key: 'is_managerial',
      header: 'Gerencial',
      render: (item: any) => (item.is_managerial ? 'Sim' : 'Não'),
      className: 'w-24',
    },
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
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(item.id); }}
          >
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
          title="Plano de Contas"
          description="Gerencie as contas contábeis e gerenciais"
          action={{ label: 'Nova Conta', onClick: handleNew }}
        />

        <DataTable
          columns={columns}
          data={accounts}
          loading={isLoading}
          emptyMessage="Nenhuma conta cadastrada. Clique em 'Nova Conta' para começar."
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(formData);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="1.01.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category_type}
                    onValueChange={(v) => setFormData({ ...formData, category_type: v as 'ativo' | 'passivo' | 'patrimonio_liquido' | 'receita' | 'custo' | 'despesa' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome da conta"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Conta Pai (opcional)</Label>
                <Select
                  value={formData.parent_id || "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, parent_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {accounts
                      .filter((a) => a.id !== editingAccount?.id)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_managerial}
                    onCheckedChange={(v) => setFormData({ ...formData, is_managerial: v })}
                  />
                  <Label>Conta Gerencial</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                  />
                  <Label>Ativa</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
