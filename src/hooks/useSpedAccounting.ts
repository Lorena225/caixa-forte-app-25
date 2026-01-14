import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SpedAccountingEntry {
  id: string;
  company_id: string;
  period_id: string | null;
  entry_date: string;
  entry_number: number;
  account_code: string;
  account_id: string | null;
  debit_value: number;
  credit_value: number;
  history: string;
  cost_center_id: string | null;
  document_type: string | null;
  document_number: string | null;
  counterparty_id: string | null;
  is_validated: boolean;
  created_at: string;
}

export function useSpedAccountingEntries(filters?: {
  startDate?: string;
  endDate?: string;
}) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['sped-accounting-entries', currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('sped_accounting_entries')
        .select('*, accounts(account_name), cost_centers(name)')
        .eq('company_id', currentCompany.id)
        .order('entry_date', { ascending: false })
        .order('entry_number', { ascending: true });
      
      if (filters?.startDate) {
        query = query.gte('entry_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('entry_date', filters.endDate);
      }
      
      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as SpedAccountingEntry[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useSpedAccountingStats() {
  const { currentCompany } = useAuth();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  return useQuery({
    queryKey: ['sped-accounting-stats', currentCompany?.id, currentYear, currentMonth],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const { data, error } = await supabase
        .from('sped_accounting_entries')
        .select('debit_value, credit_value, is_validated')
        .eq('company_id', currentCompany.id)
        .gte('entry_date', startOfMonth);
      
      if (error) throw error;
      
      const totalDebitos = data?.reduce((sum, e) => sum + Number(e.debit_value), 0) || 0;
      const totalCreditos = data?.reduce((sum, e) => sum + Number(e.credit_value), 0) || 0;
      const pendentes = data?.filter(e => !e.is_validated) || [];
      const partidasDobradas = Math.abs(totalDebitos - totalCreditos) < 0.01;
      
      return {
        totalLancamentos: data?.length || 0,
        totalDebitos,
        totalCreditos,
        diferenca: totalDebitos - totalCreditos,
        partidasDobradasOk: partidasDobradas,
        pendentesValidacao: pendentes.length,
      };
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateSpedAccountingEntry() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<SpedAccountingEntry>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data: result, error } = await supabase
        .from('sped_accounting_entries')
        .insert({ ...data, company_id: currentCompany.id } as never)
        .select()
        .single();
      
      if (error) throw error;
      return result as SpedAccountingEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sped-accounting-entries'] });
      queryClient.invalidateQueries({ queryKey: ['sped-accounting-stats'] });
      toast.success('Lançamento contábil criado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar lançamento: ' + error.message);
    },
  });
}

export function useValidateSpedAccountingEntries() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('sped_accounting_entries')
        .update({ is_validated: true })
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sped-accounting-entries'] });
      queryClient.invalidateQueries({ queryKey: ['sped-accounting-stats'] });
      toast.success('Lançamentos validados');
    },
    onError: (error: Error) => {
      toast.error('Erro na validação: ' + error.message);
    },
  });
}
