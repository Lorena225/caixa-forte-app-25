// =====================================================
// OPEN BANKING DATA HOOKS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { SupportedBankId } from '@/components/openbanking';
import { SUPPORTED_BANKS } from '@/components/openbanking';

export interface OpenBankingConnection {
  id: string;
  company_id: string;
  bank_id: SupportedBankId;
  bank_name: string;
  bank_code: string;
  bank_color: string;
  holder_document: string;
  connection_status: 'pending' | 'connected' | 'expired' | 'error';
  last_sync_at: string | null;
  next_sync_at: string | null;
  consent_expires_at: string | null;
  current_balance: number;
  available_balance: number;
  accounts_count: number;
  created_at: string;
}

export interface OpenBankingBalance {
  total_balance: number;
  available_balance: number;
  connections_count: number;
  last_sync_at: string | null;
  accounts: Array<{
    id: string;
    bank_name: string;
    bank_color: string;
    account_type: string;
    balance: number;
    last_sync_at: string | null;
  }>;
}

// Extended bank account type with Open Banking fields
interface BankAccountWithOpenBanking {
  id: string;
  company_id: string;
  bank_code: string | null;
  bank_name: string | null;
  holder_document: string | null;
  created_at: string;
  // Open Banking specific fields (added via migration)
  connection_status?: string | null;
  last_sync_at?: string | null;
  next_sync_at?: string | null;
  current_balance?: number | null;
  available_balance?: number | null;
  account_type?: string | null;
}

// Fetch all Open Banking connections
export function useOpenBankingConnections() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['openbanking-connections', currentCompany?.id],
    queryFn: async (): Promise<OpenBankingConnection[]> => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('bank_name');

      if (error) throw error;

      // Cast to extended type that includes Open Banking fields
      const accounts = (data || []) as unknown as BankAccountWithOpenBanking[];

      return accounts.map((account) => {
        const bank = SUPPORTED_BANKS.find(b => b.code === account.bank_code);
        return {
          id: account.id,
          company_id: account.company_id,
          bank_id: (bank?.id || 'other') as SupportedBankId,
          bank_name: account.bank_name || bank?.name || 'Banco',
          bank_code: account.bank_code || '',
          bank_color: bank?.color || '#666',
          holder_document: account.holder_document || '',
          connection_status: (account.connection_status || 'pending') as OpenBankingConnection['connection_status'],
          last_sync_at: account.last_sync_at || null,
          next_sync_at: account.next_sync_at || null,
          consent_expires_at: null,
          current_balance: Number(account.current_balance) || 0,
          available_balance: Number(account.available_balance) || 0,
          accounts_count: 1,
          created_at: account.created_at,
        };
      });
    },
    enabled: !!currentCompany?.id,
    staleTime: 30000,
  });
}

// Fetch consolidated Open Banking balance (for dashboard widget)
export function useOpenBankingBalance() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['openbanking-balance', currentCompany?.id],
    queryFn: async (): Promise<OpenBankingBalance> => {
      if (!currentCompany?.id) {
        return {
          total_balance: 0,
          available_balance: 0,
          connections_count: 0,
          last_sync_at: null,
          accounts: [],
        };
      }

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true);

      if (error) throw error;

      // Cast to extended type
      const allAccounts = (data || []) as unknown as BankAccountWithOpenBanking[];
      
      // Filter connected accounts
      const connectedAccounts = allAccounts.filter(acc => acc.connection_status === 'connected');
      
      const total_balance = connectedAccounts.reduce((sum, acc) => sum + (Number(acc.current_balance) || 0), 0);
      const available_balance = connectedAccounts.reduce((sum, acc) => sum + (Number(acc.available_balance) || 0), 0);
      
      const syncDates = connectedAccounts
        .map(a => a.last_sync_at)
        .filter((d): d is string => !!d)
        .sort()
        .reverse();

      return {
        total_balance,
        available_balance,
        connections_count: connectedAccounts.length,
        last_sync_at: syncDates[0] || null,
        accounts: connectedAccounts.map((acc) => {
          const bank = SUPPORTED_BANKS.find(b => b.code === acc.bank_code);
          return {
            id: acc.id,
            bank_name: acc.bank_name || bank?.name || 'Banco',
            bank_color: bank?.color || '#666',
            account_type: acc.account_type || 'checking',
            balance: Number(acc.current_balance) || 0,
            last_sync_at: acc.last_sync_at || null,
          };
        }),
      };
    },
    enabled: !!currentCompany?.id,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Auto-refresh every minute
  });
}

// Connect a new bank via Open Banking
export function useConnectOpenBanking() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      bankId, 
      credentials 
    }: { 
      bankId: SupportedBankId; 
      credentials: { cpf: string; consent: boolean } 
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');

      const bank = SUPPORTED_BANKS.find(b => b.id === bankId);
      if (!bank) throw new Error('Banco não suportado');

      // Simulate OAuth flow delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create bank account record with base fields only (type-safe)
      // Open Banking fields are added but TS types may not be updated yet
      const insertData = {
        company_id: currentCompany.id,
        bank_code: bank.code,
        bank_name: bank.name,
        holder_document: credentials.cpf.replace(/\D/g, ''),
        account_number: '****' + Math.random().toString().slice(2, 6),
        agency: '0001',
        is_active: true,
      } as Record<string, unknown>;

      // Add Open Banking specific fields
      insertData.connection_status = 'connected';
      insertData.sync_status = 'syncing';
      insertData.current_balance = Math.random() * 50000 + 5000;
      insertData.available_balance = Math.random() * 40000 + 4000;
      insertData.last_sync_at = new Date().toISOString();
      insertData.next_sync_at = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('bank_accounts')
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openbanking-connections'] });
      queryClient.invalidateQueries({ queryKey: ['openbanking-balance'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
    onError: (error) => {
      console.error('Open Banking connection error:', error);
      toast.error('Falha na conexão Open Banking');
    },
  });
}

// Manual sync trigger
export function useSyncOpenBanking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      // Update sync status - use type assertion for extended fields
      const syncingUpdate = { sync_status: 'syncing' } as Record<string, unknown>;
      
      const { error: updateError } = await supabase
        .from('bank_accounts')
        .update(syncingUpdate as never)
        .eq('id', connectionId);

      if (updateError) throw updateError;

      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update with new sync time and mock new balance
      const syncCompleteUpdate = {
        sync_status: 'idle',
        last_sync_at: new Date().toISOString(),
        next_sync_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        current_balance: Math.random() * 50000 + 5000,
        available_balance: Math.random() * 40000 + 4000,
      } as Record<string, unknown>;

      const { data, error } = await supabase
        .from('bank_accounts')
        .update(syncCompleteUpdate as never)
        .eq('id', connectionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openbanking-connections'] });
      queryClient.invalidateQueries({ queryKey: ['openbanking-balance'] });
      toast.success('Dados sincronizados com sucesso!');
    },
    onError: () => {
      toast.error('Erro na sincronização');
    },
  });
}

// Disconnect bank
export function useDisconnectOpenBanking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('bank_accounts')
        .update({
          is_active: false,
          connection_status: 'disconnected',
        })
        .eq('id', connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openbanking-connections'] });
      queryClient.invalidateQueries({ queryKey: ['openbanking-balance'] });
      toast.success('Banco desconectado');
    },
    onError: () => {
      toast.error('Erro ao desconectar');
    },
  });
}
