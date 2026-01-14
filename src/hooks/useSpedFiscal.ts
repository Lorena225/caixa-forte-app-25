import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SpedFiscalMovement {
  id: string;
  company_id: string;
  period_id: string | null;
  document_type: string;
  document_number: string;
  document_date: string;
  counterparty_id: string | null;
  operation_type: 'entrada' | 'saida';
  cfop_code: string;
  ncm_code: string | null;
  cst_icms: string | null;
  cst_pis: string | null;
  cst_cofins: string | null;
  icms_base: number;
  icms_value: number;
  icms_rate: number;
  ipi_base: number;
  ipi_value: number;
  ipi_rate: number;
  pis_base: number;
  pis_value: number;
  pis_rate: number;
  cofins_base: number;
  cofins_value: number;
  cofins_rate: number;
  total_value: number;
  observation: string | null;
  xml_key: string | null;
  is_validated: boolean;
  validation_errors: unknown | null;
  created_at: string;
  updated_at: string;
}

export function useSpedFiscalMovements(filters?: {
  startDate?: string;
  endDate?: string;
  operationType?: string;
  documentType?: string;
}) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['sped-fiscal-movements', currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('sped_fiscal_movements')
        .select('*, counterparties(name)')
        .eq('company_id', currentCompany.id)
        .order('document_date', { ascending: false });
      
      if (filters?.startDate) {
        query = query.gte('document_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('document_date', filters.endDate);
      }
      if (filters?.operationType && filters.operationType !== '__all__') {
        query = query.eq('operation_type', filters.operationType);
      }
      if (filters?.documentType && filters.documentType !== '__all__') {
        query = query.eq('document_type', filters.documentType);
      }
      
      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as SpedFiscalMovement[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useSpedFiscalStats() {
  const { currentCompany } = useAuth();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  return useQuery({
    queryKey: ['sped-fiscal-stats', currentCompany?.id, currentYear, currentMonth],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const { data, error } = await supabase
        .from('sped_fiscal_movements')
        .select('operation_type, total_value, icms_value, pis_value, cofins_value, is_validated')
        .eq('company_id', currentCompany.id)
        .gte('document_date', startOfMonth);
      
      if (error) throw error;
      
      const entradas = data?.filter(m => m.operation_type === 'entrada') || [];
      const saidas = data?.filter(m => m.operation_type === 'saida') || [];
      const pendentes = data?.filter(m => !m.is_validated) || [];
      
      return {
        totalMovimentos: data?.length || 0,
        totalEntradas: entradas.reduce((sum, m) => sum + Number(m.total_value), 0),
        totalSaidas: saidas.reduce((sum, m) => sum + Number(m.total_value), 0),
        pendentesValidacao: pendentes.length,
        totalIcms: data?.reduce((sum, m) => sum + Number(m.icms_value), 0) || 0,
        totalPis: data?.reduce((sum, m) => sum + Number(m.pis_value), 0) || 0,
        totalCofins: data?.reduce((sum, m) => sum + Number(m.cofins_value), 0) || 0,
      };
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateSpedFiscalMovement() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<SpedFiscalMovement>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data: result, error } = await supabase
        .from('sped_fiscal_movements')
        .insert({ ...data, company_id: currentCompany.id } as never)
        .select()
        .single();
      
      if (error) throw error;
      return result as SpedFiscalMovement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sped-fiscal-movements'] });
      queryClient.invalidateQueries({ queryKey: ['sped-fiscal-stats'] });
      toast.success('Movimento fiscal criado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar movimento: ' + error.message);
    },
  });
}

export function useValidateSpedMovements() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('sped_fiscal_movements')
        .update({ is_validated: true, validation_errors: null })
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sped-fiscal-movements'] });
      queryClient.invalidateQueries({ queryKey: ['sped-fiscal-stats'] });
      toast.success('Movimentos validados');
    },
    onError: (error: Error) => {
      toast.error('Erro na validação: ' + error.message);
    },
  });
}
