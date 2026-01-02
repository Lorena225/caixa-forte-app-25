import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar, useFilters } from '@/components/dashboard/FilterBar';
import { KPICard, KPIGrid } from '@/components/dashboard/KPICard';
import { AgingChart } from '@/components/dashboard/AgingChart';
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
import { formatCurrency } from '@/lib/formatters';
import {
  useAPAgingSummary,
  useTopCreditors,
  useDPOMonthly,
} from '@/hooks/useDashboardData';
import { 
  ArrowUpCircle, 
  AlertTriangle, 
  Building2, 
  Clock, 
  FileDown,
  TrendingDown 
} from 'lucide-react';

export default function APDashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useFilters();
  const currentYear = new Date().getFullYear();

  const { data: apAging = [], isLoading: agingLoading } = useAPAgingSummary();
  const { data: topCreditors = [], isLoading: creditorsLoading } = useTopCreditors(10);
  const { data: dpoData = [] } = useDPOMonthly(currentYear);

  // Calculate totals
  const apTotal = apAging.reduce((sum, a) => sum + Number(a.total_amount || 0), 0);
  const apOverdue = apAging
    .filter(a => a.aging_bucket !== 'a_vencer')
    .reduce((sum, a) => sum + Number(a.total_amount || 0), 0);
  const apToPay = apAging
    .filter(a => a.aging_bucket === 'a_vencer')
    .reduce((sum, a) => sum + Number(a.total_amount || 0), 0);
  const overduePercent = apTotal > 0 ? (apOverdue / apTotal) * 100 : 0;
  
  // Average DPO
  const avgDPO = dpoData.length > 0 
    ? Math.round(dpoData.reduce((sum, d) => sum + Number(d.dpo_days || 0), 0) / dpoData.length)
    : 0;

  const handleDrilldown = (bucket?: string) => {
    const params = new URLSearchParams({ source: 'ap_aging', direction: 'saida' });
    if (bucket) params.set('bucket', bucket);
    navigate(`/reports/drilldown?${params.toString()}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Contas a Pagar / Desembolsos"
          description="Gestão de pagamentos e fornecedores"
        >
          <Button variant="outline" size="sm" className="gap-2">
            <FileDown className="h-4 w-4" />
            Exportar
          </Button>
        </PageHeader>

        <FilterBar filters={filters} onFiltersChange={setFilters} showStatus />

        {/* KPIs */}
        <KPIGrid columns={4}>
          <KPICard
            title="Total a Pagar"
            value={formatCurrency(apTotal)}
            icon={ArrowUpCircle}
            variant="primary"
            isLoading={agingLoading}
            onClick={() => handleDrilldown()}
          />
          <KPICard
            title="A Vencer"
            value={formatCurrency(apToPay)}
            icon={Clock}
            variant="info"
            isLoading={agingLoading}
            onClick={() => handleDrilldown('a_vencer')}
          />
          <KPICard
            title="Vencido"
            value={formatCurrency(apOverdue)}
            subtitle={`${overduePercent.toFixed(1)}% do total`}
            icon={AlertTriangle}
            variant="danger"
            isLoading={agingLoading}
            onClick={() => handleDrilldown('overdue')}
          />
          <KPICard
            title="PMP (DPO)"
            value={`${avgDPO} dias`}
            subtitle="Prazo médio pagamento"
            icon={TrendingDown}
            isLoading={agingLoading}
          />
        </KPIGrid>

        {/* Aging Chart */}
        <AgingChart
          data={apAging}
          title="Aging Contas a Pagar"
          type="ap"
          isLoading={agingLoading}
          onBucketClick={handleDrilldown}
        />

        {/* Top Creditors */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Top 10 Fornecedores
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/reports/drilldown?source=top_creditors')}
              >
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {creditorsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-pulse">Carregando...</div>
              </div>
            ) : topCreditors.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Total Aberto</TableHead>
                    <TableHead className="text-right">Vencido</TableHead>
                    <TableHead className="text-right">Dias Atraso</TableHead>
                    <TableHead className="text-center">Docs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCreditors.map((creditor) => (
                    <TableRow 
                      key={creditor.counterparty_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/reports/drilldown?source=creditor&counterparty=${creditor.counterparty_id}`)}
                    >
                      <TableCell className="font-medium">
                        {creditor.counterparty_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(creditor.total_open))}
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {formatCurrency(Number(creditor.total_overdue))}
                      </TableCell>
                      <TableCell className="text-right">
                        {creditor.max_days_overdue ? (
                          <Badge variant={Number(creditor.max_days_overdue) > 30 ? 'destructive' : 'secondary'}>
                            {creditor.max_days_overdue}d
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {creditor.doc_count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Nenhum fornecedor com valores em aberto
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
