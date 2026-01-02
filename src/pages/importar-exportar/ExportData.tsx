import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  ArrowLeft, 
  Download,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  CalendarIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  exportToExcel, 
  exportMultipleSheets,
  formatCurrencyForExport, 
  formatDateForExport,
  formatPercentForExport,
  formatBooleanForExport,
  formatStatusForExport,
  formatDirectionForExport,
} from '@/lib/excel/exporter';
import type { ExportColumn } from '@/lib/excel/exporter';

type ExportType = 'transactions_ar' | 'transactions_ap' | 'transactions' | 'accounts' | 'counterparties' | 'wallets' | 'cost_centers' | 'budgets';
type ReportType = 'cashflow' | 'dre' | 'indicators' | 'rc_flow' | 'budgets';

const ENTITY_LABELS: Record<ExportType, string> = {
  transactions_ar: 'Contas a Receber',
  transactions_ap: 'Contas a Pagar',
  transactions: 'Lançamentos',
  accounts: 'Plano de Contas',
  counterparties: 'Clientes/Fornecedores',
  wallets: 'Carteiras',
  cost_centers: 'Centros de Custo',
  budgets: 'Metas/Orçamento',
};

const REPORT_LABELS: Record<ReportType, string> = {
  cashflow: 'Fluxo de Caixa',
  dre: 'DRE - Demonstrativo de Resultados',
  indicators: 'Indicadores (RC)',
  rc_flow: 'Fluxo por Conta (RC)',
  budgets: 'Metas x Realizado',
};

const DATE_FIELD_OPTIONS = {
  transactions: [
    { value: 'transaction_date', label: 'Data do Lançamento' },
    { value: 'due_date', label: 'Data de Vencimento' },
    { value: 'paid_date', label: 'Data de Pagamento' },
  ],
  transactions_ar: [
    { value: 'due_date', label: 'Data de Vencimento' },
    { value: 'document_date', label: 'Data de Emissão' },
    { value: 'paid_date', label: 'Data de Recebimento' },
  ],
  transactions_ap: [
    { value: 'due_date', label: 'Data de Vencimento' },
    { value: 'document_date', label: 'Data de Emissão' },
    { value: 'paid_date', label: 'Data de Pagamento' },
  ],
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Em Aberto' },
  { value: 'paid', label: 'Pagos' },
  { value: 'overdue', label: 'Vencidos' },
];

const QUICK_RANGES = [
  { label: 'Este mês', getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Mês passado', getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Últimos 3 meses', getRange: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
  { label: 'Este ano', getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

export default function ExportData() {
  const { type, report } = useParams<{ type: string; report?: string }>();
  const navigate = useNavigate();
  const { currentCompany } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  
  // Date filters
  const [fromDate, setFromDate] = useState<Date>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date>(endOfMonth(new Date()));
  const [dateField, setDateField] = useState('due_date');
  const [status, setStatus] = useState('all');

  const isReport = !!report || type?.includes('report');
  const entityType = type as ExportType;
  const reportType = report as ReportType || (type?.replace('report/', '') as ReportType);

  const needsDateFilter = ['transactions', 'transactions_ar', 'transactions_ap'].includes(entityType) || isReport;
  const hasStatusFilter = ['transactions_ar', 'transactions_ap'].includes(entityType);

  const title = isReport 
    ? REPORT_LABELS[reportType] || 'Relatório'
    : ENTITY_LABELS[entityType] || 'Dados';

  const handleQuickRange = (getRange: () => { from: Date; to: Date }) => {
    const range = getRange();
    setFromDate(range.from);
    setToDate(range.to);
  };

  const handleExport = async () => {
    if (!currentCompany) {
      toast.error('Selecione uma empresa');
      return;
    }

    setLoading(true);
    setExportComplete(false);

    try {
      const filters = {
        fromDate: format(fromDate, 'yyyy-MM-dd'),
        toDate: format(toDate, 'yyyy-MM-dd'),
        dateField,
        status: status !== 'all' ? status : undefined,
      };

      if (isReport && reportType) {
        await exportReportWithDates(reportType, currentCompany.id, filters, currentCompany.name);
      } else {
        await exportEntityDataWithDates(entityType, currentCompany.id, filters, currentCompany.name);
      }
      setExportComplete(true);
      toast.success('Exportação concluída!');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setLoading(false);
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
            <h1 className="text-2xl font-bold tracking-tight">
              Exportar {title}
            </h1>
            <p className="text-muted-foreground">
              Exporte os dados para Excel com formatação profissional
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Configurações de Exportação
            </CardTitle>
            <CardDescription>
              Configure os filtros e clique em Exportar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Range Filters */}
            {needsDateFilter && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {QUICK_RANGES.map((range) => (
                    <Button
                      key={range.label}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickRange(range.getRange)}
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Data Inicial</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !fromDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fromDate ? format(fromDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={fromDate}
                          onSelect={(date) => date && setFromDate(date)}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Data Final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !toDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {toDate ? format(toDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={toDate}
                          onSelect={(date) => date && setToDate(date)}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {DATE_FIELD_OPTIONS[entityType as keyof typeof DATE_FIELD_OPTIONS] && (
                    <div className="space-y-2">
                      <Label>Filtrar por</Label>
                      <Select value={dateField} onValueChange={setDateField}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATE_FIELD_OPTIONS[entityType as keyof typeof DATE_FIELD_OPTIONS].map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Status Filter */}
                {hasStatusFilter && (
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button onClick={handleExport} disabled={loading} size="lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar para Excel
                  </>
                )}
              </Button>

              {exportComplete && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Arquivo baixado com sucesso!</span>
                </div>
              )}
            </div>

            <div className="rounded-lg bg-muted p-4">
              <h4 className="font-medium mb-2">O que será exportado:</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {needsDateFilter && (
                  <li>Período: {format(fromDate, 'dd/MM/yyyy')} até {format(toDate, 'dd/MM/yyyy')}</li>
                )}
                {isReport ? (
                  <>
                    <li>Relatório completo do período selecionado</li>
                    <li>Formatação profissional com cabeçalho e rodapé</li>
                    <li>Valores monetários formatados em R$</li>
                    {reportType === 'dre' && <li>Resumo e detalhamento em abas separadas</li>}
                    {reportType === 'cashflow' && <li>Fluxo com entradas e saídas</li>}
                  </>
                ) : (
                  <>
                    <li>Registros de {title}</li>
                    <li>Formatação profissional com cabeçalho</li>
                    <li>Colunas ajustadas automaticamente</li>
                    <li>Pronto para impressão ou análise</li>
                  </>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

interface ExportFilters {
  fromDate: string;
  toDate: string;
  dateField: string;
  status?: string;
}

async function exportEntityDataWithDates(entityType: ExportType, companyId: string, filters: ExportFilters, companyName: string) {
  let data: Record<string, unknown>[] = [];
  let columns: ExportColumn[] = [];
  let filename = '';
  let title = '';

  switch (entityType) {
    case 'transactions_ar': {
      const { data: result } = await supabase
        .from('v_ar_open')
        .select('*')
        .eq('company_id', companyId)
        .gte(filters.dateField, filters.fromDate)
        .lte(filters.dateField, filters.toDate)
        .order(filters.dateField, { ascending: false })
        .limit(10000);

      data = (result || []).map((t: any) => ({
        ...t,
        counterparty_name: t.counterparty_name,
        wallet_name: t.wallet_name,
        account_name: t.account_name,
        account_code: t.account_code,
      }));
      
      columns = [
        { header: 'Vencimento', key: 'due_date', format: formatDateForExport, width: 12 },
        { header: 'Status', key: 'status', format: formatStatusForExport, width: 12 },
        { header: 'Cliente', key: 'counterparty_name', width: 25 },
        { header: 'Descrição', key: 'description', width: 30 },
        { header: 'Valor Original', key: 'original_amount', format: formatCurrencyForExport, width: 16 },
        { header: 'Valor Total', key: 'total_amount', format: formatCurrencyForExport, width: 16 },
        { header: 'Carteira', key: 'wallet_name', width: 20 },
        { header: 'Conta', key: 'account_name', width: 25 },
        { header: 'Atrasado', key: 'is_overdue', format: formatBooleanForExport, width: 10 },
        { header: 'Dias Atraso', key: 'days_late', width: 12 },
      ];
      filename = `contas_receber_${filters.fromDate}_${filters.toDate}`;
      title = 'Relatório de Contas a Receber';
      break;
    }

    case 'transactions_ap': {
      const { data: result } = await supabase
        .from('v_ap_open')
        .select('*')
        .eq('company_id', companyId)
        .gte(filters.dateField, filters.fromDate)
        .lte(filters.dateField, filters.toDate)
        .order(filters.dateField, { ascending: false })
        .limit(10000);

      data = (result || []).map((t: any) => ({
        ...t,
        counterparty_name: t.counterparty_name,
        wallet_name: t.wallet_name,
        account_name: t.account_name,
        account_code: t.account_code,
      }));
      
      columns = [
        { header: 'Vencimento', key: 'due_date', format: formatDateForExport, width: 12 },
        { header: 'Status', key: 'status', format: formatStatusForExport, width: 12 },
        { header: 'Fornecedor', key: 'counterparty_name', width: 25 },
        { header: 'Descrição', key: 'description', width: 30 },
        { header: 'Valor Original', key: 'original_amount', format: formatCurrencyForExport, width: 16 },
        { header: 'Valor Total', key: 'total_amount', format: formatCurrencyForExport, width: 16 },
        { header: 'Carteira', key: 'wallet_name', width: 20 },
        { header: 'Conta', key: 'account_name', width: 25 },
        { header: 'Atrasado', key: 'is_overdue', format: formatBooleanForExport, width: 10 },
        { header: 'Dias Atraso', key: 'days_late', width: 12 },
      ];
      filename = `contas_pagar_${filters.fromDate}_${filters.toDate}`;
      title = 'Relatório de Contas a Pagar';
      break;
    }

    case 'transactions': {
      const { data: result } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts(name, code),
          wallets(name),
          counterparties(name),
          cost_centers(name)
        `)
        .eq('company_id', companyId)
        .gte(filters.dateField, filters.fromDate)
        .lte(filters.dateField, filters.toDate)
        .order(filters.dateField as any, { ascending: false })
        .limit(10000);

      data = (result || []).map((t: Record<string, unknown>) => ({
        ...t,
        account_name: (t.accounts as Record<string, unknown>)?.name,
        account_code: (t.accounts as Record<string, unknown>)?.code,
        wallet_name: (t.wallets as Record<string, unknown>)?.name,
        counterparty_name: (t.counterparties as Record<string, unknown>)?.name,
        cost_center_name: (t.cost_centers as Record<string, unknown>)?.name,
      }));

      columns = [
        { header: 'Data', key: 'transaction_date', format: formatDateForExport, width: 12 },
        { header: 'Vencimento', key: 'due_date', format: formatDateForExport, width: 12 },
        { header: 'Pagamento', key: 'paid_date', format: formatDateForExport, width: 12 },
        { header: 'Descrição', key: 'description', width: 30 },
        { header: 'Direção', key: 'direction', format: formatDirectionForExport, width: 10 },
        { header: 'Valor', key: 'original_amount', format: formatCurrencyForExport, width: 16 },
        { header: 'Status', key: 'status', format: formatStatusForExport, width: 12 },
        { header: 'Carteira', key: 'wallet_name', width: 20 },
        { header: 'Cód. Conta', key: 'account_code', width: 12 },
        { header: 'Conta', key: 'account_name', width: 25 },
        { header: 'Cliente/Fornecedor', key: 'counterparty_name', width: 25 },
        { header: 'Centro de Custo', key: 'cost_center_name', width: 20 },
      ];
      filename = `lancamentos_${filters.fromDate}_${filters.toDate}`;
      title = 'Relatório de Lançamentos';
      break;
    }

    case 'accounts': {
      const { data: result } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', companyId)
        .order('code');

      data = result || [];
      columns = [
        { header: 'Código', key: 'code', width: 15 },
        { header: 'Nome', key: 'name', width: 40 },
        { header: 'Categoria', key: 'category_type', width: 20 },
        { header: 'Nível', key: 'level', width: 8 },
        { header: 'Gerencial', key: 'is_managerial', format: formatBooleanForExport, width: 12 },
        { header: 'Ativo', key: 'is_active', format: formatBooleanForExport, width: 10 },
      ];
      filename = 'plano_contas';
      title = 'Plano de Contas';
      break;
    }

    case 'counterparties': {
      const { data: result } = await supabase
        .from('counterparties')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      data = result || [];
      columns = [
        { header: 'Nome', key: 'name', width: 30 },
        { header: 'Tipo', key: 'type', width: 15 },
        { header: 'CPF/CNPJ', key: 'document', width: 18 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Telefone', key: 'phone', width: 15 },
        { header: 'Ativo', key: 'is_active', format: formatBooleanForExport, width: 10 },
      ];
      filename = 'clientes_fornecedores';
      title = 'Cadastro de Clientes e Fornecedores';
      break;
    }

    case 'wallets': {
      const { data: result } = await supabase
        .from('wallets')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      data = result || [];
      columns = [
        { header: 'Nome', key: 'name', width: 30 },
        { header: 'Tipo', key: 'type', width: 15 },
        { header: 'Saldo Inicial', key: 'opening_balance', format: formatCurrencyForExport, width: 16 },
        { header: 'Ativo', key: 'is_active', format: formatBooleanForExport, width: 10 },
      ];
      filename = 'carteiras';
      title = 'Cadastro de Carteiras';
      break;
    }

    case 'cost_centers': {
      const { data: result } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('company_id', companyId)
        .order('code');

      data = result || [];
      columns = [
        { header: 'Código', key: 'code', width: 15 },
        { header: 'Nome', key: 'name', width: 40 },
        { header: 'Ativo', key: 'is_active', format: formatBooleanForExport, width: 10 },
      ];
      filename = 'centros_custo';
      title = 'Cadastro de Centros de Custo';
      break;
    }

    case 'budgets': {
      const { data: result } = await supabase
        .from('budgets')
        .select('*')
        .eq('company_id', companyId)
        .order('year', { ascending: false })
        .order('month');

      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      
      data = (result || []).map((b: Record<string, unknown>) => ({
        ...b,
        month_name: monthNames[(b.month as number) - 1],
      }));
      
      columns = [
        { header: 'Ano', key: 'year', width: 10 },
        { header: 'Mês', key: 'month_name', width: 12 },
        { header: 'Meta Receita', key: 'target_revenue', format: formatCurrencyForExport, width: 16 },
        { header: 'Meta Despesa', key: 'target_expense', format: formatCurrencyForExport, width: 16 },
        { header: 'Meta Lucro', key: 'target_profit', format: formatCurrencyForExport, width: 16 },
        { header: 'Meta Margem %', key: 'target_margin', format: formatPercentForExport, width: 14 },
      ];
      filename = 'metas_orcamento';
      title = 'Metas e Orçamento';
      break;
    }
  }

  const periodLabel = `Período: ${filters.fromDate} a ${filters.toDate}`;

  exportToExcel({
    filename: `${filename}`,
    sheetName: 'Dados',
    title: `${title} - ${companyName}`,
    subtitle: periodLabel,
    columns,
    data,
  });
}

async function exportReportWithDates(reportType: ReportType, companyId: string, filters: ExportFilters, companyName: string) {
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const fromYear = parseInt(filters.fromDate.slice(0, 4));
  const toYear = parseInt(filters.toDate.slice(0, 4));
  const fromMonth = parseInt(filters.fromDate.slice(5, 7));
  const toMonth = parseInt(filters.toDate.slice(5, 7));

  switch (reportType) {
    case 'cashflow': {
      const { data: monthlyResult } = await supabase
        .from('v_cashflow_monthly')
        .select('*')
        .eq('company_id', companyId)
        .gte('year', fromYear)
        .lte('year', toYear)
        .order('year')
        .order('month');

      const filteredData = (monthlyResult || []).filter((r: any) => {
        const periodValue = r.year * 100 + r.month;
        const fromValue = fromYear * 100 + fromMonth;
        const toValue = toYear * 100 + toMonth;
        return periodValue >= fromValue && periodValue <= toValue;
      });

      const monthlyData = filteredData.map((r: Record<string, unknown>) => ({
        ...r,
        period: `${monthNames[(r.month as number) - 1]}/${r.year}`,
      }));

      exportToExcel({
        filename: `fluxo_caixa_${filters.fromDate}_${filters.toDate}`,
        sheetName: 'Fluxo de Caixa',
        title: `Fluxo de Caixa - ${companyName}`,
        subtitle: `Período: ${filters.fromDate} a ${filters.toDate}`,
        columns: [
          { header: 'Período', key: 'period', width: 15 },
          { header: 'Entradas Previstas', key: 'entradas_previstas', format: formatCurrencyForExport, width: 20 },
          { header: 'Entradas Pagas', key: 'entradas_pagas', format: formatCurrencyForExport, width: 20 },
          { header: 'Saídas Previstas', key: 'saidas_previstas', format: formatCurrencyForExport, width: 20 },
          { header: 'Saídas Pagas', key: 'saidas_pagas', format: formatCurrencyForExport, width: 20 },
          { header: 'Resultado', key: 'resultado', format: formatCurrencyForExport, width: 16 },
        ],
        data: monthlyData,
      });
      break;
    }

    case 'dre': {
      const { data: dreResult } = await supabase
        .from('v_dre_monthly')
        .select('*')
        .eq('company_id', companyId)
        .gte('year', fromYear)
        .lte('year', toYear)
        .order('category_type')
        .order('account_code');

      const filteredData = (dreResult || []).filter((r: any) => {
        const periodValue = r.year * 100 + r.month;
        const fromValue = fromYear * 100 + fromMonth;
        const toValue = toYear * 100 + toMonth;
        return periodValue >= fromValue && periodValue <= toValue;
      });

      const dreData = filteredData.map((r: Record<string, unknown>) => ({
        ...r,
        period: `${monthNames[(r.month as number) - 1]}/${r.year}`,
      }));

      exportToExcel({
        filename: `dre_${filters.fromDate}_${filters.toDate}`,
        sheetName: 'DRE',
        title: `DRE - Demonstrativo de Resultados - ${companyName}`,
        subtitle: `Período: ${filters.fromDate} a ${filters.toDate}`,
        columns: [
          { header: 'Período', key: 'period', width: 15 },
          { header: 'Categoria', key: 'category_type', width: 15 },
          { header: 'Cód. Conta', key: 'account_code', width: 12 },
          { header: 'Conta', key: 'account_name', width: 30 },
          { header: 'Valor', key: 'amount', format: formatCurrencyForExport, width: 16 },
        ],
        data: dreData,
      });
      break;
    }

    case 'indicators':
    case 'rc_flow': {
      const { data: rcResult } = await supabase
        .from('v_rc_flow_by_account')
        .select('*')
        .eq('company_id', companyId)
        .gte('year', fromYear)
        .lte('year', toYear)
        .order('account_code');

      const filteredData = (rcResult || []).filter((r: any) => {
        const periodValue = r.year * 100 + r.month;
        const fromValue = fromYear * 100 + fromMonth;
        const toValue = toYear * 100 + toMonth;
        return periodValue >= fromValue && periodValue <= toValue;
      });

      const rcData = filteredData.map((r: Record<string, unknown>) => ({
        ...r,
        period: `${monthNames[(r.month as number) - 1]}/${r.year}`,
      }));

      exportToExcel({
        filename: `rc_flow_${filters.fromDate}_${filters.toDate}`,
        sheetName: 'Fluxo por Conta',
        title: `Fluxo por Conta (RC) - ${companyName}`,
        subtitle: `Período: ${filters.fromDate} a ${filters.toDate}`,
        columns: [
          { header: 'Período', key: 'period', width: 15 },
          { header: 'Cód. Conta', key: 'account_code', width: 12 },
          { header: 'Conta', key: 'account_name', width: 30 },
          { header: 'Entradas', key: 'inflows', format: formatCurrencyForExport, width: 16 },
          { header: 'Saídas', key: 'outflows', format: formatCurrencyForExport, width: 16 },
          { header: 'Saldo', key: 'net', format: formatCurrencyForExport, width: 16 },
        ],
        data: rcData,
      });
      break;
    }

    case 'budgets': {
      const { data: budgetResult } = await supabase
        .from('budgets')
        .select('*')
        .eq('company_id', companyId)
        .gte('year', fromYear)
        .lte('year', toYear)
        .order('year')
        .order('month');

      const filteredData = (budgetResult || []).filter((r: any) => {
        const periodValue = r.year * 100 + r.month;
        const fromValue = fromYear * 100 + fromMonth;
        const toValue = toYear * 100 + toMonth;
        return periodValue >= fromValue && periodValue <= toValue;
      });

      const budgetData = filteredData.map((r: Record<string, unknown>) => ({
        ...r,
        period: `${monthNames[(r.month as number) - 1]}/${r.year}`,
      }));

      exportToExcel({
        filename: `metas_${filters.fromDate}_${filters.toDate}`,
        sheetName: 'Metas',
        title: `Metas x Realizado - ${companyName}`,
        subtitle: `Período: ${filters.fromDate} a ${filters.toDate}`,
        columns: [
          { header: 'Período', key: 'period', width: 15 },
          { header: 'Meta Receita', key: 'target_revenue', format: formatCurrencyForExport, width: 16 },
          { header: 'Meta Despesa', key: 'target_expense', format: formatCurrencyForExport, width: 16 },
          { header: 'Meta Lucro', key: 'target_profit', format: formatCurrencyForExport, width: 16 },
          { header: 'Meta Margem %', key: 'target_margin', format: formatPercentForExport, width: 14 },
        ],
        data: budgetData,
      });
      break;
    }
  }
}
