import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CardMerchant {
  id: string;
  company_id: string;
  name: string;
  merchant_type: string;
  merchant_id: string | null;
  provider: string | null;
  default_mdr_credit: number | null;
  default_mdr_debit: number | null;
  default_mdr_installment: number | null;
  anticipation_rate: number | null;
  settlement_wallet_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CardReceivable {
  id: string;
  company_id: string;
  sale_id: string;
  installment_number: number;
  gross_amount: number;
  mdr_amount: number;
  net_amount: number;
  expected_date: string;
  settlement_date: string | null;
  status: string;
  anticipated_at: string | null;
  anticipation_rate: number | null;
  anticipation_cost: number | null;
  anticipated_amount: number | null;
}

export interface CardSettlement {
  id: string;
  company_id: string;
  merchant_id: string;
  settlement_date: string;
  gross_amount: number;
  mdr_amount: number;
  anticipation_cost: number;
  fee_amount: number;
  adjustment_amount: number;
  net_amount: number;
  receivable_count: number;
  status: string;
  is_reconciled: boolean;
}

export function useCardMerchants() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["card-merchants", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("card_merchants")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("name");
      if (error) throw error;
      return data as CardMerchant[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCardReceivables(filters?: { status?: string; merchantId?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["card-receivables", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from("card_receivables")
        .select("*, card_sales(card_brand, card_type, merchant_id)")
        .eq("company_id", currentCompany.id)
        .order("expected_date", { ascending: true });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCardSettlements() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["card-settlements", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("card_settlements")
        .select("*, card_merchants(name)")
        .eq("company_id", currentCompany.id)
        .order("settlement_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateCardMerchant() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<CardMerchant, 'id' | 'company_id' | 'created_at'>) => {
      if (!currentCompany?.id) throw new Error("No company selected");
      const { error } = await supabase.from("card_merchants").insert({
        ...data,
        company_id: currentCompany.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-merchants"] });
      toast.success("Credenciadora criada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateCardMerchant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CardMerchant> & { id: string }) => {
      const { error } = await supabase
        .from("card_merchants")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-merchants"] });
      toast.success("Credenciadora atualizada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
