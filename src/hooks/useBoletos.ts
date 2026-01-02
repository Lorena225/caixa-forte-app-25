import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Boleto {
  id: string;
  company_id: string;
  transaction_id: string | null;
  agreement_id: string | null;
  our_number: string;
  your_number: string | null;
  amount: number;
  due_date: string;
  issue_date: string;
  status: string;
  barcode: string | null;
  digitable_line: string | null;
  pix_code: string | null;
  pdf_url: string | null;
  registration_status: string | null;
  paid_at: string | null;
  paid_date: string | null;
  amount_paid: number | null;
  created_at: string;
}

export interface BoletoEvent {
  id: string;
  boleto_id: string;
  company_id: string;
  event_type: string;
  event_date: string;
  amount: number | null;
  return_code: string | null;
  return_message: string | null;
  source: string | null;
  created_at: string;
}

export function useBoletos(filters?: { status?: string; dateFrom?: string; dateTo?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["boletos", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from("boletos")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("due_date", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte("due_date", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("due_date", filters.dateTo);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data as Boleto[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useBoletoEvents(boletoId: string | null) {
  return useQuery({
    queryKey: ["boleto-events", boletoId],
    queryFn: async () => {
      if (!boletoId) return [];
      const { data, error } = await supabase
        .from("boleto_events")
        .select("*")
        .eq("boleto_id", boletoId)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data as BoletoEvent[];
    },
    enabled: !!boletoId,
  });
}

export function useCancelBoleto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boletoId: string) => {
      const { error } = await supabase
        .from("boletos")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", boletoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boletos"] });
      toast.success("Boleto cancelado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
