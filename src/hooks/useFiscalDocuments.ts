import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useFiscalDocuments() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['fiscal-documents', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('fiscal_documents')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('issue_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useFiscalDocumentStats() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['fiscal-document-stats', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const { data, error } = await supabase
        .from('fiscal_documents')
        .select('document_model, status, total_nf')
        .eq('company_id', currentCompany.id);
      if (error) throw error;

      return {
        totalDocuments: data?.length || 0,
        totalAmount: data?.reduce((sum, d) => sum + Number(d.total_nf || 0), 0) || 0,
        authorized: data?.filter(d => d.status === 'autorizada').length || 0,
        pending: data?.filter(d => d.status === 'pendente' || d.status === 'rascunho').length || 0,
      };
    },
    enabled: !!currentCompany?.id,
  });
}

export const DOCUMENT_MODEL_LABELS: Record<string, string> = {
  '55': 'NF-e',
  '65': 'NFC-e',
  'nfse': 'NFS-e',
  '57': 'CT-e',
  '58': 'MDF-e',
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  pendente: 'Pendente',
  autorizada: 'Autorizada',
  cancelada: 'Cancelada',
};
