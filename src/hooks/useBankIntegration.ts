// =====================================================
// BANK INTEGRATION HOOKS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BankIntegrationService } from '@/services/bankIntegration';
import {
  BankAccount,
  BankTransaction,
  BankSyncJob,
  SupportedBank,
  ReconciliationStatus,
} from '@/types/bankIntegration';
import { toast } from 'sonner';

// =====================================================
// HELPERS
// =====================================================

async function getCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.company_id) throw new Error('Empresa não encontrada');
  return profile.company_id;
}

// Database row types
interface BankAccountRow {
  id: string;
  company_id: string;
  bank_code: string;
  bank_name: string;
  bank_slug?: string;
  account_number: string;
  account_digit?: string;
  agency: string;
  agency_digit?: string;
  account_type?: string;
  holder_name?: string;
  holder_document?: string;
  is_active?: boolean;
  is_default?: boolean;
  sync_status?: string;
  connection_status?: string;
  last_sync_at?: string;
  last_sync_error?: string;
  next_sync_at?: string;
  current_balance?: number;
  available_balance?: number;
  balance_updated_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface BankTransactionRow {
  id: string;
  company_id: string;
  bank_account_id: string;
  external_id: string;
  external_ref?: string;
  transaction_date: string;
  posting_date?: string;
  amount: number;
  direction: string;
  description?: string;
  memo?: string;
  category_code?: string;
  category_name?: string;
  counterparty_name?: string;
  counterparty_cpf_cnpj?: string;
  reconciliation_status?: string;
  matched_transaction_id?: string;
  matched_at?: string;
  match_confidence?: number;
  created_at?: string;
  updated_at?: string;
}

// =====================================================
// BANK ACCOUNTS HOOKS
// =====================================================

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const companyId = await getCompanyId();
      
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('bank_name');

      if (error) throw error;
      
      return (data || []).map((row) => {
        const r = row as unknown as BankAccountRow;
        return {
          id: r.id,
          company_id: r.company_id,
          bank_code: r.bank_code,
          bank_name: r.bank_name,
          bank_slug: (r.bank_slug || 'other') as SupportedBank,
          account_number: r.account_number,
          account_digit: r.account_digit,
          agency: r.agency,
          agency_digit: r.agency_digit,
          account_type: (r.account_type || 'checking') as 'checking' | 'savings' | 'payment',
          cpf_cnpj: r.holder_document || '',
          holder_name: r.holder_name,
          is_active: r.is_active ?? true,
          is_primary: r.is_default ?? false,
          connection_status: (r.connection_status || 'pending') as BankAccount['connection_status'],
          sync_status: (r.sync_status || 'idle') as BankAccount['sync_status'],
          sync_frequency_hours: 24,
          last_sync_at: r.last_sync_at,
          last_sync_error: r.last_sync_error,
          next_sync_at: r.next_sync_at,
          current_balance: r.current_balance ? Number(r.current_balance) : undefined,
          available_balance: r.available_balance ? Number(r.available_balance) : undefined,
          balance_updated_at: r.balance_updated_at,
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
        } as BankAccount;
      });
    },
  });
}

export function useBankAccount(accountId: string | null) {
  return useQuery({
    queryKey: ['bank-account', accountId],
    queryFn: async () => {
      if (!accountId) return null;

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (error) throw error;
      
      const r = data as unknown as BankAccountRow;
      return {
        id: r.id,
        company_id: r.company_id,
        bank_code: r.bank_code,
        bank_name: r.bank_name,
        bank_slug: (r.bank_slug || 'other') as SupportedBank,
        account_number: r.account_number,
        account_digit: r.account_digit,
        agency: r.agency,
        agency_digit: r.agency_digit,
        account_type: (r.account_type || 'checking') as 'checking' | 'savings' | 'payment',
        cpf_cnpj: r.holder_document || '',
        holder_name: r.holder_name,
        is_active: r.is_active ?? true,
        is_primary: r.is_default ?? false,
        connection_status: (r.connection_status || 'pending') as BankAccount['connection_status'],
        sync_status: (r.sync_status || 'idle') as BankAccount['sync_status'],
        sync_frequency_hours: 24,
        last_sync_at: r.last_sync_at,
        last_sync_error: r.last_sync_error,
        current_balance: r.current_balance ? Number(r.current_balance) : undefined,
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.updated_at || new Date().toISOString(),
      } as BankAccount;
    },
    enabled: !!accountId,
  });
}

export function useConnectBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      bank_code: string;
      bank_name: string;
      bank_slug: SupportedBank;
      account_number: string;
      agency: string;
      cpf_cnpj: string;
      holder_name?: string;
    }) => {
      const companyId = await getCompanyId();

      const { data: account, error } = await supabase
        .from('bank_accounts')
        .insert({
          company_id: companyId,
          bank_code: data.bank_code,
          bank_name: data.bank_name,
          bank_slug: data.bank_slug,
          account_number: data.account_number,
          agency: data.agency,
          holder_document: data.cpf_cnpj,
          holder_name: data.holder_name,
          is_active: true,
          connection_status: 'pending',
          sync_status: 'idle',
        })
        .select()
        .single();

      if (error) throw error;
      return account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Conta bancária cadastrada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao cadastrar conta bancária');
    },
  });
}

export function useDisconnectBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('bank_accounts')
        .update({
          is_active: false,
          connection_status: 'disconnected',
        })
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Conta bancária desconectada');
    },
    onError: () => {
      toast.error('Erro ao desconectar conta');
    },
  });
}

// =====================================================
// SYNC HOOKS
// =====================================================

export function useSyncBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, dateFrom, dateTo }: {
      accountId: string;
      dateFrom?: string;
      dateTo?: string;
    }) => {
      // Get account details
      const { data: account } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (!account) throw new Error('Conta não encontrada');

      const r = account as unknown as BankAccountRow;
      const bankAccount: BankAccount = {
        id: r.id,
        company_id: r.company_id,
        bank_code: r.bank_code,
        bank_name: r.bank_name,
        bank_slug: (r.bank_slug || 'other') as SupportedBank,
        account_number: r.account_number,
        agency: r.agency,
        account_type: 'checking',
        cpf_cnpj: r.holder_document || '',
        holder_name: r.holder_name || '',
        is_active: true,
        is_primary: false,
        connection_status: 'connected',
        sync_status: 'idle',
        sync_frequency_hours: 24,
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.updated_at || new Date().toISOString(),
      };

      return BankIntegrationService.syncTransactions(bankAccount, dateFrom, dateTo);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success(`Sincronização concluída: ${result.created} novas transações`);
    },
    onError: () => {
      toast.error('Erro na sincronização');
    },
  });
}

export function useBankSyncJobs(accountId?: string) {
  return useQuery({
    queryKey: ['bank-sync-jobs', accountId],
    queryFn: async () => {
      const companyId = await getCompanyId();

      let query = supabase
        .from('bank_sync_jobs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (accountId) {
        query = query.eq('bank_account_id', accountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as BankSyncJob[];
    },
  });
}

// =====================================================
// TRANSACTIONS HOOKS
// =====================================================

export function useBankTransactions(accountId?: string, status?: ReconciliationStatus) {
  return useQuery({
    queryKey: ['bank-transactions', accountId, status],
    queryFn: async () => {
      const companyId = await getCompanyId();

      let query = supabase
        .from('bank_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('transaction_date', { ascending: false })
        .limit(100);

      if (accountId) {
        query = query.eq('bank_account_id', accountId);
      }

      if (status) {
        query = query.eq('reconciliation_status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((row) => {
        const r = row as unknown as BankTransactionRow;
        return {
          id: r.id,
          company_id: r.company_id,
          bank_account_id: r.bank_account_id,
          external_id: r.external_id,
          transaction_date: r.transaction_date,
          amount: Number(r.amount),
          direction: r.direction as 'entrada' | 'saida',
          description: r.description || '',
          counterparty_name: r.counterparty_name,
          reconciliation_status: (r.reconciliation_status || 'pending') as ReconciliationStatus,
          matched_transaction_id: r.matched_transaction_id,
          matched_at: r.matched_at,
          match_confidence: r.match_confidence,
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
        } as BankTransaction;
      });
    },
  });
}

// =====================================================
// RECONCILIATION HOOKS
// =====================================================

export function useReconcileTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bankTransactionId, systemTransactionId }: {
      bankTransactionId: string;
      systemTransactionId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      await BankIntegrationService.linkTransaction(
        bankTransactionId,
        systemTransactionId,
        user.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success('Transação conciliada');
    },
    onError: () => {
      toast.error('Erro ao conciliar transação');
    },
  });
}

export function useIgnoreTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bankTransactionId: string) => {
      await BankIntegrationService.ignoreTransaction(bankTransactionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success('Transação ignorada');
    },
    onError: () => {
      toast.error('Erro ao ignorar transação');
    },
  });
}

export function useAutoReconcile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bankAccountId?: string) => {
      const companyId = await getCompanyId();
      return BankIntegrationService.autoReconcileBatch(companyId, bankAccountId);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success(`Conciliação automática: ${result.matched} conciliadas, ${result.unmatched} pendentes`);
    },
    onError: () => {
      toast.error('Erro na conciliação automática');
    },
  });
}

// =====================================================
// COMBINED HOOK
// =====================================================

export function useBankIntegration(accountId?: string) {
  const accountsQuery = useBankAccounts();
  const accountQuery = useBankAccount(accountId || null);
  const transactionsQuery = useBankTransactions(accountId);
  const syncJobsQuery = useBankSyncJobs(accountId);

  const connectAccount = useConnectBankAccount();
  const disconnectAccount = useDisconnectBankAccount();
  const syncAccount = useSyncBankAccount();
  const reconcileTransaction = useReconcileTransaction();
  const ignoreTransaction = useIgnoreTransaction();
  const autoReconcile = useAutoReconcile();

  return {
    // Data
    accounts: accountsQuery.data || [],
    account: accountQuery.data,
    transactions: transactionsQuery.data || [],
    syncJobs: syncJobsQuery.data || [],

    // Loading states
    isLoadingAccounts: accountsQuery.isLoading,
    isLoadingAccount: accountQuery.isLoading,
    isLoadingTransactions: transactionsQuery.isLoading,
    isSyncing: syncAccount.isPending,

    // Mutations
    connectAccount,
    disconnectAccount,
    syncAccount,
    reconcileTransaction,
    ignoreTransaction,
    autoReconcile,

    // Refetch
    refetchAccounts: accountsQuery.refetch,
    refetchTransactions: transactionsQuery.refetch,
  };
}
