import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string }> = {
  aberta: { label: 'Aberta', color: 'bg-blue-100 text-blue-800' },
  em_analise: { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-800' },
  aprovada: { label: 'Aprovada', color: 'bg-green-100 text-green-800' },
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
  const [cotacoes] = useState(mockCotacoes);

  const filteredCotacoes = cotacoes.filter(cotacao => {
    const matchesSearch = cotacao.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cotacao.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cotacao.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
    },
    {
      key: 'validade',
      header: 'Validade',
      cell: (row: any) => format(new Date(row.validade), 'dd/MM/yyyy', { locale: ptBR }),
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
        const status = statusConfig[row.status];
        return <Badge className={status.color}>{status.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      cell: (row: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" title="Visualizar">
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
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Cotação
          </Button>
        </div>

        {/* Tabela */}
        <DataTable
          columns={columns}
          data={filteredCotacoes}
          loading={false}
        />
      </div>
    </MainLayout>
  );
}
