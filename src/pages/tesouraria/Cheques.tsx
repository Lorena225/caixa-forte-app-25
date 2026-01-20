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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, FileCheck, AlertCircle, CheckCircle, XCircle, Clock, MoreHorizontal, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useBanksReference, useCompanyBankAccounts } from '@/hooks/useBanksReference';
import { useCheques, useCreateCheque, useUpdateChequeStatus, ChequeStatus, ChequeType } from '@/hooks/useCheques';
import { formatCurrency, formatDate } from '@/lib/formatters';

const statusConfig: Record<ChequeStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  em_carteira: { label: 'Em Carteira', variant: 'secondary', icon: Clock },
  depositado: { label: 'Depositado', variant: 'outline', icon: FileCheck },
  compensado: { label: 'Compensado', variant: 'default', icon: CheckCircle },
  devolvido: { label: 'Devolvido', variant: 'destructive', icon: XCircle },
  sustado: { label: 'Sustado', variant: 'destructive', icon: AlertCircle },
  cancelado: { label: 'Cancelado', variant: 'outline', icon: XCircle },
};

export default function ChequesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ChequeType>('recebido');
  const [statusFilter, setStatusFilter] = useState<string>('__all__');
  const [formData, setFormData] = useState({
    cheque_number: '',
    bank_code: '',
    agency: '',
    account: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount: '',
    beneficiary_name: '',
    beneficiary_document: '',
    cheque_type: 'recebido' as ChequeType,
    notes: '',
  });

  const { data: banks = [] } = useBanksReference(true);
  const { data: bankAccounts = [] } = useCompanyBankAccounts();
  const { data: cheques = [], isLoading } = useCheques({
    type: activeTab,
    status: statusFilter !== '__all__' ? statusFilter as ChequeStatus : undefined,
  });
  const createCheque = useCreateCheque();
  const updateStatus = useUpdateChequeStatus();

  const resetForm = () => {
    setFormData({
      cheque_number: '',
      bank_code: '',
      agency: '',
      account: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '',
      amount: '',
      beneficiary_name: '',
      beneficiary_document: '',
      cheque_type: activeTab,
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.cheque_number || !formData.bank_code || !formData.amount) return;

    await createCheque.mutateAsync({
      cheque_number: formData.cheque_number,
      bank_code: formData.bank_code,
      agency: formData.agency || undefined,
      account: formData.account || undefined,
      issue_date: formData.issue_date,
      due_date: formData.due_date || undefined,
      amount: parseFloat(formData.amount),
      beneficiary_name: formData.beneficiary_name || undefined,
      beneficiary_document: formData.beneficiary_document || undefined,
      cheque_type: formData.cheque_type,
      notes: formData.notes || undefined,
    });

    resetForm();
    setIsDialogOpen(false);
  };

  const handleStatusChange = (id: string, newStatus: ChequeStatus) => {
    updateStatus.mutate({ id, status: newStatus });
  };

  // KPIs
  const totalEmCarteira = cheques.filter(c => c.status === 'em_carteira').reduce((sum, c) => sum + Number(c.amount), 0);
  const totalCompensado = cheques.filter(c => c.status === 'compensado').reduce((sum, c) => sum + Number(c.amount), 0);
  const totalDevolvido = cheques.filter(c => c.status === 'devolvido').reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Gestão de Cheques"
          description="Controle de cheques emitidos e recebidos"
        >
          <Button onClick={() => { setFormData({ ...formData, cheque_type: activeTab }); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cheque
          </Button>
        </PageHeader>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Em Carteira
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalEmCarteira)}</p>
              <p className="text-sm text-muted-foreground">
                {cheques.filter(c => c.status === 'em_carteira').length} cheques
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Compensados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalCompensado)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Devolvidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalDevolvido)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ChequeType)}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="recebido" className="gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                Recebidos
              </TabsTrigger>
              <TabsTrigger value="emitido" className="gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Emitidos
              </TabsTrigger>
            </TabsList>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="em_carteira">Em Carteira</SelectItem>
                <SelectItem value="depositado">Depositado</SelectItem>
                <SelectItem value="compensado">Compensado</SelectItem>
                <SelectItem value="devolvido">Devolvido</SelectItem>
                <SelectItem value="sustado">Sustado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="recebido" className="mt-4">
            <ChequeTable 
              cheques={cheques} 
              isLoading={isLoading} 
              onStatusChange={handleStatusChange}
              type="recebido"
            />
          </TabsContent>
          <TabsContent value="emitido" className="mt-4">
            <ChequeTable 
              cheques={cheques} 
              isLoading={isLoading} 
              onStatusChange={handleStatusChange}
              type="emitido"
            />
          </TabsContent>
        </Tabs>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Novo Cheque {formData.cheque_type === 'recebido' ? 'Recebido' : 'Emitido'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número do Cheque *</Label>
                  <Input
                    placeholder="000000"
                    value={formData.cheque_number}
                    onChange={(e) => setFormData({ ...formData, cheque_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Banco *</Label>
                  <Select
                    value={formData.bank_code}
                    onValueChange={(v) => setFormData({ ...formData, bank_code: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                    {banks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.compe_code}>
                          {bank.compe_code} - {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Agência</Label>
                  <Input
                    placeholder="0000"
                    value={formData.agency}
                    onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Input
                    placeholder="00000-0"
                    value={formData.account}
                    onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Emissão *</Label>
                  <Input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bom Para</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{formData.cheque_type === 'recebido' ? 'Emitente' : 'Beneficiário'}</Label>
                  <Input
                    placeholder="Nome"
                    value={formData.beneficiary_name}
                    onChange={(e) => setFormData({ ...formData, beneficiary_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input
                    placeholder="Documento"
                    value={formData.beneficiary_document}
                    onChange={(e) => setFormData({ ...formData, beneficiary_document: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createCheque.isPending || !formData.cheque_number || !formData.bank_code || !formData.amount}
              >
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

interface ChequeTableProps {
  cheques: ReturnType<typeof useCheques>['data'];
  isLoading: boolean;
  onStatusChange: (id: string, status: ChequeStatus) => void;
  type: ChequeType;
}

function ChequeTable({ cheques = [], isLoading, onStatusChange, type }: ChequeTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cheques.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum cheque {type === 'recebido' ? 'recebido' : 'emitido'} encontrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>{type === 'recebido' ? 'Emitente' : 'Beneficiário'}</TableHead>
              <TableHead>Bom Para</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cheques.map((cheque) => {
              const status = statusConfig[cheque.status];
              const StatusIcon = status.icon;
              return (
                <TableRow key={cheque.id}>
                  <TableCell className="font-mono">{cheque.cheque_number}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{cheque.bank_code}</div>
                      {cheque.agency && <div className="text-muted-foreground">Ag {cheque.agency}</div>}
                    </div>
                  </TableCell>
                  <TableCell>{cheque.beneficiary_name || '-'}</TableCell>
                  <TableCell>{cheque.due_date ? formatDate(cheque.due_date) : '-'}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(cheque.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {cheque.status === 'em_carteira' && (
                          <>
                            <DropdownMenuItem onClick={() => onStatusChange(cheque.id, 'depositado')}>
                              Marcar como Depositado
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onStatusChange(cheque.id, 'sustado')}>
                              Sustar Cheque
                            </DropdownMenuItem>
                          </>
                        )}
                        {cheque.status === 'depositado' && (
                          <>
                            <DropdownMenuItem onClick={() => onStatusChange(cheque.id, 'compensado')}>
                              Marcar como Compensado
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onStatusChange(cheque.id, 'devolvido')}>
                              Marcar como Devolvido
                            </DropdownMenuItem>
                          </>
                        )}
                        {cheque.status !== 'cancelado' && cheque.status !== 'compensado' && (
                          <DropdownMenuItem 
                            onClick={() => onStatusChange(cheque.id, 'cancelado')}
                            className="text-destructive"
                          >
                            Cancelar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
