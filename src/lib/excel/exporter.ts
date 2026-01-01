import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: (value: unknown) => string | number;
}

export interface ExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  title?: string;
  subtitle?: string;
}

/**
 * Export data to Excel file with professional formatting
 */
export function exportToExcel(options: ExportOptions): void {
  const { filename, sheetName = 'Dados', columns, data, title, subtitle } = options;
  
  const rows: (string | number)[][] = [];
  let startRow = 0;
  
  // Add title if provided
  if (title) {
    rows.push([title]);
    startRow++;
  }
  
  // Add subtitle if provided
  if (subtitle) {
    rows.push([subtitle]);
    startRow++;
  }
  
  // Add empty row after title/subtitle
  if (title || subtitle) {
    rows.push([]);
    startRow++;
  }
  
  // Add timestamp
  rows.push([`Gerado em: ${new Date().toLocaleString('pt-BR')}`]);
  rows.push([]);
  startRow += 2;
  
  // Create headers row
  const headers = columns.map(col => col.header);
  rows.push(headers);
  
  // Create data rows
  data.forEach(row => {
    const rowData = columns.map(col => {
      const value = row[col.key];
      if (col.format) {
        return col.format(value);
      }
      if (value === null || value === undefined) {
        return '';
      }
      return value as string | number;
    });
    rows.push(rowData);
  });
  
  // Add summary row
  rows.push([]);
  rows.push([`Total de registros: ${data.length}`]);
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  
  // Set column widths
  worksheet['!cols'] = columns.map(col => ({
    wch: col.width || Math.max(col.header.length, 15)
  }));
  
  // Merge title cell if exists
  if (title) {
    worksheet['!merges'] = worksheet['!merges'] || [];
    worksheet['!merges'].push({
      s: { r: 0, c: 0 },
      e: { r: 0, c: columns.length - 1 }
    });
  }
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export multiple sheets to Excel with professional formatting
 */
export function exportMultipleSheets(
  filename: string,
  sheets: { 
    name: string; 
    columns: ExportColumn[]; 
    data: Record<string, unknown>[];
    title?: string;
  }[]
): void {
  const workbook = XLSX.utils.book_new();
  
  sheets.forEach(sheet => {
    const rows: (string | number)[][] = [];
    
    // Add title if provided
    if (sheet.title) {
      rows.push([sheet.title]);
      rows.push([]);
    }
    
    // Add timestamp
    rows.push([`Gerado em: ${new Date().toLocaleString('pt-BR')}`]);
    rows.push([]);
    
    // Headers
    const headers = sheet.columns.map(col => col.header);
    rows.push(headers);
    
    // Data
    sheet.data.forEach(row => {
      const rowData = sheet.columns.map(col => {
        const value = row[col.key];
        if (col.format) {
          return col.format(value);
        }
        if (value === null || value === undefined) {
          return '';
        }
        return value as string | number;
      });
      rows.push(rowData);
    });
    
    // Summary
    rows.push([]);
    rows.push([`Total: ${sheet.data.length}`]);
    
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = sheet.columns.map(col => ({
      wch: col.width || Math.max(col.header.length, 15)
    }));
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.substring(0, 31));
  });
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export report with multiple views (summary + details)
 */
export function exportReportWithDetails(
  filename: string,
  summary: {
    title: string;
    columns: ExportColumn[];
    data: Record<string, unknown>[];
  },
  details?: {
    title: string;
    columns: ExportColumn[];
    data: Record<string, unknown>[];
  }
): void {
  const sheets = [
    {
      name: 'Resumo',
      columns: summary.columns,
      data: summary.data,
      title: summary.title,
    }
  ];
  
  if (details && details.data.length > 0) {
    sheets.push({
      name: 'Detalhes',
      columns: details.columns,
      data: details.data,
      title: details.title,
    });
  }
  
  exportMultipleSheets(filename, sheets);
}

/**
 * Format currency for export (Brazilian format)
 */
export function formatCurrencyForExport(value: unknown): string {
  if (value === null || value === undefined) return '';
  const num = Number(value);
  if (isNaN(num)) return '';
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format currency as number for Excel calculations
 */
export function formatCurrencyNumeric(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  if (isNaN(num)) return 0;
  return Math.round(num * 100) / 100;
}

/**
 * Format date for export (Brazilian format)
 */
export function formatDateForExport(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as string);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR');
}

/**
 * Format percentage for export
 */
export function formatPercentForExport(value: unknown): string {
  if (value === null || value === undefined) return '';
  const num = Number(value);
  if (isNaN(num)) return '';
  return `${num.toFixed(2)}%`;
}

/**
 * Format boolean for export
 */
export function formatBooleanForExport(value: unknown): string {
  if (value === null || value === undefined) return '';
  return value ? 'Sim' : 'Não';
}

/**
 * Format status for export
 */
export function formatStatusForExport(value: unknown): string {
  const statusMap: Record<string, string> = {
    'rascunho': 'Rascunho',
    'lancado': 'Lançado',
    'pago': 'Pago',
    'cancelado': 'Cancelado',
  };
  return statusMap[value as string] || (value as string) || '';
}

/**
 * Format direction for export
 */
export function formatDirectionForExport(value: unknown): string {
  const directionMap: Record<string, string> = {
    'entrada': 'Entrada',
    'saida': 'Saída',
  };
  return directionMap[value as string] || (value as string) || '';
}

/**
 * Format document type for export
 */
export function formatDocumentTypeForExport(value: unknown): string {
  const typeMap: Record<string, string> = {
    'nf': 'NF',
    'nfe': 'NFe',
    'fatura': 'Fatura',
    'recibo': 'Recibo',
    'boleto': 'Boleto',
    'outro': 'Outro',
  };
  return typeMap[value as string] || (value as string) || '';
}

/**
 * Format category type for export
 */
export function formatCategoryTypeForExport(value: unknown): string {
  const typeMap: Record<string, string> = {
    'ativo': 'Ativo',
    'passivo': 'Passivo',
    'patrimonio_liquido': 'Patrimônio Líquido',
    'receita': 'Receita',
    'custo': 'Custo',
    'despesa': 'Despesa',
  };
  return typeMap[value as string] || (value as string) || '';
}

/**
 * Generate error report Excel
 */
export function exportErrorReport(
  rows: { 
    row_number: number; 
    errors: string[]; 
    raw_data: Record<string, unknown> 
  }[],
  filename: string
): void {
  const reportRows: (string | number)[][] = [];
  
  // Title
  reportRows.push(['Relatório de Erros de Importação']);
  reportRows.push([`Gerado em: ${new Date().toLocaleString('pt-BR')}`]);
  reportRows.push([]);
  
  // Summary
  reportRows.push([`Total de erros: ${rows.length}`]);
  reportRows.push([]);
  
  // Headers
  reportRows.push(['Linha', 'Erro(s)', 'Dados Originais']);
  
  // Data
  rows.forEach(row => {
    reportRows.push([
      row.row_number,
      row.errors.join(' | '),
      JSON.stringify(row.raw_data)
    ]);
  });
  
  const worksheet = XLSX.utils.aoa_to_sheet(reportRows);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 60 },
    { wch: 80 },
  ];
  
  // Merge title
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }
  ];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Erros');
  
  XLSX.writeFile(workbook, `${filename}_erros.xlsx`);
}

/**
 * Export DRE with professional multi-sheet format
 */
export function exportDREReport(
  filename: string,
  year: number,
  monthlyData: Record<string, unknown>[],
  annualData: Record<string, unknown>[]
): void {
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  const sheets = [
    {
      name: 'DRE Anual',
      title: `DRE - Demonstrativo de Resultados ${year}`,
      columns: [
        { header: 'Código', key: 'account_code', width: 15 },
        { header: 'Conta', key: 'account_name', width: 40 },
        { header: 'Categoria', key: 'category_type', width: 20 },
        { header: 'Total Anual', key: 'total', format: formatCurrencyForExport, width: 18 },
      ] as ExportColumn[],
      data: annualData,
    },
    {
      name: 'DRE Mensal',
      title: `DRE Mensal ${year}`,
      columns: [
        { header: 'Código', key: 'account_code', width: 15 },
        { header: 'Conta', key: 'account_name', width: 40 },
        { header: 'Mês', key: 'month_name', width: 10 },
        { header: 'Valor', key: 'total', format: formatCurrencyForExport, width: 18 },
      ] as ExportColumn[],
      data: monthlyData.map(r => ({
        ...r,
        month_name: monthNames[(r.month as number) - 1],
      })),
    }
  ];
  
  exportMultipleSheets(filename, sheets);
}

/**
 * Export Cash Flow report with professional formatting
 */
export function exportCashFlowReport(
  filename: string,
  year: number,
  monthlyData: Record<string, unknown>[],
  openTransactions?: Record<string, unknown>[]
): void {
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  const sheets = [
    {
      name: 'Fluxo Mensal',
      title: `Fluxo de Caixa Mensal ${year}`,
      columns: [
        { header: 'Mês', key: 'month_name', width: 12 },
        { header: 'Entradas Previstas', key: 'entradas_previstas', format: formatCurrencyForExport, width: 20 },
        { header: 'Entradas Realizadas', key: 'entradas_pagas', format: formatCurrencyForExport, width: 20 },
        { header: 'Saídas Previstas', key: 'saidas_previstas', format: formatCurrencyForExport, width: 20 },
        { header: 'Saídas Realizadas', key: 'saidas_pagas', format: formatCurrencyForExport, width: 20 },
        { header: 'Resultado', key: 'resultado', format: formatCurrencyForExport, width: 18 },
      ] as ExportColumn[],
      data: monthlyData.map(r => ({
        ...r,
        month_name: monthNames[(r.month as number) - 1],
      })),
    }
  ];
  
  if (openTransactions && openTransactions.length > 0) {
    sheets.push({
      name: 'Em Aberto',
      title: 'Transações em Aberto',
      columns: [
        { header: 'Vencimento', key: 'due_date', format: formatDateForExport, width: 12 },
        { header: 'Descrição', key: 'description', width: 40 },
        { header: 'Direção', key: 'direction', format: formatDirectionForExport, width: 10 },
        { header: 'Valor', key: 'total_amount', format: formatCurrencyForExport, width: 15 },
        { header: 'Status', key: 'status', format: formatStatusForExport, width: 12 },
      ] as ExportColumn[],
      data: openTransactions.map(t => ({ ...t, month_name: '' })),
    });
  }
  
  exportMultipleSheets(filename, sheets);
}

/**
 * Export Budget vs Actual comparison report
 */
export function exportBudgetComparisonReport(
  filename: string,
  year: number,
  data: {
    month: number;
    target_revenue: number;
    actual_revenue: number;
    target_expense: number;
    actual_expense: number;
    target_profit: number;
    actual_profit: number;
  }[]
): void {
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  const enrichedData = data.map(row => ({
    ...row,
    month_name: monthNames[row.month - 1],
    revenue_variance: row.actual_revenue - row.target_revenue,
    revenue_variance_pct: row.target_revenue > 0 ? ((row.actual_revenue - row.target_revenue) / row.target_revenue * 100) : 0,
    expense_variance: row.actual_expense - row.target_expense,
    profit_variance: row.actual_profit - row.target_profit,
  }));
  
  exportToExcel({
    filename,
    sheetName: 'Metas vs Realizado',
    title: `Comparativo Metas x Realizado ${year}`,
    subtitle: 'Análise de Performance Financeira',
    columns: [
      { header: 'Mês', key: 'month_name', width: 10 },
      { header: 'Meta Receita', key: 'target_revenue', format: formatCurrencyForExport, width: 16 },
      { header: 'Receita Real', key: 'actual_revenue', format: formatCurrencyForExport, width: 16 },
      { header: 'Var. Receita', key: 'revenue_variance', format: formatCurrencyForExport, width: 14 },
      { header: 'Var. %', key: 'revenue_variance_pct', format: formatPercentForExport, width: 10 },
      { header: 'Meta Despesa', key: 'target_expense', format: formatCurrencyForExport, width: 16 },
      { header: 'Despesa Real', key: 'actual_expense', format: formatCurrencyForExport, width: 16 },
      { header: 'Meta Lucro', key: 'target_profit', format: formatCurrencyForExport, width: 14 },
      { header: 'Lucro Real', key: 'actual_profit', format: formatCurrencyForExport, width: 14 },
    ],
    data: enrichedData,
  });
}