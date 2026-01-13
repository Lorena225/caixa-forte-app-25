import { useState, useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCounterpartiesAll, Counterparty } from '@/hooks/useCounterpartiesFiltered';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, CheckCircle2, AlertTriangle, Search, Filter, Check, X, Download, UserCheck, Building } from 'lucide-react';
import { CounterpartyForm, CounterpartyFormData, emptyFormData } from '@/components/cadastros/CounterpartyForm';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useBulkActions } from '@/hooks/useBulkActions';
import { BulkActionsBar, BulkEditModal, BulkSelectionCheckbox, type BulkAction } from '@/components/bulk';
import type { BulkEditInputType } from '@/components/bulk/BulkEditModal';

type FilterType = 'all' | 'clients' | 'suppliers';

export default function ClientesFornecedores() {
  const { currentCompany } = useAuth();
  const { data: counterparties = [], isLoading } = useCounterpartiesAll();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Counterparty | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Filtragem
  const filteredData = counterparties.filter((item) => {
    if (filterType === 'clients' && !item.is_client) return false;
    if (filterType === 'suppliers' && !item.is_supplier) return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(search) ||
        (item.document && item.document.includes(search)) ||
        (item.email && item.email.toLowerCase().includes(search))
      );
    }

    return true;
  });

  // Bulk selection
  const {
    selectedIds,
    isAllSelected,
    isPartialSelected,
    selectAll,
    deselectAll,
    toggleItem,
    isSelected,
    count: selectedCount,
  } = useBulkSelection({
    data: filteredData,
  });

  // Bulk actions
  const { bulkUpdate, bulkDelete, bulkExport, isProcessing, progress } = useBulkActions({
    tableName: 'counterparties',
    queryKey: ['counterparties-all'],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties-all'] });
      queryClient.invalidateQueries({ queryKey: ['counterparties-clients'] });
      queryClient.invalidateQueries({ queryKey: ['counterparties-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      deselectAll();
    },
  });

  // Bulk edit modal state
  const [bulkEditModal, setBulkEditModal] = useState<{
    open: boolean;
    title: string;
    field: string;
    inputType: BulkEditInputType;
    isDestructive?: boolean;
    confirmMessage?: string;
  }>({
    open: false,
    title: '',
    field: '',
    inputType: 'text',
  });

  const saveMutation = useMutation({
    mutationFn: async (data: CounterpartyFormData) => {
      const payload = {
        company_id: currentCompany?.id,
        name: data.name,
        is_client: data.is_client,
        is_supplier: data.is_supplier,
        person_type: data.person_type,
        document: data.document || null,
        legal_name: data.legal_name || null,
        trade_name: data.trade_name || null,
        phone: data.phone || null,
        email: data.email || null,
        is_active: data.is_active,
        ie: data.ie || null,
        ie_is_exempt: data.ie_is_exempt,
        im: data.im || null,
        address_street: data.address_street || null,
        address_number: data.address_number || null,
        address_complement: data.address_complement || null,
        address_neighborhood: data.address_neighborhood || null,
        address_city: data.address_city || null,
        address_state: data.address_state || null,
        address_zip: data.address_zip || null,
        delivery_same_as_billing: data.delivery_same_as_billing,
        delivery_address_street: data.delivery_address_street || null,
        delivery_address_number: data.delivery_address_number || null,
        delivery_address_complement: data.delivery_address_complement || null,
        delivery_address_neighborhood: data.delivery_address_neighborhood || null,
        delivery_address_city: data.delivery_address_city || null,
        delivery_address_state: data.delivery_address_state || null,
        delivery_address_zip: data.delivery_address_zip || null,
        contact_name: data.contact_name || null,
        contact_phone: data.contact_phone || null,
        contact_email: data.contact_email || null,
        finance_contact_name: data.finance_contact_name || null,
        finance_contact_phone: data.finance_contact_phone || null,
        finance_contact_email: data.finance_contact_email || null,
        nf_email: data.nf_email || null,
        bank_code: data.bank_code || null,
        bank_name: data.bank_name || null,
        bank_agency: data.bank_agency || null,
        bank_agency_digit: data.bank_agency_digit || null,
        bank_account: data.bank_account || null,
        bank_account_digit: data.bank_account_digit || null,
        bank_account_type: data.bank_account_type || null,
        pix_key: data.pix_key || null,
        pix_key_type: data.pix_key_type || null,
        payment_terms_payable: data.payment_terms_payable,
        payment_terms_receivable: data.payment_terms_receivable,
        credit_limit: data.credit_limit,
        supplier_notes: data.supplier_notes || null,
        client_notes: data.client_notes || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('counterparties')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('counterparties')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties-all'] });
      queryClient.invalidateQueries({ queryKey: ['counterparties-clients'] });
      queryClient.invalidateQueries({ queryKey: ['counterparties-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      setDialogOpen(false);
      setEditingItem(null);
      toast({ title: editingItem ? 'Cadastro atualizado!' : 'Cadastro criado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('counterparties').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties-all'] });
      queryClient.invalidateQueries({ queryKey: ['counterparties-clients'] });
      queryClient.invalidateQueries({ queryKey: ['counterparties-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      toast({ title: 'Cadastro excluído!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (item: Counterparty) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const mapToFormData = (item: Counterparty): Partial<CounterpartyFormData> => ({
    name: item.name,
    is_client: item.is_client,
    is_supplier: item.is_supplier,
    person_type: item.person_type || 'pj',
    document: item.document || '',
    legal_name: item.legal_name || '',
    trade_name: item.trade_name || '',
    phone: item.phone || '',
    email: item.email || '',
    is_active: item.is_active,
    ie: item.ie || '',
    ie_is_exempt: item.ie_is_exempt || false,
    im: item.im || '',
    address_street: item.address_street || '',
    address_number: item.address_number || '',
    address_complement: item.address_complement || '',
    address_neighborhood: item.address_neighborhood || '',
    address_city: item.address_city || '',
    address_state: item.address_state || '',
    address_zip: item.address_zip || '',
    delivery_same_as_billing: item.delivery_same_as_billing ?? true,
    delivery_address_street: item.delivery_address_street || '',
    delivery_address_number: item.delivery_address_number || '',
    delivery_address_complement: item.delivery_address_complement || '',
    delivery_address_neighborhood: item.delivery_address_neighborhood || '',
    delivery_address_city: item.delivery_address_city || '',
    delivery_address_state: item.delivery_address_state || '',
    delivery_address_zip: item.delivery_address_zip || '',
    contact_name: item.contact_name || '',
    contact_phone: item.contact_phone || '',
    contact_email: item.contact_email || '',
    finance_contact_name: item.finance_contact_name || '',
    finance_contact_phone: item.finance_contact_phone || '',
    finance_contact_email: item.finance_contact_email || '',
    nf_email: item.nf_email || '',
    bank_code: item.bank_code || '',
    bank_name: item.bank_name || '',
    bank_agency: item.bank_agency || '',
    bank_agency_digit: item.bank_agency_digit || '',
    bank_account: item.bank_account || '',
    bank_account_digit: item.bank_account_digit || '',
    bank_account_type: item.bank_account_type || '',
    pix_key: item.pix_key || '',
    pix_key_type: item.pix_key_type || '',
    payment_terms_payable: item.payment_terms_payable,
    payment_terms_receivable: item.payment_terms_receivable,
    credit_limit: item.credit_limit,
    supplier_notes: item.supplier_notes || '',
    client_notes: item.client_notes || '',
    fiscal_ready: item.fiscal_ready,
    payment_ready: item.payment_ready,
    collection_ready: item.collection_ready,
  });

  const getRoleLabel = (item: Counterparty) => {
    if (item.is_client && item.is_supplier) return 'Ambos';
    if (item.is_client) return 'Cliente';
    if (item.is_supplier) return 'Fornecedor';
    return '-';
  };

  const getRoleColor = (item: Counterparty) => {
    if (item.is_client && item.is_supplier) return 'bg-primary/10 text-primary';
    if (item.is_client) return 'bg-success/10 text-success';
    if (item.is_supplier) return 'bg-warning/10 text-warning';
    return '';
  };

  // Bulk actions definitions
  const bulkActions: BulkAction[] = [
    {
      id: 'activate',
      label: 'Ativar',
      icon: <Check className="h-4 w-4" />,
      onClick: () => {
        const ids = Array.from(selectedIds);
        bulkUpdate(ids, { is_active: true });
      },
    },
    {
      id: 'deactivate',
      label: 'Inativar',
      icon: <X className="h-4 w-4" />,
      onClick: () => {
        const ids = Array.from(selectedIds);
        bulkUpdate(ids, { is_active: false });
      },
    },
    {
      id: 'set_as_client',
      label: 'Marcar como Cliente',
      icon: <UserCheck className="h-4 w-4" />,
      onClick: () => {
        const ids = Array.from(selectedIds);
        bulkUpdate(ids, { is_client: true });
      },
    },
    {
      id: 'set_as_supplier',
      label: 'Marcar como Fornecedor',
      icon: <Building className="h-4 w-4" />,
      onClick: () => {
        const ids = Array.from(selectedIds);
        bulkUpdate(ids, { is_supplier: true });
      },
    },
    {
      id: 'export',
      label: 'Exportar',
      icon: <Download className="h-4 w-4" />,
      onClick: () => {
        const selectedItems = filteredData.filter(item => selectedIds.has(item.id));
        bulkExport(selectedItems, [
          { key: 'name', header: 'Nome' },
          { key: 'document', header: 'CPF/CNPJ' },
          { key: 'email', header: 'E-mail' },
          { key: 'phone', header: 'Telefone' },
          { key: 'is_client', header: 'Cliente', formatter: (v: boolean) => v ? 'Sim' : 'Não' },
          { key: 'is_supplier', header: 'Fornecedor', formatter: (v: boolean) => v ? 'Sim' : 'Não' },
          { key: 'is_active', header: 'Ativo', formatter: (v: boolean) => v ? 'Sim' : 'Não' },
        ], 'Parceiros_Selecionados');
      },
    },
    {
      id: 'delete',
      label: 'Excluir',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      onClick: () => {
        setBulkEditModal({
          open: true,
          title: `Excluir ${selectedCount} parceiro(s)`,
          field: '',
          inputType: 'confirm',
          isDestructive: true,
          confirmMessage: `Tem certeza que deseja excluir ${selectedCount} parceiro(s)? Esta ação não pode ser desfeita.`,
        });
      },
    },
  ];

  const handleBulkEditConfirm = useCallback(async () => {
    if (bulkEditModal.isDestructive) {
      const ids = Array.from(selectedIds);
      await bulkDelete(ids);
    }
    setBulkEditModal(prev => ({ ...prev, open: false }));
  }, [bulkEditModal.isDestructive, selectedIds, bulkDelete]);

  const getSelectedItemsSummary = useCallback(() => {
    return filteredData
      .filter(item => selectedIds.has(item.id))
      .map(item => ({
        id: item.id,
        label: item.name,
        sublabel: item.document || item.email || '-',
      }));
  }, [filteredData, selectedIds]);

  const columns = [
    {
      key: 'select',
      header: '',
      render: (item: Counterparty, index: number, allData: Counterparty[]) => {
        // Render header checkbox for first item in a special way
        return (
          <BulkSelectionCheckbox
            checked={isSelected(item.id)}
            onChange={() => toggleItem(item.id)}
            aria-label={`Selecionar ${item.name}`}
          />
        );
      },
      className: 'w-10',
    },
    { key: 'name', header: 'Nome' },
    {
      key: 'role',
      header: 'Tipo',
      render: (item: Counterparty) => (
        <Badge variant="outline" className={getRoleColor(item)}>
          {getRoleLabel(item)}
        </Badge>
      ),
      className: 'w-28',
    },
    {
      key: 'person_type',
      header: 'Pessoa',
      render: (item: Counterparty) => (
        <span className="text-muted-foreground text-sm">
          {item.person_type === 'pf' ? 'PF' : 'PJ'}
        </span>
      ),
      className: 'w-16',
    },
    {
      key: 'document',
      header: 'CPF/CNPJ',
      render: (item: Counterparty) => item.document || '-',
    },
    {
      key: 'phone',
      header: 'Telefone',
      render: (item: Counterparty) => item.phone || '-',
      className: 'w-32',
    },
    {
      key: 'readiness',
      header: 'Prontidão',
      render: (item: Counterparty) => (
        <div className="flex gap-1">
          <Badge
            variant={item.fiscal_ready ? 'default' : 'secondary'}
            className="text-xs px-1.5 py-0"
          >
            {item.fiscal_ready ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          </Badge>
          {item.is_supplier && (
            <Badge
              variant={item.payment_ready ? 'default' : 'secondary'}
              className="text-xs px-1.5 py-0"
            >
              {item.payment_ready ? '💰' : '⚠️'}
            </Badge>
          )}
          {item.is_client && (
            <Badge
              variant={item.collection_ready ? 'default' : 'secondary'}
              className="text-xs px-1.5 py-0"
            >
              {item.collection_ready ? '📩' : '⚠️'}
            </Badge>
          )}
        </div>
      ),
      className: 'w-24',
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (item: Counterparty) => (
        <Badge variant={item.is_active ? 'default' : 'secondary'}>
          {item.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
      className: 'w-20',
    },
    {
      key: 'actions',
      header: '',
      render: (item: Counterparty) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(item);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              deleteMutation.mutate(item.id);
            }}
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
          title="Clientes e Fornecedores"
          description="Cadastro unificado de parceiros com validações contextuais"
          action={{ label: 'Novo Cadastro', onClick: handleNew }}
        />

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedCount}
          onClearSelection={deselectAll}
          actions={bulkActions}
          isProcessing={isProcessing}
          progress={progress}
        />

        {/* Filtros */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <BulkSelectionCheckbox
              checked={isAllSelected}
              indeterminate={isPartialSelected}
              onChange={isAllSelected ? deselectAll : selectAll}
              isHeader
              aria-label="Selecionar todos"
            />
            <span className="text-sm text-muted-foreground">Selecionar todos</span>
          </div>
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, documento ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="clients">Clientes</SelectItem>
              <SelectItem value="suppliers">Fornecedores</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={filteredData}
          loading={isLoading}
          emptyMessage="Nenhum cliente ou fornecedor cadastrado."
          onRowClick={handleEdit}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Cadastro' : 'Novo Cadastro'}
              </DialogTitle>
            </DialogHeader>
            <CounterpartyForm
              initialData={editingItem ? mapToFormData(editingItem) : undefined}
              onSubmit={(data) => saveMutation.mutate(data)}
              onCancel={() => setDialogOpen(false)}
              isLoading={saveMutation.isPending}
              isEditing={!!editingItem}
            />
          </DialogContent>
        </Dialog>

        {/* Bulk Edit Modal */}
        <BulkEditModal
          open={bulkEditModal.open}
          onOpenChange={(open) => setBulkEditModal(prev => ({ ...prev, open }))}
          title={bulkEditModal.title}
          items={getSelectedItemsSummary()}
          inputType={bulkEditModal.inputType}
          onConfirm={handleBulkEditConfirm}
          isLoading={isProcessing}
          isDestructive={bulkEditModal.isDestructive}
          confirmMessage={bulkEditModal.confirmMessage}
        />
      </div>
    </MainLayout>
  );
}
