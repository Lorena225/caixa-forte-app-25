import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  FileSpreadsheet, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Eye,
  Filter,
  X,
  Download,
  Search,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { exportErrorReport } from '@/lib/excel/exporter';
import type { ImportEntityType } from '@/lib/excel/types';

interface ImportBatchWithDetails {
  id: string;
  entity?: ImportEntityType;
  source_filename?: string;
  status: 'processing' | 'success' | 'partial' | 'error';
  started_at?: string;
  finished_at?: string;
  total_rows?: number;
  processed_rows?: number;
  summary_json?: {
    imported: number;
    updated: number;
    duplicates: number;
    errors: number;
    skipped: number;
  };
  error_details?: string;
}

const ENTITY_LABELS: Record<string, string> = {
  accounts: 'Plano de Contas',
  counterparties: 'Clientes/Fornecedores',
  wallets: 'Carteiras',
  cost_centers: 'Centros de Custo',
  transactions_ar: 'Contas a Receber',
  transactions_ap: 'Contas a Pagar',
  transactions: 'Lançamentos',
  budgets: 'Metas/Orçamento',
};

const STATUS_CONFIG = {
  processing: { label: 'Processando', icon: Clock, variant: 'secondary' as const, color: 'text-blue-500' },
  success: { label: 'Sucesso', icon: CheckCircle2, variant: 'default' as const, color: 'text-green-500' },
  partial: { label: 'Parcial', icon: AlertCircle, variant: 'outline' as const, color: 'text-yellow-500' },
  error: { label: 'Erro', icon: XCircle, variant: 'destructive' as const, color: 'text-red-500' },
};

export default function ImportHistory() {
  const navigate = useNavigate();
  const { currentCompany } = useAuth();
  const [batches, setBatches] = useState<ImportBatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [batchRows, setBatchRows] = useState<Array<{
    id: string;
    row_number: number;
    status: string;
    errors_json: string[];
    raw_json: Record<string, unknown>;
  }>>([]);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>(() => {
    const date = subMonths(startOfMonth(new Date()), 2);
    return format(date, 'yyyy-MM-dd');
  });
  const [filterDateTo, setFilterDateTo] = useState<string>(() => {
    return format(endOfMonth(new Date()), 'yyyy-MM-dd');
  });
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (currentCompany) {
      fetchBatches();
    }
  }, [currentCompany]);

  const fetchBatches = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('import_batches')
        .select('*')
        .eq('company_id', currentCompany.id)
        .not('entity', 'is', null)
        .order('started_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      setBatches((data || []).map(b => ({
        ...b,
        summary_json: b.summary_json as ImportBatchWithDetails['summary_json'],
      })));
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      // Status filter
      if (filterStatus !== 'all' && batch.status !== filterStatus) {
        return false;
      }

      // Entity filter
      if (filterEntity !== 'all' && batch.entity !== filterEntity) {
        return false;
      }

      // Date filter
      if (batch.started_at) {
        const batchDate = new Date(batch.started_at);
        const fromDate = new Date(filterDateFrom);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);

        if (batchDate < fromDate || batchDate > toDate) {
          return false;
        }
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const filename = batch.source_filename?.toLowerCase() || '';
        const entity = ENTITY_LABELS[batch.entity || '']?.toLowerCase() || '';
        if (!filename.includes(search) && !entity.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [batches, filterStatus, filterEntity, filterDateFrom, filterDateTo, searchTerm]);

  const fetchBatchRows = async (batchId: string) => {
    try {
      const { data, error } = await supabase
        .from('import_rows')
        .select('id, row_number, status, errors_json, raw_json')
        .eq('batch_id', batchId)
        .order('row_number');

      if (error) throw error;

      setBatchRows((data || []).map(r => ({
        ...r,
        errors_json: (r.errors_json as string[]) || [],
        raw_json: r.raw_json as Record<string, unknown>,
      })));
      setSelectedBatch(batchId);
    } catch (error) {
      console.error('Error fetching batch rows:', error);
      toast.error('Erro ao carregar detalhes');
    }
  };

  const handleDownloadErrors = (batch: ImportBatchWithDetails) => {
    const errorRows = batchRows
      .filter(r => r.errors_json && r.errors_json.length > 0)
      .map(r => ({
        row_number: r.row_number,
        errors: r.errors_json,
        raw_data: r.raw_json,
      }));

    if (errorRows.length === 0) {
      toast.info('Nenhum erro para exportar');
      return;
    }

    exportErrorReport(errorRows, `importacao_${batch.entity || 'dados'}`);
    toast.success('Relatório de erros baixado');
  };

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterEntity('all');
    setFilterDateFrom(format(subMonths(startOfMonth(new Date()), 2), 'yyyy-MM-dd'));
    setFilterDateTo(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    setSearchTerm('');
  };

  const hasActiveFilters = filterStatus !== 'all' || filterEntity !== 'all' || searchTerm !== '';

  // Stats
  const stats = useMemo(() => {
    const total = filteredBatches.length;
    const success = filteredBatches.filter(b => b.status === 'success').length;
    const partial = filteredBatches.filter(b => b.status === 'partial').length;
    const error = filteredBatches.filter(b => b.status === 'error').length;
    const totalImported = filteredBatches.reduce((sum, b) => sum + (b.summary_json?.imported || 0), 0);
    const totalErrors = filteredBatches.reduce((sum, b) => sum + (b.summary_json?.errors || 0), 0);
    return { total, success, partial, error, totalImported, totalErrors };
  }, [filteredBatches]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/importar-exportar')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Histórico de Importações</h1>
              <p className="text-muted-foreground">
                Visualize todas as importações realizadas
              </p>
            </div>
          </div>
          <Button 
            variant={showFilters ? "secondary" : "outline"} 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                !
              </Badge>
            )}
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Filtros</CardTitle>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Nome do arquivo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                      <SelectItem value="error">Erro</SelectItem>
                      <SelectItem value="processing">Processando</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Dado</Label>
                  <Select value={filterEntity} onValueChange={setFilterEntity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total de Importações</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.success}</div>
              <p className="text-sm text-muted-foreground">Com Sucesso</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.totalImported}</div>
              <p className="text-sm text-muted-foreground">Registros Importados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.totalErrors}</div>
              <p className="text-sm text-muted-foreground">Erros</p>
            </CardContent>
          </Card>
        </div>

        {/* Batches List */}
        <Card>
          <CardHeader>
            <CardTitle>Importações</CardTitle>
            <CardDescription>
              {filteredBatches.length} importações encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma importação encontrada</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBatches.map((batch) => {
                  const statusConfig = STATUS_CONFIG[batch.status];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <Card key={batch.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${statusConfig.color}`}>
                              <StatusIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">
                                  {batch.entity ? ENTITY_LABELS[batch.entity] || batch.entity : 'Desconhecido'}
                                </span>
                                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                                {batch.source_filename && (
                                  <span className="truncate max-w-[200px]">{batch.source_filename}</span>
                                )}
                                {batch.started_at && (
                                  <span>
                                    {format(new Date(batch.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 flex-wrap">
                            {batch.summary_json && (
                              <div className="text-sm text-right">
                                <div className="flex gap-3 flex-wrap">
                                  <span className="text-green-600">{batch.summary_json.imported} criados</span>
                                  <span className="text-blue-600">{batch.summary_json.updated} atualizados</span>
                                  <span className="text-red-600">{batch.summary_json.errors} erros</span>
                                </div>
                              </div>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => fetchBatchRows(batch.id)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Detalhes
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Batch Details Modal */}
        {selectedBatch && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Detalhes da Importação</CardTitle>
                <div className="flex gap-2">
                  {batchRows.some(r => r.errors_json && r.errors_json.length > 0) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const batch = batches.find(b => b.id === selectedBatch);
                        if (batch) handleDownloadErrors(batch);
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Erros
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setSelectedBatch(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-left font-medium">Linha</th>
                      <th className="py-2 px-3 text-left font-medium">Status</th>
                      <th className="py-2 px-3 text-left font-medium">Erros</th>
                      <th className="py-2 px-3 text-left font-medium">Dados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchRows.map((row) => (
                      <tr key={row.id} className="border-b">
                        <td className="py-2 px-3">{row.row_number}</td>
                        <td className="py-2 px-3">
                          <Badge variant={
                            row.status === 'imported' || row.status === 'updated' ? 'default' :
                            row.status === 'error' ? 'destructive' :
                            row.status === 'duplicate' ? 'outline' : 'secondary'
                          }>
                            {row.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          {row.errors_json && row.errors_json.length > 0 ? (
                            <ul className="list-disc pl-4 text-red-600 text-xs">
                              {row.errors_json.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-3 max-w-xs truncate text-xs text-muted-foreground">
                          {JSON.stringify(row.raw_json).substring(0, 100)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}