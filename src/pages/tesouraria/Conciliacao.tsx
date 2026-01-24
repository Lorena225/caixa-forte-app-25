import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, CheckCircle, AlertTriangle, Link2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { showDevelopmentToast, showImportToast } from '@/utils/devFeedback';

export default function Conciliacao() {
  const { currentCompany } = useAuth();
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  const { data: wallets } = useQuery({
    queryKey: ['wallets-select', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('wallets')
        .select('id, name')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  const { data: imports, isLoading: importsLoading } = useQuery({
    queryKey: ['statement-imports', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('bank_statement_imports')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  const { data: pendingLines, isLoading: linesLoading } = useQuery({
    queryKey: ['pending-reconciliation', currentCompany?.id, selectedWallet],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('bank_statement_lines')
        .select(`
          *,
          statement:bank_statements!inner(
            company_id,
            wallet_id
          )
        `)
        .eq('statement.company_id', currentCompany.id)
        .eq('is_reconciled', false)
        .order('posted_date', { ascending: false })
        .limit(50);

      if (selectedWallet) {
        query = query.eq('statement.wallet_id', selectedWallet);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  const handleFileUpload = async () => {
    if (!file || !selectedWallet) {
      toast.error('Selecione uma carteira e um arquivo');
      return;
    }
    
    showImportToast('extrato bancário');
  };

  const handleVincular = (lineId: string) => {
    showDevelopmentToast('Vincular movimento');
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { class: string; label: string }> = {
      pending: { class: 'bg-warning/10 text-warning', label: 'Pendente' },
      processing: { class: 'bg-info/10 text-info', label: 'Processando' },
      completed: { class: 'bg-success/10 text-success', label: 'Concluído' },
      error: { class: 'bg-destructive/10 text-destructive', label: 'Erro' },
    };
    const c = config[status] || config.pending;
    return <Badge className={c.class}>{c.label}</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Conciliação Bancária"
          description="Importar extratos e conciliar movimentos automaticamente"
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importar Extrato
              </CardTitle>
              <CardDescription>
                Formatos suportados: OFX, CSV, TXT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Conta Bancária</Label>
                <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets?.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Arquivo</Label>
                <Input
                  type="file"
                  accept=".ofx,.csv,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button className="w-full" onClick={handleFileUpload} disabled={!file || !selectedWallet}>
                <Upload className="mr-2 h-4 w-4" />
                Importar e Processar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Últimas Importações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {importsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : imports && imports.length > 0 ? (
                <div className="space-y-3">
                  {imports.slice(0, 5).map((imp: any) => (
                    <div key={imp.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{imp.original_filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(imp.created_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(imp.status)}
                        <p className="text-xs text-muted-foreground mt-1">
                          {imp.matched_count}/{imp.line_count} conciliados
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma importação realizada
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Movimentos Pendentes de Conciliação
            </CardTitle>
            <CardDescription>
              Linhas do extrato ainda não vinculadas a lançamentos do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {linesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : pendingLines && pendingLines.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLines.map((line: any) => (
                    <TableRow key={line.id}>
                      <TableCell>{format(new Date(line.posted_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="max-w-xs truncate">{line.description}</TableCell>
                      <TableCell className="font-mono text-sm">{line.reference_number || '-'}</TableCell>
                      <TableCell className={`text-right font-medium ${line.direction === 'credit' ? 'text-success' : 'text-destructive'}`}>
                        {line.direction === 'credit' ? '+' : '-'}{formatCurrency(line.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => handleVincular(line.id)}>
                          <Link2 className="mr-1 h-3 w-3" />
                          Vincular
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Todos os movimentos estão conciliados!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
