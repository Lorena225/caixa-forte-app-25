// src/services/BankReconciliationService.ts
// Bank Reconciliation Service with intelligent matching, fraud detection, and AI-powered analysis

import { supabase } from '@/integrations/supabase/client';

// ============= Types =============

export interface BankStatement {
  id: string;
  company_id: string;
  bank_account_id: string;
  statement_date: string;
  opening_balance: number;
  closing_balance: number;
  lines: BankStatementLine[];
}

export interface BankStatementLine {
  id: string;
  statement_id: string;
  line_number: number;
  posted_date: string;
  description: string;
  amount: number;
  balance: number | null;
  direction: 'entrada' | 'saida';
  fit_id?: string;
  check_number?: string;
  reference_number?: string;
  is_reconciled: boolean;
  reconciled_at?: string;
}

export interface CaixaRegister {
  id: string;
  company_id: string;
  type: 'receita' | 'despesa';
  description: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: 'pendente' | 'pago' | 'cancelado';
  counterparty_name?: string;
  document_number?: string;
  category?: string;
  cost_center?: string;
}

export interface MatchResult {
  statement_line_id: string;
  caixa_register_id: string;
  score: number;
  match_type: 'exact' | 'fuzzy' | 'suggested' | 'manual';
  match_reasons: string[];
  amount_diff: number;
  date_diff_days: number;
  confidence: number;
}

export interface FraudAlert {
  id: string;
  alert_type: 'duplicate_payment' | 'unusual_amount' | 'suspicious_timing' | 'pattern_anomaly' | 'unauthorized_vendor';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_transactions: string[];
  detected_at: string;
  details: Record<string, unknown>;
}

export interface DuplicateWarning {
  id: string;
  original_transaction_id: string;
  duplicate_transaction_id: string;
  similarity_score: number;
  match_fields: string[];
  description: string;
}

export interface UnmatchedItem {
  id: string;
  source: 'bank' | 'system';
  item_type: 'statement_line' | 'caixa_register';
  description: string;
  amount: number;
  date: string;
  direction: 'entrada' | 'saida';
  days_pending: number;
  suggested_action: 'create_entry' | 'investigate' | 'ignore' | 'manual_match';
}

export interface ReconciliationReport {
  id: string;
  company_id: string;
  bank_account_id: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  
  // Summary
  bank_opening_balance: number;
  bank_closing_balance: number;
  system_opening_balance: number;
  system_closing_balance: number;
  difference: number;
  
  // Match statistics
  total_bank_transactions: number;
  total_system_transactions: number;
  matched_count: number;
  unmatched_bank_count: number;
  unmatched_system_count: number;
  match_rate: number;
  
  // Results
  matches: MatchResult[];
  unmatched_items: UnmatchedItem[];
  fraud_alerts: FraudAlert[];
  duplicate_warnings: DuplicateWarning[];
  adjustments: JournalEntry[];
  
  // Status
  status: 'draft' | 'pending_review' | 'approved' | 'completed';
  approved_by?: string;
  approved_at?: string;
}

export interface JournalEntry {
  id: string;
  entry_date: string;
  description: string;
  reference: string;
  lines: JournalEntryLine[];
  source: 'reconciliation' | 'adjustment' | 'correction';
  source_id?: string;
}

export interface JournalEntryLine {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  cost_center?: string;
  description?: string;
}

// ============= Matching Configuration =============

export interface MatchingConfig {
  amount_tolerance_percent: number;
  amount_tolerance_fixed: number;
  date_tolerance_days: number;
  auto_match_threshold: number;
  suggestion_threshold: number;
  use_ai_matching: boolean;
}

const DEFAULT_CONFIG: MatchingConfig = {
  amount_tolerance_percent: 0.01,  // 1%
  amount_tolerance_fixed: 0.05,    // R$ 0.05
  date_tolerance_days: 3,
  auto_match_threshold: 95,
  suggestion_threshold: 70,
  use_ai_matching: true,
};

// ============= BankReconciliation Class =============

export class BankReconciliation {
  private bankStatement: BankStatement;
  private caixaRegisters: CaixaRegister[];
  private companyId: string;
  private config: MatchingConfig;
  
  private matches: MatchResult[] = [];
  private unmatchedBankItems: BankStatementLine[] = [];
  private unmatchedSystemItems: CaixaRegister[] = [];

  constructor(
    bankStatement: BankStatement,
    caixaRegisters: CaixaRegister[],
    config: Partial<MatchingConfig> = {}
  ) {
    this.bankStatement = bankStatement;
    this.caixaRegisters = caixaRegisters;
    this.companyId = bankStatement.company_id;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============= Matching Methods =============

  autoMatch(tolerance: number = 0.01): MatchResult[] {
    const matches: MatchResult[] = [];
    const usedCaixaIds = new Set<string>();
    const usedLineIds = new Set<string>();

    // Sort by amount for efficient matching
    const sortedLines = [...this.bankStatement.lines].sort((a, b) => 
      Math.abs(b.amount) - Math.abs(a.amount)
    );

    for (const line of sortedLines) {
      if (usedLineIds.has(line.id)) continue;

      let bestMatch: MatchResult | null = null;
      let bestScore = 0;

      for (const register of this.caixaRegisters) {
        if (usedCaixaIds.has(register.id)) continue;

        // Direction must match
        const lineDirection = line.direction;
        const registerDirection = register.type === 'receita' ? 'entrada' : 'saida';
        if (lineDirection !== registerDirection) continue;

        // Calculate match score
        const score = this.calculateMatchScore(line, register, tolerance);
        
        if (score > bestScore && score >= this.config.auto_match_threshold) {
          bestScore = score;
          bestMatch = this.createMatchResult(line, register, score, 'exact');
        }
      }

      if (bestMatch) {
        matches.push(bestMatch);
        usedCaixaIds.add(bestMatch.caixa_register_id);
        usedLineIds.add(bestMatch.statement_line_id);
      }
    }

    this.matches = matches;
    this.updateUnmatchedItems(usedLineIds, usedCaixaIds);
    return matches;
  }

  matchByDate(daysMargin: number = 2): MatchResult[] {
    const matches: MatchResult[] = [];
    const usedCaixaIds = new Set<string>();
    const usedLineIds = new Set<string>();

    for (const line of this.bankStatement.lines) {
      if (usedLineIds.has(line.id)) continue;

      const lineDate = new Date(line.posted_date);
      const candidates: { register: CaixaRegister; dateDiff: number }[] = [];

      for (const register of this.caixaRegisters) {
        if (usedCaixaIds.has(register.id)) continue;

        const registerDate = new Date(register.payment_date || register.due_date);
        const dateDiff = Math.abs(
          (lineDate.getTime() - registerDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dateDiff <= daysMargin) {
          candidates.push({ register, dateDiff });
        }
      }

      // Sort by date proximity
      candidates.sort((a, b) => a.dateDiff - b.dateDiff);

      for (const { register } of candidates) {
        if (usedCaixaIds.has(register.id)) continue;

        const lineDirection = line.direction;
        const registerDirection = register.type === 'receita' ? 'entrada' : 'saida';
        if (lineDirection !== registerDirection) continue;

        const amountMatch = Math.abs(line.amount - register.amount) <= 
          Math.max(this.config.amount_tolerance_fixed, register.amount * this.config.amount_tolerance_percent);

        if (amountMatch) {
          const score = this.calculateMatchScore(line, register, this.config.amount_tolerance_percent);
          matches.push(this.createMatchResult(line, register, score, 'fuzzy'));
          usedCaixaIds.add(register.id);
          usedLineIds.add(line.id);
          break;
        }
      }
    }

    return matches;
  }

  matchByAmount(variance: number = 5): MatchResult[] {
    const matches: MatchResult[] = [];
    const usedCaixaIds = new Set<string>();
    const usedLineIds = new Set<string>();

    // Group by amount ranges
    const amountGroups = new Map<number, CaixaRegister[]>();
    
    for (const register of this.caixaRegisters) {
      const roundedAmount = Math.round(register.amount / variance) * variance;
      if (!amountGroups.has(roundedAmount)) {
        amountGroups.set(roundedAmount, []);
      }
      amountGroups.get(roundedAmount)!.push(register);
    }

    for (const line of this.bankStatement.lines) {
      if (usedLineIds.has(line.id)) continue;

      const roundedLineAmount = Math.round(Math.abs(line.amount) / variance) * variance;
      const candidates = amountGroups.get(roundedLineAmount) || [];

      for (const register of candidates) {
        if (usedCaixaIds.has(register.id)) continue;

        const lineDirection = line.direction;
        const registerDirection = register.type === 'receita' ? 'entrada' : 'saida';
        if (lineDirection !== registerDirection) continue;

        const amountDiff = Math.abs(Math.abs(line.amount) - register.amount);
        if (amountDiff <= variance) {
          const score = this.calculateMatchScore(line, register, variance / register.amount);
          matches.push(this.createMatchResult(line, register, score, 'fuzzy'));
          usedCaixaIds.add(register.id);
          usedLineIds.add(line.id);
          break;
        }
      }
    }

    return matches;
  }

  matchByDescription(): MatchResult[] {
    const matches: MatchResult[] = [];
    const usedCaixaIds = new Set<string>();
    const usedLineIds = new Set<string>();

    for (const line of this.bankStatement.lines) {
      if (usedLineIds.has(line.id) || !line.description) continue;

      let bestMatch: { register: CaixaRegister; similarity: number } | null = null;

      for (const register of this.caixaRegisters) {
        if (usedCaixaIds.has(register.id)) continue;

        const lineDirection = line.direction;
        const registerDirection = register.type === 'receita' ? 'entrada' : 'saida';
        if (lineDirection !== registerDirection) continue;

        const similarity = this.calculateStringSimilarity(
          line.description.toLowerCase(),
          (register.description || '').toLowerCase()
        );

        if (similarity > 0.6 && (!bestMatch || similarity > bestMatch.similarity)) {
          bestMatch = { register, similarity };
        }
      }

      if (bestMatch) {
        const amountDiff = Math.abs(Math.abs(line.amount) - bestMatch.register.amount);
        const amountTolerance = bestMatch.register.amount * 0.1; // 10% tolerance for description match

        if (amountDiff <= amountTolerance) {
          const score = (bestMatch.similarity * 60) + 
            (1 - amountDiff / bestMatch.register.amount) * 40;
          
          matches.push(this.createMatchResult(line, bestMatch.register, score, 'fuzzy'));
          usedCaixaIds.add(bestMatch.register.id);
          usedLineIds.add(line.id);
        }
      }
    }

    return matches;
  }

  // ============= Anomaly Detection =============

  detectFraudPatterns(): FraudAlert[] {
    const alerts: FraudAlert[] = [];
    const now = new Date();

    // Detect unusual amounts (statistical outliers)
    const amounts = this.bankStatement.lines.map(l => Math.abs(l.amount));
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / amounts.length
    );

    for (const line of this.bankStatement.lines) {
      const zscore = (Math.abs(line.amount) - mean) / stdDev;
      
      if (zscore > 3) {
        alerts.push({
          id: `fraud-unusual-${line.id}`,
          alert_type: 'unusual_amount',
          severity: zscore > 4 ? 'high' : 'medium',
          description: `Valor atípico detectado: ${this.formatCurrency(line.amount)} (${zscore.toFixed(1)} desvios padrão da média)`,
          affected_transactions: [line.id],
          detected_at: now.toISOString(),
          details: { amount: line.amount, mean, stdDev, zscore },
        });
      }
    }

    // Detect suspicious timing patterns (weekend/holiday transactions, late night)
    for (const line of this.bankStatement.lines) {
      const date = new Date(line.posted_date);
      const dayOfWeek = date.getDay();
      
      if ((dayOfWeek === 0 || dayOfWeek === 6) && Math.abs(line.amount) > mean * 2) {
        alerts.push({
          id: `fraud-timing-${line.id}`,
          alert_type: 'suspicious_timing',
          severity: 'medium',
          description: `Transação de alto valor em fim de semana: ${this.formatCurrency(line.amount)}`,
          affected_transactions: [line.id],
          detected_at: now.toISOString(),
          details: { amount: line.amount, dayOfWeek, date: line.posted_date },
        });
      }
    }

    // Detect round number patterns (potential fraud indicator)
    const roundNumberTxns = this.bankStatement.lines.filter(line => {
      const amount = Math.abs(line.amount);
      return amount >= 1000 && amount % 1000 === 0;
    });

    if (roundNumberTxns.length > 3) {
      alerts.push({
        id: 'fraud-pattern-round-numbers',
        alert_type: 'pattern_anomaly',
        severity: 'low',
        description: `Padrão de valores redondos detectado: ${roundNumberTxns.length} transações com valores múltiplos de R$ 1.000`,
        affected_transactions: roundNumberTxns.map(t => t.id),
        detected_at: now.toISOString(),
        details: { count: roundNumberTxns.length, amounts: roundNumberTxns.map(t => t.amount) },
      });
    }

    return alerts;
  }

  detectDuplicateTransactions(): DuplicateWarning[] {
    const warnings: DuplicateWarning[] = [];
    const seen = new Map<string, BankStatementLine>();

    for (const line of this.bankStatement.lines) {
      // Create a signature for quick duplicate detection
      const signature = `${line.amount}_${line.posted_date}_${line.direction}`;
      
      if (seen.has(signature)) {
        const original = seen.get(signature)!;
        const descSimilarity = this.calculateStringSimilarity(
          line.description || '',
          original.description || ''
        );

        warnings.push({
          id: `dup-${original.id}-${line.id}`,
          original_transaction_id: original.id,
          duplicate_transaction_id: line.id,
          similarity_score: 85 + (descSimilarity * 15),
          match_fields: ['amount', 'date', 'direction'],
          description: `Possível duplicata: ${this.formatCurrency(line.amount)} em ${line.posted_date}`,
        });
      } else {
        seen.set(signature, line);
      }
    }

    // Check for near-duplicates (same amount, different dates within 1 day)
    const linesByAmount = new Map<number, BankStatementLine[]>();
    for (const line of this.bankStatement.lines) {
      const key = Math.abs(line.amount);
      if (!linesByAmount.has(key)) {
        linesByAmount.set(key, []);
      }
      linesByAmount.get(key)!.push(line);
    }

    for (const [, lines] of linesByAmount) {
      if (lines.length < 2) continue;
      
      for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
          const dateA = new Date(lines[i].posted_date);
          const dateB = new Date(lines[j].posted_date);
          const daysDiff = Math.abs((dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff <= 1 && lines[i].direction === lines[j].direction) {
            const alreadyWarned = warnings.some(w => 
              (w.original_transaction_id === lines[i].id && w.duplicate_transaction_id === lines[j].id) ||
              (w.original_transaction_id === lines[j].id && w.duplicate_transaction_id === lines[i].id)
            );

            if (!alreadyWarned) {
              warnings.push({
                id: `dup-near-${lines[i].id}-${lines[j].id}`,
                original_transaction_id: lines[i].id,
                duplicate_transaction_id: lines[j].id,
                similarity_score: 75,
                match_fields: ['amount', 'direction'],
                description: `Transações similares em datas próximas: ${this.formatCurrency(lines[i].amount)}`,
              });
            }
          }
        }
      }
    }

    return warnings;
  }

  identifyUnmatchedItems(): UnmatchedItem[] {
    const unmatchedItems: UnmatchedItem[] = [];
    const matchedLineIds = new Set(this.matches.map(m => m.statement_line_id));
    const matchedRegisterIds = new Set(this.matches.map(m => m.caixa_register_id));
    const now = new Date();

    // Unmatched bank statement lines
    for (const line of this.bankStatement.lines) {
      if (matchedLineIds.has(line.id)) continue;

      const lineDate = new Date(line.posted_date);
      const daysPending = Math.floor((now.getTime() - lineDate.getTime()) / (1000 * 60 * 60 * 24));

      let suggestedAction: UnmatchedItem['suggested_action'] = 'investigate';
      
      if (daysPending < 3) {
        suggestedAction = 'manual_match';
      } else if (daysPending > 30) {
        suggestedAction = 'create_entry';
      } else if (Math.abs(line.amount) < 10) {
        suggestedAction = 'ignore';
      }

      unmatchedItems.push({
        id: `unmatched-bank-${line.id}`,
        source: 'bank',
        item_type: 'statement_line',
        description: line.description || 'Sem descrição',
        amount: line.amount,
        date: line.posted_date,
        direction: line.direction,
        days_pending: daysPending,
        suggested_action: suggestedAction,
      });
    }

    // Unmatched system registers (paid items that weren't found in bank)
    for (const register of this.caixaRegisters) {
      if (matchedRegisterIds.has(register.id)) continue;
      if (register.status !== 'pago') continue;

      const registerDate = new Date(register.payment_date || register.due_date);
      const daysPending = Math.floor((now.getTime() - registerDate.getTime()) / (1000 * 60 * 60 * 24));

      unmatchedItems.push({
        id: `unmatched-system-${register.id}`,
        source: 'system',
        item_type: 'caixa_register',
        description: register.description,
        amount: register.amount,
        date: register.payment_date || register.due_date,
        direction: register.type === 'receita' ? 'entrada' : 'saida',
        days_pending: daysPending,
        suggested_action: daysPending > 7 ? 'investigate' : 'manual_match',
      });
    }

    return unmatchedItems;
  }

  // ============= Reconciliation =============

  reconcile(): ReconciliationReport {
    // Run all matching algorithms
    const exactMatches = this.autoMatch();
    const dateMatches = this.matchByDate();
    const amountMatches = this.matchByAmount();
    const descMatches = this.matchByDescription();

    // Combine matches, avoiding duplicates
    const allMatches = new Map<string, MatchResult>();
    [...exactMatches, ...dateMatches, ...amountMatches, ...descMatches].forEach(match => {
      const key = `${match.statement_line_id}_${match.caixa_register_id}`;
      if (!allMatches.has(key) || allMatches.get(key)!.score < match.score) {
        allMatches.set(key, match);
      }
    });

    this.matches = Array.from(allMatches.values());
    
    // Get remaining data
    const unmatchedItems = this.identifyUnmatchedItems();
    const fraudAlerts = this.detectFraudPatterns();
    const duplicateWarnings = this.detectDuplicateTransactions();
    const adjustments = this.generateAdjustments();

    // Calculate totals
    const bankTotal = this.bankStatement.lines.reduce((sum, l) => sum + l.amount, 0);
    const systemTotal = this.caixaRegisters
      .filter(r => r.status === 'pago')
      .reduce((sum, r) => sum + (r.type === 'receita' ? r.amount : -r.amount), 0);

    const report: ReconciliationReport = {
      id: crypto.randomUUID(),
      company_id: this.companyId,
      bank_account_id: this.bankStatement.bank_account_id,
      period_start: this.bankStatement.lines[0]?.posted_date || this.bankStatement.statement_date,
      period_end: this.bankStatement.lines[this.bankStatement.lines.length - 1]?.posted_date || this.bankStatement.statement_date,
      generated_at: new Date().toISOString(),
      
      bank_opening_balance: this.bankStatement.opening_balance,
      bank_closing_balance: this.bankStatement.closing_balance,
      system_opening_balance: this.bankStatement.opening_balance, // Simplified
      system_closing_balance: this.bankStatement.opening_balance + systemTotal,
      difference: this.bankStatement.closing_balance - (this.bankStatement.opening_balance + systemTotal),
      
      total_bank_transactions: this.bankStatement.lines.length,
      total_system_transactions: this.caixaRegisters.filter(r => r.status === 'pago').length,
      matched_count: this.matches.length,
      unmatched_bank_count: unmatchedItems.filter(i => i.source === 'bank').length,
      unmatched_system_count: unmatchedItems.filter(i => i.source === 'system').length,
      match_rate: this.bankStatement.lines.length > 0 
        ? (this.matches.length / this.bankStatement.lines.length) * 100 
        : 0,
      
      matches: this.matches,
      unmatched_items: unmatchedItems,
      fraud_alerts: fraudAlerts,
      duplicate_warnings: duplicateWarnings,
      adjustments,
      
      status: 'draft',
    };

    return report;
  }

  generateAdjustments(): JournalEntry[] {
    const adjustments: JournalEntry[] = [];
    const unmatchedItems = this.identifyUnmatchedItems();
    const today = new Date().toISOString().split('T')[0];

    // Group unmatched items that might need adjustment entries
    const bankOnlyItems = unmatchedItems.filter(
      i => i.source === 'bank' && i.suggested_action === 'create_entry'
    );

    if (bankOnlyItems.length > 0) {
      const totalEntradas = bankOnlyItems
        .filter(i => i.direction === 'entrada')
        .reduce((sum, i) => sum + Math.abs(i.amount), 0);
      
      const totalSaidas = bankOnlyItems
        .filter(i => i.direction === 'saida')
        .reduce((sum, i) => sum + Math.abs(i.amount), 0);

      if (totalEntradas > 0) {
        adjustments.push({
          id: crypto.randomUUID(),
          entry_date: today,
          description: 'Ajuste de conciliação - Entradas não identificadas',
          reference: `CONC-ENT-${today}`,
          source: 'reconciliation',
          lines: [
            {
              account_code: '1.1.1.01',
              account_name: 'Banco c/Movimento',
              debit: totalEntradas,
              credit: 0,
              description: 'Entradas pendentes de identificação',
            },
            {
              account_code: '2.1.9.99',
              account_name: 'Valores a Classificar',
              debit: 0,
              credit: totalEntradas,
              description: 'Créditos pendentes de classificação',
            },
          ],
        });
      }

      if (totalSaidas > 0) {
        adjustments.push({
          id: crypto.randomUUID(),
          entry_date: today,
          description: 'Ajuste de conciliação - Saídas não identificadas',
          reference: `CONC-SAI-${today}`,
          source: 'reconciliation',
          lines: [
            {
              account_code: '1.1.9.99',
              account_name: 'Valores a Classificar',
              debit: totalSaidas,
              credit: 0,
              description: 'Débitos pendentes de classificação',
            },
            {
              account_code: '1.1.1.01',
              account_name: 'Banco c/Movimento',
              debit: 0,
              credit: totalSaidas,
              description: 'Saídas pendentes de identificação',
            },
          ],
        });
      }
    }

    return adjustments;
  }

  // ============= Private Helper Methods =============

  private calculateMatchScore(
    line: BankStatementLine,
    register: CaixaRegister,
    tolerance: number
  ): number {
    let score = 0;
    const reasons: string[] = [];

    // Amount match (40 points max)
    const amountDiff = Math.abs(Math.abs(line.amount) - register.amount);
    const amountTolerance = Math.max(this.config.amount_tolerance_fixed, register.amount * tolerance);
    
    if (amountDiff === 0) {
      score += 40;
      reasons.push('Valor exato');
    } else if (amountDiff <= amountTolerance) {
      score += 40 * (1 - amountDiff / amountTolerance);
      reasons.push('Valor aproximado');
    }

    // Date match (30 points max)
    const lineDate = new Date(line.posted_date);
    const registerDate = new Date(register.payment_date || register.due_date);
    const dateDiff = Math.abs(
      (lineDate.getTime() - registerDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dateDiff === 0) {
      score += 30;
      reasons.push('Data exata');
    } else if (dateDiff <= this.config.date_tolerance_days) {
      score += 30 * (1 - dateDiff / this.config.date_tolerance_days);
      reasons.push('Data próxima');
    }

    // Description match (20 points max)
    if (line.description && register.description) {
      const similarity = this.calculateStringSimilarity(
        line.description.toLowerCase(),
        register.description.toLowerCase()
      );
      score += similarity * 20;
      if (similarity > 0.5) reasons.push('Descrição similar');
    }

    // Reference/document match (10 points)
    if (line.reference_number && register.document_number) {
      if (line.reference_number.includes(register.document_number) ||
          register.document_number.includes(line.reference_number)) {
        score += 10;
        reasons.push('Documento correspondente');
      }
    }

    return Math.round(score);
  }

  private createMatchResult(
    line: BankStatementLine,
    register: CaixaRegister,
    score: number,
    matchType: MatchResult['match_type']
  ): MatchResult {
    const lineDate = new Date(line.posted_date);
    const registerDate = new Date(register.payment_date || register.due_date);
    const dateDiff = Math.round(
      (lineDate.getTime() - registerDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      statement_line_id: line.id,
      caixa_register_id: register.id,
      score,
      match_type: matchType,
      match_reasons: this.getMatchReasons(line, register),
      amount_diff: Math.abs(line.amount) - register.amount,
      date_diff_days: dateDiff,
      confidence: score / 100,
    };
  }

  private getMatchReasons(line: BankStatementLine, register: CaixaRegister): string[] {
    const reasons: string[] = [];
    
    if (Math.abs(line.amount) === register.amount) {
      reasons.push('Valor idêntico');
    }
    
    if (line.posted_date === (register.payment_date || register.due_date)) {
      reasons.push('Data idêntica');
    }

    if (line.description && register.description) {
      const similarity = this.calculateStringSimilarity(
        line.description.toLowerCase(),
        register.description.toLowerCase()
      );
      if (similarity > 0.7) reasons.push('Descrição correspondente');
    }

    return reasons;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    // Simple Jaccard similarity on words
    const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 2));
    
    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private updateUnmatchedItems(usedLineIds: Set<string>, usedCaixaIds: Set<string>): void {
    this.unmatchedBankItems = this.bankStatement.lines.filter(l => !usedLineIds.has(l.id));
    this.unmatchedSystemItems = this.caixaRegisters.filter(r => !usedCaixaIds.has(r.id));
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
}

// ============= AIBankMatcher Class =============

export class AIBankMatcher {
  private companyId: string;

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  async matchTransactionsByML(
    bankTxn: BankStatementLine,
    caixaTxns: CaixaRegister[]
  ): Promise<MatchResult | null> {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reconcile-match', {
        body: {
          company_id: this.companyId,
          bank_transaction: {
            id: bankTxn.id,
            amount: bankTxn.amount,
            date: bankTxn.posted_date,
            description: bankTxn.description,
            direction: bankTxn.direction,
          },
          system_transactions: caixaTxns.map(txn => ({
            id: txn.id,
            amount: txn.amount,
            date: txn.payment_date || txn.due_date,
            description: txn.description,
            counterparty: txn.counterparty_name,
            type: txn.type,
          })),
        },
      });

      if (error) {
        console.error('AI matching error:', error);
        return null;
      }

      if (data?.match) {
        return {
          statement_line_id: bankTxn.id,
          caixa_register_id: data.match.transaction_id,
          score: data.match.confidence * 100,
          match_type: data.match.confidence >= 0.95 ? 'exact' : 'fuzzy',
          match_reasons: data.match.reasons || [],
          amount_diff: data.match.amount_diff || 0,
          date_diff_days: data.match.date_diff_days || 0,
          confidence: data.match.confidence,
        };
      }

      return null;
    } catch (err) {
      console.error('AI matching failed:', err);
      return null;
    }
  }

  async batchMatch(
    statement: BankStatement,
    registers: CaixaRegister[]
  ): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];
    const usedRegisterIds = new Set<string>();

    for (const line of statement.lines) {
      if (line.is_reconciled) continue;

      const availableRegisters = registers.filter(r => !usedRegisterIds.has(r.id));
      const match = await this.matchTransactionsByML(line, availableRegisters);
      
      if (match) {
        matches.push(match);
        usedRegisterIds.add(match.caixa_register_id);
      }
    }

    return matches;
  }
}

// ============= Factory Function =============

export function createBankReconciliation(
  bankStatement: BankStatement,
  caixaRegisters: CaixaRegister[],
  config?: Partial<MatchingConfig>
): BankReconciliation {
  return new BankReconciliation(bankStatement, caixaRegisters, config);
}

export function createAIBankMatcher(companyId: string): AIBankMatcher {
  return new AIBankMatcher(companyId);
}
