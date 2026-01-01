// Data normalization utilities for Excel import

/**
 * Parse Brazilian currency format to number
 * Accepts: 1.500,00 | 1500,00 | 1500.00 | R$ 1.500,00
 */
export function parseCurrency(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'number') return value;
  
  let str = String(value).trim();
  
  // Remove currency symbol and spaces
  str = str.replace(/R\$\s*/gi, '').replace(/\s/g, '');
  
  // Detect format: if has comma after dot, it's Brazilian (1.500,00)
  const hasBrazilianFormat = /\d+\.\d{3}/.test(str) || /,\d{1,2}$/.test(str);
  
  if (hasBrazilianFormat) {
    // Brazilian format: remove thousand separator (.) and convert decimal separator (, -> .)
    str = str.replace(/\./g, '').replace(',', '.');
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Parse date from various formats
 * Accepts: dd/mm/yyyy | yyyy-mm-dd | dd-mm-yyyy
 */
export function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  
  if (value instanceof Date) return value;
  
  const str = String(value).trim();
  
  // Try ISO format first (yyyy-mm-dd)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const date = new Date(str);
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try Brazilian format (dd/mm/yyyy or dd-mm-yyyy)
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try mm/dd/yyyy (US format)
  const usMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

/**
 * Format date to ISO string (yyyy-mm-dd)
 */
export function formatDateToISO(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

/**
 * Parse boolean from various formats
 * Accepts: true/false | sim/não | s/n | 1/0 | yes/no | y/n
 */
export function parseBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'boolean') return value;
  
  const str = String(value).trim().toLowerCase();
  
  const trueValues = ['true', 'sim', 's', '1', 'yes', 'y', 'verdadeiro', 'v'];
  const falseValues = ['false', 'não', 'nao', 'n', '0', 'no', 'falso', 'f'];
  
  if (trueValues.includes(str)) return true;
  if (falseValues.includes(str)) return false;
  
  return null;
}

/**
 * Parse integer
 */
export function parseInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'number') return Math.floor(value);
  
  const num = parseInt(String(value).trim(), 10);
  return isNaN(num) ? null : num;
}

/**
 * Parse decimal
 */
export function parseDecimal(value: unknown): number | null {
  return parseCurrency(value);
}

/**
 * Normalize text - trim and handle empty
 */
export function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  
  const str = String(value).trim();
  return str === '' ? null : str;
}

/**
 * Normalize enum value
 */
export function normalizeEnum(value: unknown, options: string[]): string | null {
  if (value === null || value === undefined || value === '') return null;
  
  const str = String(value).trim().toLowerCase();
  
  // Try exact match first
  const exactMatch = options.find(opt => opt.toLowerCase() === str);
  if (exactMatch) return exactMatch;
  
  // Try partial match
  const partialMatch = options.find(opt => 
    opt.toLowerCase().includes(str) || str.includes(opt.toLowerCase())
  );
  
  return partialMatch || null;
}

/**
 * Normalize CPF/CNPJ - remove formatting
 */
export function normalizeDocument(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  
  return String(value).replace(/[^\d]/g, '') || null;
}

/**
 * Normalize account/category code
 * Remove extra spaces, standardize dots
 */
export function normalizeCode(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  
  let str = String(value).trim().toUpperCase();
  // Remove double spaces
  str = str.replace(/\s+/g, ' ');
  // Standardize separators (allow dots, dashes, spaces)
  return str || null;
}

/**
 * Normalize document number (NF/Fatura/Recibo)
 * Accepts: "NF123", "NF 123", "NFe-123" -> returns clean format
 */
export function normalizeDocumentNumber(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  
  let str = String(value).trim();
  // Remove double spaces
  str = str.replace(/\s+/g, ' ');
  return str || null;
}

/**
 * Normalize document type
 */
export function normalizeDocumentType(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  
  const str = String(value).trim().toLowerCase();
  
  const typeMap: Record<string, string> = {
    'nf': 'nf',
    'nota fiscal': 'nf',
    'nfe': 'nfe',
    'nota fiscal eletronica': 'nfe',
    'nota fiscal eletrônica': 'nfe',
    'fatura': 'fatura',
    'fat': 'fatura',
    'recibo': 'recibo',
    'rec': 'recibo',
    'boleto': 'boleto',
    'bol': 'boleto',
    'outro': 'outro',
    'outros': 'outro',
  };
  
  return typeMap[str] || 'outro';
}

/**
 * Generate deterministic hash for a row (for idempotency)
 * Optionally includes document_number if present
 */
export function generateRowHash(data: Record<string, unknown>, fields: string[]): string {
  const values = fields.map(f => String(data[f] ?? '')).join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < values.length; i++) {
    const char = values.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `hash_${Math.abs(hash).toString(36)}`;
}

/**
 * Generate idempotency hash including document info when available
 */
export function generateTransactionHash(data: Record<string, unknown>): string {
  const baseFields = ['direction', 'counterparty_name', 'total_amount'];
  
  // Include document_number if present for stronger idempotency
  if (data.document_number) {
    return generateRowHash(data, [...baseFields, 'document_number']);
  }
  
  return generateRowHash(data, baseFields);
}
