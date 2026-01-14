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
import { Search, AlertOctagon, CheckCircle, Clock, XCircle, AlertTriangle, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  negativado: { label: 'Negativado', color: 'bg-red-100 text-red-800' },
  baixado: { label: 'Baixado', color: 'bg-green-100 text-green-800' },
  erro: { label: 'Erro', color: 'bg-orange-100 text-orange-800' },
};

// Mock data
const mockNegativacoes = [
  { id: '1', cliente: 'João Silva', documento: '123.456.789-00', valor: 1500, vencimento: '2025-11-15', data_negativacao: '2025-12-15', bureau: 'SPC', status: 'negativado' },
  { id: '2', cliente: 'Maria Santos', documento: '987.654.321-00', valor: 3200, vencimento: '2025-12-01', data_negativacao: null, bureau: 'Serasa', status: 'pendente' },
  { id: '3', cliente: 'Carlos Oliveira', documento: '456.789.123-00', valor: 850, vencimento: '2025-10-20', data_negativacao: '2025-11-20', bureau: 'SPC', status: 'baixado' },
  { id: '4', cliente: 'Ana Costa', documento: '12.345.678/0001-90', valor: 5600, vencimento: '2025-11-30', data_negativacao: null, bureau: 'Serasa', status: 'erro' },
];

export default function Negativacao() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [negativacoes] = useState(mockNegativacoes);

  const filteredNegativacoes = negativacoes.filter(neg => {
    const matchesSearch = neg.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      neg.documento.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || neg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: 'cliente',
      header: 'Cliente',
      cell: (row: any) => (
        <div>
          <div className="font-medium">{row.cliente}</div>
          <div className="text-xs text-muted-foreground">{row.documento}</div>
        </div>
      ),
    },
    {
      key: 'valor',
      header: 'Valor',
      cell: (row: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.valor),
    },
    {
      key: 'vencimento',
      header: 'Vencimento',
      cell: (row: any) => format(new Date(row.vencimento), 'dd/MM/yyyy', { locale: ptBR }),
    },
    {
      key: 'data_negativacao',
      header: 'Data Negativação',
      cell: (row: any) => row.data_negativacao 
        ? format(new Date(row.data_negativacao), 'dd/MM/yyyy', { locale: ptBR })
        : '-',
    },
    {
      key: 'bureau',
      header: 'Bureau',
      cell: (row: any) => <Badge variant="outline">{row.bureau}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row: any) => {
        const status = statusConfig[row.status];
        return <Badge className={status.color}>{status.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      cell: (row: any) => (
        <div className="flex gap-1">
          {row.status === 'pendente' && (
            <Button variant="outline" size="sm">
              Negativar
            </Button>
          )}
          {row.status === 'negativado' && (
            <Button variant="outline" size="sm">
              Baixar
            </Button>
          )}
          {row.status === 'erro' && (
            <Button variant="outline" size="sm">
              Reenviar
            </Button>
          )}
        </div>
      ),
    },
  ];

  // KPIs
  const totalNegativado = negativacoes.filter(n => n.status === 'negativado').reduce((sum, n) => sum + n.valor, 0);
  const totalPendente = negativacoes.filter(n => n.status === 'pendente').length;

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
                {negativacoes.filter(n => n.status === 'negativado').length}
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
                Baixados (Mês)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {negativacoes.filter(n => n.status === 'baixado').length}
              </div>
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
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="negativado">Negativado</SelectItem>
              <SelectItem value="baixado">Baixado</SelectItem>
              <SelectItem value="erro">Erro</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar Lote
          </Button>
          <Button>
            Negativar Selecionados
          </Button>
        </div>

        {/* Tabela */}
        <DataTable
          columns={columns}
          data={filteredNegativacoes}
          loading={false}
        />
      </div>
    </MainLayout>
  );
}
