import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/common/DataTable';
import { 
  Plus, Search, Send, Download, Eye, XCircle, RefreshCw, 
  FileText, Receipt, AlertCircle, CheckCircle2, Clock, Printer
} from 'lucide-react';
import { useFiscalDocuments, useFiscalDocumentStats, FiscalDocumentWithCounterparty } from '@/hooks/useFiscalDocuments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NFeEmissaoModal } from '@/components/fiscal/NFeEmissaoModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

const statusColors: Record<string, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  pendente: 'bg-secondary text-secondary-foreground',
  autorizada: 'bg-primary/10 text-primary',
  cancelada: 'bg-destructive/10 text-destructive',
  rejeitada: 'bg-accent text-accent-foreground',
  erro: 'bg-destructive/20 text-destructive',
};

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  pendente: 'Pendente',
  autorizada: 'Autorizada',
  cancelada: 'Cancelada',
  rejeitada: 'Rejeitada',
  erro: 'Erro',
};

const modelLabels: Record<string, string> = {
  '55': 'NF-e',
  '65': 'NFC-e',
  'nfse': 'NFS-e',
};

export default function EmissorNotas() {
  const [activeTab, setActiveTab] = useState<'nfe' | 'nfse'>('nfe');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [nfeModalOpen, setNfeModalOpen] = useState(false);
  
  const { data: allDocuments = [], isLoading } = useFiscalDocuments();
  const { data: stats } = useFiscalDocumentStats();

  // Filter documents by type
  const nfeDocuments = allDocuments.filter(d => d.document_model === '55');
  const nfseDocuments = allDocuments.filter(d => d.document_model === 'nfse');
  
  const currentDocuments = activeTab === 'nfe' ? nfeDocuments : nfseDocuments;
  
  const filteredDocuments = currentDocuments.filter(doc => {
    const matchesSearch = 
      doc.document_number?.toString().includes(searchTerm) ||
      doc.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.access_key?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats per type
  const nfeStats = {
    autorizadas: nfeDocuments.filter(d => d.status === 'autorizada').length,
    pendentes: nfeDocuments.filter(d => d.status === 'pendente' || d.status === 'rascunho').length,
    rejeitadas: nfeDocuments.filter(d => d.status === 'rejeitada').length,
    valorTotal: nfeDocuments.filter(d => d.status === 'autorizada').reduce((sum, d) => sum + Number(d.total_nf || 0), 0),
  };

  const nfseStats = {
    emitidas: nfseDocuments.filter(d => d.status === 'autorizada').length,
    pendentes: nfseDocuments.filter(d => d.status === 'pendente' || d.status === 'rascunho').length,
    valorTotal: nfseDocuments.filter(d => d.status === 'autorizada').reduce((sum, d) => sum + Number(d.total_nf || 0), 0),
    issTotal: nfseDocuments.filter(d => d.status === 'autorizada').reduce((sum, d) => sum + Number(d.total_iss || 0), 0),
  };

  const nfeColumns = [
    {
      key: 'numero',
      header: 'Número',
      cell: (row: any) => (
        <div className="font-mono font-medium">
          {row.document_series}-{row.document_number?.toString().padStart(9, '0')}
        </div>
      ),
    },
    {
      key: 'issue_date',
      header: 'Emissão',
      cell: (row: any) => row.issue_date 
        ? format(new Date(row.issue_date), 'dd/MM/yy HH:mm', { locale: ptBR })
        : '-',
    },
    {
      key: 'destinatario',
      header: 'Destinatário',
      cell: (row: any) => (
        <div className="max-w-[180px]">
          <div className="font-medium truncate">{row.recipient_name || '-'}</div>
          {row.recipient_document && (
            <div className="text-xs text-muted-foreground font-mono">{row.recipient_document}</div>
          )}
        </div>
      ),
    },
    {
      key: 'natureza',
      header: 'Natureza',
      cell: (row: any) => (
        <Tooltip>
          <TooltipTrigger>
            <span className="text-sm truncate max-w-[120px] block">{row.cfop || 'Venda'}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>CFOP: {row.cfop || '5102'}</p>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'total_nf',
      header: 'Valor',
      cell: (row: any) => (
        <span className="font-medium">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(row.total_nf) || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row: any) => (
        <Badge className={`${statusColors[row.status] || 'bg-muted'} gap-1`}>
          {row.status === 'autorizada' && <CheckCircle2 className="h-3 w-3" />}
          {row.status === 'pendente' && <Clock className="h-3 w-3" />}
          {row.status === 'rejeitada' && <AlertCircle className="h-3 w-3" />}
          {statusLabels[row.status] || row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row: any) => (
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Visualizar DANFE</TooltipContent>
          </Tooltip>
          
          {row.status === 'rascunho' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Send className="h-4 w-4 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Transmitir para SEFAZ</TooltipContent>
            </Tooltip>
          )}
          
          {row.status === 'autorizada' && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Printer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Imprimir DANFE</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download XML</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      ),
    },
  ];

  const nfseColumns = [
    {
      key: 'numero',
      header: 'Número',
      cell: (row: any) => (
        <div className="font-mono font-medium">
          {row.document_number?.toString().padStart(6, '0') || '-'}
        </div>
      ),
    },
    {
      key: 'issue_date',
      header: 'Emissão',
      cell: (row: any) => row.issue_date 
        ? format(new Date(row.issue_date), 'dd/MM/yyyy', { locale: ptBR })
        : '-',
    },
    {
      key: 'tomador',
      header: 'Tomador do Serviço',
      cell: (row: any) => (
        <div className="max-w-[180px]">
          <div className="font-medium truncate">{row.recipient_name || '-'}</div>
        </div>
      ),
    },
    {
      key: 'servico',
      header: 'Serviço',
      cell: (row: any) => (
        <div className="max-w-[150px] truncate text-sm">
          {row.cfop || 'Prestação de Serviço'}
        </div>
      ),
    },
    {
      key: 'total_nf',
      header: 'Valor',
      cell: (row: any) => (
        <span className="font-medium">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(row.total_nf) || 0)}
        </span>
      ),
    },
    {
      key: 'total_iss',
      header: 'ISS',
      cell: (row: any) => (
        <span className="text-orange-600 dark:text-orange-400">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(row.total_iss) || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row: any) => (
        <Badge className={statusColors[row.status] || 'bg-muted'}>
          {row.status === 'autorizada' ? 'Emitida' : statusLabels[row.status] || row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
          {row.status === 'autorizada' && (
            <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Emissor Fiscal Unificado"
          description="Emissão e gestão de NF-e (Produtos) e NFS-e (Serviços)"
        />

        {/* Alert for pending documents */}
        {(nfeStats.rejeitadas > 0) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você tem {nfeStats.rejeitadas} nota(s) rejeitada(s) que precisam de atenção.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'nfe' | 'nfse')}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList className="h-11">
              <TabsTrigger value="nfe" className="gap-2 px-4">
                <FileText className="h-4 w-4" />
                NF-e (Produtos)
                {nfeStats.pendentes > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {nfeStats.pendentes}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="nfse" className="gap-2 px-4">
                <Receipt className="h-4 w-4" />
                NFS-e (Serviços)
                {nfseStats.pendentes > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {nfseStats.pendentes}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Consultar SEFAZ
              </Button>
              <Button onClick={() => setNfeModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {activeTab === 'nfe' ? 'Nova NF-e' : 'Nova NFS-e'}
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {activeTab === 'nfe' ? (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Autorizadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{nfeStats.autorizadas}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      Pendentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{nfeStats.pendentes}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      Rejeitadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{nfeStats.rejeitadas}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Valor Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(nfeStats.valorTotal)}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Emitidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{nfseStats.emitidas}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pendentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{nfseStats.pendentes}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Valor Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(nfseStats.valorTotal)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      ISS Retido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nfseStats.issTotal)}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, destinatário ou chave de acesso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="autorizada">Autorizada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="rejeitada">Rejeitada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="nfe" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <DataTable
                  columns={nfeColumns}
                  data={filteredDocuments}
                  loading={isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nfse" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <DataTable
                  columns={nfseColumns}
                  data={filteredDocuments}
                  loading={isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <NFeEmissaoModal open={nfeModalOpen} onOpenChange={setNfeModalOpen} />
      </div>
    </MainLayout>
  );
}
