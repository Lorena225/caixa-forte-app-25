// =====================================================
// BANK INTEGRATION SERVICE
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import {
  BankAccount,
  BankTransaction,
  SupportedBank,
  ReconciliationStatus,
} from '@/types/bankIntegration';

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

export class BankIntegrationService {
  // =====================================================
  // SYNC TRANSACTIONS FROM BANK API
  // =====================================================
  
  static async syncTransactions(
    bankAccount: BankAccount,
    dateFrom?: string,
    dateTo?: string
  ): Promise<SyncResult> {
    const bank = (bankAccount.bank_slug || 'other') as SupportedBank;
    
    // Create sync job
    const { data: job } = await supabase
      .from('bank_sync_jobs')
      .insert({
        company_id: bankAccount.company_id,
        bank_account_id: bankAccount.id,
        sync_type: dateFrom ? 'full' : 'incremental',
        date_from: dateFrom,
        date_to: dateTo,
        status: 'running',
        started_at: new Date().toISOString(),
        triggered_by: 'manual',
      })
      .select()
      .single();

    try {
      // Bank adapters would go here
      // For now, return empty result as APIs require credentials
      console.log(`Syncing ${bank} account:`, bankAccount.account_number, dateFrom, dateTo);
      
      const transactions: Partial<BankTransaction>[] = [];
      const result = await this.importTransactions(bankAccount.company_id, bankAccount.id, transactions);
      
      // Update sync job
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
            errors: JSON.parse(JSON.stringify(result.errors)),
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
            errors: JSON.parse(JSON.stringify([errorMessage])),
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
          .single();

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
    
    const tolerance = 0.01;
    const dateRange = 3;
    
    const startDate = new Date(transaction_date);
    startDate.setDate(startDate.getDate() - dateRange);
    const endDate = new Date(transaction_date);
    endDate.setDate(endDate.getDate() + dateRange);

    const { data: candidates } = await supabase
      .from('transactions')
      .select('id, description, amount, total_amount, due_date, direction')
      .eq('company_id', company_id)
      .eq('direction', direction)
      .gte('due_date', startDate.toISOString().split('T')[0])
      .lte('due_date', endDate.toISOString().split('T')[0])
      .in('status', ['lancado', 'pendente'] as never[]);

    if (!candidates || candidates.length === 0) {
      return { matched: false, candidates: [] };
    }

    type CandidateRow = { id: string; description: string; amount: number | null; total_amount: number | null; due_date: string };

    const scoredCandidates = (candidates as unknown as CandidateRow[]).map((candidate) => {
      let confidence = 0;
      const candidateAmount = Number(candidate.total_amount || candidate.amount) || 0;
      
      const amountDiff = Math.abs(Math.abs(candidateAmount) - Math.abs(amount));
      if (amountDiff <= tolerance) {
        confidence += 50;
      } else if (amountDiff <= Math.abs(amount) * 0.05) {
        confidence += 20;
      }

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
      .update({ status: 'pago' as never, paid_at: new Date().toISOString() })
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
}
