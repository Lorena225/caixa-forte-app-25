import * as XLSX from 'xlsx';
import type { TemplateColumn } from './types';
import {
  parseCurrency,
  parseDate,
  parseBoolean,
  parseInteger,
  parseDecimal,
  normalizeText,
  normalizeEnum,
  formatDateToISO,
} from './normalizers';
import type { ValidationError, NormalizedRow } from './types';

export interface ParsedExcelData {
  headers: string[];
  rows: Record<string, unknown>[];
  sheetName: string;
}

/**
 * Parse an Excel file and return raw data
 */
export function parseExcelFile(file: File): Promise<ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Get the first sheet (usually "DADOS")
        const sheetName = workbook.SheetNames.find(n => 
          n.toUpperCase() === 'DADOS'
        ) || workbook.SheetNames[0];
        
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          raw: false,
          defval: null,
        });
        
        // Get headers from first row
        const headerRow = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
          header: 1,
          range: 0,
        })[0] as unknown as string[];
        
        resolve({
          headers: headerRow || [],
          rows: jsonData,
          sheetName,
        });
      } catch (error) {
        reject(new Error(`Erro ao ler arquivo Excel: ${error}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Map Excel columns to template fields
 */
export function mapColumnsToFields(
  headers: string[],
  columns: TemplateColumn[]
): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim();
    
    // Try to find matching column by label
    const matchByLabel = columns.find(col => 
      col.label.toLowerCase().trim() === normalizedHeader
    );
    
    if (matchByLabel) {
      mapping[header] = matchByLabel.name;
      return;
    }
    
    // Try to find matching column by name
    const matchByName = columns.find(col => 
      col.name.toLowerCase() === normalizedHeader
    );
    
    if (matchByName) {
      mapping[header] = matchByName.name;
    }
  });
  
  return mapping;
}

/**
 * Normalize a single row based on template columns
 */
export function normalizeRow(
  row: Record<string, unknown>,
  columns: TemplateColumn[],
  mapping: Record<string, string>
): NormalizedRow {
  const data: Record<string, unknown> = {};
  const errors: ValidationError[] = [];
  
  // Process each column in the template
  columns.forEach(col => {
    // Find the Excel header that maps to this field
    const excelHeader = Object.entries(mapping).find(([, field]) => field === col.name)?.[0];
    const rawValue = excelHeader ? row[excelHeader] : undefined;
    
    let normalizedValue: unknown = null;
    
    // Normalize based on type
    switch (col.type) {
      case 'text':
        normalizedValue = normalizeText(rawValue);
        break;
      case 'date':
        const dateValue = parseDate(rawValue);
        normalizedValue = formatDateToISO(dateValue);
        if (rawValue && !normalizedValue) {
          errors.push({ field: col.name, message: `Data inválida: ${rawValue}` });
        }
        break;
      case 'currency':
        normalizedValue = parseCurrency(rawValue);
        if (rawValue && normalizedValue === null) {
          errors.push({ field: col.name, message: `Valor monetário inválido: ${rawValue}` });
        }
        break;
      case 'decimal':
        normalizedValue = parseDecimal(rawValue);
        if (rawValue && normalizedValue === null) {
          errors.push({ field: col.name, message: `Número decimal inválido: ${rawValue}` });
        }
        break;
      case 'integer':
        normalizedValue = parseInteger(rawValue);
        if (rawValue && normalizedValue === null) {
          errors.push({ field: col.name, message: `Número inteiro inválido: ${rawValue}` });
        }
        break;
      case 'boolean':
        normalizedValue = parseBoolean(rawValue);
        if (rawValue && normalizedValue === null) {
          errors.push({ field: col.name, message: `Valor booleano inválido: ${rawValue}` });
        }
        break;
      case 'enum':
        normalizedValue = normalizeEnum(rawValue, col.options || []);
        if (rawValue && normalizedValue === null) {
          errors.push({ 
            field: col.name, 
            message: `Valor "${rawValue}" não está na lista: ${col.options?.join(', ')}` 
          });
        }
        break;
    }
    
    // Apply default if value is null
    if (normalizedValue === null && col.default !== undefined) {
      normalizedValue = col.default;
    }
    
    // Check required
    if (col.required && (normalizedValue === null || normalizedValue === '')) {
      errors.push({ field: col.name, message: `Campo obrigatório: ${col.label}` });
    }
    
    data[col.name] = normalizedValue;
  });
  
  return {
    data,
    errors,
    isValid: errors.length === 0,
  };
}

/**
 * Validate and normalize all rows
 */
export function validateAndNormalizeRows(
  rows: Record<string, unknown>[],
  columns: TemplateColumn[],
  mapping: Record<string, string>
): NormalizedRow[] {
  return rows.map(row => normalizeRow(row, columns, mapping));
}
