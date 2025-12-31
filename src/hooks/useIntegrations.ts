import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// Types for the integration module (since types.ts is read-only)
export type IntegrationProvider = 'ofx' | 'csv' | 'stripe' | 'mercadopago' | 'asaas' | 'pagarme' | 'omie' | 'tiny' | 'bling' | 'openfinance' | 'other';
export type IntegrationStatus = 'disconnected' | 'connected' | 'error' | 'disabled';
export type IntegrationAuthType = 'file' | 'oauth' | 'api_key' | 'webhook';
export type ImportBatchStatus = 'processing' | 'success' | 'partial' | 'error';
export type MatchType = 'exact' | 'fuzzy' | 'manual';
export type ReconciliationAction = 'mark_paid' | 'create' | 'ignore' | 'pending';

export interface Integration {
  id: string;
  company_id: string;
  provider: IntegrationProvider;
  name: string;
  status: IntegrationStatus;
  auth_type: IntegrationAuthType;
  settings_json: Json;
  last_sync_at: string | null;
  last_sync_status: string | null;
  sync_interval_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationAccount {
  id: string;
  company_id: string;
  integration_id: string;
  external_account_id: string;
  external_account_name: string | null;
  wallet_id: string | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ImportBatch {
  id: string;
  company_id: string;
  integration_id: string;
  source_type: 'manual_upload' | 'scheduled_sync' | 'webhook';
  source_filename: string | null;
  started_at: string;
  finished_at: string | null;
  status: ImportBatchStatus;
  summary_json: Json;
  error_details: string | null;
  created_at: string;
}

export interface ImportedTransaction {
  id: string;
  company_id: string;
  batch_id: string;
  integration_id: string;
  external_id: string | null;
  external_hash: string;
  external_account_id: string | null;
  posted_at: string;
  amount: number;
  direction: 'in' | 'out';
  description_raw: string | null;
  counterparty_raw: string | null;
  fit_id: string | null;
  raw_json: Json | null;
  duplicate_of_id: string | null;
  processed: boolean;
  created_at: string;
}

export interface ReconciliationMatch {
  id: string;
  company_id: string;
  imported_transaction_id: string;
  transaction_id: string | null;
  match_type: MatchType;
  confidence: number;
  rules_applied_json: Json;
  action_taken: ReconciliationAction;
  approved_by_user_id: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  imported_transaction?: ImportedTransaction;
}

export interface CategorizationRule {
  id: string;
  company_id: string;
  integration_id: string | null;
  name: string;
  priority: number;
  conditions_json: Json;
  account_id: string | null;
  cost_center_id: string | null;
  counterparty_id: string | null;
  is_active: boolean;
  created_at: string;
}

// Helper to parse summary_json
export function parseSummary(json: Json): { imported: number; reconciled: number; created: number; duplicates: number; errors: number } {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    return {
      imported: typeof json.imported === 'number' ? json.imported : 0,
      reconciled: typeof json.reconciled === 'number' ? json.reconciled : 0,
      created: typeof json.created === 'number' ? json.created : 0,
      duplicates: typeof json.duplicates === 'number' ? json.duplicates : 0,
      errors: typeof json.errors === 'number' ? json.errors : 0,
    };
  }
  return { imported: 0, reconciled: 0, created: 0, duplicates: 0, errors: 0 };
}

// Hooks

export function useIntegrations() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['integrations', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Integration[];
    },
    enabled: !!currentCompany,
  });
}

export function useIntegration(integrationId: string | null) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['integration', integrationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('id', integrationId!)
        .eq('company_id', currentCompany!.id)
        .single();
      
      if (error) throw error;
      return data as Integration;
    },
    enabled: !!currentCompany && !!integrationId,
  });
}

export function useIntegrationAccounts(integrationId: string | null) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['integration-accounts', integrationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_accounts')
        .select('*')
        .eq('integration_id', integrationId!)
        .eq('company_id', currentCompany!.id);
      
      if (error) throw error;
      return data as IntegrationAccount[];
    },
    enabled: !!currentCompany && !!integrationId,
  });
}

export function useImportBatches(integrationId?: string) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['import-batches', currentCompany?.id, integrationId],
    queryFn: async () => {
      let query = supabase
        .from('import_batches')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (integrationId) {
        query = query.eq('integration_id', integrationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ImportBatch[];
    },
    enabled: !!currentCompany,
  });
}

export function useImportedTransactions(batchId: string | null, filter?: { processed?: boolean }) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['imported-transactions', batchId, filter],
    queryFn: async () => {
      let query = supabase
        .from('imported_transactions')
        .select('*')
        .eq('batch_id', batchId!)
        .eq('company_id', currentCompany!.id)
        .order('posted_at', { ascending: false });
      
      if (filter?.processed !== undefined) {
        query = query.eq('processed', filter.processed);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ImportedTransaction[];
    },
    enabled: !!currentCompany && !!batchId,
  });
}

export function useReconciliationMatches(filter?: { actionTaken?: ReconciliationAction }) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['reconciliation-matches', currentCompany?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from('reconciliation_matches')
        .select(`
          *,
          imported_transaction:imported_transactions(*)
        `)
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (filter?.actionTaken) {
        query = query.eq('action_taken', filter.actionTaken);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ReconciliationMatch[];
    },
    enabled: !!currentCompany,
  });
}

export function useCategorizationRules(integrationId?: string) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['categorization-rules', currentCompany?.id, integrationId],
    queryFn: async () => {
      let query = supabase
        .from('categorization_rules')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .eq('is_active', true)
        .order('priority', { ascending: false });
      
      if (integrationId) {
        query = query.or(`integration_id.eq.${integrationId},integration_id.is.null`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CategorizationRule[];
    },
    enabled: !!currentCompany,
  });
}

// Mutations

export function useCreateIntegration() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<Integration>) => {
      const { data: result, error } = await supabase
        .from('integrations')
        .insert({
          company_id: currentCompany!.id,
          provider: data.provider!,
          name: data.name!,
          auth_type: data.auth_type || 'file',
          status: 'connected',
          settings_json: data.settings_json || {},
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as Integration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integração criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar integração: ' + error.message);
    },
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Integration> }) => {
      const { data: result, error } = await supabase
        .from('integrations')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result as Integration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integração atualizada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integração removida');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });
}

export function useCreateImportBatch() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: { integrationId: string; filename?: string }) => {
      const { data: result, error } = await supabase
        .from('import_batches')
        .insert({
          company_id: currentCompany!.id,
          integration_id: data.integrationId,
          source_type: 'manual_upload',
          source_filename: data.filename,
          status: 'processing',
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as ImportBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-batches'] });
    },
  });
}

export function useUpdateImportBatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ImportBatch> }) => {
      const { data: result, error } = await supabase
        .from('import_batches')
        .update({
          ...data,
          finished_at: data.status !== 'processing' ? new Date().toISOString() : undefined,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result as ImportBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-batches'] });
    },
  });
}

export function useImportTransactions() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (transactions: Array<{
      batch_id: string;
      integration_id: string;
      external_id?: string | null;
      external_hash: string;
      external_account_id?: string | null;
      posted_at: string;
      amount: number;
      direction: string;
      description_raw?: string | null;
      counterparty_raw?: string | null;
      fit_id?: string | null;
      raw_json?: Json | null;
      duplicate_of_id?: string | null;
      processed?: boolean;
    }>) => {
      const { data, error } = await supabase
        .from('imported_transactions')
        .insert(transactions.map(t => ({
          ...t,
          company_id: currentCompany!.id,
        })))
        .select();
      
      if (error) throw error;
      return data as ImportedTransaction[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imported-transactions'] });
    },
  });
}

export function useCreateReconciliationMatch() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (matches: Array<{
      importedTransactionId: string;
      transactionId?: string;
      matchType: MatchType;
      confidence: number;
      rulesApplied: string[];
      actionTaken: ReconciliationAction;
    }>) => {
      const { data, error } = await supabase
        .from('reconciliation_matches')
        .insert(matches.map(m => ({
          company_id: currentCompany!.id,
          imported_transaction_id: m.importedTransactionId,
          transaction_id: m.transactionId || null,
          match_type: m.matchType,
          confidence: m.confidence,
          rules_applied_json: m.rulesApplied,
          action_taken: m.actionTaken,
        })))
        .select();
      
      if (error) throw error;
      return data as ReconciliationMatch[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-matches'] });
    },
  });
}

export function useApproveReconciliation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ matchId, action }: { matchId: string; action: ReconciliationAction }) => {
      const { data, error } = await supabase
        .from('reconciliation_matches')
        .update({
          action_taken: action,
          approved_by_user_id: user!.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .select()
        .single();
      
      if (error) throw error;
      return data as ReconciliationMatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-matches'] });
      queryClient.invalidateQueries({ queryKey: ['imported-transactions'] });
    },
  });
}

export function useMarkTransactionPaid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ transactionId, paidDate }: { transactionId: string; paidDate: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          status: 'pago',
          paid_date: paidDate,
        })
        .eq('id', transactionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-matches'] });
      toast.success('Transação marcada como paga');
    },
    onError: (error: Error) => {
      toast.error('Erro ao marcar como paga: ' + error.message);
    },
  });
}

export function useCreateIntegrationAccount() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      integrationId: string;
      externalAccountId: string;
      externalAccountName?: string;
      walletId?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('integration_accounts')
        .insert({
          company_id: currentCompany!.id,
          integration_id: data.integrationId,
          external_account_id: data.externalAccountId,
          external_account_name: data.externalAccountName,
          wallet_id: data.walletId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as IntegrationAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-accounts'] });
      toast.success('Conta mapeada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao mapear conta: ' + error.message);
    },
  });
}

export function useUpdateIntegrationAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, walletId }: { id: string; walletId: string | null }) => {
      const { data, error } = await supabase
        .from('integration_accounts')
        .update({ wallet_id: walletId })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as IntegrationAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-accounts'] });
      toast.success('Mapeamento atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

export function useMarkImportedAsProcessed() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('imported_transactions')
        .update({ processed: true })
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imported-transactions'] });
    },
  });
}

export function useCreateCategorizationRule() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<CategorizationRule>) => {
      const { data: result, error } = await supabase
        .from('categorization_rules')
        .insert({
          company_id: currentCompany!.id,
          name: data.name!,
          priority: data.priority || 0,
          conditions_json: data.conditions_json || {},
          account_id: data.account_id,
          cost_center_id: data.cost_center_id,
          counterparty_id: data.counterparty_id,
          integration_id: data.integration_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as CategorizationRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorization-rules'] });
      toast.success('Regra criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar regra: ' + error.message);
    },
  });
}

export function useDeleteCategorizationRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categorization_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorization-rules'] });
      toast.success('Regra removida');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });
}
