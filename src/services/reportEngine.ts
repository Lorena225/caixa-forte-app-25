// =====================================================
// REPORT ENGINE - Generate Financial Reports
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import {
  ReportData,
  ReportPeriod,
  ReportColumn,
  ReportRow,
  ReportSummary,
  ReportMetadata,
  ExportFormat,
  REPORT_TRANSLATIONS,
} from '@/types/reports';
import { format as formatDate, parseISO, differenceInDays } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

type Locale = 'pt-BR' | 'en-US' | 'es-ES';

const DATE_LOCALES = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': es,
};

// Cache for reports (5 minutes)
const reportCache = new Map<string, { data: ReportData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(companyId: string, type: string, periodo: ReportPeriod): string {
  return `${companyId}:${type}:${periodo.inicio}:${periodo.fim}`;
}

function getFromCache(key: string): ReportData | null {
  const cached = reportCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  reportCache.delete(key);
  return null;
}

function setCache(key: string, data: ReportData): void {
  reportCache.set(key, { data, timestamp: Date.now() });
}

// Transaction type from database
interface TransactionRow {
  id: string;
  amount: number | null;
  total_amount: number | null;
  description: string | null;
  status: string | null;
  due_date: string | null;
  direction: string | null;
  counterparty_id: string | null;
}

export class ReportEngine {
  private static locale: Locale = 'pt-BR';
  private static currency = 'BRL';
  private static timezone = 'America/Sao_Paulo';

  static setLocale(locale: Locale): void {
    this.locale = locale;
  }

  static setCurrency(currency: string): void {
    this.currency = currency;
  }

  // =====================================================
  // GERAR DRE (Demonstração de Resultados)
  // =====================================================
  static async generateDRE(
    companyId: string,
    periodo: ReportPeriod,
    options: { useCache?: boolean } = {}
  ): Promise<ReportData> {
    const cacheKey = getCacheKey(companyId, 'dre', periodo);
    
    if (options.useCache !== false) {
      const cached = getFromCache(cacheKey);
      if (cached) return cached;
    }

    // Query paid transactions in period
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, amount, total_amount, description, status, due_date, direction')
      .eq('company_id', companyId)
      .gte('due_date', periodo.inicio)
      .lte('due_date', periodo.fim)
      .eq('status', 'pago' as never);

    let totalReceitas = 0;
    let totalDespesas = 0;

    const txList = (transactions || []) as unknown as TransactionRow[];

    txList.forEach((tx) => {
      const valor = Number(tx.total_amount || tx.amount) || 0;
      if (tx.direction === 'entrada') {
        totalReceitas += valor;
      } else if (tx.direction === 'saida') {
        totalDespesas += valor;
      }
    });

    const resultado = totalReceitas - totalDespesas;

    const rows: ReportRow[] = [
      { id: 'receitas-header', descricao: 'RECEITAS', isGroup: true, level: 0 },
      { id: 'receitas-total', descricao: 'Total Receitas', valor: totalReceitas, isSubtotal: true, level: 0 },
      { id: 'despesas-header', descricao: 'DESPESAS', isGroup: true, level: 0 },
      { id: 'despesas-total', descricao: 'Total Despesas', valor: totalDespesas, isSubtotal: true, level: 0 },
      { id: 'resultado', descricao: 'RESULTADO LÍQUIDO', valor: resultado, isTotal: true, level: 0 },
    ];

    const columns: ReportColumn[] = [
      { key: 'descricao', label: 'Descrição', type: 'text', width: 300 },
      { key: 'valor', label: 'Valor', type: 'currency', width: 150, align: 'right' },
    ];

    const summary: ReportSummary = {
      totalReceitas,
      totalDespesas,
      resultado,
      variacaoPercentual: totalReceitas > 0 ? (resultado / totalReceitas) * 100 : 0,
    };

    const metadata: ReportMetadata = {
      companyName: '',
      reportName: REPORT_TRANSLATIONS[this.locale].dre,
      reportType: 'dre',
      periodo,
      generatedAt: new Date().toISOString(),
      locale: this.locale,
      currency: this.currency,
      timezone: this.timezone,
    };

    const report: ReportData = {
      metadata,
      columns,
      rows,
      summary,
      totals: { receitas: totalReceitas, despesas: totalDespesas, resultado },
    };

    setCache(cacheKey, report);
    return report;
  }

  // =====================================================
  // GERAR FLUXO DE CAIXA
  // =====================================================
  static async generateFluxoCaixa(
    companyId: string,
    periodo: ReportPeriod,
    options: { useCache?: boolean } = {}
  ): Promise<ReportData> {
    const cacheKey = getCacheKey(companyId, 'fluxo_caixa', periodo);
    
    if (options.useCache !== false) {
      const cached = getFromCache(cacheKey);
      if (cached) return cached;
    }

    // Query paid transactions in period
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, amount, total_amount, description, status, due_date, direction')
      .eq('company_id', companyId)
      .gte('due_date', periodo.inicio)
      .lte('due_date', periodo.fim)
      .eq('status', 'pago' as never)
      .order('due_date', { ascending: true });

    let saldoAcumulado = 0;
    const rows: ReportRow[] = [];

    const txList = (transactions || []) as unknown as TransactionRow[];

    txList.forEach((tx) => {
      const valor = Number(tx.total_amount || tx.amount) || 0;
      const isEntrada = tx.direction === 'entrada';
      
      if (isEntrada) {
        saldoAcumulado += valor;
      } else {
        saldoAcumulado -= valor;
      }

      rows.push({
        id: tx.id,
        data: tx.due_date,
        descricao: tx.description || '-',
        tipo: isEntrada ? 'entrada' : 'saida',
        valor: isEntrada ? valor : -valor,
        saldoAcumulado,
      });
    });

    const entradas = rows.filter(r => (r.valor as number) > 0).reduce((acc, r) => acc + (r.valor as number), 0);
    const saidas = Math.abs(rows.filter(r => (r.valor as number) < 0).reduce((acc, r) => acc + (r.valor as number), 0));

    const columns: ReportColumn[] = [
      { key: 'data', label: 'Data', type: 'date', width: 100 },
      { key: 'descricao', label: 'Descrição', type: 'text', width: 250 },
      { key: 'tipo', label: 'Tipo', type: 'text', width: 80 },
      { key: 'valor', label: 'Valor', type: 'currency', width: 120, align: 'right' },
      { key: 'saldoAcumulado', label: 'Saldo', type: 'currency', width: 120, align: 'right' },
    ];

    const summary: ReportSummary = {
      totalReceitas: entradas,
      totalDespesas: saidas,
      saldoFinal: saldoAcumulado,
      resultado: entradas - saidas,
    };

    const metadata: ReportMetadata = {
      companyName: '',
      reportName: REPORT_TRANSLATIONS[this.locale].fluxo_caixa,
      reportType: 'fluxo_caixa',
      periodo,
      generatedAt: new Date().toISOString(),
      locale: this.locale,
      currency: this.currency,
      timezone: this.timezone,
    };

    const report: ReportData = {
      metadata,
      columns,
      rows,
      summary,
      totals: { entradas, saidas, saldo: saldoAcumulado },
    };

    setCache(cacheKey, report);
    return report;
  }

  // =====================================================
  // GERAR ORÇAMENTO x REALIZADO
  // =====================================================
  static async generateOrcamentoRealizado(
    companyId: string,
    periodo: ReportPeriod,
    options: { useCache?: boolean } = {}
  ): Promise<ReportData> {
    const cacheKey = getCacheKey(companyId, 'orcamento_realizado', periodo);
    
    if (options.useCache !== false) {
      const cached = getFromCache(cacheKey);
      if (cached) return cached;
    }

    // Query budgets
    const { data: budgets } = await supabase
      .from('budgets')
      .select('id, budget_amount')
      .eq('company_id', companyId);

    // Query paid transactions for actual values
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, total_amount, direction')
      .eq('company_id', companyId)
      .gte('due_date', periodo.inicio)
      .lte('due_date', periodo.fim)
      .eq('status', 'pago' as never);

    const txList = (transactions || []) as unknown as TransactionRow[];
    const budgetList = (budgets || []) as unknown as { id: string; budget_amount: number | null }[];

    const totalOrcado = budgetList.reduce((acc, b) => acc + (Number(b.budget_amount) || 0), 0);
    
    let receitas = 0;
    let despesas = 0;
    txList.forEach((tx) => {
      const valor = Number(tx.total_amount || tx.amount) || 0;
      if (tx.direction === 'entrada') {
        receitas += valor;
      } else {
        despesas += valor;
      }
    });
    
    const totalRealizado = receitas - despesas;
    const variacao = totalRealizado - totalOrcado;
    const variacaoPercentual = totalOrcado !== 0 ? (variacao / totalOrcado) * 100 : 0;

    const rows: ReportRow[] = [
      {
        id: 'total',
        descricao: 'TOTAL',
        orcado: totalOrcado,
        realizado: totalRealizado,
        variacao,
        variacaoPercentual,
        status: Math.abs(variacaoPercentual) > 20 ? 'excedido' : Math.abs(variacaoPercentual) > 10 ? 'atencao' : 'dentro',
        isTotal: true,
      },
    ];

    const columns: ReportColumn[] = [
      { key: 'descricao', label: 'Descrição', type: 'text', width: 250 },
      { key: 'orcado', label: 'Orçado', type: 'currency', width: 120, align: 'right' },
      { key: 'realizado', label: 'Realizado', type: 'currency', width: 120, align: 'right' },
      { key: 'variacao', label: 'Variação', type: 'currency', width: 120, align: 'right' },
      { key: 'variacaoPercentual', label: 'Var %', type: 'percentage', width: 80, align: 'right' },
      { key: 'status', label: 'Status', type: 'text', width: 100 },
    ];

    const summary: ReportSummary = { variacao, variacaoPercentual };

    const metadata: ReportMetadata = {
      companyName: '',
      reportName: REPORT_TRANSLATIONS[this.locale].orcamento_realizado,
      reportType: 'orcamento_realizado',
      periodo,
      generatedAt: new Date().toISOString(),
      locale: this.locale,
      currency: this.currency,
      timezone: this.timezone,
    };

    const report: ReportData = { metadata, columns, rows, summary };
    setCache(cacheKey, report);
    return report;
  }

  // =====================================================
  // GERAR AGING (Vencimentos)
  // =====================================================
  static async generateAging(
    companyId: string,
    tipo: 'receivable' | 'payable' = 'receivable',
    options: { useCache?: boolean; asOfDate?: string } = {}
  ): Promise<ReportData> {
    const asOfDate = options.asOfDate || new Date().toISOString().split('T')[0];
    const periodo: ReportPeriod = { inicio: '1900-01-01', fim: asOfDate };
    const cacheKey = getCacheKey(companyId, `aging_${tipo}`, periodo);
    
    if (options.useCache !== false) {
      const cached = getFromCache(cacheKey);
      if (cached) return cached;
    }

    const direction = tipo === 'receivable' ? 'entrada' : 'saida';

    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, amount, total_amount, description, due_date, direction')
      .eq('company_id', companyId)
      .eq('direction', direction as never)
      .in('status', ['lancado', 'pendente'] as never[])
      .lte('due_date', asOfDate);

    const today = parseISO(asOfDate);
    const rows: ReportRow[] = [];
    const buckets = { a_vencer: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_mais': 0 };

    const txList = (transactions || []) as unknown as TransactionRow[];

    txList.forEach((tx) => {
      if (!tx.due_date) return;
      const dueDate = parseISO(tx.due_date);
      const diasAtraso = differenceInDays(today, dueDate);
      const valor = Number(tx.total_amount || tx.amount) || 0;

      let faixa: keyof typeof buckets = 'a_vencer';
      if (diasAtraso <= 0) faixa = 'a_vencer';
      else if (diasAtraso <= 30) faixa = '1_30';
      else if (diasAtraso <= 60) faixa = '31_60';
      else if (diasAtraso <= 90) faixa = '61_90';
      else faixa = '90_mais';

      buckets[faixa] += valor;
      rows.push({ 
        id: tx.id, 
        documento: tx.description || '-', 
        vencimento: tx.due_date, 
        valor, 
        diasAtraso: Math.max(0, diasAtraso), 
        faixa 
      });
    });

    const columns: ReportColumn[] = [
      { key: 'documento', label: 'Documento', type: 'text', width: 200 },
      { key: 'vencimento', label: 'Vencimento', type: 'date', width: 100 },
      { key: 'diasAtraso', label: 'Dias', type: 'number', width: 60, align: 'right' },
      { key: 'valor', label: 'Valor', type: 'currency', width: 120, align: 'right' },
      { key: 'faixa', label: 'Faixa', type: 'text', width: 100 },
    ];

    const total = Object.values(buckets).reduce((a, b) => a + b, 0);
    const summary: ReportSummary = { ...buckets, total };

    const metadata: ReportMetadata = {
      companyName: '',
      reportName: `${REPORT_TRANSLATIONS[this.locale].aging} - ${tipo === 'receivable' ? 'Recebíveis' : 'Pagáveis'}`,
      reportType: 'aging',
      periodo,
      generatedAt: new Date().toISOString(),
      locale: this.locale,
      currency: this.currency,
      timezone: this.timezone,
    };

    const report: ReportData = { metadata, columns, rows, summary, totals: buckets };
    setCache(cacheKey, report);
    return report;
  }

  // =====================================================
  // EXPORTAR RELATÓRIO
  // =====================================================
  static async exportReport(
    report: ReportData,
    exportFormat: ExportFormat
  ): Promise<{ blob: Blob; filename: string; mimeType: string }> {
    const timestamp = formatDate(new Date(), 'yyyyMMdd_HHmmss');
    const baseFilename = `${report.metadata.reportType}_${timestamp}`;

    switch (exportFormat) {
      case 'csv':
        return this.exportToCSV(report, baseFilename);
      case 'excel':
        return this.exportToExcel(report, baseFilename);
      case 'json':
      default:
        return this.exportToJSON(report, baseFilename);
    }
  }

  private static exportToCSV(report: ReportData, filename: string): { blob: Blob; filename: string; mimeType: string } {
    const { columns, rows, metadata } = report;
    const headers = columns.map((col) => col.label).join(',');
    const dataRows = rows.map((row) => columns.map((col) => {
      const value = row[col.key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
      return String(value);
    }).join(','));
    const footer = `\nRelatório: ${metadata.reportName}\nPeríodo: ${metadata.periodo.inicio} a ${metadata.periodo.fim}\nGerado em: ${metadata.generatedAt}`;
    const csv = [headers, ...dataRows, footer].join('\n');
    return { blob: new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename: `${filename}.csv`, mimeType: 'text/csv' };
  }

  private static exportToExcel(report: ReportData, filename: string): { blob: Blob; filename: string; mimeType: string } {
    const { columns, rows } = report;
    const wb = XLSX.utils.book_new();
    const headers = columns.map((col) => col.label);
    const data = rows.map((row) => columns.map((col) => row[col.key]));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return { blob: new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename: `${filename}.xlsx`, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }

  private static exportToJSON(report: ReportData, filename: string): { blob: Blob; filename: string; mimeType: string } {
    return { blob: new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), filename: `${filename}.json`, mimeType: 'application/json' };
  }

  static formatCurrency(value: number, locale: Locale = 'pt-BR', currency = 'BRL'): string {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  }

  static clearCache(): void {
    reportCache.clear();
  }
}
