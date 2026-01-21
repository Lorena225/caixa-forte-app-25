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

// ============= BankReconciliationService Class (New Interface) =============

export interface BankTransaction {
  id: string;
  company_id: string;
  bank_account_id: string;
  date: Date | string;
  amount: number;
  description: string;
  reference?: string;
  direction: 'entrada' | 'saida';
  balance?: number;
  fit_id?: string;
}

export interface BankReconciliationMatch {
  bankTransaction: BankTransaction;
  caixaRegister?: CaixaRegister;
  matchScore: number; // 0-100
  matchType: 'EXACT' | 'DATE_FUZZY' | 'AMOUNT_FUZZY' | 'DESCRIPTION_FUZZY' | 'NONE';
  confidence: number; // 0-1
  suggestedAction: 'AUTO_MATCH' | 'MANUAL_REVIEW' | 'FRAUD_ALERT';
}

export interface AnomalyAlert {
  id: string;
  type: 'duplicate_payment' | 'unusual_amount' | 'suspicious_timing' | 'pattern_anomaly' | 'velocity_spike' | 'round_number_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedTransactionIds: string[];
  detectedAt: Date;
  details: Record<string, unknown>;
}

export interface ReconciliationResult {
  id: string;
  status: 'success' | 'partial' | 'failed';
  totalProcessed: number;
  autoMatched: number;
  manualReviewRequired: number;
  fraudAlerts: number;
  difference: number;
  matches: BankReconciliationMatch[];
  unmatchedBank: BankTransaction[];
  unmatchedSystem: CaixaRegister[];
  generatedAt: Date;
}

export class BankReconciliationService {
  private companyId: string;

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  // ============= Import Bank Statement =============

  async importBankStatement(
    file: Buffer | ArrayBuffer | string,
    format: 'OFX' | 'CNAB' | 'CSV'
  ): Promise<BankTransaction[]> {
    const transactions: BankTransaction[] = [];
    
    let content: string;
    if (typeof file === 'string') {
      content = file;
    } else if (file instanceof ArrayBuffer) {
      content = new TextDecoder('utf-8').decode(file);
    } else {
      content = file.toString('utf-8');
    }

    switch (format) {
      case 'OFX':
        return this.parseOFX(content);
      case 'CNAB':
        return this.parseCNAB(content);
      case 'CSV':
        return this.parseCSV(content);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private parseOFX(content: string): BankTransaction[] {
    const transactions: BankTransaction[] = [];
    
    // Extract STMTTRN blocks
    const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = stmttrnRegex.exec(content)) !== null) {
      const block = match[1];
      
      const getValue = (tag: string): string => {
        const regex = new RegExp(`<${tag}>([^<\\n]+)`, 'i');
        const m = block.match(regex);
        return m ? m[1].trim() : '';
      };

      const trntype = getValue('TRNTYPE');
      const dtposted = getValue('DTPOSTED');
      const trnamt = parseFloat(getValue('TRNAMT').replace(',', '.')) || 0;
      const fitid = getValue('FITID');
      const memo = getValue('MEMO') || getValue('NAME');
      const checknum = getValue('CHECKNUM');

      // Parse date (YYYYMMDD or YYYYMMDDHHMMSS format)
      let date = new Date();
      if (dtposted) {
        const year = parseInt(dtposted.substring(0, 4));
        const month = parseInt(dtposted.substring(4, 6)) - 1;
        const day = parseInt(dtposted.substring(6, 8));
        date = new Date(year, month, day);
      }

      transactions.push({
        id: fitid || crypto.randomUUID(),
        company_id: this.companyId,
        bank_account_id: '',
        date,
        amount: Math.abs(trnamt),
        description: memo,
        reference: checknum || fitid,
        direction: trnamt >= 0 ? 'entrada' : 'saida',
        fit_id: fitid,
      });
    }

    return transactions;
  }

  private parseCNAB(content: string): BankTransaction[] {
    const transactions: BankTransaction[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.length < 240) continue; // CNAB 240 format

      const recordType = line.substring(7, 8);
      if (recordType !== '3') continue; // Detail record

      const segmentType = line.substring(13, 14);
      if (segmentType !== 'A' && segmentType !== 'J') continue;

      try {
        const dateStr = line.substring(93, 101);
        const year = parseInt(dateStr.substring(4, 8));
        const month = parseInt(dateStr.substring(2, 4)) - 1;
        const day = parseInt(dateStr.substring(0, 2));
        const date = new Date(year, month, day);

        const amountStr = line.substring(119, 134);
        const amount = parseInt(amountStr) / 100;

        const description = line.substring(73, 93).trim();
        const docNumber = line.substring(58, 73).trim();

        transactions.push({
          id: crypto.randomUUID(),
          company_id: this.companyId,
          bank_account_id: '',
          date,
          amount: Math.abs(amount),
          description,
          reference: docNumber,
          direction: amount >= 0 ? 'entrada' : 'saida',
        });
      } catch {
        continue;
      }
    }

    return transactions;
  }

  private parseCSV(content: string): BankTransaction[] {
    const transactions: BankTransaction[] = [];
    const lines = content.split('\n');
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(/[,;]/).map(c => c.trim().replace(/^"|"$/g, ''));
      
      if (cols.length >= 3) {
        const dateStr = cols[0];
        const description = cols[1];
        const amountStr = cols[2].replace(/[^\d,.-]/g, '').replace(',', '.');
        const amount = parseFloat(amountStr) || 0;

        // Try to parse date
        let date = new Date();
        const dateParts = dateStr.split(/[\/\-]/);
        if (dateParts.length === 3) {
          if (dateParts[2].length === 4) {
            // DD/MM/YYYY
            date = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
          } else if (dateParts[0].length === 4) {
            // YYYY-MM-DD
            date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          }
        }

        transactions.push({
          id: crypto.randomUUID(),
          company_id: this.companyId,
          bank_account_id: '',
          date,
          amount: Math.abs(amount),
          description,
          reference: cols[3] || undefined,
          direction: amount >= 0 ? 'entrada' : 'saida',
        });
      }
    }

    return transactions;
  }

  // ============= Auto Match Transactions =============

  async autoMatchTransactions(
    bankTransactions: BankTransaction[],
    caixaRegisters: CaixaRegister[],
    tolerancePercent: number = 5,
    toleranceDays: number = 2
  ): Promise<BankReconciliationMatch[]> {
    const matches: BankReconciliationMatch[] = [];
    const usedCaixaIds = new Set<string>();

    // Sort by amount descending for better matching
    const sortedBankTxns = [...bankTransactions].sort((a, b) => 
      Math.abs(b.amount) - Math.abs(a.amount)
    );

    for (const bankTxn of sortedBankTxns) {
      let bestMatch: BankReconciliationMatch | null = null;
      let bestScore = 0;

      for (const caixaReg of caixaRegisters) {
        if (usedCaixaIds.has(caixaReg.id)) continue;

        // Direction must match
        const caixaDirection = caixaReg.type === 'receita' ? 'entrada' : 'saida';
        if (bankTxn.direction !== caixaDirection) continue;

        const score = this.calculateMatchScore(bankTxn, caixaReg);
        
        if (score > bestScore) {
          bestScore = score;
          const matchType = this.determineMatchType(bankTxn, caixaReg, tolerancePercent, toleranceDays);
          const suggestedAction = this.determineSuggestedAction(score, matchType);

          bestMatch = {
            bankTransaction: bankTxn,
            caixaRegister: caixaReg,
            matchScore: score,
            matchType,
            confidence: score / 100,
            suggestedAction,
          };
        }
      }

      if (bestMatch) {
        matches.push(bestMatch);
        if (bestMatch.caixaRegister) {
          usedCaixaIds.add(bestMatch.caixaRegister.id);
        }
      } else {
        // No match found
        matches.push({
          bankTransaction: bankTxn,
          caixaRegister: undefined,
          matchScore: 0,
          matchType: 'NONE',
          confidence: 0,
          suggestedAction: 'MANUAL_REVIEW',
        });
      }
    }

    return matches;
  }

  // ============= Detailed Match Score Calculation =============

  private calculateMatchScore(
    bankTxn: BankTransaction,
    caixaTxn: CaixaRegister
  ): number {
    let score = 0;

    // Valor: 40 pontos máximo
    const amountDiff = Math.abs(bankTxn.amount - caixaTxn.amount) / Math.max(bankTxn.amount, caixaTxn.amount);
    if (amountDiff === 0) score += 40;
    else if (amountDiff <= 0.05) score += 35;
    else if (amountDiff <= 0.10) score += 25;

    // Data: 30 pontos máximo
    const bankDate = new Date(bankTxn.date);
    const caixaDate = new Date(caixaTxn.payment_date || caixaTxn.due_date);
    const daysDiff = Math.abs(Math.floor((bankDate.getTime() - caixaDate.getTime()) / (1000 * 60 * 60 * 24)));
    if (daysDiff === 0) score += 30;
    else if (daysDiff <= 2) score += 25;
    else if (daysDiff <= 5) score += 15;

    // Descrição: 20 pontos máximo (usando Levenshtein distance)
    const similarity = this.calculateStringSimilarity(
      bankTxn.description || '',
      caixaTxn.description || ''
    );
    score += similarity * 20;

    // Referência: 10 pontos máximo
    if (bankTxn.reference && caixaTxn.document_number) {
      if (bankTxn.reference === caixaTxn.document_number) {
        score += 10;
      } else if (bankTxn.reference.includes(caixaTxn.document_number) ||
                 caixaTxn.document_number.includes(bankTxn.reference)) {
        score += 7;
      }
    }

    return Math.min(score, 100);
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().replace(/\s+/g, '');
    const s2 = str2.toLowerCase().replace(/\s+/g, '');
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  private determineMatchType(
    bankTxn: BankTransaction,
    caixaTxn: CaixaRegister,
    tolerancePercent: number,
    toleranceDays: number
  ): BankReconciliationMatch['matchType'] {
    const amountDiff = Math.abs(bankTxn.amount - caixaTxn.amount);
    const amountTolerance = caixaTxn.amount * (tolerancePercent / 100);
    const isExactAmount = amountDiff === 0;
    const isWithinAmountTolerance = amountDiff <= amountTolerance;

    const bankDate = new Date(bankTxn.date);
    const caixaDate = new Date(caixaTxn.payment_date || caixaTxn.due_date);
    const daysDiff = Math.abs(Math.floor((bankDate.getTime() - caixaDate.getTime()) / (1000 * 60 * 60 * 24)));
    const isExactDate = daysDiff === 0;
    const isWithinDateTolerance = daysDiff <= toleranceDays;

    const descSimilarity = this.calculateStringSimilarity(
      bankTxn.description || '',
      caixaTxn.description || ''
    );

    // Exact match: amount exact, date exact or within 1 day
    if (isExactAmount && (isExactDate || daysDiff <= 1)) {
      return 'EXACT';
    }

    // Date fuzzy: amount matches but date is fuzzy
    if (isWithinAmountTolerance && !isExactDate && isWithinDateTolerance) {
      return 'DATE_FUZZY';
    }

    // Amount fuzzy: date matches but amount is fuzzy
    if (!isExactAmount && isWithinAmountTolerance && isExactDate) {
      return 'AMOUNT_FUZZY';
    }

    // Description fuzzy: high description similarity
    if (descSimilarity > 0.7 && isWithinAmountTolerance) {
      return 'DESCRIPTION_FUZZY';
    }

    return 'NONE';
  }

  private determineSuggestedAction(
    score: number,
    matchType: BankReconciliationMatch['matchType']
  ): BankReconciliationMatch['suggestedAction'] {
    if (matchType === 'EXACT' && score >= 95) {
      return 'AUTO_MATCH';
    }
    if (score >= 80) {
      return 'AUTO_MATCH';
    }
    if (score >= 60) {
      return 'MANUAL_REVIEW';
    }
    // Very low scores on suspicious patterns
    if (matchType === 'NONE' && score < 30) {
      return 'FRAUD_ALERT';
    }
    return 'MANUAL_REVIEW';
  }

  // ============= Anomaly Detection =============

  async detectAnomalies(transactions: BankTransaction[]): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];
    const now = new Date();

    // Calculate statistics
    const amounts = transactions.map(t => t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / amounts.length
    );

    // 1. Unusual amounts (statistical outliers)
    for (const txn of transactions) {
      const zscore = stdDev > 0 ? (txn.amount - mean) / stdDev : 0;
      
      if (Math.abs(zscore) > 3) {
        alerts.push({
          id: `anomaly-amount-${txn.id}`,
          type: 'unusual_amount',
          severity: Math.abs(zscore) > 4 ? 'high' : 'medium',
          description: `Valor atípico: R$ ${txn.amount.toFixed(2)} (${zscore.toFixed(1)} desvios da média)`,
          affectedTransactionIds: [txn.id],
          detectedAt: now,
          details: { amount: txn.amount, mean, stdDev, zscore },
        });
      }
    }

    // 2. Duplicate payments
    const seenSignatures = new Map<string, BankTransaction>();
    for (const txn of transactions) {
      const signature = `${txn.amount.toFixed(2)}_${new Date(txn.date).toISOString().split('T')[0]}_${txn.direction}`;
      
      if (seenSignatures.has(signature)) {
        const original = seenSignatures.get(signature)!;
        alerts.push({
          id: `anomaly-duplicate-${txn.id}`,
          type: 'duplicate_payment',
          severity: 'high',
          description: `Possível pagamento duplicado: R$ ${txn.amount.toFixed(2)}`,
          affectedTransactionIds: [original.id, txn.id],
          detectedAt: now,
          details: { originalId: original.id, duplicateId: txn.id, amount: txn.amount },
        });
      } else {
        seenSignatures.set(signature, txn);
      }
    }

    // 3. Suspicious timing (weekend/holiday transactions)
    for (const txn of transactions) {
      const date = new Date(txn.date);
      const dayOfWeek = date.getDay();
      
      if ((dayOfWeek === 0 || dayOfWeek === 6) && txn.amount > mean * 2) {
        alerts.push({
          id: `anomaly-timing-${txn.id}`,
          type: 'suspicious_timing',
          severity: 'medium',
          description: `Transação de alto valor em fim de semana: R$ ${txn.amount.toFixed(2)}`,
          affectedTransactionIds: [txn.id],
          detectedAt: now,
          details: { dayOfWeek, date: date.toISOString(), amount: txn.amount },
        });
      }
    }

    // 4. Round number pattern (potential fraud indicator)
    const roundNumberTxns = transactions.filter(t => 
      t.amount >= 1000 && t.amount % 1000 === 0
    );
    if (roundNumberTxns.length >= 3) {
      alerts.push({
        id: `anomaly-round-pattern-${now.getTime()}`,
        type: 'round_number_pattern',
        severity: 'low',
        description: `Padrão de valores redondos: ${roundNumberTxns.length} transações múltiplas de R$ 1.000`,
        affectedTransactionIds: roundNumberTxns.map(t => t.id),
        detectedAt: now,
        details: { 
          count: roundNumberTxns.length, 
          amounts: roundNumberTxns.map(t => t.amount),
        },
      });
    }

    // 5. Velocity spike (too many transactions in short period)
    const txnsByDate = new Map<string, BankTransaction[]>();
    for (const txn of transactions) {
      const dateKey = new Date(txn.date).toISOString().split('T')[0];
      if (!txnsByDate.has(dateKey)) {
        txnsByDate.set(dateKey, []);
      }
      txnsByDate.get(dateKey)!.push(txn);
    }

    const dailyCounts = Array.from(txnsByDate.values()).map(list => list.length);
    const avgDaily = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;

    for (const [dateKey, dayTxns] of txnsByDate) {
      if (dayTxns.length > avgDaily * 3 && dayTxns.length >= 5) {
        alerts.push({
          id: `anomaly-velocity-${dateKey}`,
          type: 'velocity_spike',
          severity: 'medium',
          description: `Volume atípico de transações em ${dateKey}: ${dayTxns.length} (média: ${avgDaily.toFixed(1)}/dia)`,
          affectedTransactionIds: dayTxns.map(t => t.id),
          detectedAt: now,
          details: { date: dateKey, count: dayTxns.length, average: avgDaily },
        });
      }
    }

    return alerts;
  }

  // ============= Reconcile =============

  async reconcile(matches: BankReconciliationMatch[]): Promise<ReconciliationResult> {
    const autoMatched = matches.filter(m => m.suggestedAction === 'AUTO_MATCH');
    const manualReview = matches.filter(m => m.suggestedAction === 'MANUAL_REVIEW');
    const fraudAlerts = matches.filter(m => m.suggestedAction === 'FRAUD_ALERT');
    const unmatched = matches.filter(m => m.matchType === 'NONE');

    // Calculate difference
    const bankTotal = matches.reduce((sum, m) => {
      const amount = m.bankTransaction.amount;
      return sum + (m.bankTransaction.direction === 'entrada' ? amount : -amount);
    }, 0);

    const systemTotal = matches
      .filter(m => m.caixaRegister)
      .reduce((sum, m) => {
        const amount = m.caixaRegister!.amount;
        return sum + (m.caixaRegister!.type === 'receita' ? amount : -amount);
      }, 0);

    // Persist auto-matched items
    for (const match of autoMatched) {
      if (match.caixaRegister) {
        try {
          await supabase
            .from('reconciliation_suggestions')
            .insert({
              company_id: this.companyId,
              statement_line_id: match.bankTransaction.id,
              candidate_id: match.caixaRegister.id,
              candidate_type: 'transaction',
              score: match.matchScore / 100, // score is 0-1 in DB
              is_selected: true,
              match_reasons_json: [match.matchType.toLowerCase()],
            });
        } catch (err) {
          console.error('Failed to persist match:', err);
        }
      }
    }

    return {
      id: crypto.randomUUID(),
      status: unmatched.length === 0 ? 'success' : autoMatched.length > 0 ? 'partial' : 'failed',
      totalProcessed: matches.length,
      autoMatched: autoMatched.length,
      manualReviewRequired: manualReview.length,
      fraudAlerts: fraudAlerts.length,
      difference: bankTotal - systemTotal,
      matches,
      unmatchedBank: unmatched.map(m => m.bankTransaction),
      unmatchedSystem: matches
        .filter(m => m.matchType === 'NONE' && m.caixaRegister)
        .map(m => m.caixaRegister!),
      generatedAt: new Date(),
    };
  }

  // ============= Generate Adjustments =============

  async generateAdjustments(matches: BankReconciliationMatch[]): Promise<JournalEntry[]> {
    const adjustments: JournalEntry[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Unmatched bank transactions that need adjustment entries
    const unmatchedEntradas = matches
      .filter(m => m.matchType === 'NONE' && m.bankTransaction.direction === 'entrada')
      .reduce((sum, m) => sum + m.bankTransaction.amount, 0);

    const unmatchedSaidas = matches
      .filter(m => m.matchType === 'NONE' && m.bankTransaction.direction === 'saida')
      .reduce((sum, m) => sum + m.bankTransaction.amount, 0);

    if (unmatchedEntradas > 0) {
      adjustments.push({
        id: crypto.randomUUID(),
        entry_date: today,
        description: 'Ajuste de conciliação - Créditos bancários não identificados',
        reference: `CONC-CR-${today}`,
        source: 'reconciliation',
        lines: [
          {
            account_code: '1.1.1.01',
            account_name: 'Banco c/Movimento',
            debit: unmatchedEntradas,
            credit: 0,
            description: 'Créditos pendentes de identificação',
          },
          {
            account_code: '2.1.9.99',
            account_name: 'Valores a Classificar - Créditos',
            debit: 0,
            credit: unmatchedEntradas,
            description: 'Créditos bancários a classificar',
          },
        ],
      });
    }

    if (unmatchedSaidas > 0) {
      adjustments.push({
        id: crypto.randomUUID(),
        entry_date: today,
        description: 'Ajuste de conciliação - Débitos bancários não identificados',
        reference: `CONC-DB-${today}`,
        source: 'reconciliation',
        lines: [
          {
            account_code: '1.1.9.99',
            account_name: 'Valores a Classificar - Débitos',
            debit: unmatchedSaidas,
            credit: 0,
            description: 'Débitos bancários a classificar',
          },
          {
            account_code: '1.1.1.01',
            account_name: 'Banco c/Movimento',
            debit: 0,
            credit: unmatchedSaidas,
            description: 'Débitos pendentes de identificação',
          },
        ],
      });
    }

    return adjustments;
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

export function createBankReconciliationService(companyId: string): BankReconciliationService {
  return new BankReconciliationService(companyId);
}
