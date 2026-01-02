import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Counterparty {
  id: string;
  company_id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  is_client: boolean;
  is_supplier: boolean;
  person_type: 'pf' | 'pj';
  legal_name: string | null;
  trade_name: string | null;
  ie: string | null;
  ie_is_exempt: boolean;
  im: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  delivery_same_as_billing: boolean;
  delivery_address_street: string | null;
  delivery_address_number: string | null;
  delivery_address_complement: string | null;
  delivery_address_neighborhood: string | null;
  delivery_address_city: string | null;
  delivery_address_state: string | null;
  delivery_address_zip: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  finance_contact_name: string | null;
  finance_contact_phone: string | null;
  finance_contact_email: string | null;
  nf_email: string | null;
  bank_code: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_agency_digit: string | null;
  bank_account: string | null;
  bank_account_digit: string | null;
  bank_account_type: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  payment_terms_payable: number | null;
  payment_terms_receivable: number | null;
  credit_limit: number | null;
  supplier_notes: string | null;
  client_notes: string | null;
  fiscal_ready: boolean;
  payment_ready: boolean;
  collection_ready: boolean;
  missing_fields_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook para buscar todos os parceiros (clientes e fornecedores)
 */
export function useCounterpartiesAll() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['counterparties-all', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from('counterparties')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name');

      if (error) throw error;
      return (data || []) as Counterparty[];
    },
    enabled: !!currentCompany?.id,
  });
}

/**
 * Hook para buscar apenas clientes (is_client = true)
 */
export function useClients() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['counterparties-clients', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from('counterparties')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_client', true)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data || []) as Counterparty[];
    },
    enabled: !!currentCompany?.id,
  });
}

/**
 * Hook para buscar apenas fornecedores (is_supplier = true)
 */
export function useSuppliers() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['counterparties-suppliers', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from('counterparties')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_supplier', true)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data || []) as Counterparty[];
    },
    enabled: !!currentCompany?.id,
  });
}

/**
 * Hook para buscar um parceiro específico por ID
 */
export function useCounterparty(id: string | null) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['counterparty', id],
    queryFn: async () => {
      if (!id || !currentCompany?.id) return null;

      const { data, error } = await supabase
        .from('counterparties')
        .select('*')
        .eq('id', id)
        .eq('company_id', currentCompany.id)
        .single();

      if (error) throw error;
      return data as Counterparty;
    },
    enabled: !!id && !!currentCompany?.id,
  });
}
