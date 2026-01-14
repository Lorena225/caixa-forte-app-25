import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, Send, Download, XCircle, RefreshCw, Printer } from 'lucide-react';
import { useBoletos } from '@/hooks/useBoletos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BoletoModal } from '@/components/cobranca/BoletoModal';

const statusColors: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-800',
  registrando: 'bg-blue-100 text-blue-800',
  registrado: 'bg-purple-100 text-purple-800',
  pago: 'bg-green-100 text-green-800',
  vencido: 'bg-red-100 text-red-800',
  cancelado: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  registrando: 'Registrando',
  registrado: 'Registrado',
  pago: 'Pago',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
};

export default function BoletosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const { data: boletos = [], isLoading } = useBoletos();

  const filteredBoletos = boletos.filter(boleto => {
    const matchesSearch = 
      boleto.our_number?.includes(searchTerm) ||
      boleto.your_number?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || boleto.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPIs
  const totalRegistrados = boletos.filter(b => b.status === 'registrado');
  const totalVencidos = boletos.filter(b => b.status === 'vencido');
  const valorAberto = boletos
    .filter(b => ['registrado', 'vencido'].includes(b.status))
    .reduce((sum, b) => sum + (b.amount || 0), 0);
  const valorRecebido = boletos
    .filter(b => b.status === 'pago')
    .reduce((sum, b) => sum + (b.amount_paid || b.amount || 0), 0);

  const columns = [
    {
      key: 'our_number',
      header: 'Nosso Número',
      cell: (row: any) => <div className="font-medium font-mono">{row.our_number}</div>,
    },
    {
      key: 'your_number',
      header: 'Seu Número',
      cell: (row: any) => row.your_number || '-',
    },
    {
      key: 'issue_date',
      header: 'Emissão',
      cell: (row: any) => format(new Date(row.issue_date), 'dd/MM/yyyy', { locale: ptBR }),
    },
    {
      key: 'due_date',
      header: 'Vencimento',
      cell: (row: any) => {
        const isOverdue = new Date(row.due_date) < new Date() && row.status !== 'pago';
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {format(new Date(row.due_date), 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: 'Valor',
      cell: (row: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.amount || 0),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row: any) => (
        <Badge className={statusColors[row.status] || 'bg-gray-100'}>
          {statusLabels[row.status] || row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      cell: (row: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" title="Visualizar">
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === 'rascunho' && (
            <Button variant="ghost" size="icon" title="Registrar">
              <Send className="h-4 w-4" />
            </Button>
          )}
          {row.status === 'registrado' && (
            <>
              <Button variant="ghost" size="icon" title="Download PDF">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Imprimir">
                <Printer className="h-4 w-4" />
              </Button>
            </>
          )}
          {['rascunho', 'registrado'].includes(row.status) && (
            <Button variant="ghost" size="icon" title="Cancelar">
              <XCircle className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Boletos"
          description="Emissão e acompanhamento de boletos bancários"
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Registrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{totalRegistrados.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vencidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{totalVencidos.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor em Aberto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorAberto)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recebido (Mês)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorRecebido)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nosso número ou seu número..."
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
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="registrado">Registrado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Status
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Boleto
          </Button>
        </div>

        <BoletoModal open={modalOpen} onOpenChange={setModalOpen} />

        {/* Tabela */}
        <DataTable
          columns={columns}
          data={filteredBoletos}
          loading={isLoading}
        />
      </div>
    </MainLayout>
  );
}
