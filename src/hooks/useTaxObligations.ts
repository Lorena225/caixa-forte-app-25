import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TaxObligation {
  id: string;
  company_id: string;
  obligation_type: string;
  obligation_name: string;
  reference_year: number;
  reference_month: number | null;
  due_date: string;
  status: 'pendente' | 'em_elaboracao' | 'gerada' | 'transmitida' | 'aceita' | 'rejeitada' | 'retificada';
  file_path: string | null;
  file_name: string | null;
  file_hash: string | null;
  protocol_number: string | null;
  receipt_number: string | null;
  transmission_date: string | null;
  reception_date: string | null;
  rejection_reason: string | null;
  rectification_of: string | null;
  notes: string | null;
  responsible_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export const OBLIGATION_TYPES = [
  { code: 'EFD_ICMS_IPI', name: 'EFD ICMS/IPI', monthly: true, dayDue: 25 },
  { code: 'EFD_CONTRIBUICOES', name: 'EFD Contribuições', monthly: true, dayDue: 15 },
  { code: 'DCTF', name: 'DCTF', monthly: true, dayDue: 15 },
  { code: 'ECF', name: 'ECF', monthly: false, dayDue: null },
  { code: 'DIRF', name: 'DIRF', monthly: false, dayDue: null },
  { code: 'SPED_CONTABIL', name: 'SPED Contábil (ECD)', monthly: false, dayDue: null },
  { code: 'GIA', name: 'GIA', monthly: true, dayDue: 16 },
  { code: 'SINTEGRA', name: 'SINTEGRA', monthly: true, dayDue: 15 },
];

export function useTaxObligations(filters?: {
  year?: number;
  status?: string;
  type?: string;
}) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['tax-obligations', currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('tax_obligations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('due_date', { ascending: true });
      
      if (filters?.year) {
        query = query.eq('reference_year', filters.year);
      }
      if (filters?.status && filters.status !== '__all__') {
        query = query.eq('status', filters.status);
      }
      if (filters?.type && filters.type !== '__all__') {
        query = query.eq('obligation_type', filters.type);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TaxObligation[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function usePendingObligations() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['pending-tax-obligations', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStr = nextMonth.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('tax_obligations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .in('status', ['pendente', 'em_elaboracao', 'gerada'])
        .gte('due_date', today)
        .lte('due_date', nextMonthStr)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as TaxObligation[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useOverdueObligations() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['overdue-tax-obligations', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('tax_obligations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .in('status', ['pendente', 'em_elaboracao', 'gerada'])
        .lt('due_date', today)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as TaxObligation[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateTaxObligation() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<TaxObligation>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const obligationType = OBLIGATION_TYPES.find(o => o.code === data.obligation_type);
      
      const { data: result, error } = await supabase
        .from('tax_obligations')
        .insert({
          ...data,
          company_id: currentCompany.id,
          obligation_name: obligationType?.name || data.obligation_type,
          status: 'pendente',
        } as never)
        .select()
        .single();
      
      if (error) throw error;
      return result as TaxObligation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tax-obligations'] });
      toast.success('Obrigação cadastrada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cadastrar: ' + error.message);
    },
  });
}

export function useUpdateObligationStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, ...extra }: { id: string; status: string; [key: string]: unknown }) => {
      const updateData: Record<string, unknown> = { status, ...extra };
      
      if (status === 'transmitida') {
        updateData.transmission_date = new Date().toISOString();
      }
      if (status === 'aceita') {
        updateData.reception_date = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('tax_obligations')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tax-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-tax-obligations'] });
      toast.success('Status atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });
}

export function useTransmitObligation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Simulate SEFAZ transmission
      const protocol = `PROT${Date.now()}`;
      const receipt = `REC${Date.now()}`;
      
      const { error } = await supabase
        .from('tax_obligations')
        .update({
          status: 'aceita',
          protocol_number: protocol,
          receipt_number: receipt,
          transmission_date: new Date().toISOString(),
          reception_date: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (error) throw error;
      return { protocol, receipt };
    },
    onSuccess: ({ protocol }) => {
      queryClient.invalidateQueries({ queryKey: ['tax-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tax-obligations'] });
      toast.success(`Transmitida com sucesso. Protocolo: ${protocol}`);
    },
    onError: (error: Error) => {
      toast.error('Erro na transmissão: ' + error.message);
    },
  });
}
