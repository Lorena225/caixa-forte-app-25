// CSV Parser for bank statements
export interface CSVTransaction {
  date: Date;
  amount: number;
  description: string;
  type?: string;
  balance?: number;
  reference?: string;
  counterparty?: string;
}

export interface CSVParseResult {
  transactions: CSVTransaction[];
  headers: string[];
  detectedFormat: CSVFormat;
}

export interface CSVFormat {
  dateColumn: number;
  amountColumn: number;
  descriptionColumn: number;
  typeColumn?: number;
  balanceColumn?: number;
  referenceColumn?: number;
  counterpartyColumn?: number;
  dateFormat: string;
  delimiter: string;
  hasHeader: boolean;
  amountFormat: 'single' | 'credit_debit'; // single column with +/- or separate columns
  creditColumn?: number;
  debitColumn?: number;
}

function detectDelimiter(content: string): string {
  const firstLines = content.split('\n').slice(0, 5).join('\n');
  const delimiters = [';', ',', '\t', '|'];
  
  let bestDelimiter = ',';
  let maxCount = 0;
  
  for (const d of delimiters) {
    const count = (firstLines.match(new RegExp(`\\${d}`, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = d;
    }
  }
  
  return bestDelimiter;
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function detectDateFormat(dateStr: string): string {
  // Try common Brazilian formats first
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return 'dd/MM/yyyy';
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return 'dd-MM-yyyy';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'yyyy-MM-dd';
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(dateStr)) return 'dd/MM/yy';
  if (/^\d{8}$/.test(dateStr)) return 'ddMMyyyy';
  
  return 'dd/MM/yyyy'; // Default Brazilian format
}

function parseDate(dateStr: string, format: string): Date {
  dateStr = dateStr.trim();
  
  let day: number, month: number, year: number;
  
  switch (format) {
    case 'dd/MM/yyyy':
      [day, month, year] = dateStr.split('/').map(Number);
      break;
    case 'dd-MM-yyyy':
      [day, month, year] = dateStr.split('-').map(Number);
      break;
    case 'yyyy-MM-dd':
      [year, month, day] = dateStr.split('-').map(Number);
      break;
    case 'dd/MM/yy':
      const parts = dateStr.split('/').map(Number);
      day = parts[0];
      month = parts[1];
      year = parts[2] + (parts[2] > 50 ? 1900 : 2000);
      break;
    case 'ddMMyyyy':
      day = parseInt(dateStr.substring(0, 2));
      month = parseInt(dateStr.substring(2, 4));
      year = parseInt(dateStr.substring(4, 8));
      break;
    default:
      return new Date(dateStr);
  }
  
  return new Date(year, month - 1, day);
}

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  
  // Remove currency symbols and spaces
  let clean = amountStr.replace(/[R$\s]/g, '').trim();
  
  // Handle Brazilian format: 1.234,56 -> 1234.56
  if (clean.includes(',')) {
    // Check if it's Brazilian format (comma as decimal separator)
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Brazilian format
      clean = clean.replace(/\./g, '').replace(',', '.');
    }
  }
  
  return parseFloat(clean) || 0;
}

function detectColumnMapping(headers: string[]): Partial<CSVFormat> {
  const mapping: Partial<CSVFormat> = {};
  
  const datePatterns = /^(data|date|dt|posted|lancamento|movimento)$/i;
  const amountPatterns = /^(valor|amount|value|vl|quantia|total)$/i;
  const descPatterns = /^(descri[cç][aã]o|description|desc|historico|hist[oó]rico|memo|observa[cç][aã]o)$/i;
  const creditPatterns = /^(cr[eé]dito|credit|entrada|in|recebido)$/i;
  const debitPatterns = /^(d[eé]bito|debit|sa[ií]da|out|pago)$/i;
  const balancePatterns = /^(saldo|balance|bal)$/i;
  const refPatterns = /^(refer[eê]ncia|reference|ref|id|num|n[uú]mero|documento|doc)$/i;
  const counterpartyPatterns = /^(favorecido|benefici[aá]rio|pagador|cliente|fornecedor|nome|name|counterparty)$/i;
  
  headers.forEach((header, idx) => {
    const h = header.trim().toLowerCase();
    
    if (datePatterns.test(h)) mapping.dateColumn = idx;
    else if (amountPatterns.test(h)) mapping.amountColumn = idx;
    else if (descPatterns.test(h)) mapping.descriptionColumn = idx;
    else if (creditPatterns.test(h)) mapping.creditColumn = idx;
    else if (debitPatterns.test(h)) mapping.debitColumn = idx;
    else if (balancePatterns.test(h)) mapping.balanceColumn = idx;
    else if (refPatterns.test(h)) mapping.referenceColumn = idx;
    else if (counterpartyPatterns.test(h)) mapping.counterpartyColumn = idx;
  });
  
  // Determine amount format
  if (mapping.creditColumn !== undefined || mapping.debitColumn !== undefined) {
    mapping.amountFormat = 'credit_debit';
  } else {
    mapping.amountFormat = 'single';
  }
  
  return mapping;
}

export function parseCSV(content: string, customFormat?: Partial<CSVFormat>): CSVParseResult {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return { transactions: [], headers: [], detectedFormat: {} as CSVFormat };
  }
  
  const delimiter = customFormat?.delimiter || detectDelimiter(content);
  const firstRow = parseCSVLine(lines[0], delimiter);
  
  // Detect if first row is header
  const hasHeader = customFormat?.hasHeader ?? !firstRow.some(cell => /^\d/.test(cell.trim()));
  
  const headers = hasHeader ? firstRow : firstRow.map((_, i) => `Coluna ${i + 1}`);
  const dataStartIdx = hasHeader ? 1 : 0;
  
  // Detect or use custom column mapping
  const autoMapping = detectColumnMapping(headers);
  const format: CSVFormat = {
    dateColumn: customFormat?.dateColumn ?? autoMapping.dateColumn ?? 0,
    amountColumn: customFormat?.amountColumn ?? autoMapping.amountColumn ?? 1,
    descriptionColumn: customFormat?.descriptionColumn ?? autoMapping.descriptionColumn ?? 2,
    typeColumn: customFormat?.typeColumn ?? autoMapping.typeColumn,
    balanceColumn: customFormat?.balanceColumn ?? autoMapping.balanceColumn,
    referenceColumn: customFormat?.referenceColumn ?? autoMapping.referenceColumn,
    counterpartyColumn: customFormat?.counterpartyColumn ?? autoMapping.counterpartyColumn,
    dateFormat: customFormat?.dateFormat ?? '',
    delimiter,
    hasHeader,
    amountFormat: customFormat?.amountFormat ?? autoMapping.amountFormat ?? 'single',
    creditColumn: customFormat?.creditColumn ?? autoMapping.creditColumn,
    debitColumn: customFormat?.debitColumn ?? autoMapping.debitColumn,
  };
  
  // Detect date format from first data row
  if (!format.dateFormat && lines.length > dataStartIdx) {
    const firstDataRow = parseCSVLine(lines[dataStartIdx], delimiter);
    if (firstDataRow[format.dateColumn]) {
      format.dateFormat = detectDateFormat(firstDataRow[format.dateColumn]);
    }
  }
  
  const transactions: CSVTransaction[] = [];
  
  for (let i = dataStartIdx; i < lines.length; i++) {
    const row = parseCSVLine(lines[i], delimiter);
    
    if (row.length < 2) continue;
    
    try {
      const dateStr = row[format.dateColumn];
      if (!dateStr) continue;
      
      let amount: number;
      if (format.amountFormat === 'credit_debit') {
        const credit = format.creditColumn !== undefined ? parseAmount(row[format.creditColumn]) : 0;
        const debit = format.debitColumn !== undefined ? parseAmount(row[format.debitColumn]) : 0;
        amount = credit - debit;
      } else {
        amount = parseAmount(row[format.amountColumn]);
      }
      
      if (amount === 0 && !row[format.descriptionColumn]) continue;
      
      const transaction: CSVTransaction = {
        date: parseDate(dateStr, format.dateFormat),
        amount,
        description: row[format.descriptionColumn] || '',
        type: format.typeColumn !== undefined ? row[format.typeColumn] : undefined,
        balance: format.balanceColumn !== undefined ? parseAmount(row[format.balanceColumn]) : undefined,
        reference: format.referenceColumn !== undefined ? row[format.referenceColumn] : undefined,
        counterparty: format.counterpartyColumn !== undefined ? row[format.counterpartyColumn] : undefined,
      };
      
      if (!isNaN(transaction.date.getTime())) {
        transactions.push(transaction);
      }
    } catch (e) {
      console.warn(`Erro ao processar linha ${i + 1}:`, e);
    }
  }
  
  return { transactions, headers, detectedFormat: format };
}

export function generateCSVHash(transaction: CSVTransaction, index: number): string {
  const str = `${transaction.date.toISOString().split('T')[0]}|${transaction.amount}|${transaction.description}|${index}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
