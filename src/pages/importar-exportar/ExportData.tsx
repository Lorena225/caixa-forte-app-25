import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Download,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  cashflow: 'Fluxo de Caixa Mensal',
  dre: 'DRE - Demonstrativo de Resultados',
  indicators: 'Indicadores (RC)',
  rc_flow: 'Fluxo por Conta (RC)',
  budgets: 'Metas x Realizado',
};

export default function ExportData() {
  const { type, report } = useParams<{ type: string; report?: string }>();
  const navigate = useNavigate();
  const { currentCompany } = useAuth();
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [exportComplete, setExportComplete] = useState(false);

  const isReport = !!report || type?.includes('report');
  const entityType = type as ExportType;
  const reportType = report as ReportType || (type?.replace('report/', '') as ReportType);

  const title = isReport 
    ? REPORT_LABELS[reportType] || 'Relatório'
    : ENTITY_LABELS[entityType] || 'Dados';

  const handleExport = async () => {
    if (!currentCompany) {
      toast.error('Selecione uma empresa');
      return;
    }

    setLoading(true);
    setExportComplete(false);

    try {
      if (isReport && reportType) {
        await exportReport(reportType, currentCompany.id, parseInt(year), currentCompany.name);
      } else {
        await exportEntityData(entityType, currentCompany.id, currentCompany.name);
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
            {isReport && (
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => {
                      const y = new Date().getFullYear() - i;
                      return (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
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
                {isReport ? (
                  <>
                    <li>Relatório completo do ano {year}</li>
                    <li>Formatação profissional com cabeçalho e rodapé</li>
                    <li>Valores monetários formatados em R$</li>
                    <li>Data e hora da exportação</li>
                    {reportType === 'dre' && <li>Resumo anual e detalhamento mensal em abas separadas</li>}
                    {reportType === 'cashflow' && <li>Fluxo mensal com entradas e saídas</li>}
                    {reportType === 'budgets' && <li>Comparativo com variação percentual</li>}
                  </>
                ) : (
                  <>
                    <li>Todos os registros ativos de {title}</li>
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

async function exportEntityData(entityType: ExportType, companyId: string, companyName: string) {
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
        .order('due_date');

      data = result || [];
      columns = [
        { header: 'Descrição', key: 'description', width: 30 },
        { header: 'Cliente', key: 'counterparty_name', width: 25 },
        { header: 'Vencimento', key: 'due_date', format: formatDateForExport, width: 12 },
        { header: 'Valor Original', key: 'original_amount', format: formatCurrencyForExport, width: 16 },
        { header: 'Valor Total', key: 'total_amount', format: formatCurrencyForExport, width: 16 },
        { header: 'Status', key: 'status', format: formatStatusForExport, width: 12 },
        { header: 'Carteira', key: 'wallet_name', width: 20 },
        { header: 'Conta', key: 'account_name', width: 25 },
        { header: 'Atrasado', key: 'is_overdue', format: formatBooleanForExport, width: 10 },
        { header: 'Dias Atraso', key: 'days_late', width: 12 },
      ];
      filename = 'contas_receber';
      title = 'Relatório de Contas a Receber';
      break;
    }

    case 'transactions_ap': {
      const { data: result } = await supabase
        .from('v_ap_open')
        .select('*')
        .eq('company_id', companyId)
        .order('due_date');

      data = result || [];
      columns = [
        { header: 'Descrição', key: 'description', width: 30 },
        { header: 'Fornecedor', key: 'counterparty_name', width: 25 },
        { header: 'Vencimento', key: 'due_date', format: formatDateForExport, width: 12 },
        { header: 'Valor Original', key: 'original_amount', format: formatCurrencyForExport, width: 16 },
        { header: 'Valor Total', key: 'total_amount', format: formatCurrencyForExport, width: 16 },
        { header: 'Status', key: 'status', format: formatStatusForExport, width: 12 },
        { header: 'Carteira', key: 'wallet_name', width: 20 },
        { header: 'Conta', key: 'account_name', width: 25 },
        { header: 'Atrasado', key: 'is_overdue', format: formatBooleanForExport, width: 10 },
        { header: 'Dias Atraso', key: 'days_late', width: 12 },
      ];
      filename = 'contas_pagar';
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
        .order('transaction_date', { ascending: false })
        .limit(5000);

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
        { header: 'Descrição', key: 'description', width: 30 },
        { header: 'Direção', key: 'direction', format: formatDirectionForExport, width: 10 },
        { header: 'Valor Original', key: 'original_amount', format: formatCurrencyForExport, width: 16 },
        { header: 'Juros', key: 'interest_amount', format: formatCurrencyForExport, width: 12 },
        { header: 'Desconto %', key: 'discount_percent', format: formatPercentForExport, width: 12 },
        { header: 'Valor Total', key: 'total_amount', format: formatCurrencyForExport, width: 16 },
        { header: 'Status', key: 'status', format: formatStatusForExport, width: 12 },
        { header: 'Carteira', key: 'wallet_name', width: 20 },
        { header: 'Cód. Conta', key: 'account_code', width: 12 },
        { header: 'Conta', key: 'account_name', width: 25 },
        { header: 'Cliente/Fornecedor', key: 'counterparty_name', width: 25 },
        { header: 'Centro de Custo', key: 'cost_center_name', width: 20 },
      ];
      filename = 'lancamentos';
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
        { header: 'Endereço', key: 'address', width: 40 },
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
        { header: 'Dia Fechamento', key: 'closing_day', width: 16 },
        { header: 'Dia Vencimento', key: 'due_day', width: 16 },
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

  exportToExcel({
    filename: `${filename}_${new Date().toISOString().slice(0, 10)}`,
    sheetName: 'Dados',
    title: `${title} - ${companyName}`,
    columns,
    data,
  });
}

async function exportReport(reportType: ReportType, companyId: string, year: number, companyName: string) {
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthNamesShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  switch (reportType) {
    case 'cashflow': {
      const { data: monthlyResult } = await supabase
        .from('v_cashflow_monthly')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', year)
        .order('month');

      const monthlyData = (monthlyResult || []).map((r: Record<string, unknown>) => ({
        ...r,
        month_name: monthNames[(r.month as number) - 1],
      }));

      // Calculate accumulated balance
      let accumulated = 0;
      const dataWithAccumulated = monthlyData.map((row: Record<string, unknown>) => {
        accumulated += (row.resultado as number) || 0;
        return { ...row, accumulated };
      });

      exportToExcel({
        filename: `fluxo_caixa_${year}`,
        sheetName: 'Fluxo de Caixa',
        title: `Fluxo de Caixa ${year} - ${companyName}`,
        subtitle: 'Resumo Mensal de Entradas e Saídas',
        columns: [
          { header: 'Mês', key: 'month_name', width: 12 },
          { header: 'Entradas Previstas', key: 'entradas_previstas', format: formatCurrencyForExport, width: 20 },
          { header: 'Entradas Realizadas', key: 'entradas_pagas', format: formatCurrencyForExport, width: 20 },
          { header: 'Saídas Previstas', key: 'saidas_previstas', format: formatCurrencyForExport, width: 20 },
          { header: 'Saídas Realizadas', key: 'saidas_pagas', format: formatCurrencyForExport, width: 20 },
          { header: 'Resultado Mês', key: 'resultado', format: formatCurrencyForExport, width: 16 },
          { header: 'Acumulado', key: 'accumulated', format: formatCurrencyForExport, width: 16 },
        ],
        data: dataWithAccumulated,
      });
      break;
    }

    case 'dre': {
      // Get monthly data
      const { data: monthlyResult } = await supabase
        .from('v_dre_monthly')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', year)
        .order('category_type')
        .order('account_code');

      const monthlyData = (monthlyResult || []).map((r: Record<string, unknown>) => ({
        ...r,
        month_name: monthNamesShort[(r.month as number) - 1],
      }));

      // Calculate annual totals per account
      const annualTotals = new Map<string, Record<string, unknown>>();
      monthlyData.forEach((row: Record<string, unknown>) => {
        const key = row.account_code as string;
        if (!annualTotals.has(key)) {
          annualTotals.set(key, {
            account_code: row.account_code,
            account_name: row.account_name,
            category_type: row.category_type,
            total: 0,
          });
        }
        const current = annualTotals.get(key)!;
        current.total = (current.total as number) + ((row.total as number) || 0);
      });

      const annualData = Array.from(annualTotals.values());

      // Export with multiple sheets
      exportMultipleSheets(`dre_${year}`, [
        {
          name: 'Resumo Anual',
          title: `DRE Anual ${year} - ${companyName}`,
          columns: [
            { header: 'Código', key: 'account_code', width: 15 },
            { header: 'Conta', key: 'account_name', width: 40 },
            { header: 'Categoria', key: 'category_type', width: 20 },
            { header: 'Total Anual', key: 'total', format: formatCurrencyForExport, width: 18 },
          ],
          data: annualData,
        },
        {
          name: 'Detalhamento Mensal',
          title: `DRE Mensal ${year}`,
          columns: [
            { header: 'Código', key: 'account_code', width: 15 },
            { header: 'Conta', key: 'account_name', width: 40 },
            { header: 'Categoria', key: 'category_type', width: 20 },
            { header: 'Mês', key: 'month_name', width: 10 },
            { header: 'Valor', key: 'total', format: formatCurrencyForExport, width: 18 },
          ],
          data: monthlyData,
        },
      ]);
      break;
    }

    case 'indicators': {
      const { data: result } = await supabase
        .from('v_rc_indicators_monthly')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', year)
        .order('month');

      const data = (result || []).map((r: Record<string, unknown>) => ({
        ...r,
        month_name: monthNames[(r.month as number) - 1],
      }));

      exportToExcel({
        filename: `indicadores_rc_${year}`,
        sheetName: 'Indicadores',
        title: `Indicadores Financeiros ${year} - ${companyName}`,
        subtitle: 'Receitas, Despesas e Lucratividade',
        columns: [
          { header: 'Mês', key: 'month_name', width: 12 },
          { header: 'Receita Prevista', key: 'receita_prevista', format: formatCurrencyForExport, width: 18 },
          { header: 'Receita Realizada', key: 'receita_realizada', format: formatCurrencyForExport, width: 18 },
          { header: 'Despesa Prevista', key: 'despesa_prevista', format: formatCurrencyForExport, width: 18 },
          { header: 'Despesa Realizada', key: 'despesa_realizada', format: formatCurrencyForExport, width: 18 },
          { header: 'Lucro/Prejuízo', key: 'lucro_prejuizo', format: formatCurrencyForExport, width: 16 },
          { header: 'Lucratividade %', key: 'lucratividade', format: formatPercentForExport, width: 14 },
        ],
        data,
      });
      break;
    }

    case 'rc_flow': {
      const { data: result } = await supabase
        .from('v_rc_flow_by_account')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', year)
        .order('category_type')
        .order('account_code')
        .order('month');

      const data = (result || []).map((r: Record<string, unknown>) => ({
        ...r,
        month_name: monthNamesShort[(r.month as number) - 1],
        direction_label: r.direction === 'entrada' ? 'Entrada' : 'Saída',
      }));

      exportToExcel({
        filename: `fluxo_por_conta_${year}`,
        sheetName: 'Fluxo por Conta',
        title: `Fluxo por Conta ${year} - ${companyName}`,
        subtitle: 'Valores Previstos vs Realizados por Conta Contábil',
        columns: [
          { header: 'Código', key: 'account_code', width: 15 },
          { header: 'Conta', key: 'account_name', width: 35 },
          { header: 'Categoria', key: 'category_type', width: 18 },
          { header: 'Direção', key: 'direction_label', width: 10 },
          { header: 'Mês', key: 'month_name', width: 8 },
          { header: 'Valor Previsto', key: 'valor_previsto', format: formatCurrencyForExport, width: 16 },
          { header: 'Valor Realizado', key: 'valor_pago', format: formatCurrencyForExport, width: 16 },
        ],
        data,
      });
      break;
    }

    case 'budgets': {
      // Get budgets and actual data
      const { data: budgetsData } = await supabase
        .from('budgets')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', year)
        .order('month');

      const { data: indicatorsData } = await supabase
        .from('v_rc_indicators_monthly')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', year);

      // Merge data with variance calculations
      const data = (budgetsData || []).map((b: Record<string, unknown>) => {
        const actual = (indicatorsData || []).find((i: Record<string, unknown>) => i.month === b.month) as Record<string, unknown> | undefined;
        const targetRevenue = (b.target_revenue as number) || 0;
        const actualRevenue = (actual?.receita_realizada as number) || 0;
        const targetExpense = (b.target_expense as number) || 0;
        const actualExpense = (actual?.despesa_realizada as number) || 0;
        const targetProfit = (b.target_profit as number) || 0;
        const actualProfit = (actual?.lucro_prejuizo as number) || 0;

        return {
          month_name: monthNames[(b.month as number) - 1],
          target_revenue: targetRevenue,
          actual_revenue: actualRevenue,
          revenue_variance: actualRevenue - targetRevenue,
          revenue_variance_pct: targetRevenue > 0 ? ((actualRevenue - targetRevenue) / targetRevenue * 100) : 0,
          target_expense: targetExpense,
          actual_expense: actualExpense,
          expense_variance: actualExpense - targetExpense,
          target_profit: targetProfit,
          actual_profit: actualProfit,
          profit_variance: actualProfit - targetProfit,
        };
      });

      exportToExcel({
        filename: `metas_vs_realizado_${year}`,
        sheetName: 'Metas vs Realizado',
        title: `Comparativo Metas x Realizado ${year} - ${companyName}`,
        subtitle: 'Análise de Performance Financeira',
        columns: [
          { header: 'Mês', key: 'month_name', width: 12 },
          { header: 'Meta Receita', key: 'target_revenue', format: formatCurrencyForExport, width: 16 },
          { header: 'Receita Real', key: 'actual_revenue', format: formatCurrencyForExport, width: 16 },
          { header: 'Var. R$', key: 'revenue_variance', format: formatCurrencyForExport, width: 14 },
          { header: 'Var. %', key: 'revenue_variance_pct', format: formatPercentForExport, width: 10 },
          { header: 'Meta Despesa', key: 'target_expense', format: formatCurrencyForExport, width: 16 },
          { header: 'Despesa Real', key: 'actual_expense', format: formatCurrencyForExport, width: 16 },
          { header: 'Meta Lucro', key: 'target_profit', format: formatCurrencyForExport, width: 14 },
          { header: 'Lucro Real', key: 'actual_profit', format: formatCurrencyForExport, width: 14 },
        ],
        data,
      });
      break;
    }
  }
}