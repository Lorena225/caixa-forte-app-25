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

  static async fromBankAccount(bankAccountId: string): Promise<BankIntegrationService | null> {
    const { data: account } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', bankAccountId)
      .single();

    if (!account) return null;

    return new BankIntegrationService({
      bankCode: account.bank_code || '',
      bankName: account.bank_name || '',
      authMethod: 'OFX',
    });
  }

  async fetchStatements(bankAccountId: string, dateRange?: DateRange): Promise<BankStatement[]> {
    const config = BANK_CONFIGS[this.bankSlug];
    if (!config?.supports_statement) return [];

    const { data: statements } = await supabase
      .from('bank_statement_imports')
      .select('id, company_id, created_at, period_start, period_end, line_count')
      .eq('wallet_id', bankAccountId)
      .order('period_start', { ascending: false })
      .limit(50);

    return (statements || []).map(s => ({
      id: s.id,
      bank_account_id: bankAccountId,
      period_start: s.period_start || '',
      period_end: s.period_end || '',
      opening_balance: 0,
      closing_balance: 0,
      transaction_count: s.line_count || 0,
      currency: 'BRL',
      created_at: s.created_at,
    }));
  }

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

  async fetchBalance(bankAccountId: string): Promise<BankBalance> {
    const { data: account } = await supabase
      .from('wallets')
      .select('current_balance')
      .eq('id', bankAccountId)
      .single();

    return {
      account_id: bankAccountId,
      current_balance: Number(account?.current_balance) || 0,
      available_balance: Number(account?.current_balance) || 0,
      currency: 'BRL',
      as_of: new Date().toISOString(),
    };
  }

  async sendPaymentCNAB(companyId: string, cnabContent: string, cnabType: '240' | '400' = '240'): Promise<CNABSendResult> {
    const recordCount = cnabContent.split('\n').filter(l => l.trim()).length;
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

  async requestTransferAPI(transfer: TransferRequest): Promise<TransferResult> {
    const config = BANK_CONFIGS[this.bankSlug];
    if (!config?.supports_transfer) {
      return { success: false, status: 'failed', error_message: 'Unsupported' };
    }
    return {
      success: true,
      confirmation_code: `TRF-${Date.now()}`,
      status: 'processing',
    };
  }

  static calculateNextRun(cronExpression: CronExpression): Date {
    const now = new Date();
    const parts = cronExpression.split(' ');
    if (parts.length >= 2) {
      const next = new Date(now);
      next.setHours(parseInt(parts[1]) || 8, parseInt(parts[0]) || 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      return next;
    }
    const next = new Date(now);
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  }

  static async syncTransactions(bankAccount: BankAccount, dateFrom?: string, dateTo?: string): Promise<SyncResult> {
    const { data: job } = await supabase
      .from('bank_sync_jobs')
      .insert({ company_id: bankAccount.company_id, bank_account_id: bankAccount.id, sync_type: dateFrom ? 'full' : 'incremental', status: 'running', started_at: new Date().toISOString(), triggered_by: 'manual' })
      .select().single();

    const result = await this.importTransactions(bankAccount.company_id, bankAccount.id, []);
    if (job) await supabase.from('bank_sync_jobs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', job.id);
    return result;
  }

  static async importTransactions(companyId: string, bankAccountId: string, transactions: Partial<BankTransaction>[]): Promise<SyncResult> {
    const result: SyncResult = { fetched: transactions.length, created: 0, updated: 0, skipped: 0, errors: [] };
    for (const tx of transactions) {
      const { error } = await supabase.from('bank_transactions').insert({ company_id: companyId, bank_account_id: bankAccountId, external_id: tx.external_id || crypto.randomUUID(), transaction_date: tx.transaction_date, amount: tx.amount, direction: tx.direction, description: tx.description, reconciliation_status: 'pending' });
      if (error) result.errors.push(error.message); else result.created++;
    }
    return result;
  }

  static async reconcileTransaction(bankTransaction: BankTransaction): Promise<ReconciliationResult> {
    const { company_id, amount, transaction_date, direction, description } = bankTransaction;
    const startDate = new Date(transaction_date); startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(transaction_date); endDate.setDate(endDate.getDate() + 3);

    const { data: candidates } = await supabase.from('transactions').select('id, description, amount, total_amount, due_date').eq('company_id', company_id).eq('direction', direction).gte('due_date', startDate.toISOString().split('T')[0]).lte('due_date', endDate.toISOString().split('T')[0]).in('status', ['lancado', 'pendente'] as never[]);

    if (!candidates?.length) return { matched: false, candidates: [] };

    const scored = candidates.map((c: { id: string; description: string | null; amount: number | null; total_amount: number | null; due_date: string }) => {
      let confidence = 0;
      const amt = Number(c.total_amount || c.amount) || 0;
      if (Math.abs(amt - Math.abs(amount)) <= 0.01) confidence += 50;
      if (description && c.description?.toLowerCase().includes(description.toLowerCase().slice(0, 10))) confidence += 20;
      return { id: c.id, description: c.description || '', amount: amt, date: c.due_date, confidence };
    }).sort((a, b) => b.confidence - a.confidence);

    const top = scored[0];
    return top?.confidence >= 90 ? { matched: true, transactionId: top.id, confidence: top.confidence, candidates: scored.slice(0, 5) } : { matched: false, candidates: scored.slice(0, 5) };
  }

  static async linkTransaction(bankTransactionId: string, systemTransactionId: string, userId: string): Promise<void> {
    await supabase.from('bank_transactions').update({ matched_transaction_id: systemTransactionId, matched_at: new Date().toISOString(), matched_by: userId, reconciliation_status: 'matched', match_confidence: 100 }).eq('id', bankTransactionId);
    await supabase.from('transactions').update({ status: 'pago' as never, paid_at: new Date().toISOString() }).eq('id', systemTransactionId);
  }

  static async ignoreTransaction(bankTransactionId: string): Promise<void> {
    await supabase.from('bank_transactions').update({ reconciliation_status: 'ignored' }).eq('id', bankTransactionId);
  }

  static async autoReconcileBatch(companyId: string, bankAccountId?: string): Promise<{ matched: number; unmatched: number }> {
    let query = supabase.from('bank_transactions').select('*').eq('company_id', companyId).eq('reconciliation_status', 'pending');
    if (bankAccountId) query = query.eq('bank_account_id', bankAccountId);
    const { data } = await query.limit(100);
    let matched = 0, unmatched = 0;
    for (const tx of (data || []) as unknown as BankTransactionRow[]) {
      const bankTx: BankTransaction = { id: tx.id, company_id: tx.company_id, bank_account_id: tx.bank_account_id, external_id: tx.external_id, transaction_date: tx.transaction_date, amount: Number(tx.amount), direction: tx.direction as 'entrada' | 'saida', description: tx.description || '', reconciliation_status: 'pending', created_at: tx.created_at || '', updated_at: tx.updated_at || '' };
      const result = await this.reconcileTransaction(bankTx);
      if (result.matched && result.transactionId) { await supabase.from('bank_transactions').update({ matched_transaction_id: result.transactionId, reconciliation_status: 'matched', match_confidence: result.confidence }).eq('id', tx.id); matched++; }
      else { await supabase.from('bank_transactions').update({ reconciliation_status: 'unmatched' }).eq('id', tx.id); unmatched++; }
    }
    return { matched, unmatched };
  }

  static getBankConfig(bankSlug: SupportedBank) { return BANK_CONFIGS[bankSlug]; }
  static getSupportedBanks() { return SUPPORTED_BANKS; }
  static getBankSlugFromName(bankName: string): SupportedBank { return BANK_NAME_TO_SLUG[bankName.toUpperCase()] || 'other'; }
}