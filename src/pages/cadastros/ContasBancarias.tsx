import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { useToast } from '@/hooks/use-toast';
import { BankSelect } from '@/components/cadastros/BankSelect';
import {
  useBanksReference,
  useCompanyBankAccounts,
  useBankAccountMutations,
  useBankRequestMutation,
  type BankReference,
} from '@/hooks/useBanksReference';
import {
  Pencil,
  Trash2,
  Building2,
  Plus,
  Star,
  Landmark,
  AlertCircle,
} from 'lucide-react';

// Tipos de conta disponíveis
const accountTypeOptions = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Conta Poupança' },
  { value: 'universitaria', label: 'Conta Universitária' },
] as const;

const accountTypeLabels: Record<string, string> = {
  corrente: 'Conta Corrente',
  poupanca: 'Conta Poupança',
  universitaria: 'Conta Universitária',
  pagamentos: 'Conta de Pagamentos',
  caixa: 'Caixa',
};

interface FormErrors {
  bank?: string;
  agency_number?: string;
  account_number?: string;
  account_type?: string;
}

export default function ContasBancarias() {
  const { toast } = useToast();
  const { data: accounts = [], isLoading } = useCompanyBankAccounts();
  const { createAccount, updateAccount, deleteAccount } = useBankAccountMutations();
  const bankRequestMutation = useBankRequestMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedBank, setSelectedBank] = useState<BankReference | null>(null);
  const [requestName, setRequestName] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState({
    agency_number: '',
    agency_digit: '',
    account_number: '',
    account_digit: '',
    account_type: 'corrente',
    nickname: '',
    holder_name: '',
    holder_document: '',
    is_active: true,
    is_default_receipts: false,
    is_default_payments: false,
  });

  const resetForm = () => {
    setFormData({
      agency_number: '',
      agency_digit: '',
      account_number: '',
      account_digit: '',
      account_type: 'corrente',
      nickname: '',
      holder_name: '',
      holder_document: '',
      is_active: true,
      is_default_receipts: false,
      is_default_payments: false,
    });
    setSelectedBank(null);
    setEditingItem(null);
    setErrors({});
  };

  const handleNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setSelectedBank(item.bank);
    setFormData({
      agency_number: item.agency_number || '',
      agency_digit: item.agency_digit || '',
      account_number: item.account_number,
      account_digit: item.account_digit || '',
      account_type: item.account_type,
      nickname: item.nickname || '',
      holder_name: item.holder_name || '',
      holder_document: item.holder_document || '',
      is_active: item.is_active,
      is_default_receipts: item.is_default_receipts,
      is_default_payments: item.is_default_payments,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta bancária?')) return;
    try {
      await deleteAccount.mutateAsync(id);
      toast({ title: 'Conta excluída com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  // Validação de campos
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!selectedBank) {
      newErrors.bank = 'Banco é obrigatório';
    }
    if (!formData.agency_number.trim()) {
      newErrors.agency_number = 'Agência é obrigatória';
    } else if (!/^[0-9]+$/.test(formData.agency_number)) {
      newErrors.agency_number = 'Agência deve conter apenas números';
    }
    if (!formData.account_number.trim()) {
      newErrors.account_number = 'Número da conta é obrigatório';
    } else if (!/^[0-9]+$/.test(formData.account_number)) {
      newErrors.account_number = 'Conta deve conter apenas números';
    }
    if (!formData.account_type) {
      newErrors.account_type = 'Tipo de conta é obrigatório';
    }
    // Validar dígitos opcionais
    if (formData.agency_digit && !/^[0-9]{1,2}$/.test(formData.agency_digit)) {
      newErrors.agency_number = 'Dígito da agência inválido (1-2 números)';
    }
    if (formData.account_digit && !/^[0-9]{1,3}$/.test(formData.account_digit)) {
      newErrors.account_number = 'Dígito da conta inválido (1-3 números)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        bank_id: selectedBank!.id,
        branch_id: null,
        wallet_id: null,
        agency_number: formData.agency_number,
        agency_digit: formData.agency_digit || null,
        account_number: formData.account_number,
        account_digit: formData.account_digit || null,
        account_type: formData.account_type,
        nickname: formData.nickname || null,
        holder_name: formData.holder_name || null,
        holder_document: formData.holder_document || null,
        is_active: formData.is_active,
        is_default_receipts: formData.is_default_receipts,
        is_default_payments: formData.is_default_payments,
        cnab_agreement: null,
        cnab_wallet: null,
        cnab_layout: null,
      };

      if (editingItem) {
        await updateAccount.mutateAsync({ id: editingItem.id, ...payload });
        toast({ title: 'Conta atualizada com sucesso!' });
      } else {
        await createAccount.mutateAsync(payload);
        toast({ title: 'Conta criada com sucesso!' });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleRequestBank = async () => {
    if (!requestName.trim()) {
      toast({ title: 'Erro', description: 'Digite o nome do banco', variant: 'destructive' });
      return;
    }
    try {
      await bankRequestMutation.mutateAsync({ requested_name: requestName });
      toast({ title: 'Solicitação enviada!', description: 'Aguarde a análise do administrador.' });
      setRequestDialogOpen(false);
      setRequestName('');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  // Formatação de agência e conta para exibição
  const formatAgency = (item: any) => {
    if (!item.agency_number) return '-';
    return `${item.agency_number}${item.agency_digit ? `-${item.agency_digit}` : ''}`;
  };

  const formatAccount = (item: any) => {
    return `${item.account_number}${item.account_digit ? `-${item.account_digit}` : ''}`;
  };

  const columns = [
    {
      key: 'bank',
      header: 'Banco',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <span className="font-mono font-medium">{item.bank?.compe_code}</span>
            <span className="text-muted-foreground ml-2 text-sm">
              {item.bank?.display_name?.split(' - ')[1] || item.bank?.name}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'agency',
      header: 'Agência',
      render: (item: any) => (
        <span className="font-mono">{formatAgency(item)}</span>
      ),
      className: 'w-28',
    },
    {
      key: 'account',
      header: 'Conta',
      render: (item: any) => (
        <span className="font-mono">{formatAccount(item)}</span>
      ),
      className: 'w-36',
    },
    {
      key: 'account_type',
      header: 'Tipo',
      render: (item: any) => accountTypeLabels[item.account_type] || item.account_type,
      className: 'w-36',
    },
    {
      key: 'nickname',
      header: 'Apelido',
      render: (item: any) => item.nickname || '-',
    },
    {
      key: 'defaults',
      header: 'Padrão',
      render: (item: any) => (
        <div className="flex gap-1">
          {item.is_default_receipts && (
            <Badge variant="outline" className="text-xs">
              <Star className="h-3 w-3 mr-1 text-success" />
              Receb.
            </Badge>
          )}
          {item.is_default_payments && (
            <Badge variant="outline" className="text-xs">
              <Star className="h-3 w-3 mr-1 text-warning" />
              Pagam.
            </Badge>
          )}
        </div>
      ),
      className: 'w-36',
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (item: any) => (
        <Badge variant={item.is_active ? 'default' : 'secondary'}>
          {item.is_active ? 'Ativa' : 'Inativa'}
        </Badge>
      ),
      className: 'w-24',
    },
    {
      key: 'actions',
      header: '',
      render: (item: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
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
          title="Contas Bancárias"
          description="Cadastre as contas bancárias da empresa vinculadas aos bancos oficiais"
          action={{ label: 'Nova Conta', onClick: handleNew, icon: <Plus className="h-4 w-4" /> }}
        />

        <DataTable
          columns={columns}
          data={accounts}
          loading={isLoading}
          emptyMessage="Nenhuma conta bancária cadastrada."
        />

        {/* Dialog de Conta */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                {editingItem ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da conta bancária. Campos com * são obrigatórios.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Banco */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Banco <span className="text-destructive">*</span>
                </Label>
                <BankSelect
                  value={selectedBank}
                  onChange={(bank) => {
                    setSelectedBank(bank);
                    if (bank) setErrors((prev) => ({ ...prev, bank: undefined }));
                  }}
                  disabled={!!editingItem}
                  onRequestBank={() => setRequestDialogOpen(true)}
                  error={!!errors.bank}
                />
                {selectedBank && (
                  <p className="text-xs text-muted-foreground">
                    Código COMPE: <span className="font-mono font-semibold">{selectedBank.compe_code}</span> (não editável)
                  </p>
                )}
                {errors.bank && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.bank}
                  </p>
                )}
              </div>

              {/* Agência */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Agência <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={formData.agency_number}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, agency_number: value });
                      if (value.trim()) setErrors((prev) => ({ ...prev, agency_number: undefined }));
                    }}
                    placeholder="0001"
                    maxLength={10}
                    className={errors.agency_number ? 'border-destructive' : ''}
                  />
                  {errors.agency_number && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.agency_number}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Dígito da Agência</Label>
                  <Input
                    value={formData.agency_digit}
                    onChange={(e) => setFormData({ ...formData, agency_digit: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    placeholder="0"
                    maxLength={2}
                    className="w-24"
                  />
                  <p className="text-xs text-muted-foreground">Opcional (1-2 números)</p>
                </div>
              </div>

              {/* Tipo de Conta */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Tipo de Conta <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) => {
                    setFormData({ ...formData, account_type: value });
                    setErrors((prev) => ({ ...prev, account_type: undefined }));
                  }}
                >
                  <SelectTrigger className={errors.account_type ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione o tipo de conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.account_type && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.account_type}
                  </p>
                )}
              </div>

              {/* Número da Conta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Número da Conta <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={formData.account_number}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, account_number: value });
                      if (value.trim()) setErrors((prev) => ({ ...prev, account_number: undefined }));
                    }}
                    placeholder="12345678"
                    maxLength={20}
                    className={errors.account_number ? 'border-destructive' : ''}
                  />
                  {errors.account_number && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.account_number}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Dígito da Conta</Label>
                  <Input
                    value={formData.account_digit}
                    onChange={(e) => setFormData({ ...formData, account_digit: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                    placeholder="0"
                    maxLength={3}
                    className="w-24"
                  />
                  <p className="text-xs text-muted-foreground">Opcional (1-3 números)</p>
                </div>
              </div>

              {/* Apelido */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Apelido</Label>
                <Input
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  placeholder="Ex: Conta Principal, Folha de Pagamento"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">Nome interno para identificação rápida</p>
              </div>

              {/* Titular */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nome do Titular</Label>
                  <Input
                    value={formData.holder_name}
                    onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                    placeholder="Razão social ou nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">CPF/CNPJ do Titular</Label>
                  <Input
                    value={formData.holder_document}
                    onChange={(e) => setFormData({ ...formData, holder_document: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              {/* Switches */}
              <div className="space-y-4 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Conta Ativa</Label>
                    <p className="text-xs text-muted-foreground">Conta disponível para uso no sistema</p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Padrão para Recebimentos</Label>
                    <p className="text-xs text-muted-foreground">Usar como conta principal para receber</p>
                  </div>
                  <Switch
                    checked={formData.is_default_receipts}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_default_receipts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Padrão para Pagamentos</Label>
                    <p className="text-xs text-muted-foreground">Usar como conta principal para pagar</p>
                  </div>
                  <Switch
                    checked={formData.is_default_payments}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_default_payments: checked })}
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createAccount.isPending || updateAccount.isPending}>
                  {createAccount.isPending || updateAccount.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Solicitar Banco */}
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Solicitar Inclusão de Banco</DialogTitle>
              <DialogDescription>
                Se o banco não está na lista oficial, envie uma solicitação para análise do administrador.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Banco *</Label>
                <Input
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  placeholder="Nome completo do banco"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleRequestBank} disabled={bankRequestMutation.isPending}>
                  {bankRequestMutation.isPending ? 'Enviando...' : 'Enviar Solicitação'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
