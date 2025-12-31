import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Download,
  Loader2,
  FileSpreadsheet,
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
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { currentCompany } = useAuth();
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const isReport = type?.startsWith('report/');
  const entityType = type as ExportType;
  const reportType = isReport ? type?.replace('report/', '') as ReportType : null;

  const handleExport = async () => {
    if (!currentCompany) {
      toast.error('Selecione uma empresa');
      return;
    }

    setLoading(true);

    try {
      if (isReport && reportType) {
        await exportReport(reportType, currentCompany.id, parseInt(year));
      } else {
        await exportEntityData(entityType, currentCompany.id);
      }
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
              Exportar {isReport ? REPORT_LABELS[reportType!] : ENTITY_LABELS[entityType]}
            </h1>
            <p className="text-muted-foreground">
              Exporte os dados para Excel
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
          <CardContent className="space-y-4">
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

            <Button onClick={handleExport} disabled={loading} className="w-full md:w-auto">
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
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

async function exportEntityData(entityType: ExportType, companyId: string) {
  let data: Record<string, unknown>[] = [];
  let columns: ExportColumn[] = [];
  let filename = '';

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
        { header: 'Vencimento', key: 'due_date', format: formatDateForExport },
        { header: 'Valor', key: 'total_amount', format: formatCurrencyForExport },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Carteira', key: 'wallet_name', width: 20 },
        { header: 'Conta', key: 'account_name', width: 25 },
      ];
      filename = 'contas_receber';
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
        { header: 'Vencimento', key: 'due_date', format: formatDateForExport },
        { header: 'Valor', key: 'total_amount', format: formatCurrencyForExport },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Carteira', key: 'wallet_name', width: 20 },
        { header: 'Conta', key: 'account_name', width: 25 },
      ];
      filename = 'contas_pagar';
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
        .order('transaction_date', { ascending: false });

      data = (result || []).map((t: Record<string, unknown>) => ({
        ...t,
        account_name: (t.accounts as Record<string, unknown>)?.name,
        wallet_name: (t.wallets as Record<string, unknown>)?.name,
        counterparty_name: (t.counterparties as Record<string, unknown>)?.name,
        cost_center_name: (t.cost_centers as Record<string, unknown>)?.name,
      }));

      columns = [
        { header: 'Data', key: 'transaction_date', format: formatDateForExport },
        { header: 'Descrição', key: 'description', width: 30 },
        { header: 'Direção', key: 'direction', width: 10 },
        { header: 'Valor', key: 'total_amount', format: formatCurrencyForExport },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Carteira', key: 'wallet_name', width: 20 },
        { header: 'Conta', key: 'account_name', width: 25 },
        { header: 'Cliente/Fornecedor', key: 'counterparty_name', width: 25 },
      ];
      filename = 'lancamentos';
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
        { header: 'Gerencial', key: 'is_managerial', format: (v) => v ? 'Sim' : 'Não' },
        { header: 'Ativo', key: 'is_active', format: (v) => v ? 'Sim' : 'Não' },
      ];
      filename = 'plano_contas';
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
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Telefone', key: 'phone', width: 15 },
        { header: 'Ativo', key: 'is_active', format: (v) => v ? 'Sim' : 'Não' },
      ];
      filename = 'clientes_fornecedores';
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
        { header: 'Saldo Inicial', key: 'opening_balance', format: formatCurrencyForExport },
        { header: 'Ativo', key: 'is_active', format: (v) => v ? 'Sim' : 'Não' },
      ];
      filename = 'carteiras';
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
        { header: 'Ativo', key: 'is_active', format: (v) => v ? 'Sim' : 'Não' },
      ];
      filename = 'centros_custo';
      break;
    }

    case 'budgets': {
      const { data: result } = await supabase
        .from('budgets')
        .select('*')
        .eq('company_id', companyId)
        .order('year', { ascending: false })
        .order('month');

      data = result || [];
      columns = [
        { header: 'Ano', key: 'year', width: 10 },
        { header: 'Mês', key: 'month', width: 10 },
        { header: 'Meta Receita', key: 'target_revenue', format: formatCurrencyForExport },
        { header: 'Meta Despesa', key: 'target_expense', format: formatCurrencyForExport },
        { header: 'Meta Lucro', key: 'target_profit', format: formatCurrencyForExport },
        { header: 'Meta Margem %', key: 'target_margin', format: formatPercentForExport },
      ];
      filename = 'metas_orcamento';
      break;
    }
  }

  exportToExcel({
    filename,
    columns,
    data,
  });
}

async function exportReport(reportType: ReportType, companyId: string, year: number) {
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  switch (reportType) {
    case 'cashflow': {
      const { data: result } = await supabase
        .from('v_cashflow_monthly')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', year)
        .order('month');

      const data = (result || []).map((r: Record<string, unknown>) => ({
        ...r,
        month_name: monthNames[(r.month as number) - 1],
      }));

      exportToExcel({
        filename: `fluxo_caixa_${year}`,
        columns: [
          { header: 'Mês', key: 'month_name', width: 12 },
          { header: 'Entradas Previstas', key: 'entradas_previstas', format: formatCurrencyForExport },
          { header: 'Entradas Pagas', key: 'entradas_pagas', format: formatCurrencyForExport },
          { header: 'Saídas Previstas', key: 'saidas_previstas', format: formatCurrencyForExport },
          { header: 'Saídas Pagas', key: 'saidas_pagas', format: formatCurrencyForExport },
          { header: 'Resultado', key: 'resultado', format: formatCurrencyForExport },
        ],
        data,
      });
      break;
    }

    case 'dre': {
      const { data: result } = await supabase
        .from('v_dre_monthly')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', year)
        .order('account_code');

      exportToExcel({
        filename: `dre_${year}`,
        columns: [
          { header: 'Código', key: 'account_code', width: 15 },
          { header: 'Conta', key: 'account_name', width: 40 },
          { header: 'Categoria', key: 'category_type', width: 20 },
          { header: 'Mês', key: 'month', width: 8 },
          { header: 'Total', key: 'total', format: formatCurrencyForExport },
        ],
        data: result || [],
      });
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
        columns: [
          { header: 'Mês', key: 'month_name', width: 12 },
          { header: 'Receita Prevista', key: 'receita_prevista', format: formatCurrencyForExport },
          { header: 'Receita Realizada', key: 'receita_realizada', format: formatCurrencyForExport },
          { header: 'Despesa Prevista', key: 'despesa_prevista', format: formatCurrencyForExport },
          { header: 'Despesa Realizada', key: 'despesa_realizada', format: formatCurrencyForExport },
          { header: 'Lucro/Prejuízo', key: 'lucro_prejuizo', format: formatCurrencyForExport },
          { header: 'Lucratividade %', key: 'lucratividade', format: formatPercentForExport },
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
        .order('account_code');

      const data = (result || []).map((r: Record<string, unknown>) => ({
        ...r,
        month_name: monthNames[(r.month as number) - 1],
      }));

      exportToExcel({
        filename: `fluxo_por_conta_${year}`,
        columns: [
          { header: 'Código', key: 'account_code', width: 15 },
          { header: 'Conta', key: 'account_name', width: 40 },
          { header: 'Categoria', key: 'category_type', width: 20 },
          { header: 'Direção', key: 'direction', width: 10 },
          { header: 'Mês', key: 'month_name', width: 8 },
          { header: 'Valor Previsto', key: 'valor_previsto', format: formatCurrencyForExport },
          { header: 'Valor Pago', key: 'valor_pago', format: formatCurrencyForExport },
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

      // Merge data
      const data = (budgetsData || []).map((b: Record<string, unknown>) => {
        const actual = (indicatorsData || []).find((i: Record<string, unknown>) => i.month === b.month) as Record<string, unknown> | undefined;
        return {
          month_name: monthNames[(b.month as number) - 1],
          target_revenue: b.target_revenue,
          actual_revenue: actual?.receita_realizada || 0,
          target_expense: b.target_expense,
          actual_expense: actual?.despesa_realizada || 0,
          target_profit: b.target_profit,
          actual_profit: actual?.lucro_prejuizo || 0,
        };
      });

      exportToExcel({
        filename: `metas_vs_realizado_${year}`,
        columns: [
          { header: 'Mês', key: 'month_name', width: 12 },
          { header: 'Meta Receita', key: 'target_revenue', format: formatCurrencyForExport },
          { header: 'Receita Realizada', key: 'actual_revenue', format: formatCurrencyForExport },
          { header: 'Meta Despesa', key: 'target_expense', format: formatCurrencyForExport },
          { header: 'Despesa Realizada', key: 'actual_expense', format: formatCurrencyForExport },
          { header: 'Meta Lucro', key: 'target_profit', format: formatCurrencyForExport },
          { header: 'Lucro Realizado', key: 'actual_profit', format: formatCurrencyForExport },
        ],
        data,
      });
      break;
    }
  }
}
