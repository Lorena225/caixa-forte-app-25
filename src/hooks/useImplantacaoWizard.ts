import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Wizard de implantação: grava os cadastros mínimos que tiram o sistema do
// estado "zerado" (contas, clientes/fornecedores, centros de custo) num fluxo
// único, em vez de espalhar a pessoa por várias telas.

export interface BankAccountInput {
  bank_code: string; bank_name: string; agency: string;
  account_number: string; account_type: string; // checking | savings | payment
}
export interface PartnerInput {
  name: string; kind: 'cliente' | 'fornecedor' | 'ambos'; person_type: 'pf' | 'pj';
}
export interface CostCenterInput { code: string; name: string; }

export function useCreateBankAccount() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: BankAccountInput) => {
      const { error } = await supabase.from('bank_accounts').insert({
        company_id: currentCompany!.id,
        bank_code: p.bank_code, bank_name: p.bank_name,
        agency: p.agency, account_number: p.account_number,
        account_type: p.account_type, is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding-status'] });
      qc.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Conta cadastrada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao cadastrar conta'),
  });
}

export function useCreatePartner() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: PartnerInput) => {
      const { error } = await supabase.from('counterparties').insert({
        company_id: currentCompany!.id,
        name: p.name,
        type: p.kind === 'ambos' ? 'cliente' : p.kind,
        is_client: p.kind === 'cliente' || p.kind === 'ambos',
        is_supplier: p.kind === 'fornecedor' || p.kind === 'ambos',
        person_type: p.person_type,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding-status'] });
      qc.invalidateQueries({ queryKey: ['counterparties'] });
      toast.success('Contraparte cadastrada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao cadastrar'),
  });
}

export function useCreateCostCenter() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: CostCenterInput) => {
      const { error } = await supabase.from('cost_centers').insert({
        company_id: currentCompany!.id, code: p.code, name: p.name, is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding-status'] });
      qc.invalidateQueries({ queryKey: ['cost-centers'] });
      toast.success('Centro de custo cadastrado');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao cadastrar'),
  });
}
