import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { BackButton } from "@/components/common/BackButton";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Pencil, Trash2, Eye, AlertTriangle, Bell } from "lucide-react";
import { useContracts, useCreateContract, useUpdateContract, useDeleteContract, type Contract } from "@/hooks/useContracts";
import { useClients, useSuppliers } from "@/hooks/useCounterpartiesFiltered";
import { ContractDetailsDialog } from "@/components/contratos/ContractDetailsDialog";
import { format, differenceInDays, parseISO } from "date-fns";

const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  encerrado: 'Encerrado',
  cancelado: 'Cancelado',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  rascunho: 'secondary',
  ativo: 'default',
  suspenso: 'outline',
  encerrado: 'secondary',
  cancelado: 'destructive',
};

export default function ContratosLista() {
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  
  const [formData, setFormData] = useState({
    tipo: 'cliente' as 'cliente' | 'fornecedor',
    counterparty_id: '',
    data_inicio: format(new Date(), 'yyyy-MM-dd'),
    data_fim: '',
    renovacao_automatica: false,
    alertar_antes_dias: 30,
    valor_total: 0,
    observacoes: '',
    status: 'rascunho' as const,
  });

  const { data: contracts, isLoading } = useContracts({ 
    tipo: tipoFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
  });
  const { data: clients } = useClients();
  const { data: suppliers } = useSuppliers();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();

  const counterparties = formData.tipo === 'cliente' ? clients : suppliers;

  // Contratos vencendo em até 30 dias
  const expiringContracts = useMemo(() => {
    return (contracts || []).filter(c => {
      if (!c.data_fim || c.status === 'encerrado' || c.status === 'cancelado') return false;
      const days = differenceInDays(parseISO(c.data_fim), new Date());
      return days >= 0 && days <= (c.alertar_antes_dias || 30);
    });
  }, [contracts]);

  const handleNew = () => {
    setEditingId(null);
    setFormData({
      tipo: 'cliente',
      counterparty_id: '',
      data_inicio: format(new Date(), 'yyyy-MM-dd'),
      data_fim: '',
      renovacao_automatica: false,
      alertar_antes_dias: 30,
      valor_total: 0,
      observacoes: '',
      status: 'rascunho',
    });
    setDialogOpen(true);
  };

  const handleEdit = (contract: typeof contracts extends (infer T)[] ? T : never) => {
    setEditingId(contract.id);
    setFormData({
      tipo: contract.tipo,
      counterparty_id: contract.counterparty_id,
      data_inicio: contract.data_inicio,
      data_fim: contract.data_fim || '',
      renovacao_automatica: contract.renovacao_automatica,
      alertar_antes_dias: contract.alertar_antes_dias,
      valor_total: Number(contract.valor_total) || 0,
      observacoes: contract.observacoes || '',
      status: 'rascunho' as const,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingId) {
      await updateContract.mutateAsync({ id: editingId, ...formData });
    } else {
      await createContract.mutateAsync({
        ...formData,
        condicoes_comerciais_json: {},
      });
    }
    setDialogOpen(false);
  };

  const columns = [
    { 
      key: 'contract_number', 
      header: 'Número',
      render: (contract: typeof contracts extends (infer T)[] ? T : never) => (
        <span className="font-mono text-sm">{contract.contract_number}</span>
      )
    },
    { 
      key: 'tipo', 
      header: 'Tipo',
      render: (contract: typeof contracts extends (infer T)[] ? T : never) => (
        <Badge variant={contract.tipo === 'cliente' ? 'default' : 'secondary'}>
          {contract.tipo === 'cliente' ? 'Cliente' : 'Fornecedor'}
        </Badge>
      )
    },
    { 
      key: 'counterparty', 
      header: 'Parte',
      render: (contract: typeof contracts extends (infer T)[] ? T : never) => (
        contract.counterparty?.name || '-'
      )
    },
    { 
      key: 'data_inicio', 
      header: 'Início',
      render: (contract: typeof contracts extends (infer T)[] ? T : never) => (
        format(new Date(contract.data_inicio), 'dd/MM/yyyy')
      )
    },
    { 
      key: 'data_fim', 
      header: 'Fim',
      render: (contract: typeof contracts extends (infer T)[] ? T : never) => (
        contract.data_fim ? format(new Date(contract.data_fim), 'dd/MM/yyyy') : 'Indeterminado'
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (contract: typeof contracts extends (infer T)[] ? T : never) => (
        <Badge variant={STATUS_VARIANTS[contract.status]}>
          {STATUS_LABELS[contract.status]}
        </Badge>
      )
    },
    { 
      key: 'valor_total', 
      header: 'Valor',
      render: (contract: typeof contracts extends (infer T)[] ? T : never) => (
        (Number(contract.valor_total) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      )
    },
    {
      key: 'vencimento',
      header: 'Vencimento',
      render: (contract: typeof contracts extends (infer T)[] ? T : never) => {
        if (!contract.data_fim) return <span className="text-xs text-muted-foreground">Indeterminado</span>;
        const days = differenceInDays(parseISO(contract.data_fim), new Date());
        if (days < 0) return <Badge variant="destructive" className="text-xs">Vencido</Badge>;
        if (days <= (contract.alertar_antes_dias || 30)) {
          return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs gap-1">
            <AlertTriangle className="h-3 w-3" /> {days}d
          </Badge>;
        }
        return <span className="text-xs">{format(parseISO(contract.data_fim), 'dd/MM/yyyy')}</span>;
      }
    },
    {
      key: 'actions',
      header: '',
      render: (contract: typeof contracts extends (infer T)[] ? T : never) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setViewingContract(contract as Contract)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleEdit(contract)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteContract.mutate(contract.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton to="/contratos" />
          <PageHeader title="Contratos" description="Lista de contratos" />
        </div>

        {/* Alerta de contratos vencendo */}
        {expiringContracts.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <Bell className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <span className="font-semibold">{expiringContracts.length} contrato(s)</span> vencendo em breve:{' '}
              {expiringContracts.map(c => c.contract_number).join(', ')}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="cliente">Cliente</SelectItem>
              <SelectItem value="fornecedor">Fornecedor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Contrato
          </Button>
        </div>

        <DataTable 
          data={contracts || []} 
          columns={columns} 
          loading={isLoading}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v as 'cliente' | 'fornecedor', counterparty_id: '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="fornecedor">Fornecedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{formData.tipo === 'cliente' ? 'Cliente' : 'Fornecedor'}</Label>
                  <Select 
                    value={formData.counterparty_id} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, counterparty_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {counterparties?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input 
                    type="date" 
                    value={formData.data_inicio} 
                    onChange={(e) => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input 
                    type="date" 
                    value={formData.data_fim} 
                    onChange={(e) => setFormData(prev => ({ ...prev, data_fim: e.target.value }))} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Total</Label>
                  <Input 
                    type="number" 
                    value={formData.valor_total} 
                    onChange={(e) => setFormData(prev => ({ ...prev, valor_total: parseFloat(e.target.value) || 0 }))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alertar (dias antes)</Label>
                  <Input 
                    type="number" 
                    value={formData.alertar_antes_dias} 
                    onChange={(e) => setFormData(prev => ({ ...prev, alertar_antes_dias: parseInt(e.target.value) || 30 }))} 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={formData.renovacao_automatica}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, renovacao_automatica: checked }))}
                />
                <Label>Renovação Automática</Label>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea 
                  value={formData.observacoes} 
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createContract.isPending || updateContract.isPending}>
                {editingId ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: detalhe + assinatura ClickSign */}
        <ContractDetailsDialog
          contract={viewingContract}
          open={!!viewingContract}
          onOpenChange={(open) => { if (!open) setViewingContract(null); }}
        />
      </div>
    </MainLayout>
  );
}
