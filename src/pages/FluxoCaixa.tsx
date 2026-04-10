import { useState } from 'react';
import { useCashflowMonthly } from '@/hooks/useCompanyData';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { BackButton } from '@/components/common/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatShortMonth } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Wallet, Target, Filter, X, Download } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';

type PeriodType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
type DateType = 'issue' | 'due' | 'payment';
type MovementType = 'all' | 'entries' | 'exits';

interface AdvancedFilters {
  periodType: PeriodType;
  dateType: DateType;
  movementType: MovementType;
  titleTypes: string[];
  accountTypes: string[];
  flowCategories: string[];
  statusTypes: string[];
}

const defaultFilters: AdvancedFilters = {
  periodType: 'month',
  dateType: 'payment',
  movementType: 'all',
  titleTypes: [],
  accountTypes: [],
  flowCategories: [],
  statusTypes: [],
};

export default function FluxoCaixa() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [filters, setFilters] = useState<AdvancedFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  const { data: cashflow = [], isLoading } = useCashflowMonthly(year);
  
  // Calculate running balance
  let runningBalance = 0;
  const chartData = cashflow.map((item) => {
    runningBalance += Number(item.resultado || 0);
    return {
      month: formatShortMonth(item.month || 0),
      entradas: Number(item.entradas_pagas || 0),
      saidas: Number(item.saidas_pagas || 0),
      resultado: Number(item.resultado || 0),
      saldo: runningBalance,
      entradas_previstas: Number(item.entradas_previstas || 0),
      saidas_previstas: Number(item.saidas_previstas || 0),
    };
  });

  const totals = cashflow.reduce(
    (acc, item) => ({
      entradas: acc.entradas + Number(item.entradas_pagas || 0),
      saidas: acc.saidas + Number(item.saidas_pagas || 0),
      resultado: acc.resultado + Number(item.resultado || 0),
      entradas_previstas: acc.entradas_previstas + Number(item.entradas_previstas || 0),
      saidas_previstas: acc.saidas_previstas + Number(item.saidas_previstas || 0),
    }),
    { entradas: 0, saidas: 0, resultado: 0, entradas_previstas: 0, saidas_previstas: 0 }
  );

  const lucratividade = totals.entradas > 0 
    ? ((totals.resultado / totals.entradas) * 100).toFixed(1) 
    : '0.0';

  const activeFiltersCount = [
    filters.titleTypes.length > 0,
    filters.accountTypes.length > 0,
    filters.flowCategories.length > 0,
    filters.statusTypes.length > 0,
    filters.movementType !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => setFilters(defaultFilters);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start gap-4">
          <BackButton />
          <div className="flex-1">
            <PageHeader title="Fluxo de Caixa" description="Acompanhe entradas e saídas realizadas">
              <div className="flex items-center gap-2">
                {/* Period Filter */}
                <Select value={filters.periodType} onValueChange={(v) => setFilters(f => ({ ...f, periodType: v as PeriodType }))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Dia</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                    <SelectItem value="quarter">Trimestre</SelectItem>
                    <SelectItem value="year">Ano</SelectItem>
                    <SelectItem value="custom">Customizado</SelectItem>
                  </SelectContent>
                </Select>

                {/* Year Filter */}
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date Type Filter */}
                <Select value={filters.dateType} onValueChange={(v) => setFilters(f => ({ ...f, dateType: v as DateType }))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="issue">Data Emissão</SelectItem>
                    <SelectItem value="due">Data Vencimento</SelectItem>
                    <SelectItem value="payment">Data Pagamento</SelectItem>
                  </SelectContent>
                </Select>

                {/* Advanced Filters */}
                <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filtros
                      {activeFiltersCount > 0 && (
                        <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
                          {activeFiltersCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Filtros Avançados</h4>
                        {activeFiltersCount > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearFilters}>
                            <X className="h-4 w-4 mr-1" /> Limpar
                          </Button>
                        )}
                      </div>
                      
                      <Separator />

                      {/* Movement Type */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Tipo de Movimento</Label>
                        <Select value={filters.movementType} onValueChange={(v) => setFilters(f => ({ ...f, movementType: v as MovementType }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="entries">Só Entradas</SelectItem>
                            <SelectItem value="exits">Só Saídas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Title Types */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Tipo de Título</Label>
                        <div className="space-y-1">
                          {['Contas a Receber', 'Contas a Pagar', 'Transferências', 'Conciliações', 'Ajustes'].map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox
                                id={type}
                                checked={filters.titleTypes.includes(type)}
                                onCheckedChange={(checked) => {
                                  setFilters(f => ({
                                    ...f,
                                    titleTypes: checked 
                                      ? [...f.titleTypes, type]
                                      : f.titleTypes.filter(t => t !== type)
                                  }));
                                }}
                              />
                              <Label htmlFor={type} className="text-sm">{type}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Account Types */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Conta Financeira</Label>
                        <div className="space-y-1">
                          {['Caixa', 'Conta Corrente', 'Cartão', 'Conta Pagamento'].map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox
                                id={`acc-${type}`}
                                checked={filters.accountTypes.includes(type)}
                                onCheckedChange={(checked) => {
                                  setFilters(f => ({
                                    ...f,
                                    accountTypes: checked 
                                      ? [...f.accountTypes, type]
                                      : f.accountTypes.filter(t => t !== type)
                                  }));
                                }}
                              />
                              <Label htmlFor={`acc-${type}`} className="text-sm">{type}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Flow Categories */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Categoria de Fluxo</Label>
                        <div className="space-y-1">
                          {['Operacional', 'Investimento', 'Financiamento'].map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox
                                id={`flow-${type}`}
                                checked={filters.flowCategories.includes(type)}
                                onCheckedChange={(checked) => {
                                  setFilters(f => ({
                                    ...f,
                                    flowCategories: checked 
                                      ? [...f.flowCategories, type]
                                      : f.flowCategories.filter(t => t !== type)
                                  }));
                                }}
                              />
                              <Label htmlFor={`flow-${type}`} className="text-sm">{type}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Status Types */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Situação</Label>
                        <div className="space-y-1">
                          {['Previsto', 'Em Aberto', 'Parcialmente Pago', 'Pago/Recebido', 'Cancelado'].map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox
                                id={`status-${type}`}
                                checked={filters.statusTypes.includes(type)}
                                onCheckedChange={(checked) => {
                                  setFilters(f => ({
                                    ...f,
                                    statusTypes: checked 
                                      ? [...f.statusTypes, type]
                                      : f.statusTypes.filter(t => t !== type)
                                  }));
                                }}
                              />
                              <Label htmlFor={`status-${type}`} className="text-sm">{type}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </PageHeader>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card className="kpi-card kpi-card-success">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Entradas</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold value-positive">{formatCurrency(totals.entradas)}</div>
              <p className="text-xs text-muted-foreground">Previsto: {formatCurrency(totals.entradas_previstas)}</p>
            </CardContent>
          </Card>
          <Card className="kpi-card kpi-card-danger">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saídas</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold value-negative">{formatCurrency(totals.saidas)}</div>
              <p className="text-xs text-muted-foreground">Previsto: {formatCurrency(totals.saidas_previstas)}</p>
            </CardContent>
          </Card>
          <Card className="kpi-card kpi-card-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resultado</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totals.resultado >= 0 ? 'value-positive' : 'value-negative'}`}>
                {formatCurrency(totals.resultado)}
              </div>
            </CardContent>
          </Card>
          <Card className="kpi-card kpi-card-warning">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lucratividade</CardTitle>
              <Target className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lucratividade}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Entradas x Saídas por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Adicione lançamentos para visualizar o gráfico
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Saldo Acumulado</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="saldo" 
                      name="Saldo" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Adicione lançamentos para visualizar o gráfico
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th className="text-right">Entradas</th>
                    <th className="text-right">Saídas</th>
                    <th className="text-right">Resultado</th>
                    <th className="text-right">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="font-medium">{row.month}</td>
                      <td className="text-right value-positive">{formatCurrency(row.entradas)}</td>
                      <td className="text-right value-negative">{formatCurrency(row.saidas)}</td>
                      <td className={`text-right font-semibold ${row.resultado >= 0 ? 'value-positive' : 'value-negative'}`}>
                        {formatCurrency(row.resultado)}
                      </td>
                      <td className={`text-right font-semibold ${row.saldo >= 0 ? 'value-positive' : 'value-negative'}`}>
                        {formatCurrency(row.saldo)}
                      </td>
                    </tr>
                  ))}
                  {chartData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum dado para exibir
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
