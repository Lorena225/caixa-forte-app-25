import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Send, Download, Eye, XCircle, RefreshCw } from 'lucide-react';
import { useFiscalDocuments } from '@/hooks/useFiscalDocuments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NFeEmissaoModal } from '@/components/fiscal/NFeEmissaoModal';

const statusColors: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-800',
  pendente: 'bg-blue-100 text-blue-800',
  autorizada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  rejeitada: 'bg-orange-100 text-orange-800',
  inutilizada: 'bg-purple-100 text-purple-800',
};

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  pendente: 'Pendente',
  autorizada: 'Autorizada',
  cancelada: 'Cancelada',
  rejeitada: 'Rejeitada',
  inutilizada: 'Inutilizada',
};

export default function NFe() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const { data: allNotas = [], isLoading } = useFiscalDocuments();

  // Filter only NF-e documents (model 55)
  const notas = allNotas.filter(n => n.document_model === '55');

  const filteredNotas = notas.filter(nota => {
    const matchesSearch = 
      nota.document_number?.toString().includes(searchTerm) ||
      nota.access_key?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || nota.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPIs
  const totalAutorizadas = notas.filter(n => n.status === 'autorizada').length;
  const totalPendentes = notas.filter(n => n.status === 'rascunho' || n.status === 'pendente').length;
  const totalCanceladas = notas.filter(n => n.status === 'cancelada').length;
  const valorTotal = notas
    .filter(n => n.status === 'autorizada')
    .reduce((sum, n) => sum + (Number(n.total_nf) || 0), 0);

  const columns = [
    {
      key: 'numero',
      header: 'Número',
      cell: (row: any) => (
        <div className="font-medium">
          {row.document_series}-{row.document_number?.toString().padStart(9, '0')}
        </div>
      ),
    },
    {
      key: 'issue_date',
      header: 'Data Emissão',
      cell: (row: any) => row.issue_date 
        ? format(new Date(row.issue_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
        : '-',
    },
    {
      key: 'destinatario',
      header: 'Destinatário',
      cell: (row: any) => (
        <div className="max-w-[200px]">
          <div className="font-medium truncate">{row.recipient_name || '-'}</div>
          {row.recipient_document && (
            <div className="text-xs text-muted-foreground">{row.recipient_document}</div>
          )}
        </div>
      ),
    },
    {
      key: 'total_nf',
      header: 'Valor Total',
      cell: (row: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(row.total_nf) || 0),
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
            <Button variant="ghost" size="icon" title="Transmitir">
              <Send className="h-4 w-4" />
            </Button>
          )}
          {row.status === 'autorizada' && (
            <>
              <Button variant="ghost" size="icon" title="Download XML">
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
          title="NF-e - Notas Fiscais Eletrônicas"
          description="Emissão e gerenciamento de notas fiscais eletrônicas"
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Autorizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalAutorizadas}</div>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Canceladas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{totalCanceladas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total Autorizado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, destinatário ou chave..."
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
              <SelectItem value="autorizada">Autorizada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="rejeitada">Rejeitada</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Consultar SEFAZ
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova NF-e
          </Button>
        </div>

        <NFeEmissaoModal open={modalOpen} onOpenChange={setModalOpen} />

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
