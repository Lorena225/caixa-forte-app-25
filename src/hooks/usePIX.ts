import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database, Json } from "@/integrations/supabase/types";

// Use the database types directly for better compatibility
type PIXProviderRow = Database['public']['Tables']['pix_providers']['Row'];
type PIXChargeRow = Database['public']['Tables']['pix_charges']['Row'];
type PIXEventRow = Database['public']['Tables']['pix_events']['Row'];

export type PIXProvider = PIXProviderRow;
export type PIXCharge = PIXChargeRow;
export type PIXEvent = PIXEventRow;

export function usePIXProviders() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["pix-providers", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("pix_providers")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function usePIXCharges(filters?: { status?: string; dateFrom?: string; dateTo?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["pix-charges", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from("pix_charges")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// PIX Events interface based on actual database schema
interface PIXEventDB {
  id: string;
  company_id: string;
  provider_key: string;
  event_id: string | null;
  txid: string | null;
  end_to_end_id: string | null;
  event_type: string | null;
  status: string | null;
  amount: number | null;
  raw_json_sanitized: Json | null;
  signature_valid: boolean | null;
  is_duplicate: boolean | null;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export function usePIXEvents(txid: string | null) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ["pix-events", txid],
    queryFn: async (): Promise<PIXEventDB[]> => {
      if (!txid || !currentCompany?.id) return [];
      
      // Query pix_events by txid since pix_charge_id doesn't exist
      const { data, error } = await supabase
        .from("pix_events")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("txid", txid)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data ?? []) as unknown as PIXEventDB[];
    },
    enabled: !!txid && !!currentCompany?.id,
  });
}

export function useCreatePIXCharge() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      amount: number;
      description?: string;
      payer_document?: string;
      payer_name?: string;
      expiration_minutes?: number;
      transaction_id?: string;
    }) => {
      const { data: result, error } = await supabase.functions.invoke("pix-create-charge", {
        body: {
          company_id: currentCompany?.id,
          ...data,
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pix-charges"] });
      toast.success("Cobrança PIX criada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useCancelPIXCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chargeId: string) => {
      const { error } = await supabase
        .from("pix_charges")
        .update({ status: "cancelled" })
        .eq("id", chargeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pix-charges"] });
      toast.success("Cobrança PIX cancelada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useCreatePIXProvider() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      provider_name: string;
      provider_key: string;
    }) => {
      const { error } = await supabase.from("pix_providers").insert({
        company_id: currentCompany?.id,
        ...data,
        is_enabled: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pix-providers"] });
      toast.success("Provedor PIX cadastrado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
