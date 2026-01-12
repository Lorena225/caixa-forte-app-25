import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, FileText, Calendar, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';

export default function Extratos() {
  const { currentCompany } = useAuth();

  const { data: statements, isLoading } = useQuery({
    queryKey: ['bank-statements', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('bank_statements')
        .select(`
          *,
          wallet:wallets(name, wallet_type)
        `)
        .eq('company_id', currentCompany.id)
        .order('statement_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Extratos Bancários"
          description="Histórico de extratos importados por conta"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Extratos Importados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : statements && statements.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data do Extrato</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Saldo Inicial</TableHead>
                    <TableHead className="text-right">Saldo Final</TableHead>
                    <TableHead>Importado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((stmt: any) => (
                    <TableRow key={stmt.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(stmt.statement_date), 'dd/MM/yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {stmt.wallet?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase">
                          {stmt.source_type || 'manual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(stmt.opening_balance)}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-medium ${
                        Number(stmt.closing_balance) >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {formatCurrency(stmt.closing_balance)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(stmt.imported_at || stmt.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum extrato importado ainda</p>
                <p className="text-sm mt-1">
                  Importe extratos na tela de Conciliação Bancária
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
