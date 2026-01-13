import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

// Use the database types directly
type NFeInvoiceRow = Database['public']['Tables']['nfe_invoices']['Row'];
type NFeItemRow = Database['public']['Tables']['nfe_items']['Row'];
type NFeEventRow = Database['public']['Tables']['nfe_events']['Row'];

export type NFeInvoice = NFeInvoiceRow;
export type NFeItem = NFeItemRow;
export type NFeEvent = NFeEventRow;

export function useNFeInvoices(filters?: { status?: string; dateFrom?: string; dateTo?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["nfe-invoices", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from("nfe_invoices")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("issue_date", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte("issue_date", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("issue_date", filters.dateTo);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useNFeItems(nfeId: string | null) {
  return useQuery({
    queryKey: ["nfe-items", nfeId],
    queryFn: async () => {
      if (!nfeId) return [];
      const { data, error } = await supabase
        .from("nfe_items")
        .select("*")
        .eq("invoice_id", nfeId)
        .order("item_number", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!nfeId,
  });
}

export function useNFeEvents(nfeId: string | null) {
  return useQuery({
    queryKey: ["nfe-events", nfeId],
    queryFn: async () => {
      if (!nfeId) return [];
      const { data, error } = await supabase
        .from("nfe_events")
        .select("*")
        .eq("invoice_id", nfeId)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!nfeId,
  });
}

export function useEmitNFe() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (nfeId: string) => {
      const { data, error } = await supabase.functions.invoke("fiscal-emit", {
        body: {
          company_id: currentCompany?.id,
          document_type: "nfe",
          document_id: nfeId,
          action: "emit",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfe-invoices"] });
      toast.success("NF-e enviada para autorização");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useCancelNFe() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async ({ nfeId, justification }: { nfeId: string; justification: string }) => {
      const { data, error } = await supabase.functions.invoke("fiscal-emit", {
        body: {
          company_id: currentCompany?.id,
          document_type: "nfe",
          document_id: nfeId,
          action: "cancel",
          justification,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfe-invoices"] });
      toast.success("NF-e cancelada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useCorrectNFe() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async ({ nfeId, correction }: { nfeId: string; correction: string }) => {
      const { data, error } = await supabase.functions.invoke("fiscal-emit", {
        body: {
          company_id: currentCompany?.id,
          document_type: "nfe",
          document_id: nfeId,
          action: "correct",
          correction,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfe-invoices"] });
      toast.success("Carta de correção enviada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
