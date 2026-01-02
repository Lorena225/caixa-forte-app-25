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
  useARAgingSummary,
  useTopDebtors,
  useDSOMonthly,
} from '@/hooks/useDashboardData';
import { 
  ArrowDownCircle, 
  AlertTriangle, 
  Users, 
  Clock, 
  FileDown,
  TrendingUp 
} from 'lucide-react';

export default function ARDashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useFilters();
  const currentYear = new Date().getFullYear();

  const { data: arAging = [], isLoading: agingLoading } = useARAgingSummary();
  const { data: topDebtors = [], isLoading: debtorsLoading } = useTopDebtors(10);
  const { data: dsoData = [] } = useDSOMonthly(currentYear);

  // Calculate totals
  const arTotal = arAging.reduce((sum, a) => sum + Number(a.total_amount || 0), 0);
  const arOverdue = arAging
    .filter(a => a.aging_bucket !== 'a_vencer')
    .reduce((sum, a) => sum + Number(a.total_amount || 0), 0);
  const arToReceive = arAging
    .filter(a => a.aging_bucket === 'a_vencer')
    .reduce((sum, a) => sum + Number(a.total_amount || 0), 0);
  const overduePercent = arTotal > 0 ? (arOverdue / arTotal) * 100 : 0;
  
  // Average DSO
  const avgDSO = dsoData.length > 0 
    ? Math.round(dsoData.reduce((sum, d) => sum + Number(d.dso_days || 0), 0) / dsoData.length)
    : 0;

  const handleDrilldown = (bucket?: string) => {
    const params = new URLSearchParams({ source: 'ar_aging', direction: 'entrada' });
    if (bucket) params.set('bucket', bucket);
    navigate(`/reports/drilldown?${params.toString()}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Contas a Receber / Inadimplência"
          description="Análise de recebíveis e gestão de cobrança"
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
            title="Total a Receber"
            value={formatCurrency(arTotal)}
            icon={ArrowDownCircle}
            variant="primary"
            isLoading={agingLoading}
            onClick={() => handleDrilldown()}
          />
          <KPICard
            title="A Vencer"
            value={formatCurrency(arToReceive)}
            icon={Clock}
            variant="success"
            isLoading={agingLoading}
            onClick={() => handleDrilldown('a_vencer')}
          />
          <KPICard
            title="Vencido"
            value={formatCurrency(arOverdue)}
            subtitle={`${overduePercent.toFixed(1)}% do total`}
            icon={AlertTriangle}
            variant="warning"
            isLoading={agingLoading}
            onClick={() => handleDrilldown('overdue')}
          />
          <KPICard
            title="PMR (DSO)"
            value={`${avgDSO} dias`}
            subtitle="Prazo médio recebimento"
            icon={TrendingUp}
            isLoading={agingLoading}
          />
        </KPIGrid>

        {/* Aging Chart */}
        <AgingChart
          data={arAging}
          title="Contas a Receber"
          type="ar"
          isLoading={agingLoading}
          onBucketClick={handleDrilldown}
        />

        {/* Top Debtors */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top 10 Clientes Devedores
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/reports/drilldown?source=top_debtors')}
              >
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {debtorsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-pulse">Carregando...</div>
              </div>
            ) : topDebtors.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total Aberto</TableHead>
                    <TableHead className="text-right">Vencido</TableHead>
                    <TableHead className="text-right">Dias Atraso</TableHead>
                    <TableHead className="text-center">Docs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDebtors.map((debtor) => (
                    <TableRow 
                      key={debtor.counterparty_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/reports/drilldown?source=debtor&counterparty=${debtor.counterparty_id}`)}
                    >
                      <TableCell className="font-medium">
                        {debtor.counterparty_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(debtor.total_open))}
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {formatCurrency(Number(debtor.total_overdue))}
                      </TableCell>
                      <TableCell className="text-right">
                        {debtor.max_days_overdue ? (
                          <Badge variant={Number(debtor.max_days_overdue) > 60 ? 'destructive' : 'secondary'}>
                            {debtor.max_days_overdue}d
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {debtor.doc_count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Nenhum cliente com valores em aberto
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
