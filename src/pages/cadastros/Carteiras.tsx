import { useState, useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWallets } from '@/hooks/useCompanyData';
import { useBanksReference, type BankReference } from '@/hooks/useBanksReference';
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
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import { BankSelect } from '@/components/cadastros/BankSelect';
import { Pencil, Trash2, Wallet, CreditCard, Banknote, Plus, AlertCircle } from 'lucide-react';

const typeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  caixa: { label: 'Caixa', icon: Banknote, color: 'bg-success/10 text-success' },
  banco: { label: 'Banco', icon: Wallet, color: 'bg-primary/10 text-primary' },
  cartao: { label: 'Cartão', icon: CreditCard, color: 'bg-warning/10 text-warning' },
};

export default function Carteiras() {
  const { currentCompany } = useAuth();
  const { data: wallets = [], isLoading } = useWallets();
  const { data: banks = [] } = useBanksReference();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedBank, setSelectedBank] = useState<BankReference | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'banco' as 'caixa' | 'banco' | 'cartao',
    opening_balance: 0,
    closing_day: '',
    due_day: '',
    is_active: true,
    agency_number: '',
    agency_digit: '',
    account_number: '',
    account_digit: '',
    account_type: 'corrente',
  });
  const [errors, setErrors] = useState<{bank?: string; agency_number?: string; account_number?: string}>({});

  // Mapa de bancos por ID para lookup rápido
  const banksMap = useMemo(() => {
    return new Map(banks.map(b => [b.id, b]));
  }, [banks]);

  const saveMutation = useMutation({
    mutationFn: async (data: { formData: typeof formData; bank: BankReference | null }) => {
      const payload = {
        name: data.formData.name,
        type: data.formData.type,
        opening_balance: data.formData.opening_balance,
        is_active: data.formData.is_active,
        company_id: currentCompany?.id,
        closing_day: data.formData.closing_day ? parseInt(data.formData.closing_day) : null,
        due_day: data.formData.due_day ? parseInt(data.formData.due_day) : null,
        bank_id: data.formData.type === 'banco' && data.bank ? data.bank.id : null,
      };
      if (editingItem) {
        const { error } = await supabase.from('wallets').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('wallets').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      setDialogOpen(false);
      setEditingItem(null);
      resetForm();
      toast({ title: editingItem ? 'Carteira atualizada!' : 'Carteira criada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wallets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast({ title: 'Carteira excluída!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ 
      name: '', 
      type: 'banco', 
      opening_balance: 0, 
      closing_day: '', 
      due_day: '', 
      is_active: true,
      agency_number: '',
      agency_digit: '',
      account_number: '',
      account_digit: '',
      account_type: 'corrente',
    });
    setSelectedBank(null);
    setErrors({});
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      opening_balance: item.opening_balance || 0,
      closing_day: item.closing_day?.toString() || '',
      due_day: item.due_day?.toString() || '',
      is_active: item.is_active,
      agency_number: item.agency_number || '',
      agency_digit: item.agency_digit || '',
      account_number: item.account_number || '',
      account_digit: item.account_digit || '',
      account_type: item.account_type || 'corrente',
    });
    setErrors({});
    // Buscar banco se existir
    if (item.bank_id) {
      const bank = banksMap.get(item.bank_id);
      setSelectedBank(bank || null);
    } else {
      setSelectedBank(null);
    }
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta carteira?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação para tipo banco
    if (formData.type === 'banco') {
      const newErrors: typeof errors = {};
      if (!selectedBank) newErrors.bank = 'Banco é obrigatório';
      if (!formData.agency_number.trim()) newErrors.agency_number = 'Agência é obrigatória';
      if (!formData.account_number.trim()) newErrors.account_number = 'Número da conta é obrigatório';
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
        return;
      }
    }
    
    saveMutation.mutate({ formData, bank: selectedBank });
  };

  const columns = [
    {
      key: 'type',
      header: 'Tipo',
      render: (item: any) => {
        const config = typeLabels[item.type];
        if (!config) return item.type;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${config.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <span>{config.label}</span>
          </div>
        );
      },
      className: 'w-32',
    },
    { key: 'name', header: 'Nome' },
    {
      key: 'bank',
      header: 'Banco',
      render: (item: any) => {
        if (item.type !== 'banco' || !item.bank_id) return '-';
        const bank = banksMap.get(item.bank_id);
        if (!bank) return '-';
        return (
          <span className="text-sm">
            <span className="font-mono font-medium">{bank.compe_code}</span>
            <span className="text-muted-foreground ml-1">– {bank.display_name.split(' - ')[1] || bank.name}</span>
          </span>
        );
      },
    },
    {
      key: 'opening_balance',
      header: 'Saldo Inicial',
      render: (item: any) => (
        <span className={item.opening_balance >= 0 ? 'value-positive' : 'value-negative'}>
          {formatCurrency(item.opening_balance || 0)}
        </span>
      ),
      className: 'text-right',
    },
    {
      key: 'closing_day',
      header: 'Fechamento',
      render: (item: any) => item.closing_day ? `Dia ${item.closing_day}` : '-',
      className: 'w-28',
    },
    {
      key: 'due_day',
      header: 'Vencimento',
      render: (item: any) => item.due_day ? `Dia ${item.due_day}` : '-',
      className: 'w-28',
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
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
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
          title="Contas e Cartões"
          description="Gerencie suas contas bancárias, caixa e cartões"
          action={{ 
            label: 'Nova Carteira', 
            onClick: handleNew,
            icon: <Plus className="h-4 w-4" />
          }}
        />

        <DataTable
          columns={columns}
          data={wallets}
          loading={isLoading}
          emptyMessage="Nenhuma conta ou cartão cadastrado."
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Carteira' : 'Nova Carteira'}</DialogTitle>
              <DialogDescription>
                Configure os dados da conta bancária, caixa ou cartão.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="Conta Corrente" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v) => {
                      setFormData({ ...formData, type: v as 'caixa' | 'banco' | 'cartao' });
                      if (v !== 'banco') setSelectedBank(null);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([value, { label }]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.type === 'banco' && (
                <div className="space-y-4">
                  {/* Banco */}
                  <div className="space-y-2">
                    <Label>Banco <span className="text-destructive">*</span></Label>
                    <BankSelect
                      value={selectedBank}
                      onChange={(bank) => {
                        setSelectedBank(bank);
                        if (bank) setErrors(prev => ({ ...prev, bank: undefined }));
                      }}
                      placeholder="Selecione o banco"
                      error={!!errors.bank}
                    />
                    {selectedBank && (
                      <p className="text-xs text-muted-foreground">
                        Código COMPE: <span className="font-mono font-semibold">{selectedBank.compe_code}</span>
                      </p>
                    )}
                    {errors.bank && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />{errors.bank}
                      </p>
                    )}
                  </div>

                  {/* Agência */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Agência <span className="text-destructive">*</span></Label>
                      <Input
                        value={formData.agency_number}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, agency_number: value });
                          if (value.trim()) setErrors(prev => ({ ...prev, agency_number: undefined }));
                        }}
                        placeholder="0001"
                        maxLength={10}
                        className={errors.agency_number ? 'border-destructive' : ''}
                      />
                      {errors.agency_number && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />{errors.agency_number}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Dígito Agência</Label>
                      <Input
                        value={formData.agency_digit}
                        onChange={(e) => setFormData({ ...formData, agency_digit: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                        placeholder="0"
                        maxLength={2}
                        className="w-20"
                      />
                      <p className="text-xs text-muted-foreground">Opcional</p>
                    </div>
                  </div>

                  {/* Tipo de Conta */}
                  <div className="space-y-2">
                    <Label>Tipo de Conta <span className="text-destructive">*</span></Label>
                    <Select
                      value={formData.account_type}
                      onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente">Conta Corrente</SelectItem>
                        <SelectItem value="poupanca">Conta Poupança</SelectItem>
                        <SelectItem value="universitaria">Conta Universitária</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Número da Conta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Número da Conta <span className="text-destructive">*</span></Label>
                      <Input
                        value={formData.account_number}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, account_number: value });
                          if (value.trim()) setErrors(prev => ({ ...prev, account_number: undefined }));
                        }}
                        placeholder="12345678"
                        maxLength={20}
                        className={errors.account_number ? 'border-destructive' : ''}
                      />
                      {errors.account_number && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />{errors.account_number}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Dígito Conta</Label>
                      <Input
                        value={formData.account_digit}
                        onChange={(e) => setFormData({ ...formData, account_digit: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                        placeholder="0"
                        maxLength={3}
                        className="w-20"
                      />
                      <p className="text-xs text-muted-foreground">Opcional</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Saldo Inicial (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                />
              </div>

              {formData.type === 'cartao' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dia de Fechamento</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.closing_day}
                      onChange={(e) => setFormData({ ...formData, closing_day: e.target.value })}
                      placeholder="Ex: 15"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dia de Vencimento</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.due_day}
                      onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                      placeholder="Ex: 25"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch 
                  checked={formData.is_active} 
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} 
                />
                <Label>Ativa</Label>
              </div>
              
              <div className="flex justify-end gap-2 pt-2 border-t">
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
