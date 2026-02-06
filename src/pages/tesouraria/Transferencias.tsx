import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Plus, ArrowRightLeft, CheckCircle, XCircle, Clock, FileText, Zap } from 'lucide-react';
import { useCompanyBankAccounts } from '@/hooks/useBanksReference';
import { useBankTransfers, useCreateBankTransfer, useExecuteBankTransfer, useCancelBankTransfer } from '@/hooks/useBankTransfers';
import { useAtomicTransfer } from '@/hooks/useAtomicTransfer';
import { formatCurrency, formatDate } from '@/lib/formatters';

const statusConfig = {
  rascunho: { label: 'Rascunho', variant: 'secondary' as const, icon: FileText },
  pendente: { label: 'Pendente', variant: 'outline' as const, icon: Clock },
  concluido: { label: 'Concluído', variant: 'default' as const, icon: CheckCircle },
  cancelado: { label: 'Cancelado', variant: 'destructive' as const, icon: XCircle },
};

export default function TransferenciasPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('__all__');
  const [executeImmediate, setExecuteImmediate] = useState(true);
  const [formData, setFormData] = useState({
    origin_bank_account_id: '',
    destination_bank_account_id: '',
    transfer_date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    reference_number: '',
  });

  const { data: bankAccounts = [], isLoading: loadingAccounts } = useCompanyBankAccounts();
  const { data: transfers = [], isLoading: loadingTransfers } = useBankTransfers(
    statusFilter !== '__all__' ? statusFilter : undefined
  );
  const createTransfer = useCreateBankTransfer();
  const atomicTransfer = useAtomicTransfer();
  const executeTransfer = useExecuteBankTransfer();
  const cancelTransfer = useCancelBankTransfer();

  const resetForm = () => {
    setFormData({
      origin_bank_account_id: '',
      destination_bank_account_id: '',
      transfer_date: new Date().toISOString().split('T')[0],
      amount: '',
      description: '',
      reference_number: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.origin_bank_account_id || !formData.destination_bank_account_id || !formData.amount) {
      return;
    }

    if (executeImmediate) {
      // Use atomic transfer for immediate execution (ACID compliant)
      await atomicTransfer.mutateAsync({
        origin_account_id: formData.origin_bank_account_id,
        destination_account_id: formData.destination_bank_account_id,
        transfer_date: formData.transfer_date,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        reference_number: formData.reference_number || undefined,
      });
    } else {
      // Create as draft for later execution
      await createTransfer.mutateAsync({
        origin_bank_account_id: formData.origin_bank_account_id,
        destination_bank_account_id: formData.destination_bank_account_id,
        transfer_date: formData.transfer_date,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        reference_number: formData.reference_number || undefined,
      });
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const formatAccountLabel = (account: typeof bankAccounts[0]) => {
    return `${account.bank?.name || account.bank?.compe_code || ''} - Ag ${account.agency_number || ''} / CC ${account.account_number}`;
  };

  const isLoading = loadingAccounts || loadingTransfers;

  // KPIs
  const totalPendente = transfers.filter(t => t.status === 'pendente').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalConcluido = transfers.filter(t => t.status === 'concluido').reduce((sum, t) => sum + Number(t.amount), 0);
  const countPendente = transfers.filter(t => t.status === 'pendente').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Transferências Bancárias"
          description="Gerencie transferências entre contas bancárias"
        >
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transferência
          </Button>
        </PageHeader>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Transferências Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{countPendente}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(totalPendente)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Concluído (Mês)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalConcluido)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contas Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{bankAccounts.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Histórico de Transferências</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : transfers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma transferência encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => {
                    const status = statusConfig[transfer.status];
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={transfer.id}>
                        <TableCell>{formatDate(transfer.transfer_date)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {transfer.origin_account?.bank_name || transfer.origin_account?.bank_code}
                            </div>
                            <div className="text-muted-foreground">
                              Ag {transfer.origin_account?.agency} / CC {transfer.origin_account?.account_number}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {transfer.destination_account?.bank_name || transfer.destination_account?.bank_code}
                            </div>
                            <div className="text-muted-foreground">
                              Ag {transfer.destination_account?.agency} / CC {transfer.destination_account?.account_number}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(transfer.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {transfer.status === 'rascunho' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => executeTransfer.mutate(transfer.id)}
                              >
                                Executar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelTransfer.mutate(transfer.id)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          )}
                          {transfer.status === 'pendente' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => executeTransfer.mutate(transfer.id)}
                            >
                              Confirmar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Transferência</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Conta Origem *</Label>
                <Select
                  value={formData.origin_bank_account_id}
                  onValueChange={(v) => setFormData({ ...formData, origin_bank_account_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta de origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {formatAccountLabel(account)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Conta Destino *</Label>
                <Select
                  value={formData.destination_bank_account_id}
                  onValueChange={(v) => setFormData({ ...formData, destination_bank_account_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts
                      .filter((a) => a.id !== formData.origin_bank_account_id)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {formatAccountLabel(account)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input
                    type="date"
                    value={formData.transfer_date}
                    onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  placeholder="Descrição da transferência"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Número de Referência</Label>
                <Input
                  placeholder="Ex: DOC, TED, PIX"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                />
              </div>

              {/* Atomic execution toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-warning" />
                  <div>
                    <Label className="cursor-pointer">Executar Imediatamente</Label>
                    <p className="text-xs text-muted-foreground">
                      Atualiza os saldos das contas em tempo real (transação atômica)
                    </p>
                  </div>
                </div>
                <Switch
                  checked={executeImmediate}
                  onCheckedChange={setExecuteImmediate}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={(executeImmediate ? atomicTransfer.isPending : createTransfer.isPending) || !formData.origin_bank_account_id || !formData.destination_bank_account_id || !formData.amount}
              >
                {executeImmediate ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Executar Agora
                  </>
                ) : (
                  'Criar Rascunho'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
