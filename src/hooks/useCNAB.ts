import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CNABAgreement {
  id: string;
  company_id: string;
  bank_account_id: string | null;
  name: string;
  bank_code: string;
  agreement_number: string;
  wallet_code: string | null;
  wallet_variation: string | null;
  layout: string;
  operation_type: string | null;
  service_type: string | null;
  transmission_code: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CNABRemittance {
  id: string;
  company_id: string;
  agreement_id: string;
  remittance_type: string;
  file_sequence: number;
  record_count: number;
  total_amount: number;
  status: string;
  file_content: string | null;
  generated_at: string;
  sent_at: string | null;
  error_message: string | null;
}

export function useCNABAgreements() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["cnab-agreements", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("cnab_agreements")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CNABAgreement[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCNABRemittances() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["cnab-remittances", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("cnab_remittances")
        .select("*, cnab_agreements(name, agreement_number)")
        .eq("company_id", currentCompany.id)
        .order("generated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateCNABAgreement() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<CNABAgreement, 'id' | 'company_id' | 'created_at'>) => {
      if (!currentCompany?.id) throw new Error("No company selected");
      const { error } = await supabase.from("cnab_agreements").insert({
        ...data,
        company_id: currentCompany.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cnab-agreements"] });
      toast.success("Convênio CNAB criado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateCNABAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CNABAgreement> & { id: string }) => {
      const { error } = await supabase
        .from("cnab_agreements")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cnab-agreements"] });
      toast.success("Convênio atualizado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
