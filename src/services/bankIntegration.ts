// =====================================================
// BANK INTEGRATION SERVICE
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import {
  BankAccount,
  BankTransaction,
  BankStatement,
  BankBalance,
  TransferRequest,
  TransferResult,
  CNABSendResult,
  DateRange,
  SupportedBank,
  BankAuthMethod,
  ReconciliationStatus,
  CronExpression,
  BANK_CONFIGS,
} from '@/types/bankIntegration';

// =====================================================
// CONSTANTS
// =====================================================

export const SUPPORTED_BANKS = [
  'BANCO_DO_BRASIL',
  'CAIXA_ECONOMICA',
  'BRADESCO',
  'ITAU',
  'SANTANDER',
  'SICOOB',
  'SICREDI',
  'INTER',
  'NUBANK',
  'BTG',
  'SAFRA',
  'ORIGINAL',
  'C6',
  'MERCADOPAGO',
  'PAGSEGURO',
  'STONE',
] as const;

const BANK_NAME_TO_SLUG: Record<string, SupportedBank> = {
  'BANCO_DO_BRASIL': 'bb',
  'CAIXA_ECONOMICA': 'caixa',
  'BRADESCO': 'bradesco',
  'ITAU': 'itau',
  'SANTANDER': 'santander',
  'SICOOB': 'sicoob',
  'SICREDI': 'sicredi',
  'INTER': 'inter',
  'NUBANK': 'nubank',
  'BTG': 'btg',
  'SAFRA': 'safra',
  'ORIGINAL': 'original',
  'C6': 'c6',
  'MERCADOPAGO': 'mercadopago',
  'PAGSEGURO': 'pagseguro',
  'STONE': 'stone',
};

// =====================================================
// INTERFACES
// =====================================================

interface SyncResult {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface ReconciliationResult {
  matched: boolean;
  transactionId?: string;
  confidence?: number;
  candidates?: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    confidence: number;
  }>;
}

interface BankTransactionRow {
  id: string;
  company_id: string;
  bank_account_id: string;
  external_id: string;
  transaction_date: string;
  amount: number;
  direction: string;
  description?: string;
  reconciliation_status?: string;
  created_at?: string;
  updated_at?: string;
}

// =====================================================
// BANK INTEGRATION SERVICE CLASS
// =====================================================

export class BankIntegrationService {
  private bankCode: string;
  private bankName: string;
  private authMethod: BankAuthMethod;
  private bankSlug: SupportedBank;
  private syncSchedule?: CronExpression;

  constructor(config: {
    bankCode: string;
    bankName: string;
    authMethod: BankAuthMethod;
    syncSchedule?: CronExpression;
  }) {
    this.bankCode = config.bankCode;
    this.bankName = config.bankName;
    this.authMethod = config.authMethod;
    this.syncSchedule = config.syncSchedule;
    this.bankSlug = BANK_NAME_TO_SLUG[config.bankName.toUpperCase()] || 'other';
  }

  // =====================================================
  // STATIC FACTORY METHOD
  // =====================================================

  static async fromBankAccount(bankAccountId: string): Promise<BankIntegrationService | null> {
    const { data: account } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', bankAccountId)
      .maybeSingle();

    if (!account) return null;

    return new BankIntegrationService({
      bankCode: account.bank_code || '',
      bankName: account.bank_name || '',
      authMethod: 'OFX',
    });
  }

  // =====================================================
  // IMPORT - FETCH STATEMENTS
  // =====================================================

  async fetchStatements(bankAccountId: string, dateRange?: DateRange): Promise<BankStatement[]> {
    const config = BANK_CONFIGS[this.bankSlug];
    if (!config?.supports_statement) return [];

    const query = supabase
      .from('bank_statement_imports')
      .select('id, company_id, created_at, period_start, period_end, line_count, wallet_id')
      .eq('wallet_id', bankAccountId)
      .order('period_start', { ascending: false });

    if (dateRange) {
      query.gte('period_start', dateRange.start).lte('period_end', dateRange.end);
    }

    const { data: statements } = await query.limit(50);

    return (statements || []).map(s => ({
      id: s.id,
      bank_account_id: s.wallet_id,
      period_start: s.period_start || '',
      period_end: s.period_end || '',
      opening_balance: 0,
      closing_balance: 0,
      transaction_count: s.line_count || 0,
      currency: 'BRL',
      created_at: s.created_at,
    }));
  }

  // =====================================================
  // IMPORT - FETCH TRANSACTIONS
  // =====================================================

  async fetchTransactions(bankAccountId: string, dateRange: DateRange): Promise<BankTransaction[]> {
    const { data } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_account_id', bankAccountId)
      .gte('transaction_date', dateRange.start)
      .lte('transaction_date', dateRange.end)
      .order('transaction_date', { ascending: false });

    return (data || []).map(tx => ({
      id: tx.id,
      company_id: tx.company_id,
      bank_account_id: tx.bank_account_id,
      external_id: tx.external_id,
      transaction_date: tx.transaction_date,
      amount: Number(tx.amount),
      direction: tx.direction as 'entrada' | 'saida',
      description: tx.description || '',
      reconciliation_status: (tx.reconciliation_status || 'pending') as ReconciliationStatus,
      created_at: tx.created_at || new Date().toISOString(),
      updated_at: tx.updated_at || new Date().toISOString(),
    }));
  }

  // =====================================================
  // IMPORT - FETCH BALANCE
  // =====================================================

  async fetchBalance(bankAccountId: string): Promise<BankBalance> {
    // Use wallets table with opening_balance column
    const { data: wallet } = await supabase
      .from('wallets')
      .select('opening_balance')
      .eq('id', bankAccountId)
      .maybeSingle();

    // Calculate current balance from transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('total_amount, direction')
      .eq('wallet_id', bankAccountId)
      .eq('status', 'pago');

    let balance = Number(wallet?.opening_balance) || 0;
    (transactions || []).forEach(tx => {
      const amount = Number(tx.total_amount) || 0;
      balance += tx.direction === 'entrada' ? amount : -amount;
    });

    return {
      account_id: bankAccountId,
      current_balance: balance,
      available_balance: balance,
      currency: 'BRL',
      as_of: new Date().toISOString(),
    };
  }

  // =====================================================
  // EXPORT - SEND CNAB PAYMENT FILE
  // =====================================================

  async sendPaymentCNAB(
    companyId: string,
    cnabContent: string,
    cnabType: '240' | '400' = '240'
  ): Promise<CNABSendResult> {
    const recordCount = cnabContent.split('\n').filter(l => l.trim()).length;
    
    // In production: send to bank via API or file transfer
    return {
      success: true,
      protocol_number: `PROT-${Date.now()}`,
      records_sent: recordCount,
      records_accepted: recordCount,
      records_rejected: 0,
      errors: [],
      sent_at: new Date().toISOString(),
    };
  }

  // =====================================================
  // EXPORT - REQUEST TRANSFER VIA API
  // =====================================================

  async requestTransferAPI(transfer: TransferRequest): Promise<TransferResult> {
    const config = BANK_CONFIGS[this.bankSlug];
    
    if (!config?.supports_transfer) {
      return {
        success: false,
        status: 'failed',
        error_message: `Bank ${this.bankName} does not support API transfers`,
        error_code: 'UNSUPPORTED_OPERATION',
      };
    }

    // In production: call bank API
    return {
      success: true,
      confirmation_code: `TRF-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
      status: 'processing',
    };
  }

  // =====================================================
  // SYNC SCHEDULE MANAGEMENT
  // =====================================================

  static calculateNextRun(cronExpression: CronExpression): Date {
    const now = new Date();
    const parts = cronExpression.split(' ');
    
    if (parts.length >= 2) {
      const minute = parseInt(parts[0]) || 0;
      const hour = parseInt(parts[1]) || 8;
      
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);
      
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      
      // Handle weekday-only schedule
      if (parts[4]?.includes('MON-FRI')) {
        while (next.getDay() === 0 || next.getDay() === 6) {
          next.setDate(next.getDate() + 1);
        }
      }
      
      return next;
    }
    
    const next = new Date(now);
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  }

  // =====================================================
  // SYNC TRANSACTIONS FROM BANK API
  // =====================================================

  static async syncTransactions(
    bankAccount: BankAccount,
    dateFrom?: string,
    dateTo?: string
  ): Promise<SyncResult> {
    const { data: job } = await supabase
      .from('bank_sync_jobs')
      .insert({
        company_id: bankAccount.company_id,
        bank_account_id: bankAccount.id,
        sync_type: dateFrom ? 'full' : 'incremental',
        status: 'running',
        started_at: new Date().toISOString(),
        triggered_by: 'manual',
      })
      .select()
      .single();

    try {
      const transactions: Partial<BankTransaction>[] = [];
      const result = await this.importTransactions(bankAccount.company_id, bankAccount.id, transactions);

      if (job) {
        await supabase
          .from('bank_sync_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            transactions_fetched: result.fetched,
            transactions_created: result.created,
            transactions_updated: result.updated,
            transactions_skipped: result.skipped,
          })
          .eq('id', job.id);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (job) {
        await supabase
          .from('bank_sync_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      }

      throw error;
    }
  }

  // =====================================================
  // IMPORT TRANSACTIONS
  // =====================================================

  static async importTransactions(
    companyId: string,
    bankAccountId: string,
    transactions: Partial<BankTransaction>[]
  ): Promise<SyncResult> {
    const result: SyncResult = {
      fetched: transactions.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (const tx of transactions) {
      try {
        const { data: existing } = await supabase
          .from('bank_transactions')
          .select('id')
          .eq('bank_account_id', bankAccountId)
          .eq('external_id', tx.external_id || '')
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('bank_transactions')
            .update({
              amount: tx.amount,
              description: tx.description,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (error) {
            result.errors.push(`Update failed: ${error.message}`);
          } else {
            result.updated++;
          }
        } else {
          const { error } = await supabase
            .from('bank_transactions')
            .insert({
              company_id: companyId,
              bank_account_id: bankAccountId,
              external_id: tx.external_id || crypto.randomUUID(),
              transaction_date: tx.transaction_date,
              amount: tx.amount,
              direction: tx.direction,
              description: tx.description,
              reconciliation_status: 'pending',
            });

          if (error) {
            result.errors.push(`Insert failed: ${error.message}`);
          } else {
            result.created++;
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(msg);
        result.skipped++;
      }
    }

    return result;
  }

  // =====================================================
  // RECONCILIATION
  // =====================================================

  static async reconcileTransaction(
    bankTransaction: BankTransaction
  ): Promise<ReconciliationResult> {
    const { company_id, amount, transaction_date, direction, description } = bankTransaction;

    const startDate = new Date(transaction_date);
    startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(transaction_date);
    endDate.setDate(endDate.getDate() + 3);

    // Use correct columns: total_amount instead of amount
    const { data: candidates } = await supabase
      .from('transactions')
      .select('id, description, total_amount, due_date, direction')
      .eq('company_id', company_id)
      .eq('direction', direction)
      .gte('due_date', startDate.toISOString().split('T')[0])
      .lte('due_date', endDate.toISOString().split('T')[0])
      .in('status', ['lancado', 'rascunho']);

    if (!candidates || candidates.length === 0) {
      return { matched: false, candidates: [] };
    }

    const scoredCandidates = candidates.map((candidate) => {
      let confidence = 0;
      const candidateAmount = Number(candidate.total_amount) || 0;

      // Amount matching
      const amountDiff = Math.abs(Math.abs(candidateAmount) - Math.abs(amount));
      if (amountDiff <= 0.01) {
        confidence += 50;
      } else if (amountDiff <= Math.abs(amount) * 0.05) {
        confidence += 20;
      }

      // Date matching
      const dateDiff = Math.abs(
        new Date(candidate.due_date).getTime() - new Date(transaction_date).getTime()
      ) / (1000 * 60 * 60 * 24);
      if (dateDiff === 0) {
        confidence += 30;
      } else if (dateDiff <= 1) {
        confidence += 25;
      } else if (dateDiff <= 3) {
        confidence += 15;
      }

      // Description matching
      if (description && candidate.description) {
        const descLower = description.toLowerCase();
        const candDescLower = candidate.description.toLowerCase();
        if (descLower.includes(candDescLower) || candDescLower.includes(descLower)) {
          confidence += 20;
        }
      }

      return {
        id: candidate.id,
        description: candidate.description,
        amount: candidateAmount,
        date: candidate.due_date,
        confidence,
      };
    });

    scoredCandidates.sort((a, b) => b.confidence - a.confidence);

    const topCandidate = scoredCandidates[0];
    if (topCandidate && topCandidate.confidence >= 90) {
      return {
        matched: true,
        transactionId: topCandidate.id,
        confidence: topCandidate.confidence,
        candidates: scoredCandidates.slice(0, 5),
      };
    }

    return { matched: false, candidates: scoredCandidates.slice(0, 5) };
  }

  // =====================================================
  // MANUAL RECONCILIATION
  // =====================================================

  static async linkTransaction(
    bankTransactionId: string,
    systemTransactionId: string,
    userId: string
  ): Promise<void> {
    await supabase
      .from('bank_transactions')
      .update({
        matched_transaction_id: systemTransactionId,
        matched_at: new Date().toISOString(),
        matched_by: userId,
        reconciliation_status: 'matched',
        match_confidence: 100,
      })
      .eq('id', bankTransactionId);

    await supabase
      .from('transactions')
      .update({
        status: 'pago',
        paid_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', systemTransactionId);
  }

  static async ignoreTransaction(bankTransactionId: string): Promise<void> {
    await supabase
      .from('bank_transactions')
      .update({ reconciliation_status: 'ignored' })
      .eq('id', bankTransactionId);
  }

  // =====================================================
  // AUTO-RECONCILE BATCH
  // =====================================================

  static async autoReconcileBatch(
    companyId: string,
    bankAccountId?: string
  ): Promise<{ matched: number; unmatched: number }> {
    let query = supabase
      .from('bank_transactions')
      .select('*')
      .eq('company_id', companyId)
      .eq('reconciliation_status', 'pending');

    if (bankAccountId) {
      query = query.eq('bank_account_id', bankAccountId);
    }

    const { data: pendingTransactions } = await query.limit(100);

    let matched = 0;
    let unmatched = 0;

    for (const tx of (pendingTransactions || []) as unknown as BankTransactionRow[]) {
      const bankTx: BankTransaction = {
        id: tx.id,
        company_id: tx.company_id,
        bank_account_id: tx.bank_account_id,
        external_id: tx.external_id,
        transaction_date: tx.transaction_date,
        amount: Number(tx.amount),
        direction: tx.direction as 'entrada' | 'saida',
        description: tx.description || '',
        reconciliation_status: (tx.reconciliation_status || 'pending') as ReconciliationStatus,
        created_at: tx.created_at || new Date().toISOString(),
        updated_at: tx.updated_at || new Date().toISOString(),
      };

      const result = await this.reconcileTransaction(bankTx);

      if (result.matched && result.transactionId) {
        await supabase
          .from('bank_transactions')
          .update({
            matched_transaction_id: result.transactionId,
            matched_at: new Date().toISOString(),
            reconciliation_status: 'matched',
            match_confidence: result.confidence,
          })
          .eq('id', tx.id);
        matched++;
      } else {
        await supabase
          .from('bank_transactions')
          .update({ reconciliation_status: 'unmatched' })
          .eq('id', tx.id);
        unmatched++;
      }
    }

    return { matched, unmatched };
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  static getBankConfig(bankSlug: SupportedBank) {
    return BANK_CONFIGS[bankSlug];
  }

  static getSupportedBanks(): typeof SUPPORTED_BANKS {
    return SUPPORTED_BANKS;
  }

  static getBankSlugFromName(bankName: string): SupportedBank {
    return BANK_NAME_TO_SLUG[bankName.toUpperCase()] || 'other';
  }
}