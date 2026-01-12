import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type SpedType = 'efd_icms_ipi' | 'efd_contribuicoes' | 'ecf' | 'ecd';
export type SpedStatus = 'pending' | 'processing' | 'completed' | 'error' | 'transmitted';

export const SPED_TYPE_LABELS: Record<SpedType, string> = {
  efd_icms_ipi: 'EFD ICMS/IPI',
  efd_contribuicoes: 'EFD Contribuições',
  ecf: 'ECF',
  ecd: 'ECD',
};

export const SPED_STATUS_LABELS: Record<SpedStatus, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  completed: 'Concluído',
  error: 'Erro',
  transmitted: 'Transmitido',
};

export const SPED_TYPE_DESCRIPTIONS: Record<SpedType, string> = {
  efd_icms_ipi: 'Escrituração Fiscal Digital de ICMS e IPI - Mensal',
  efd_contribuicoes: 'EFD PIS/COFINS - Mensal',
  ecf: 'Escrituração Contábil Fiscal - Anual',
  ecd: 'Escrituração Contábil Digital - Anual',
};

export function useSpedJobs(year?: number) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['sped-jobs', currentCompany?.id, year],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from('sped_jobs')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('reference_year', { ascending: false });
      if (year) query = query.eq('reference_year', year);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateSpedJob() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: { sped_type: SpedType; reference_year: number; reference_month?: number }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { error } = await supabase
        .from('sped_jobs')
        .insert({ ...data, company_id: currentCompany.id, status: 'pending' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sped-jobs'] });
      toast.success('Geração de SPED iniciada');
    },
  });
}
