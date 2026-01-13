import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BankReference {
  id: string;
  compe_code: string;
  ispb: string | null;
  name: string;
  display_name: string;
  bank_type: string;
  is_active: boolean;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface BankBranch {
  id: string;
  company_id: string;
  bank_id: string;
  agency_number: string;
  agency_digit: string | null;
  agency_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bank?: BankReference;
}

export interface CompanyBankAccount {
  id: string;
  company_id: string;
  bank_id: string;
  branch_id: string | null;
  wallet_id: string | null;
  account_number: string;
  account_digit: string | null;
  account_type: string;
  nickname: string | null;
  holder_name: string | null;
  holder_document: string | null;
  is_active: boolean;
  is_default_receipts: boolean;
  is_default_payments: boolean;
  cnab_agreement: string | null;
  cnab_wallet: string | null;
  cnab_layout: string | null;
  created_at: string;
  updated_at: string;
  bank?: BankReference;
  branch?: BankBranch;
}

export interface BankRequest {
  id: string;
  company_id: string;
  requested_name: string;
  website: string | null;
  cnpj_ispb: string | null;
  requested_by_user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  approved_bank_id: string | null;
  created_at: string;
  updated_at: string;
}

// Hook para lista de bancos de referência (FEBRABAN)
export function useBanksReference(activeOnly = true) {
  return useQuery({
    queryKey: ['banks-reference', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('banks_reference')
        .select('*')
        .order('display_name');
      
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as BankReference[];
    },
  });
}

// Hook para agências da empresa
export function useCompanyBankBranches() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['company-bank-branches', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('company_bank_branches')
        .select(`
          *,
          bank:bank_id (*)
        `)
        .eq('company_id', currentCompany.id)
        .order('agency_number');
      
      if (error) throw error;
      return data as (BankBranch & { bank: BankReference })[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para contas bancárias da empresa
export function useCompanyBankAccounts() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['company-bank-accounts', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('company_bank_accounts')
        .select(`
          *,
          bank:bank_id (*),
          branch:branch_id (*)
        `)
        .eq('company_id', currentCompany.id)
        .order('nickname');
      
      if (error) throw error;
      return data as (CompanyBankAccount & { bank: BankReference; branch: BankBranch | null })[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para solicitações de novos bancos
export function useBankRequests() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['bank-requests', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('bank_requests')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BankRequest[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Mutations para agências
export function useBankBranchMutations() {
  const { currentCompany, user } = useAuth();
  const queryClient = useQueryClient();
  
  const createBranch = useMutation({
    mutationFn: async (data: Omit<BankBranch, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('company_bank_branches')
        .insert({ ...data, company_id: currentCompany?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-bank-branches'] });
    },
  });
  
  const updateBranch = useMutation({
    mutationFn: async ({ id, ...data }: Partial<BankBranch> & { id: string }) => {
      const { error } = await supabase
        .from('company_bank_branches')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-bank-branches'] });
    },
  });
  
  const deleteBranch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_bank_branches')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-bank-branches'] });
    },
  });
  
  return { createBranch, updateBranch, deleteBranch };
}

// Mutations para contas bancárias
export function useBankAccountMutations() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  
  const createAccount = useMutation({
    mutationFn: async (data: Omit<CompanyBankAccount, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('company_bank_accounts')
        .insert({ ...data, company_id: currentCompany?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-bank-accounts'] });
    },
  });
  
  const updateAccount = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CompanyBankAccount> & { id: string }) => {
      const { error } = await supabase
        .from('company_bank_accounts')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-bank-accounts'] });
    },
  });
  
  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_bank_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-bank-accounts'] });
    },
  });
  
  return { createAccount, updateAccount, deleteAccount };
}

// Mutation para solicitar novo banco
export function useBankRequestMutation() {
  const { currentCompany, user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { requested_name: string; website?: string; cnpj_ispb?: string }) => {
      const { error } = await supabase
        .from('bank_requests')
        .insert({
          ...data,
          company_id: currentCompany?.id,
          requested_by_user_id: user?.id,
          status: 'pending',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-requests'] });
    },
  });
}
