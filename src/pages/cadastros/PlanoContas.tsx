import { useState, useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountsExtended, useAccountCategories, useChartOfAccountsSettings } from '@/hooks/useCompanyData';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Layers, FolderTree, Plus, AlertCircle, MinusCircle, Info } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AccountCategory = Database['public']['Enums']['account_category'];
type ContraMode = 'reduce_parent' | 'reduce_classification';
type NormalBalance = 'debit' | 'credit';

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

const contraModeLabels: Record<ContraMode, string> = {
  reduce_parent: 'Reduz conta pai',
  reduce_classification: 'Reduz classificação/conta alvo',
};

const normalBalanceLabels: Record<NormalBalance, string> = {
  debit: 'Devedor',
  credit: 'Credor',
};

export default function PlanoContas() {
  const { currentCompany } = useAuth();
  const { data: accounts = [], isLoading: accountsLoading } = useAccountsExtended();
  const { data: categories = [], isLoading: categoriesLoading } = useAccountCategories();
  const { data: coaSettings } = useChartOfAccountsSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('contas');
  
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
    account_code: '',
    account_name: '',
    category_type: 'despesa' as AccountCategory,
    category_id: '',
    parent_id: '',
    is_managerial: false,
    is_active: true,
    allows_posting: true,
    posting_block_reason: '',
    is_contra_account: false,
    contra_mode: 'reduce_parent' as ContraMode,
    contra_target_account_id: '',
    financial_classification_code: '',
    financial_classification_reducer: false,
    normal_balance: '' as NormalBalance | '',
  });

  // Check if account has children (can't post if leaf_only policy)
  const accountHasChildren = useMemo(() => {
    if (!editingAccount) return false;
    return accounts.some((a: any) => a.parent_id === editingAccount.id);
  }, [editingAccount, accounts]);

  const isLeafOnlyPolicy = coaSettings?.posting_policy === 'leaf_only';

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
      // Validar código máximo de 30 caracteres
      if (data.account_code.length > 30) {
        throw new Error('Código da conta excede 30 caracteres');
      }

      const payload: any = {
        account_code: data.account_code,
        account_name: data.account_name,
        code: data.account_code, // Manter compatibilidade
        name: data.account_name, // Manter compatibilidade
        category_type: data.category_type,
        category_id: data.category_id || null,
        parent_id: data.parent_id || null,
        is_managerial: data.is_managerial,
        is_active: data.is_active,
        allows_posting: data.allows_posting,
        posting_block_reason: data.posting_block_reason || null,
        is_contra_account: data.is_contra_account,
        contra_mode: data.is_contra_account ? data.contra_mode : null,
        contra_target_account_id: data.is_contra_account && data.contra_mode === 'reduce_classification' 
          ? (data.contra_target_account_id || null) 
          : null,
        financial_classification_code: data.financial_classification_code || null,
        financial_classification_reducer: data.financial_classification_reducer,
        normal_balance: data.normal_balance || null,
        company_id: currentCompany?.id,
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
      queryClient.invalidateQueries({ queryKey: ['accounts_extended'] });
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
      queryClient.invalidateQueries({ queryKey: ['accounts_extended'] });
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
      account_code: '',
      account_name: '',
      category_type: 'despesa',
      category_id: '',
      parent_id: '',
      is_managerial: false,
      is_active: true,
      allows_posting: true,
      posting_block_reason: '',
      is_contra_account: false,
      contra_mode: 'reduce_parent',
      contra_target_account_id: '',
      financial_classification_code: '',
      financial_classification_reducer: false,
      normal_balance: '',
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
      account_code: account.account_code || account.code,
      account_name: account.account_name || account.name,
      category_type: account.category_type,
      category_id: account.category_id || '',
      parent_id: account.parent_id || '',
      is_managerial: account.is_managerial || false,
      is_active: account.is_active ?? true,
      allows_posting: account.allows_posting ?? true,
      posting_block_reason: account.posting_block_reason || '',
      is_contra_account: account.is_contra_account || false,
      contra_mode: account.contra_mode || 'reduce_parent',
      contra_target_account_id: account.contra_target_account_id || '',
      financial_classification_code: account.financial_classification_code || '',
      financial_classification_reducer: account.financial_classification_reducer || false,
      normal_balance: account.normal_balance || '',
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

  // Accounts that can be targets for contra accounts
  const contraTargetAccounts = useMemo(() => {
    return accounts.filter((a: any) => 
      a.id !== editingAccount?.id && 
      !a.is_contra_account
    );
  }, [accounts, editingAccount]);

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
    { 
      key: 'account_code', 
      header: 'Código', 
      className: 'w-32 font-mono',
      render: (item: any) => item.account_code || item.code,
    },
    { 
      key: 'account_name', 
      header: 'Nome',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          {item.is_contra_account && (
            <Tooltip>
              <TooltipTrigger>
                <MinusCircle className="h-4 w-4 text-warning" />
              </TooltipTrigger>
              <TooltipContent>Conta Redutora</TooltipContent>
            </Tooltip>
          )}
          <span>{item.account_name || item.name}</span>
        </div>
      ),
    },
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
      key: 'allows_posting',
      header: 'Lançar',
      render: (item: any) => (
        <Badge variant={item.allows_posting ? 'default' : 'secondary'}>
          {item.allows_posting ? 'Sim' : 'Não'}
        </Badge>
      ),
      className: 'w-20',
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
      <div className="space-y-6 animate-fade-in form-surface">
        <PageHeader
          title="Plano de Contas"
          description="Gerencie categorias e contas contábeis"
        />

        {/* Settings Info */}
        {coaSettings && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 text-sm">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span>
              Política de lançamento: <strong>
                {coaSettings.posting_policy === 'leaf_only' && 'Apenas contas folha'}
                {coaSettings.posting_policy === 'allows_posting_flag' && 'Conforme flag "Aceita lançamentos"'}
                {coaSettings.posting_policy === 'leaf_or_flag' && 'Folhas sempre, pais se habilitado'}
              </strong>
            </span>
            <span className="text-muted-foreground">•</span>
            <span>Código máximo: <strong>{coaSettings.max_code_length || 30}</strong> caracteres</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="contas" className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Contas
            </TabsTrigger>
            <TabsTrigger value="categorias" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Categorias
            </TabsTrigger>
          </TabsList>

          {/* Contas Tab */}
          <TabsContent value="contas" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Contas Analíticas</CardTitle>
                    <CardDescription>
                      Cadastre contas contábeis com suporte a redutores e classificações financeiras
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
                  onRowClick={handleEditAccount}
                  emptyMessage="Nenhuma conta cadastrada. Clique em 'Nova Conta' para começar."
                />
              </CardContent>
            </Card>
          </TabsContent>

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
                  onRowClick={handleEditCategory}
                  emptyMessage="Nenhuma categoria cadastrada. Clique em 'Nova Categoria' para começar."
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
              <DialogDescription>
                Preencha os dados da conta contábil. Campos com * são obrigatórios.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveAccountMutation.mutate(accountFormData);
              }}
              className="space-y-6"
            >
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Informações Básicas</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Código * (máx. 30 caracteres)</Label>
                    <Input
                      value={accountFormData.account_code}
                      onChange={(e) => setAccountFormData({ ...accountFormData, account_code: e.target.value })}
                      placeholder="1.01.01"
                      required
                      maxLength={30}
                    />
                    {accountFormData.account_code.length > 25 && (
                      <p className="text-xs text-warning">{30 - accountFormData.account_code.length} caracteres restantes</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select
                      value={accountFormData.category_type}
                      onValueChange={(v) => setAccountFormData({ 
                        ...accountFormData, 
                        category_type: v as AccountCategory,
                        category_id: ''
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
                  <Label>Nome *</Label>
                  <Input
                    value={accountFormData.account_name}
                    onChange={(e) => setAccountFormData({ ...accountFormData, account_name: e.target.value })}
                    placeholder="Nome da conta"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={accountFormData.category_id || "__none__"}
                      onValueChange={(v) => setAccountFormData({ ...accountFormData, category_id: v === "__none__" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
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
                  </div>
                  <div className="space-y-2">
                    <Label>Conta Pai</Label>
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
                              {a.account_code || a.code} - {a.account_name || a.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Posting Settings */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Configurações de Lançamento</h4>
                
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={accountFormData.allows_posting}
                      onCheckedChange={(v) => setAccountFormData({ ...accountFormData, allows_posting: v })}
                      disabled={isLeafOnlyPolicy && accountHasChildren}
                    />
                    <div>
                      <Label>Aceita lançamentos</Label>
                      {isLeafOnlyPolicy && accountHasChildren && (
                        <p className="text-xs text-warning flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          Conta com filhos não pode lançar (política leaf_only)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={accountFormData.is_active}
                      onCheckedChange={(v) => setAccountFormData({ ...accountFormData, is_active: v })}
                    />
                    <Label>Ativa</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={accountFormData.is_managerial}
                      onCheckedChange={(v) => setAccountFormData({ ...accountFormData, is_managerial: v })}
                    />
                    <Label>Gerencial</Label>
                  </div>
                </div>

                {!accountFormData.allows_posting && (
                  <div className="space-y-2">
                    <Label>Motivo do bloqueio (opcional)</Label>
                    <Textarea
                      value={accountFormData.posting_block_reason}
                      onChange={(e) => setAccountFormData({ ...accountFormData, posting_block_reason: e.target.value })}
                      placeholder="Ex: Conta sintética, usar subconta específica"
                      rows={2}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Saldo Normal</Label>
                    <Select
                      value={accountFormData.normal_balance || "__none__"}
                      onValueChange={(v) => setAccountFormData({ ...accountFormData, normal_balance: v === "__none__" ? "" : v as NormalBalance })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não definido</SelectItem>
                        <SelectItem value="debit">Devedor</SelectItem>
                        <SelectItem value="credit">Credor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Contra Account Settings */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Conta Redutora</h4>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={accountFormData.is_contra_account}
                    onCheckedChange={(v) => setAccountFormData({ ...accountFormData, is_contra_account: v })}
                  />
                  <div>
                    <Label>Esta é uma conta redutora</Label>
                    <p className="text-xs text-muted-foreground">
                      Contas redutoras aparecem como (-) nos relatórios e reduzem o subtotal do grupo
                    </p>
                  </div>
                </div>

                {accountFormData.is_contra_account && (
                  <div className="space-y-4 pl-6 border-l-2 border-warning/30">
                    <div className="space-y-2">
                      <Label>Modo de redução</Label>
                      <Select
                        value={accountFormData.contra_mode}
                        onValueChange={(v) => setAccountFormData({ ...accountFormData, contra_mode: v as ContraMode })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(contraModeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {accountFormData.contra_mode === 'reduce_classification' && (
                      <div className="space-y-2">
                        <Label>Conta/Classificação alvo</Label>
                        <Select
                          value={accountFormData.contra_target_account_id || "__none__"}
                          onValueChange={(v) => setAccountFormData({ ...accountFormData, contra_target_account_id: v === "__none__" ? "" : v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a conta alvo..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Usar classificação financeira</SelectItem>
                            {contraTargetAccounts.map((a: any) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.account_code || a.code} - {a.account_name || a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Financial Classification */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Classificação Financeira</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Código da classificação</Label>
                    <Input
                      value={accountFormData.financial_classification_code}
                      onChange={(e) => setAccountFormData({ ...accountFormData, financial_classification_code: e.target.value })}
                      placeholder="Ex: OPERATIONAL, INVEST, FINANCING"
                      maxLength={60}
                    />
                    <p className="text-xs text-muted-foreground">
                      Usado para agrupar nos relatórios gerenciais
                    </p>
                  </div>
                  <div className="flex items-start gap-2 pt-6">
                    <Switch
                      checked={accountFormData.financial_classification_reducer}
                      onCheckedChange={(v) => setAccountFormData({ ...accountFormData, financial_classification_reducer: v })}
                    />
                    <div>
                      <Label>Redutor da classificação</Label>
                      <p className="text-xs text-muted-foreground">
                        Valores entram como (-) na classificação
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
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
