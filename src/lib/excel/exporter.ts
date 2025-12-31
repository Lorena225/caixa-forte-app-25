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
}

/**
 * Export data to Excel file
 */
export function exportToExcel(options: ExportOptions): void {
  const { filename, sheetName = 'Dados', columns, data } = options;
  
  // Create headers row
  const headers = columns.map(col => col.header);
  
  // Create data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      if (col.format) {
        return col.format(value);
      }
      return value ?? '';
    });
  });
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Set column widths
  worksheet['!cols'] = columns.map(col => ({
    wch: col.width || Math.max(col.header.length, 12)
  }));
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export multiple sheets to Excel
 */
export function exportMultipleSheets(
  filename: string,
  sheets: { name: string; columns: ExportColumn[]; data: Record<string, unknown>[] }[]
): void {
  const workbook = XLSX.utils.book_new();
  
  sheets.forEach(sheet => {
    const headers = sheet.columns.map(col => col.header);
    const rows = sheet.data.map(row => {
      return sheet.columns.map(col => {
        const value = row[col.key];
        if (col.format) {
          return col.format(value);
        }
        return value ?? '';
      });
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet['!cols'] = sheet.columns.map(col => ({
      wch: col.width || Math.max(col.header.length, 12)
    }));
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Format currency for export (Brazilian format)
 */
export function formatCurrencyForExport(value: unknown): string {
  if (value === null || value === undefined) return '';
  const num = Number(value);
  if (isNaN(num)) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const data = rows.map(row => ({
    'Linha': row.row_number,
    'Erros': row.errors.join('; '),
    'Dados Originais': JSON.stringify(row.raw_data),
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 60 },
    { wch: 80 },
  ];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Erros');
  
  XLSX.writeFile(workbook, `${filename}_erros.xlsx`);
}
