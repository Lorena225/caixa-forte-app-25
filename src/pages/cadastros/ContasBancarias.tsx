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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import {
  useBanksReference,
  useCompanyBankBranches,
  useCompanyBankAccounts,
  useBankAccountMutations,
  useBankRequestMutation,
  type BankReference,
  type BankBranch,
} from '@/hooks/useBanksReference';
import {
  Pencil,
  Trash2,
  Building2,
  ChevronsUpDown,
  Check,
  Plus,
  AlertCircle,
  Star,
  Landmark,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const accountTypes: Record<string, string> = {
  corrente: 'Conta Corrente',
  poupanca: 'Poupança',
  pagamentos: 'Conta de Pagamentos',
  caixa: 'Caixa',
};

export default function ContasBancarias() {
  const { toast } = useToast();
  const { data: banks = [] } = useBanksReference();
  const { data: branches = [] } = useCompanyBankBranches();
  const { data: accounts = [], isLoading } = useCompanyBankAccounts();
  const { createAccount, updateAccount, deleteAccount } = useBankAccountMutations();
  const bankRequestMutation = useBankRequestMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedBank, setSelectedBank] = useState<BankReference | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BankBranch | null>(null);
  const [requestName, setRequestName] = useState('');
  const [formData, setFormData] = useState({
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

  // Filtrar agências pelo banco selecionado
  const filteredBranches = useMemo(() => {
    if (!selectedBank) return [];
    return branches.filter((b) => b.bank_id === selectedBank.id);
  }, [selectedBank, branches]);

  const resetForm = () => {
    setFormData({
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
    setSelectedBranch(null);
    setEditingItem(null);
  };

  const handleNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setSelectedBank(item.bank);
    setSelectedBranch(item.branch || null);
    setFormData({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) {
      toast({ title: 'Erro', description: 'Selecione um banco', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        bank_id: selectedBank.id,
        branch_id: selectedBranch?.id || null,
        account_number: formData.account_number,
        account_digit: formData.account_digit || null,
        account_type: formData.account_type,
        nickname: formData.nickname || null,
        holder_name: formData.holder_name || null,
        holder_document: formData.holder_document || null,
        is_active: formData.is_active,
        is_default_receipts: formData.is_default_receipts,
        is_default_payments: formData.is_default_payments,
        wallet_id: null,
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
      key: 'branch',
      header: 'Agência',
      render: (item: any) =>
        item.branch ? (
          <span className="font-mono">
            {item.branch.agency_number}
            {item.branch.agency_digit && `-${item.branch.agency_digit}`}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      className: 'w-28',
    },
    {
      key: 'account',
      header: 'Conta',
      render: (item: any) => (
        <span className="font-mono">
          {item.account_number}
          {item.account_digit && <span className="text-muted-foreground">-{item.account_digit}</span>}
        </span>
      ),
      className: 'w-36',
    },
    {
      key: 'account_type',
      header: 'Tipo',
      render: (item: any) => accountTypes[item.account_type] || item.account_type,
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
      <div className="space-y-6 animate-fade-in">
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                {editingItem ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Banco */}
              <div className="space-y-2">
                <Label>Banco *</Label>
                <Popover open={bankOpen} onOpenChange={setBankOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={bankOpen}
                      className="w-full justify-between"
                      disabled={!!editingItem}
                    >
                      {selectedBank ? selectedBank.display_name : 'Selecione um banco...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar banco por código ou nome..." />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-4 text-center space-y-2">
                            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Banco não encontrado na lista oficial.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setBankOpen(false);
                                setRequestDialogOpen(true);
                              }}
                            >
                              Solicitar inclusão de banco
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {banks.map((bank) => (
                            <CommandItem
                              key={bank.id}
                              value={`${bank.compe_code} ${bank.name} ${bank.display_name}`}
                              onSelect={() => {
                                setSelectedBank(bank);
                                setSelectedBranch(null);
                                setBankOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedBank?.id === bank.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <span className="font-mono mr-2">{bank.compe_code}</span>
                              <span>{bank.display_name.split(' - ')[1] || bank.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedBank && (
                  <div className="text-xs text-muted-foreground">
                    Código COMPE: <span className="font-mono font-medium">{selectedBank.compe_code}</span> (não editável)
                  </div>
                )}
              </div>

              {/* Agência */}
              <div className="space-y-2">
                <Label>Agência (opcional)</Label>
                <Popover open={branchOpen} onOpenChange={setBranchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      disabled={!selectedBank}
                    >
                      {selectedBranch
                        ? `${selectedBranch.agency_number}${selectedBranch.agency_digit ? '-' + selectedBranch.agency_digit : ''} ${selectedBranch.agency_name || ''}`
                        : 'Selecione uma agência...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar agência..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma agência cadastrada para este banco.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setSelectedBranch(null);
                              setBranchOpen(false);
                            }}
                          >
                            <Check
                              className={cn('mr-2 h-4 w-4', !selectedBranch ? 'opacity-100' : 'opacity-0')}
                            />
                            <span className="text-muted-foreground">Sem agência</span>
                          </CommandItem>
                          {filteredBranches.map((branch) => (
                            <CommandItem
                              key={branch.id}
                              value={`${branch.agency_number} ${branch.agency_name || ''}`}
                              onSelect={() => {
                                setSelectedBranch(branch);
                                setBranchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedBranch?.id === branch.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <span className="font-mono">
                                {branch.agency_number}
                                {branch.agency_digit && `-${branch.agency_digit}`}
                              </span>
                              {branch.agency_name && (
                                <span className="ml-2 text-muted-foreground">{branch.agency_name}</span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Número da Conta */}
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Número da Conta *</Label>
                  <Input
                    value={formData.account_number}
                    onChange={(e) =>
                      setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="12345678"
                    required
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dígito</Label>
                  <Input
                    value={formData.account_digit}
                    onChange={(e) =>
                      setFormData({ ...formData, account_digit: e.target.value.replace(/\D/g, '').slice(0, 3) })
                    }
                    placeholder="0"
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={formData.account_type}
                    onValueChange={(v) => setFormData({ ...formData, account_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(accountTypes).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Apelido */}
              <div className="space-y-2">
                <Label>Apelido (opcional)</Label>
                <Input
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  placeholder="Ex: Conta Principal, Itaú Matriz"
                />
              </div>

              {/* Titular */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Titular</Label>
                  <Input
                    value={formData.holder_name}
                    onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                    placeholder="Razão social ou nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ do Titular</Label>
                  <Input
                    value={formData.holder_document}
                    onChange={(e) => setFormData({ ...formData, holder_document: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                  />
                  <Label>Ativa</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_default_receipts}
                    onCheckedChange={(v) => setFormData({ ...formData, is_default_receipts: v })}
                  />
                  <Label>Padrão Recebimentos</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_default_payments}
                    onCheckedChange={(v) => setFormData({ ...formData, is_default_payments: v })}
                  />
                  <Label>Padrão Pagamentos</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
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

        {/* Dialog de Solicitação de Banco */}
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Solicitar Inclusão de Banco
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                O banco que você procura não está na lista oficial. Preencha os dados abaixo para solicitar a inclusão.
                Um administrador irá analisar sua solicitação.
              </p>
              <div className="space-y-2">
                <Label>Nome do Banco *</Label>
                <Input
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  placeholder="Ex: Banco XYZ S.A."
                />
              </div>
              <div className="flex justify-end gap-2">
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
