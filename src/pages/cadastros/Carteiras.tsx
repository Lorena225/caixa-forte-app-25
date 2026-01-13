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
import { Pencil, Trash2, Wallet, CreditCard, Banknote, Plus } from 'lucide-react';

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
  });

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
      is_active: true 
    });
    setSelectedBank(null);
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
    });
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Carteira' : 'Nova Carteira'}</DialogTitle>
              <DialogDescription>
                Configure os dados da conta bancária, caixa ou cartão.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <BankSelect
                    value={selectedBank}
                    onChange={setSelectedBank}
                    placeholder="Selecione o banco"
                  />
                  {selectedBank && (
                    <p className="text-xs text-muted-foreground">
                      Código COMPE: <span className="font-mono font-semibold">{selectedBank.compe_code}</span>
                    </p>
                  )}
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
                <div className="grid grid-cols-2 gap-4">
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
