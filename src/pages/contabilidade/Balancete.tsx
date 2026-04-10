import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/formatters';

interface TrialBalanceRow {
  account_id: string;
  account_code: string;
  account_name: string;
  category_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

export default function Balancete() {
  const { currentCompany } = useAuth();

  const { data: balanceData, isLoading, refetch } = useQuery({
    queryKey: ['trial-balance', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('v_trial_balance')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('account_code');
      
      if (error) throw error;
      return (data || []) as TrialBalanceRow[];
    },
    enabled: !!currentCompany?.id
  });

  const categoryLabels: Record<string, string> = {
    ativo: 'Ativo',
    passivo: 'Passivo',
    patrimonio_liquido: 'Patrimônio Líquido',
    receita: 'Receita',
    custo: 'Custos',
    despesa: 'Despesas'
  };

  const groupedData = balanceData?.reduce((acc, row) => {
    const category = row.category_type || 'outros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(row);
    return acc;
  }, {} as Record<string, TrialBalanceRow[]>) || {};

  const totals = balanceData?.reduce(
    (acc, row) => ({
      debit: acc.debit + Number(row.total_debit || 0),
      credit: acc.credit + Number(row.total_credit || 0)
    }),
    { debit: 0, credit: 0 }
  ) || { debit: 0, credit: 0 };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Balancete de Verificação"
          description="Saldos contábeis por conta"
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </PageHeader>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Débitos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totals.debit)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Créditos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totals.credit)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Diferença
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${Math.abs(totals.debit - totals.credit) > 0.01 ? 'text-destructive' : 'text-success'}`}>
                {formatCurrency(Math.abs(totals.debit - totals.credit))}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            {balanceData && balanceData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedData).map(([category, rows]) => (
                    <>
                      <TableRow key={category} className="bg-muted/50">
                        <TableCell colSpan={5} className="font-semibold">
                          {categoryLabels[category] || category}
                        </TableCell>
                      </TableRow>
                      {rows.map((row) => (
                        <TableRow key={row.account_id}>
                          <TableCell className="font-mono">{row.account_code}</TableCell>
                          <TableCell>{row.account_name}</TableCell>
                          <TableCell className="text-right">
                            {Number(row.total_debit) > 0 ? formatCurrency(row.total_debit) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {Number(row.total_credit) > 0 ? formatCurrency(row.total_credit) : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${Number(row.balance) >= 0 ? '' : 'text-destructive'}`}>
                            {formatCurrency(Math.abs(row.balance))}
                            {Number(row.balance) < 0 ? ' C' : Number(row.balance) > 0 ? ' D' : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={2}>TOTAL</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.debit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.credit)}</TableCell>
                    <TableCell className="text-right">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado contábil encontrado. Faça lançamentos para visualizar o balancete.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
