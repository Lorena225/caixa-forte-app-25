import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, AlertOctagon, CheckCircle, Clock, AlertTriangle, Upload } from 'lucide-react';
import { useCreditProtectionRequests, useSendToNegativation, useRemoveNegativation, useBulkNegativation } from '@/hooks/useCreditProtection';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  sent: { label: 'Enviado', color: 'bg-blue-100 text-blue-800' },
  registered: { label: 'Negativado', color: 'bg-red-100 text-red-800' },
  removed: { label: 'Baixado', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
};

export default function Negativacao() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { data: requests = [], isLoading } = useCreditProtectionRequests({ status: statusFilter });
  const sendToNegativation = useSendToNegativation();
  const removeNegativation = useRemoveNegativation();
  const bulkNegativation = useBulkNegativation();

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.customer_document.includes(searchTerm);
    return matchesSearch;
  });

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkNegativation = async () => {
    await bulkNegativation.mutateAsync(selectedIds);
    setSelectedIds([]);
    setConfirmDialogOpen(false);
  };

  const columns = [
    {
      key: 'select',
      header: '',
      cell: (row: any) => row.status === 'pending' && (
        <Checkbox 
          checked={selectedIds.includes(row.id)}
          onCheckedChange={() => toggleSelection(row.id)}
        />
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      cell: (row: any) => (
        <div>
          <div className="font-medium">{row.customer_name}</div>
          <div className="text-xs text-muted-foreground">{row.customer_document}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      cell: (row: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.amount),
    },
    {
      key: 'days_overdue',
      header: 'Dias em Atraso',
      cell: (row: any) => (
        <span className={row.days_overdue > 30 ? 'text-red-600 font-medium' : ''}>
          {row.days_overdue} dias
        </span>
      ),
    },
    {
      key: 'sent_at',
      header: 'Data Envio',
      cell: (row: any) => row.sent_at 
        ? format(new Date(row.sent_at), 'dd/MM/yyyy', { locale: ptBR })
        : '-',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row: any) => {
        const config = statusConfig[row.status] || statusConfig.pending;
        return <Badge className={config.color}>{config.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      cell: (row: any) => (
        <div className="flex gap-1">
          {row.status === 'pending' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => sendToNegativation.mutate(row.id)}
              disabled={sendToNegativation.isPending}
            >
              Negativar
            </Button>
          )}
          {row.status === 'registered' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => removeNegativation.mutate(row.id)}
              disabled={removeNegativation.isPending}
            >
              Baixar
            </Button>
          )}
          {row.status === 'sent' && (
            <Button variant="outline" size="sm" disabled>
              Processando...
            </Button>
          )}
        </div>
      ),
    },
  ];

  // KPIs
  const totalNegativado = requests.filter(n => n.status === 'registered').reduce((sum, n) => sum + n.amount, 0);
  const totalPendente = requests.filter(n => n.status === 'pending').length;
  const totalBaixado = requests.filter(n => n.status === 'removed').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Negativação"
          description="Gestão de negativações em bureaus de crédito"
        />

        {/* Alert de integração */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Integração com Bureaus</AlertTitle>
          <AlertDescription>
            Para enviar negativações automaticamente, configure as credenciais de acesso aos bureaus de crédito nas configurações do sistema.
          </AlertDescription>
        </Alert>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{totalPendente}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertOctagon className="h-4 w-4" />
                Negativados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {requests.filter(n => n.status === 'registered').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Negativado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalNegativado)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Baixados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalBaixado}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="registered">Negativado</SelectItem>
              <SelectItem value="removed">Baixado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar Lote
          </Button>
          <Button 
            disabled={selectedIds.length === 0}
            onClick={() => setConfirmDialogOpen(true)}
          >
            Negativar Selecionados ({selectedIds.length})
          </Button>
        </div>

        {/* Tabela */}
        <DataTable
          columns={columns}
          data={filteredRequests}
          loading={isLoading}
        />

        {/* Dialog de confirmação */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Negativação</DialogTitle>
              <DialogDescription>
                Você está prestes a enviar {selectedIds.length} registro(s) para negativação.
                Esta ação é irreversível e pode afetar o crédito dos clientes.
              </DialogDescription>
            </DialogHeader>
            <Alert variant="destructive">
              <AlertOctagon className="h-4 w-4" />
              <AlertTitle>Atenção!</AlertTitle>
              <AlertDescription>
                Certifique-se de que todos os procedimentos de cobrança foram esgotados antes de negativar.
                O cliente deve ser notificado previamente conforme legislação vigente.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button>
              <Button 
                variant="destructive" 
                onClick={handleBulkNegativation}
                disabled={bulkNegativation.isPending}
              >
                {bulkNegativation.isPending ? 'Enviando...' : 'Confirmar Negativação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
