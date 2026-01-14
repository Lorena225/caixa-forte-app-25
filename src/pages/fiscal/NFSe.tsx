import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FileText, Send, Download, Eye, XCircle } from 'lucide-react';
import { useFiscalDocuments } from '@/hooks/useFiscalDocuments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-800',
  processando: 'bg-blue-100 text-blue-800',
  emitida: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  erro: 'bg-orange-100 text-orange-800',
};

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  processando: 'Processando',
  emitida: 'Emitida',
  cancelada: 'Cancelada',
  erro: 'Erro',
};

export default function NFSe() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: notas = [], isLoading } = useFiscalDocuments('nfse');

  const filteredNotas = notas.filter(nota => {
    const matchesSearch = 
      nota.numero?.toString().includes(searchTerm) ||
      nota.tomador_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || nota.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPIs
  const totalEmitidas = notas.filter(n => n.status === 'emitida').length;
  const totalPendentes = notas.filter(n => n.status === 'rascunho' || n.status === 'processando').length;
  const valorTotal = notas
    .filter(n => n.status === 'emitida')
    .reduce((sum, n) => sum + (n.valor_servicos || 0), 0);
  const issTotal = notas
    .filter(n => n.status === 'emitida')
    .reduce((sum, n) => sum + (n.valor_iss || 0), 0);

  const columns = [
    {
      key: 'numero',
      header: 'Número',
      cell: (row: any) => (
        <div className="font-medium">{row.numero?.toString().padStart(6, '0') || '-'}</div>
      ),
    },
    {
      key: 'data_emissao',
      header: 'Data Emissão',
      cell: (row: any) => row.data_emissao 
        ? format(new Date(row.data_emissao), 'dd/MM/yyyy', { locale: ptBR })
        : '-',
    },
    {
      key: 'tomador',
      header: 'Tomador',
      cell: (row: any) => (
        <div>
          <div className="font-medium truncate max-w-[200px]">{row.tomador_nome || '-'}</div>
          <div className="text-xs text-muted-foreground">{row.tomador_documento}</div>
        </div>
      ),
    },
    {
      key: 'servico',
      header: 'Serviço',
      cell: (row: any) => (
        <div className="truncate max-w-[150px]" title={row.discriminacao}>
          {row.codigo_servico} - {row.discriminacao?.substring(0, 30)}...
        </div>
      ),
    },
    {
      key: 'valor_servicos',
      header: 'Valor',
      cell: (row: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.valor_servicos || 0),
    },
    {
      key: 'valor_iss',
      header: 'ISS',
      cell: (row: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.valor_iss || 0),
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
            <Button variant="ghost" size="icon" title="Emitir">
              <Send className="h-4 w-4" />
            </Button>
          )}
          {row.status === 'emitida' && (
            <>
              <Button variant="ghost" size="icon" title="Download PDF">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Cancelar">
                <XCircle className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="NFS-e - Notas Fiscais de Serviço"
          description="Emissão e gerenciamento de notas fiscais de serviço"
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Emitidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalEmitidas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalPendentes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ISS Retido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(issTotal)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou tomador..."
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
              <SelectItem value="emitida">Emitida</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="erro">Erro</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova NFS-e
          </Button>
        </div>

        {/* Tabela */}
        <DataTable
          columns={columns}
          data={filteredNotas}
          loading={isLoading}
        />
      </div>
    </MainLayout>
  );
}
