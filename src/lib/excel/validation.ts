// Excel import validation utilities
import type { ValidationError, TemplateColumn, NormalizedRow } from './types';
import { normalizeCode, normalizeDocumentNumber, normalizeDocumentType } from './normalizers';

export interface CategoryAccountValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  resolvedCategoryId?: string;
  resolvedAccountId?: string;
}

/**
 * Validate that category and account are consistent
 * Rules:
 * - category_code or account_code must be present
 * - If account_code is present, category is inferred
 * - If only category_code, warn that account should be provided
 * - account must belong to the specified category
 */
export function validateCategoryAccount(
  row: Record<string, unknown>,
  categories: { id: string; code: string; category_type: string }[],
  accounts: { id: string; code: string; category_id: string | null }[]
): CategoryAccountValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  let resolvedCategoryId: string | undefined;
  let resolvedAccountId: string | undefined;

  const categoryCode = normalizeCode(row.category_code);
  const accountCode = normalizeCode(row.account_code);

  // Find account first
  if (accountCode) {
    const account = accounts.find(a => normalizeCode(a.code) === accountCode);
    if (account) {
      resolvedAccountId = account.id;
      // Infer category from account
      if (account.category_id) {
        resolvedCategoryId = account.category_id;
        
        // Validate category consistency if category_code was also provided
        if (categoryCode) {
          const providedCategory = categories.find(c => normalizeCode(c.code) === categoryCode);
          if (providedCategory && providedCategory.id !== account.category_id) {
            warnings.push(`Conta ${accountCode} pertence à categoria diferente da informada. Usando categoria da conta.`);
          }
        }
      }
    } else {
      errors.push({ field: 'account_code', message: `Conta "${accountCode}" não encontrada` });
    }
  }

  // If no account but category provided
  if (!resolvedAccountId && categoryCode) {
    const category = categories.find(c => normalizeCode(c.code) === categoryCode);
    if (category) {
      resolvedCategoryId = category.id;
      warnings.push(`Categoria informada sem conta. Considere criar uma conta para melhor rastreamento.`);
    } else {
      errors.push({ field: 'category_code', message: `Categoria "${categoryCode}" não encontrada` });
    }
  }

  // Must have at least account or category
  if (!resolvedAccountId && !resolvedCategoryId) {
    errors.push({ field: 'account_code', message: 'Conta é obrigatória (account_code)' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    resolvedCategoryId,
    resolvedAccountId,
  };
}

/**
 * Validate document fields
 */
export function validateDocument(row: Record<string, unknown>): {
  normalizedNumber: string | null;
  normalizedType: string | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  const docNumber = normalizeDocumentNumber(row.document_number);
  const docType = normalizeDocumentType(row.document_type);

  // Warn if counterparty exists but no document for recurring expenses
  if (row.counterparty_name && !docNumber && row.direction === 'saida') {
    warnings.push('Despesa com fornecedor sem número de documento. Considere preencher para melhor rastreamento.');
  }

  return {
    normalizedNumber: docNumber,
    normalizedType: docType,
    warnings,
  };
}

/**
 * Check for duplicate transactions based on document
 */
export function checkDuplicateByDocument(
  row: Record<string, unknown>,
  existingTransactions: { 
    document_number: string | null; 
    counterparty_id: string | null;
    total_amount: number;
    direction: string;
  }[],
  counterpartyId: string | null
): { isDuplicate: boolean; warning: string | null } {
  const docNumber = normalizeDocumentNumber(row.document_number);
  
  if (!docNumber) {
    return { isDuplicate: false, warning: null };
  }

  const duplicate = existingTransactions.find(t => 
    t.document_number && 
    normalizeDocumentNumber(t.document_number) === docNumber &&
    t.counterparty_id === counterpartyId &&
    t.direction === row.direction
  );

  if (duplicate) {
    const sameAmount = duplicate.total_amount === Number(row.total_amount);
    if (sameAmount) {
      return { 
        isDuplicate: true, 
        warning: `Documento ${docNumber} já existe com o mesmo valor. Possível duplicata.` 
      };
    } else {
      return { 
        isDuplicate: false, 
        warning: `Documento ${docNumber} já existe mas com valor diferente. Verifique se é uma atualização.` 
      };
    }
  }

  return { isDuplicate: false, warning: null };
}

/**
 * Generate enhanced hash for idempotency including document
 */
export function generateEnhancedHash(row: Record<string, unknown>): string {
  const parts: string[] = [
    String(row.direction || ''),
    String(row.counterparty_name || ''),
    String(row.total_amount || ''),
  ];

  // Include document if available for stronger idempotency
  const docNumber = normalizeDocumentNumber(row.document_number);
  if (docNumber) {
    parts.push(docNumber);
  } else {
    // Fall back to due_date for non-documented transactions
    parts.push(String(row.due_date || ''));
  }

  const str = parts.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }

  return `tx_${Math.abs(hash).toString(36)}`;
}
