import { useState, useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccounts, useAccountCategories } from '@/hooks/useCompanyData';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Pencil, Trash2, Layers, FolderTree, Plus } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AccountCategory = Database['public']['Enums']['account_category'];

const categoryLabels: Record<AccountCategory, string> = {
  ativo: 'Ativo',
  passivo: 'Passivo',
  patrimonio_liquido: 'Patrimônio Líquido',
  receita: 'Receita',
  custo: 'Custo',
  despesa: 'Despesa',
};

const categoryColors: Record<AccountCategory, string> = {
  ativo: 'bg-info/10 text-info',
  passivo: 'bg-warning/10 text-warning',
  patrimonio_liquido: 'bg-primary/10 text-primary',
  receita: 'bg-success/10 text-success',
  custo: 'bg-destructive/10 text-destructive',
  despesa: 'bg-destructive/10 text-destructive',
};

export default function PlanoContas() {
  const { currentCompany } = useAuth();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: categories = [], isLoading: categoriesLoading } = useAccountCategories();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('categorias');
  
  // Category state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    code: '',
    name: '',
    category_type: 'despesa' as AccountCategory,
    parent_id: '',
    is_active: true,
  });
  
  // Account state
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [accountFormData, setAccountFormData] = useState({
    code: '',
    name: '',
    category_type: 'despesa' as AccountCategory,
    category_id: '',
    parent_id: '',
    is_managerial: false,
    is_active: true,
  });

  // Category mutations
  const saveCategoryMutation = useMutation({
    mutationFn: async (data: typeof categoryFormData) => {
      const payload = {
        ...data,
        company_id: currentCompany?.id,
        parent_id: data.parent_id || null,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('account_categories')
          .update(payload)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('account_categories').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account_categories'] });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      resetCategoryForm();
      toast({ title: editingCategory ? 'Categoria atualizada!' : 'Categoria criada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('account_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account_categories'] });
      toast({ title: 'Categoria excluída!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Account mutations
  const saveAccountMutation = useMutation({
    mutationFn: async (data: typeof accountFormData) => {
      const payload = {
        ...data,
        company_id: currentCompany?.id,
        category_id: data.category_id || null,
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
      setAccountDialogOpen(false);
      setEditingAccount(null);
      resetAccountForm();
      toast({ title: editingAccount ? 'Conta atualizada!' : 'Conta criada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteAccountMutation = useMutation({
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

  const resetCategoryForm = () => {
    setCategoryFormData({
      code: '',
      name: '',
      category_type: 'despesa',
      parent_id: '',
      is_active: true,
    });
  };

  const resetAccountForm = () => {
    setAccountFormData({
      code: '',
      name: '',
      category_type: 'despesa',
      category_id: '',
      parent_id: '',
      is_managerial: false,
      is_active: true,
    });
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryFormData({
      code: category.code,
      name: category.name,
      category_type: category.category_type,
      parent_id: category.parent_id || '',
      is_active: category.is_active,
    });
    setCategoryDialogOpen(true);
  };

  const handleNewCategory = () => {
    setEditingCategory(null);
    resetCategoryForm();
    setCategoryDialogOpen(true);
  };

  const handleEditAccount = (account: any) => {
    setEditingAccount(account);
    setAccountFormData({
      code: account.code,
      name: account.name,
      category_type: account.category_type,
      category_id: account.category_id || '',
      parent_id: account.parent_id || '',
      is_managerial: account.is_managerial,
      is_active: account.is_active,
    });
    setAccountDialogOpen(true);
  };

  const handleNewAccount = () => {
    setEditingAccount(null);
    resetAccountForm();
    setAccountDialogOpen(true);
  };

  // Filter categories based on selected category_type for account form
  const filteredCategories = useMemo(() => {
    return categories.filter((c: any) => c.category_type === accountFormData.category_type);
  }, [categories, accountFormData.category_type]);

  // Category columns
  const categoryColumns = [
    { key: 'code', header: 'Código', className: 'w-32 font-mono' },
    { key: 'name', header: 'Nome' },
    {
      key: 'category_type',
      header: 'Tipo',
      render: (item: any) => (
        <Badge variant="outline" className={categoryColors[item.category_type as AccountCategory]}>
          {categoryLabels[item.category_type as AccountCategory]}
        </Badge>
      ),
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
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditCategory(item); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); deleteCategoryMutation.mutate(item.id); }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
      className: 'w-24',
    },
  ];

  // Account columns
  const accountColumns = [
    { key: 'code', header: 'Código', className: 'w-32 font-mono' },
    { key: 'name', header: 'Nome' },
    {
      key: 'category',
      header: 'Categoria',
      render: (item: any) => item.category?.name || '-',
    },
    {
      key: 'category_type',
      header: 'Tipo',
      render: (item: any) => (
        <Badge variant="outline" className={categoryColors[item.category_type as AccountCategory]}>
          {categoryLabels[item.category_type as AccountCategory]}
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
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditAccount(item); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); deleteAccountMutation.mutate(item.id); }}
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
          description="Gerencie categorias e contas contábeis"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="categorias" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="contas" className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Contas
            </TabsTrigger>
          </TabsList>

          {/* Categorias Tab */}
          <TabsContent value="categorias" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Categorias (Grupos)</CardTitle>
                    <CardDescription>
                      Defina grupos de contas por tipo: Receitas, Despesas, Custos, etc.
                    </CardDescription>
                  </div>
                  <Button onClick={handleNewCategory}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Categoria
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={categoryColumns}
                  data={categories}
                  loading={categoriesLoading}
                  emptyMessage="Nenhuma categoria cadastrada. Clique em 'Nova Categoria' para começar."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contas Tab */}
          <TabsContent value="contas" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Contas Analíticas</CardTitle>
                    <CardDescription>
                      Cadastre contas contábeis e vincule a uma categoria
                    </CardDescription>
                  </div>
                  <Button onClick={handleNewAccount}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Conta
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={accountColumns}
                  data={accounts}
                  loading={accountsLoading}
                  emptyMessage="Nenhuma conta cadastrada. Clique em 'Nova Conta' para começar."
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Category Dialog */}
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCategoryMutation.mutate(categoryFormData);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input
                    value={categoryFormData.code}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, code: e.target.value })}
                    placeholder="R01, D05"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={categoryFormData.category_type}
                    onValueChange={(v) => setCategoryFormData({ ...categoryFormData, category_type: v as AccountCategory })}
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
                <Label>Nome *</Label>
                <Input
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="Receitas com Serviços, Despesas Operacionais..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria Pai (opcional)</Label>
                <Select
                  value={categoryFormData.parent_id || "__none__"}
                  onValueChange={(v) => setCategoryFormData({ ...categoryFormData, parent_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma (Raiz)</SelectItem>
                    {categories
                      .filter((c: any) => c.id !== editingCategory?.id && c.category_type === categoryFormData.category_type)
                      .map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} - {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={categoryFormData.is_active}
                  onCheckedChange={(v) => setCategoryFormData({ ...categoryFormData, is_active: v })}
                />
                <Label>Ativa</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveCategoryMutation.isPending}>
                  {saveCategoryMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Account Dialog */}
        <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveAccountMutation.mutate(accountFormData);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input
                    value={accountFormData.code}
                    onChange={(e) => setAccountFormData({ ...accountFormData, code: e.target.value })}
                    placeholder="1.01.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={accountFormData.category_type}
                    onValueChange={(v) => setAccountFormData({ 
                      ...accountFormData, 
                      category_type: v as AccountCategory,
                      category_id: '' // Reset category when type changes
                    })}
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
                <Label>Categoria *</Label>
                <Select
                  value={accountFormData.category_id || "__none__"}
                  onValueChange={(v) => setAccountFormData({ ...accountFormData, category_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem categoria</SelectItem>
                    {filteredCategories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filteredCategories.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma categoria do tipo "{categoryLabels[accountFormData.category_type]}". 
                    <Button variant="link" size="sm" className="h-auto p-0 ml-1" onClick={() => {
                      setAccountDialogOpen(false);
                      setActiveTab('categorias');
                      handleNewCategory();
                    }}>
                      Criar categoria
                    </Button>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={accountFormData.name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                  placeholder="Nome da conta"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Conta Pai (opcional)</Label>
                <Select
                  value={accountFormData.parent_id || "__none__"}
                  onValueChange={(v) => setAccountFormData({ ...accountFormData, parent_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {accounts
                      .filter((a: any) => a.id !== editingAccount?.id)
                      .map((a: any) => (
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
                    checked={accountFormData.is_managerial}
                    onCheckedChange={(v) => setAccountFormData({ ...accountFormData, is_managerial: v })}
                  />
                  <Label>Conta Gerencial</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={accountFormData.is_active}
                    onCheckedChange={(v) => setAccountFormData({ ...accountFormData, is_active: v })}
                  />
                  <Label>Ativa</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAccountDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveAccountMutation.isPending}>
                  {saveAccountMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
