import { useState } from 'react';
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
  useBankBranchMutations,
  type BankReference,
} from '@/hooks/useBanksReference';
import { Pencil, Trash2, Building2, ChevronsUpDown, Check, Plus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Agencias() {
  const { toast } = useToast();
  const { data: banks = [] } = useBanksReference();
  const { data: branches = [], isLoading } = useCompanyBankBranches();
  const { createBranch, updateBranch, deleteBranch } = useBankBranchMutations();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedBank, setSelectedBank] = useState<BankReference | null>(null);
  const [formData, setFormData] = useState({
    agency_number: '',
    agency_digit: '',
    agency_name: '',
    is_active: true,
  });

  const resetForm = () => {
    setFormData({ agency_number: '', agency_digit: '', agency_name: '', is_active: true });
    setSelectedBank(null);
    setEditingItem(null);
  };

  const handleNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setSelectedBank(item.bank);
    setFormData({
      agency_number: item.agency_number,
      agency_digit: item.agency_digit || '',
      agency_name: item.agency_name || '',
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta agência?')) return;
    try {
      await deleteBranch.mutateAsync(id);
      toast({ title: 'Agência excluída com sucesso!' });
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
        agency_number: formData.agency_number,
        agency_digit: formData.agency_digit || null,
        agency_name: formData.agency_name || null,
        is_active: formData.is_active,
      };

      if (editingItem) {
        await updateBranch.mutateAsync({ id: editingItem.id, ...payload });
        toast({ title: 'Agência atualizada com sucesso!' });
      } else {
        await createBranch.mutateAsync(payload);
        toast({ title: 'Agência criada com sucesso!' });
      }
      setDialogOpen(false);
      resetForm();
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
            <span className="text-muted-foreground ml-2">{item.bank?.display_name?.split(' - ')[1] || item.bank?.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'agency_number',
      header: 'Agência',
      render: (item: any) => (
        <span className="font-mono">
          {item.agency_number}
          {item.agency_digit && <span className="text-muted-foreground">-{item.agency_digit}</span>}
        </span>
      ),
      className: 'w-32',
    },
    {
      key: 'agency_name',
      header: 'Nome da Agência',
      render: (item: any) => item.agency_name || '-',
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
          title="Agências Bancárias"
          description="Cadastre as agências dos bancos utilizados pela empresa"
          action={{ label: 'Nova Agência', onClick: handleNew, icon: <Plus className="h-4 w-4" /> }}
        />

        <DataTable
          columns={columns}
          data={branches}
          loading={isLoading}
          emptyMessage="Nenhuma agência cadastrada."
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Agência' : 'Nova Agência'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar banco por código ou nome..." />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-4 text-center space-y-2">
                            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Banco não encontrado na lista oficial.
                            </p>
                            <Button variant="outline" size="sm">
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
                  <div className="text-xs text-muted-foreground mt-1">
                    Código COMPE: <span className="font-mono font-medium">{selectedBank.compe_code}</span> (não editável)
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Número da Agência *</Label>
                  <Input
                    value={formData.agency_number}
                    onChange={(e) => setFormData({ ...formData, agency_number: e.target.value.replace(/\D/g, '') })}
                    placeholder="0001"
                    required
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dígito</Label>
                  <Input
                    value={formData.agency_digit}
                    onChange={(e) => setFormData({ ...formData, agency_digit: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    placeholder="0"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome da Agência (opcional)</Label>
                <Input
                  value={formData.agency_name}
                  onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                  placeholder="Ex: Agência Centro"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Ativa</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createBranch.isPending || updateBranch.isPending}>
                  {(createBranch.isPending || updateBranch.isPending) ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
