import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  FileSpreadsheet, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
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
        .limit(50);

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
        errors_json: r.errors_json as string[],
        raw_json: r.raw_json as Record<string, unknown>,
      })));
      setSelectedBatch(batchId);
    } catch (error) {
      console.error('Error fetching batch rows:', error);
      toast.error('Erro ao carregar detalhes');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
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

        {/* Batches List */}
        <Card>
          <CardHeader>
            <CardTitle>Importações Recentes</CardTitle>
            <CardDescription>
              Últimas 50 importações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : batches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma importação realizada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {batches.map((batch) => {
                  const statusConfig = STATUS_CONFIG[batch.status];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <Card key={batch.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${statusConfig.color}`}>
                              <StatusIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {batch.entity ? ENTITY_LABELS[batch.entity] || batch.entity : 'Desconhecido'}
                                </span>
                                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                {batch.source_filename && (
                                  <span>{batch.source_filename}</span>
                                )}
                                {batch.started_at && (
                                  <span>
                                    {format(new Date(batch.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {batch.summary_json && (
                              <div className="text-sm text-right">
                                <div className="flex gap-3">
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
                <Button variant="ghost" size="sm" onClick={() => setSelectedBatch(null)}>
                  Fechar
                </Button>
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
