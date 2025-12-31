// Reconciliation Logic - Match imported transactions with existing ones
import { Tables } from '@/integrations/supabase/types';

type Transaction = Tables<'transactions'>;

export interface ImportedTransaction {
  id: string;
  external_id?: string;
  external_hash: string;
  posted_at: string;
  amount: number;
  direction: 'in' | 'out';
  description_raw?: string;
  counterparty_raw?: string;
  fit_id?: string;
  wallet_id?: string;
}

export interface ReconciliationResult {
  importedTransactionId: string;
  transactionId?: string;
  matchType: 'exact' | 'fuzzy' | 'manual';
  confidence: number;
  rulesApplied: string[];
  suggestedAction: 'mark_paid' | 'create' | 'ignore' | 'pending';
}

export interface ReconciliationSettings {
  autoReconcileThreshold: number; // 0-100, auto-reconcile if confidence >= this
  dateTolerance: number; // days
  amountTolerance: number; // absolute value tolerance
  amountTolerancePercent: number; // percentage tolerance
  autoCreateTransactions: boolean;
  defaultAccountId?: string;
}

const DEFAULT_SETTINGS: ReconciliationSettings = {
  autoReconcileThreshold: 90,
  dateTolerance: 3,
  amountTolerance: 0.05,
  amountTolerancePercent: 0,
  autoCreateTransactions: false,
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textSimilarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  
  if (normA === normB) return 100;
  if (!normA || !normB) return 0;
  
  // Check if one contains the other
  if (normA.includes(normB) || normB.includes(normA)) {
    const ratio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length);
    return Math.floor(50 + ratio * 40);
  }
  
  // Word match
  const wordsA = new Set(normA.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(normB.split(' ').filter(w => w.length > 2));
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  let matches = 0;
  wordsA.forEach(word => {
    if (wordsB.has(word)) matches++;
  });
  
  const totalWords = Math.max(wordsA.size, wordsB.size);
  return Math.floor((matches / totalWords) * 80);
}

function dateDifference(date1: string | Date, date2: string | Date): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d1.getTime() - d2.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function amountMatches(
  amount1: number,
  amount2: number,
  tolerance: number,
  tolerancePercent: number
): boolean {
  const diff = Math.abs(amount1 - amount2);
  if (diff <= tolerance) return true;
  if (tolerancePercent > 0) {
    const percentDiff = (diff / Math.max(Math.abs(amount1), Math.abs(amount2))) * 100;
    return percentDiff <= tolerancePercent;
  }
  return false;
}

export function findExactMatch(
  imported: ImportedTransaction,
  transactions: Transaction[]
): Transaction | null {
  // Match by external_id or fit_id if already linked
  // This is handled at database level, but we can check here too
  
  // Match by exact amount, date, and wallet
  for (const tx of transactions) {
    const txDirection = tx.direction === 'entrada' ? 'in' : 'out';
    const txAmount = Math.abs(tx.total_amount);
    const importedAmount = Math.abs(imported.amount);
    
    // Skip if different direction
    if (txDirection !== imported.direction) continue;
    
    // Exact amount match
    if (txAmount !== importedAmount) continue;
    
    // Exact date match (due_date or paid_date)
    const importedDate = new Date(imported.posted_at).toISOString().split('T')[0];
    const txDueDate = new Date(tx.due_date).toISOString().split('T')[0];
    const txPaidDate = tx.paid_date ? new Date(tx.paid_date).toISOString().split('T')[0] : null;
    
    if (txDueDate === importedDate || txPaidDate === importedDate) {
      // Same wallet if specified
      if (!imported.wallet_id || tx.wallet_id === imported.wallet_id) {
        return tx;
      }
    }
  }
  
  return null;
}

export function findFuzzyMatches(
  imported: ImportedTransaction,
  transactions: Transaction[],
  settings: ReconciliationSettings = DEFAULT_SETTINGS
): Array<{ transaction: Transaction; confidence: number; rules: string[] }> {
  const matches: Array<{ transaction: Transaction; confidence: number; rules: string[] }> = [];
  
  const importedAmount = Math.abs(imported.amount);
  const importedDate = new Date(imported.posted_at);
  
  for (const tx of transactions) {
    const rules: string[] = [];
    let confidence = 0;
    
    const txDirection = tx.direction === 'entrada' ? 'in' : 'out';
    const txAmount = Math.abs(tx.total_amount);
    
    // Must be same direction
    if (txDirection !== imported.direction) continue;
    
    // Amount check
    if (txAmount === importedAmount) {
      confidence += 40;
      rules.push('exact_amount');
    } else if (amountMatches(txAmount, importedAmount, settings.amountTolerance, settings.amountTolerancePercent)) {
      confidence += 25;
      rules.push('fuzzy_amount');
    } else {
      continue; // Amount must match within tolerance
    }
    
    // Date check
    const txDueDate = new Date(tx.due_date);
    const txPaidDate = tx.paid_date ? new Date(tx.paid_date) : null;
    
    const dueDiff = dateDifference(importedDate, txDueDate);
    const paidDiff = txPaidDate ? dateDifference(importedDate, txPaidDate) : Infinity;
    const minDateDiff = Math.min(dueDiff, paidDiff);
    
    if (minDateDiff === 0) {
      confidence += 30;
      rules.push('exact_date');
    } else if (minDateDiff <= settings.dateTolerance) {
      confidence += Math.max(10, 25 - minDateDiff * 5);
      rules.push('fuzzy_date');
    } else {
      continue; // Date must be within tolerance
    }
    
    // Wallet match
    if (imported.wallet_id && tx.wallet_id === imported.wallet_id) {
      confidence += 15;
      rules.push('same_wallet');
    }
    
    // Description similarity
    if (imported.description_raw && tx.description) {
      const similarity = textSimilarity(imported.description_raw, tx.description);
      if (similarity >= 50) {
        confidence += Math.floor(similarity * 0.15);
        rules.push('similar_description');
      }
    }
    
    // Status check - prefer unpaid transactions
    if (tx.status !== 'pago') {
      confidence += 5;
      rules.push('unpaid');
    }
    
    // Cap at 100
    confidence = Math.min(100, confidence);
    
    if (confidence >= 50) {
      matches.push({ transaction: tx, confidence, rules });
    }
  }
  
  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence);
}

export function reconcileTransaction(
  imported: ImportedTransaction,
  transactions: Transaction[],
  settings: ReconciliationSettings = DEFAULT_SETTINGS
): ReconciliationResult {
  // Check for exact match first
  const exactMatch = findExactMatch(imported, transactions);
  
  if (exactMatch) {
    return {
      importedTransactionId: imported.id,
      transactionId: exactMatch.id,
      matchType: 'exact',
      confidence: 100,
      rulesApplied: ['exact_match'],
      suggestedAction: exactMatch.status === 'pago' ? 'ignore' : 'mark_paid',
    };
  }
  
  // Try fuzzy matching
  const fuzzyMatches = findFuzzyMatches(imported, transactions, settings);
  
  if (fuzzyMatches.length > 0) {
    const best = fuzzyMatches[0];
    
    let suggestedAction: ReconciliationResult['suggestedAction'] = 'pending';
    
    if (best.confidence >= settings.autoReconcileThreshold) {
      suggestedAction = best.transaction.status === 'pago' ? 'ignore' : 'mark_paid';
    } else if (best.confidence >= 60) {
      suggestedAction = 'pending'; // Needs review
    }
    
    return {
      importedTransactionId: imported.id,
      transactionId: best.transaction.id,
      matchType: 'fuzzy',
      confidence: best.confidence,
      rulesApplied: best.rules,
      suggestedAction,
    };
  }
  
  // No match found - suggest creating new transaction
  return {
    importedTransactionId: imported.id,
    matchType: 'manual',
    confidence: 0,
    rulesApplied: ['no_match'],
    suggestedAction: settings.autoCreateTransactions ? 'create' : 'pending',
  };
}

export function applyCategorization(
  description: string,
  rules: Array<{
    conditions_json: { keywords?: string[]; direction?: string; minAmount?: number; maxAmount?: number };
    account_id?: string;
    cost_center_id?: string;
    counterparty_id?: string;
  }>,
  direction: 'in' | 'out',
  amount: number
): { accountId?: string; costCenterId?: string; counterpartyId?: string } | null {
  const normalizedDesc = normalizeText(description);
  
  for (const rule of rules) {
    const conditions = rule.conditions_json;
    
    // Check direction
    if (conditions.direction && conditions.direction !== direction) continue;
    
    // Check amount range
    if (conditions.minAmount !== undefined && amount < conditions.minAmount) continue;
    if (conditions.maxAmount !== undefined && amount > conditions.maxAmount) continue;
    
    // Check keywords
    if (conditions.keywords && conditions.keywords.length > 0) {
      const hasKeyword = conditions.keywords.some(kw => 
        normalizedDesc.includes(normalizeText(kw))
      );
      if (!hasKeyword) continue;
    }
    
    // All conditions match
    return {
      accountId: rule.account_id || undefined,
      costCenterId: rule.cost_center_id || undefined,
      counterpartyId: rule.counterparty_id || undefined,
    };
  }
  
  return null;
}
