import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CreditProtectionRequest {
  id: string;
  company_id: string;
  counterparty_id: string | null;
  transaction_id: string | null;
  customer_name: string;
  customer_document: string;
  amount: number;
  days_overdue: number;
  status: 'pending' | 'sent' | 'registered' | 'removed' | 'cancelled';
  sent_at: string | null;
  registered_at: string | null;
  removed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCreditProtectionRequests(filters?: { status?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["credit-protection", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from("credit_protection_requests")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data as CreditProtectionRequest[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateCreditProtection() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      customer_name: string;
      customer_document: string;
      amount: number;
      days_overdue: number;
      counterparty_id?: string;
      transaction_id?: string;
      notes?: string;
    }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { data: request, error } = await supabase
        .from("credit_protection_requests")
        .insert({
          company_id: currentCompany.id,
          customer_name: data.customer_name,
          customer_document: data.customer_document,
          amount: data.amount,
          days_overdue: data.days_overdue,
          counterparty_id: data.counterparty_id || null,
          transaction_id: data.transaction_id || null,
          notes: data.notes || null,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-protection"] });
      toast.success("Solicitação de negativação criada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useSendToNegativation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("credit_protection_requests")
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-protection"] });
      toast.success("Enviado para negativação");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useRemoveNegativation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("credit_protection_requests")
        .update({
          status: 'removed',
          removed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-protection"] });
      toast.success("Negativação baixada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useBulkNegativation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("credit_protection_requests")
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-protection"] });
      toast.success("Negativações enviadas em lote");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
