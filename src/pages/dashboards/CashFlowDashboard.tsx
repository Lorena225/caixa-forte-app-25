import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DashboardInsightsPanel } from '@/components/dashboard/DashboardInsightsPanel';
import { FilterBar, useFilters } from '@/components/dashboard/FilterBar';
import { KPICard, KPIGrid } from '@/components/dashboard/KPICard';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
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
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  useExecutiveKPIs,
  useCashFlowDaily,
  useCashFlowProjection,
  useUpcomingTransactions,
} from '@/hooks/useDashboardData';
import { Wallet, TrendingUp, TrendingDown, Calendar, FileDown } from 'lucide-react';

export default function CashFlowDashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useFilters();

  const { data: kpis, isLoading: kpisLoading } = useExecutiveKPIs(filters);
  const { data: dailyFlow = [] } = useCashFlowDaily(filters);
  const { data: projection = [] } = useCashFlowProjection();
  const { data: upcoming = [], isLoading: upcomingLoading } = useUpcomingTransactions(14);

  // Calculate wallet balances
  const topWallets = kpis?.wallets?.slice(0, 5) || [];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Caixa e Fluxo de Caixa"
          description="Posição de caixa e projeções financeiras"
        >
          <Button variant="outline" size="sm" className="gap-2">
            <FileDown className="h-4 w-4" />
            Exportar
          </Button>
        </PageHeader>

        <DashboardInsightsPanel scope="cashflow" />

        <FilterBar filters={filters} onFiltersChange={setFilters} />

        {/* Wallet Balances */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <KPICard
            title="Saldo Total"
            value={formatCurrency(kpis?.cashBalance || 0)}
            icon={Wallet}
            variant="primary"
            isLoading={kpisLoading}
          />
          {topWallets.map((wallet) => (
            <KPICard
              key={wallet.id}
              title={wallet.name}
              value={formatCurrency(wallet.balance)}
              icon={Wallet}
              isLoading={kpisLoading}
            />
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <CashFlowChart
            data={dailyFlow}
            title="Saldo Diário (Realizado)"
            type="line"
            height={300}
          />
          <CashFlowChart
            data={projection}
            title="Projeção 13 Semanas"
            type="area"
            height={300}
          />
        </div>

        {/* Combined Chart */}
        <CashFlowChart
          data={dailyFlow}
          title="Entradas x Saídas com Saldo"
          type="combined"
          height={350}
        />

        {/* Upcoming Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximos 14 Dias
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/reports/drilldown?source=upcoming')}
              >
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-pulse">Carregando...</div>
              </div>
            ) : upcoming.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Contraparte</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.slice(0, 10).map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.due_date)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.description}
                      </TableCell>
                      <TableCell>
                        {(tx.counterparty as any)?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.direction === 'entrada' ? 'default' : 'destructive'}>
                          {tx.direction === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        tx.direction === 'entrada' ? 'text-success' : 'text-destructive'
                      }`}>
                        {tx.direction === 'entrada' ? '+' : '-'}
                        {formatCurrency(Number(tx.total_amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Nenhum lançamento nos próximos 14 dias
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
