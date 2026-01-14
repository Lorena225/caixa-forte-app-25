import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TaxCalculation {
  id: string;
  company_id: string;
  period_id: string | null;
  period_year: number;
  period_month: number;
  tax_type: 'ICMS' | 'PIS' | 'COFINS' | 'IPI' | 'ISS' | 'IRPJ' | 'CSLL';
  total_debits: number;
  total_credits: number;
  balance: number;
  previous_balance: number;
  payment_value: number;
  payment_due_date: string | null;
  payment_date: string | null;
  status: 'pendente' | 'apurado' | 'pago' | 'compensado';
  darf_code: string | null;
  notes: string | null;
  calculated_by: string | null;
  calculated_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useTaxCalculations(year?: number, month?: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['tax-calculations', currentCompany?.id, year, month],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('tax_calculations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
      
      if (year) {
        query = query.eq('period_year', year);
      }
      if (month) {
        query = query.eq('period_month', month);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TaxCalculation[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useTaxCalculationsByType(taxType: string) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['tax-calculations-by-type', currentCompany?.id, taxType],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('tax_calculations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('tax_type', taxType)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(12);
      
      if (error) throw error;
      return data as TaxCalculation[];
    },
    enabled: !!currentCompany?.id && !!taxType,
  });
}

export function useTaxCalculationSummary(year: number, month: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['tax-calculation-summary', currentCompany?.id, year, month],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      const { data, error } = await supabase
        .from('tax_calculations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('period_year', year)
        .eq('period_month', month);
      
      if (error) throw error;
      
      const taxTypes = ['ICMS', 'PIS', 'COFINS', 'IPI', 'ISS', 'IRPJ', 'CSLL'] as const;
      const summary: Record<string, TaxCalculation | null> = {};
      
      taxTypes.forEach(type => {
        summary[type] = (data?.find(d => d.tax_type === type) as TaxCalculation) || null;
      });
      
      const totalAPagar = data?.reduce((sum, d) => {
        if (d.balance > 0 && d.status !== 'pago') {
          return sum + d.balance;
        }
        return sum;
      }, 0) || 0;
      
      return { ...summary, totalAPagar };
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateTaxCalculation() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<TaxCalculation>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const balance = (data.total_debits || 0) - (data.total_credits || 0) - (data.previous_balance || 0);
      
      const { data: result, error } = await supabase
        .from('tax_calculations')
        .insert({
          ...data,
          company_id: currentCompany.id,
          balance,
          payment_value: balance > 0 ? balance : 0,
          status: 'apurado',
          calculated_by: user?.id,
          calculated_at: new Date().toISOString(),
        } as never)
        .select()
        .single();
      
      if (error) throw error;
      return result as TaxCalculation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['tax-calculation-summary'] });
      toast.success('Apuração criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar apuração: ' + error.message);
    },
  });
}

export function useUpdateTaxCalculation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<TaxCalculation> & { id: string }) => {
      const { error } = await supabase
        .from('tax_calculations')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['tax-calculation-summary'] });
      toast.success('Apuração atualizada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

export function useMarkTaxAsPaid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, paymentDate }: { id: string; paymentDate: string }) => {
      const { error } = await supabase
        .from('tax_calculations')
        .update({ status: 'pago', payment_date: paymentDate })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['tax-calculation-summary'] });
      toast.success('Imposto marcado como pago');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });
}
