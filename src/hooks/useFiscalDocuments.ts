import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FiscalDocumentWithCounterparty {
  id: string;
  company_id: string;
  document_model: string;
  document_number: string;
  document_series: string | null;
  issue_date: string;
  status: string | null;
  access_key: string | null;
  total_nf: number;
  total_iss: number | null;
  total_icms: number | null;
  total_pis: number | null;
  total_cofins: number | null;
  counterparty_id: string | null;
  operation_type: string;
  notes: string | null;
  cfop?: string;
  // Joined fields
  recipient_name: string | null;
  recipient_document: string | null;
}

export function useFiscalDocuments() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['fiscal-documents', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('fiscal_documents')
        .select(`
          id,
          company_id,
          document_model,
          document_number,
          document_series,
          issue_date,
          status,
          access_key,
          total_nf,
          total_iss,
          total_icms,
          total_pis,
          total_cofins,
          counterparty_id,
          operation_type,
          notes,
          counterparties:counterparty_id (
            name,
            document
          )
        `)
        .eq('company_id', currentCompany.id)
        .order('issue_date', { ascending: false });
      if (error) throw error;
      
      // Transform to include recipient info
      return (data || []).map((doc: any) => ({
        ...doc,
        recipient_name: doc.counterparties?.name || null,
        recipient_document: doc.counterparties?.document || null,
        cfop: doc.operation_type || null,
      })) as FiscalDocumentWithCounterparty[];
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
