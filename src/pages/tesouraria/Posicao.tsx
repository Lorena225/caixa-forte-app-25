import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown, Wallet, Building2, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/formatters';

export default function Posicao() {
  const { currentCompany } = useAuth();

  const { data: positions, isLoading } = useQuery({
    queryKey: ['cash-positions', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from('v_cash_position_daily')
        .select('*')
        .eq('company_id', currentCompany.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  const totals = (positions || []).reduce(
    (acc, row) => ({
      balance: acc.balance + Number(row.current_balance || 0),
      inflows: acc.inflows + Number(row.total_inflows || 0),
      outflows: acc.outflows + Number(row.total_outflows || 0),
      projected: acc.projected + Number(row.projected_balance || 0)
    }),
    { balance: 0, inflows: 0, outflows: 0, projected: 0 }
  );

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'bank_account': return <Building2 className="h-4 w-4" />;
      case 'credit_card': return <CreditCard className="h-4 w-4" />;
      default: return <Wallet className="h-4 w-4" />;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Posição de Caixa"
          description="Saldos atuais e projeções por conta bancária e carteira"
        />

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="kpi-card kpi-card-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Saldo Total D+0
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(totals.balance)}
              </p>
            </CardContent>
          </Card>

          <Card className="kpi-card kpi-card-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Entradas Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(totals.inflows)}
              </p>
            </CardContent>
          </Card>

          <Card className="kpi-card kpi-card-danger">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Saídas Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(totals.outflows)}
              </p>
            </CardContent>
          </Card>

          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Projeção D+1
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${totals.projected >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(totals.projected)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Posição por Carteira</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : positions && positions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carteira</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Saldo Atual</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Saídas</TableHead>
                    <TableHead className="text-right">Projeção D+1</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((pos: any) => (
                    <TableRow key={pos.wallet_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getWalletIcon(pos.wallet_type)}
                          <span className="font-medium">{pos.wallet_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {pos.wallet_type?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${Number(pos.current_balance) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(pos.current_balance)}
                      </TableCell>
                      <TableCell className="text-right text-success">
                        {formatCurrency(pos.total_inflows)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(pos.total_outflows)}
                      </TableCell>
                      <TableCell className={`text-right ${Number(pos.projected_balance) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(pos.projected_balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma carteira encontrada. Configure suas contas bancárias em Cadastros.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
