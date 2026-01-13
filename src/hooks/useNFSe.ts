import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

// Use the database types directly
type NFSeInvoiceRow = Database['public']['Tables']['nfse_invoices']['Row'];
type NFSeEventRow = Database['public']['Tables']['nfse_events']['Row'];

export type NFSeInvoice = NFSeInvoiceRow;
export type NFSeEvent = NFSeEventRow;

export function useNFSeInvoices(filters?: { status?: string; dateFrom?: string; dateTo?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["nfse-invoices", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from("nfse_invoices")
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

export function useNFSeEvents(nfseId: string | null) {
  return useQuery({
    queryKey: ["nfse-events", nfseId],
    queryFn: async () => {
      if (!nfseId) return [];
      const { data, error } = await supabase
        .from("nfse_events")
        .select("*")
        .eq("invoice_id", nfseId)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!nfseId,
  });
}

export function useEmitNFSe() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (nfseId: string) => {
      const { data, error } = await supabase.functions.invoke("fiscal-emit", {
        body: {
          company_id: currentCompany?.id,
          document_type: "nfse",
          document_id: nfseId,
          action: "emit",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfse-invoices"] });
      toast.success("NFS-e enviada para autorização");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useCancelNFSe() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async ({ nfseId, reason }: { nfseId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke("fiscal-emit", {
        body: {
          company_id: currentCompany?.id,
          document_type: "nfse",
          document_id: nfseId,
          action: "cancel",
          justification: reason,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfse-invoices"] });
      toast.success("NFS-e cancelada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
