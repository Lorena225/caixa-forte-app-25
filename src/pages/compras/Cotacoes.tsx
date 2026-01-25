import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableWithSelection } from '@/components/common/DataTableWithSelection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, CheckCircle, XCircle, Clock, Users, ArrowLeft, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CotacaoModal } from '@/components/compras/CotacaoModal';
import { useQuotations } from '@/hooks/useQuotations';
import { toast } from 'sonner';
import { BulkAction } from '@/components/bulk/BulkActionsBar';
import { useNavigate } from 'react-router-dom';

const statusConfig: Record<string, { label: string; color: string }> = {
  aberta: { label: 'Aberta', color: 'bg-blue-100 text-blue-800' },
  em_analise: { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-800' },
  aprovada: { label: 'Aprovada', color: 'bg-green-100 text-green-800' },
  convertido: { label: 'Convertida', color: 'bg-purple-100 text-purple-800' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
  expirada: { label: 'Expirada', color: 'bg-gray-100 text-gray-800' },
};

// Mock data
const mockCotacoes = [
  { id: '1', numero: 'COT-2026-0001', descricao: 'Materiais de Escritório', data: '2026-01-10', validade: '2026-01-20', fornecedores: 3, respostas: 2, status: 'em_analise' },
  { id: '2', numero: 'COT-2026-0002', descricao: 'Equipamentos de TI', data: '2026-01-12', validade: '2026-01-25', fornecedores: 5, respostas: 3, status: 'aberta' },
  { id: '3', numero: 'COT-2025-0125', descricao: 'Mobiliário', data: '2025-12-15', validade: '2025-12-25', fornecedores: 4, respostas: 4, status: 'aprovada' },
  { id: '4', numero: 'COT-2025-0124', descricao: 'Uniformes', data: '2025-12-10', validade: '2025-12-20', fornecedores: 3, respostas: 1, status: 'expirada' },
];

export default function Cotacoes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'report'>('list');
  const [selectedCotacao, setSelectedCotacao] = useState<any>(null);
  const navigate = useNavigate();
  
  const { quotations, isLoading } = useQuotations();
  const cotacoes = mockCotacoes; // Will switch to quotations when data available

  const filteredCotacoes = cotacoes.filter(cotacao => {
    const matchesSearch = cotacao.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cotacao.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cotacao.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewReport = (cotacao: any) => {
    setSelectedCotacao(cotacao);
    setViewMode('report');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedCotacao(null);
  };

  const handleBulkDelete = async (ids: string[]) => {
    toast.success(`${ids.length} cotação(ões) excluída(s)`);
  };

  const handleBulkStatusChange = async (status: string) => {
    toast.success(`Status alterado para as cotações selecionadas`);
  };

  const bulkActions: BulkAction[] = [
    {
      id: 'delete',
      label: 'Excluir Selecionadas',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => handleBulkDelete([]),
      variant: 'destructive',
    },
    {
      id: 'status-aprovada',
      label: 'Aprovar Selecionadas',
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: () => handleBulkStatusChange('aprovada'),
    },
    {
      id: 'convert',
      label: 'Converter em Pedido',
      icon: <FileText className="h-4 w-4" />,
      onClick: () => toast.info('Funcionalidade de conversão em massa em desenvolvimento'),
    },
    {
      id: 'cancel',
      label: 'Cancelar Selecionadas',
      icon: <XCircle className="h-4 w-4" />,
      onClick: () => handleBulkStatusChange('cancelada'),
      variant: 'destructive',
    },
  ];

  const columns = [
    {
      key: 'numero',
      header: 'Número',
      cell: (row: any) => <div className="font-medium font-mono">{row.numero}</div>,
    },
    {
      key: 'descricao',
      header: 'Descrição',
      cell: (row: any) => row.descricao,
    },
    {
      key: 'data',
      header: 'Data',
      cell: (row: any) => format(new Date(row.data), 'dd/MM/yyyy', { locale: ptBR }),
      hideOnMobile: true,
    },
    {
      key: 'validade',
      header: 'Validade',
      cell: (row: any) => format(new Date(row.validade), 'dd/MM/yyyy', { locale: ptBR }),
      hideOnMobile: true,
    },
    {
      key: 'fornecedores',
      header: 'Fornecedores',
      cell: (row: any) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          {row.fornecedores}
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'respostas',
      header: 'Respostas',
      cell: (row: any) => (
        <span className={row.respostas === row.fornecedores ? 'text-green-600' : 'text-yellow-600'}>
          {row.respostas}/{row.fornecedores}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row: any) => {
        const status = statusConfig[row.status] || { label: row.status, color: 'bg-gray-100 text-gray-800' };
        return <Badge className={status.color}>{status.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      cell: (row: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" title="Visualizar" onClick={() => handleViewReport(row)}>
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === 'em_analise' && (
            <Button variant="ghost" size="icon" title="Aprovar">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </Button>
          )}
          {['aberta', 'em_analise'].includes(row.status) && (
            <Button variant="ghost" size="icon" title="Cancelar">
              <XCircle className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Report View
  if (viewMode === 'report' && selectedCotacao) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <PageHeader
              title={`Relatório: ${selectedCotacao.numero}`}
              description={selectedCotacao.descricao}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Cotação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número</p>
                  <p className="font-mono font-medium">{selectedCotacao.numero}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">{format(new Date(selectedCotacao.data), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Validade</p>
                  <p className="font-medium">{format(new Date(selectedCotacao.validade), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusConfig[selectedCotacao.status]?.color || 'bg-gray-100'}>
                    {statusConfig[selectedCotacao.status]?.label || selectedCotacao.status}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Fornecedores ({selectedCotacao.respostas}/{selectedCotacao.fornecedores} respostas)</h4>
                <p className="text-sm text-muted-foreground">
                  Lista de fornecedores e suas propostas serão exibidas aqui.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Cotações"
          description="Solicite e compare propostas de fornecedores"
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Abertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {cotacoes.filter(c => c.status === 'aberta').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em Análise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {cotacoes.filter(c => c.status === 'em_analise').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Aprovadas (Mês)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {cotacoes.filter(c => c.status === 'aprovada').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Resposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou descrição..."
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
              <SelectItem value="aberta">Aberta</SelectItem>
              <SelectItem value="em_analise">Em Análise</SelectItem>
              <SelectItem value="aprovada">Aprovada</SelectItem>
              <SelectItem value="expirada">Expirada</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Cotação
          </Button>
        </div>

        {/* Modal de Nova Cotação */}
        <CotacaoModal open={modalOpen} onOpenChange={setModalOpen} />

        {/* Tabela com Seleção */}
        <DataTableWithSelection
          columns={columns}
          data={filteredCotacoes}
          loading={isLoading}
          enableSelection
          bulkActions={bulkActions}
          canSelect={(item) => !['cancelada', 'convertido', 'expirada'].includes(item.status)}
        />
      </div>
    </MainLayout>
  );
}
