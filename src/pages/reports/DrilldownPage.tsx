import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar, useFilters, DashboardFilters } from '@/components/dashboard/FilterBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useDrilldownTransactions } from '@/hooks/useDashboardData';
import { 
  FileDown, 
  FileSpreadsheet, 
  ArrowLeft, 
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { exportToExcel } from '@/lib/excel/exporter';

const sourceLabels: Record<string, string> = {
  cash_balance: 'Movimentações de Caixa',
  revenue: 'Receitas',
  expenses: 'Despesas',
  ar_aging: 'Contas a Receber',
  ap_aging: 'Contas a Pagar',
  ar_overdue: 'Recebíveis Vencidos',
  top_debtors: 'Devedores',
  top_creditors: 'Credores',
  upcoming: 'Próximos Lançamentos',
  debtor: 'Títulos do Cliente',
  creditor: 'Títulos do Fornecedor',
};

export default function DrilldownPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useFilters();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const source = searchParams.get('source') || 'transactions';
  const direction = searchParams.get('direction') as 'entrada' | 'saida' | undefined;
  const statusFilter = searchParams.get('status') || undefined;

  const extendedFilters: DashboardFilters & { direction?: 'entrada' | 'saida'; statusFilter?: string } = {
    ...filters,
    direction,
    statusFilter,
  };

  const { data: transactions = [], isLoading } = useDrilldownTransactions(extendedFilters);

  // Filter by search
  const filteredData = useMemo(() => {
    if (!search) return transactions;
    const lowerSearch = search.toLowerCase();
    return transactions.filter((tx) => 
      tx.description?.toLowerCase().includes(lowerSearch) ||
      (tx.counterparty as any)?.name?.toLowerCase().includes(lowerSearch) ||
      tx.document_number?.toLowerCase().includes(lowerSearch)
    );
  }, [transactions, search]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  // Totals
  const totals = useMemo(() => {
    return filteredData.reduce((acc, tx) => ({
      entradas: acc.entradas + (tx.direction === 'entrada' ? Number(tx.total_amount) : 0),
      saidas: acc.saidas + (tx.direction === 'saida' ? Number(tx.total_amount) : 0),
      count: acc.count + 1,
    }), { entradas: 0, saidas: 0, count: 0 });
  }, [filteredData]);

  const handleExportExcel = () => {
    exportToExcel({
      filename: `drilldown_${source}_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Detalhamento',
      columns: [
        { header: 'Data Venc.', key: 'due_date', format: (v) => formatDate(v as string) },
        { header: 'Data Pgto.', key: 'paid_date', format: (v) => v ? formatDate(v as string) : '-' },
        { header: 'Descrição', key: 'description' },
        { header: 'Contraparte', key: 'counterparty_name' },
        { header: 'Conta', key: 'account_name' },
        { header: 'Centro de Custo', key: 'cost_center_name' },
        { header: 'Tipo', key: 'direction', format: (v) => v === 'entrada' ? 'Entrada' : 'Saída' },
        { header: 'Status', key: 'status' },
        { header: 'Valor', key: 'total_amount', format: (v) => formatCurrency(Number(v)) },
      ],
      data: filteredData.map((tx) => ({
        ...tx,
        counterparty_name: (tx.counterparty as any)?.name || '-',
        account_name: (tx.account as any)?.name || '-',
        cost_center_name: (tx.cost_center as any)?.name || '-',
      })),
      title: sourceLabels[source] || 'Detalhamento',
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title={sourceLabels[source] || 'Detalhamento'}
          description="Visualização detalhada com filtros aplicados"
        >
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </PageHeader>

        <FilterBar 
          filters={filters} 
          onFiltersChange={setFilters} 
          showDateField 
          showStatus 
        />

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total de Registros</div>
              <div className="text-2xl font-bold">{totals.count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Entradas</div>
              <div className="text-2xl font-bold text-success">{formatCurrency(totals.entradas)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Saídas</div>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totals.saidas)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Saldo</div>
              <div className={`text-2xl font-bold ${totals.entradas - totals.saidas >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(totals.entradas - totals.saidas)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transações</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-pulse">Carregando...</div>
              </div>
            ) : paginatedData.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Contraparte</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((tx) => {
                      const isOverdue = tx.status !== 'pago' && new Date(tx.due_date) < new Date();
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className={isOverdue ? 'text-destructive font-medium' : ''}>
                            {formatDate(tx.due_date)}
                          </TableCell>
                          <TableCell>
                            {tx.paid_date ? formatDate(tx.paid_date) : '-'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {tx.description}
                          </TableCell>
                          <TableCell>
                            {(tx.counterparty as any)?.name || '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {(tx.account as any)?.code} - {(tx.account as any)?.name?.substring(0, 20)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.direction === 'entrada' ? 'default' : 'destructive'}>
                              {tx.direction === 'entrada' ? 'Entrada' : 'Saída'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              tx.status === 'pago' ? 'default' :
                              isOverdue ? 'destructive' : 'secondary'
                            }>
                              {tx.status === 'pago' ? 'Pago' : 
                               isOverdue ? 'Vencido' : 'Aberto'}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            tx.direction === 'entrada' ? 'text-success' : 'text-destructive'
                          }`}>
                            {tx.direction === 'entrada' ? '+' : '-'}
                            {formatCurrency(Number(tx.total_amount))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, filteredData.length)} de {filteredData.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Página {page} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Nenhuma transação encontrada com os filtros aplicados
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
