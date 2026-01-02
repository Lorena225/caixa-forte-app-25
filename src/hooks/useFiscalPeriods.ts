import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FiscalPeriod {
  id: string;
  company_id: string;
  period_year: number;
  period_month: number;
  status: string;
  opened_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
}

export interface PeriodLock {
  id: string;
  company_id: string;
  period_id: string;
  module: string;
  locked_at: string | null;
  locked_by: string | null;
  unlocked_at: string | null;
  unlocked_by: string | null;
  unlock_reason: string | null;
  created_at: string;
}

export function useFiscalPeriods() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["fiscal-periods", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("fiscal_periods")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });
      if (error) throw error;
      return data as FiscalPeriod[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function usePeriodLocks(periodId: string | null) {
  return useQuery({
    queryKey: ["period-locks", periodId],
    queryFn: async () => {
      if (!periodId) return [];
      const { data, error } = await supabase
        .from("period_locks")
        .select("*")
        .eq("period_id", periodId);
      if (error) throw error;
      return data as PeriodLock[];
    },
    enabled: !!periodId,
  });
}

export function useCreateFiscalPeriod() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: { year: number; month: number }) => {
      if (!currentCompany?.id) throw new Error("No company selected");
      const { error } = await supabase.from("fiscal_periods").insert({
        company_id: currentCompany.id,
        period_year: data.year,
        period_month: data.month,
        status: "open",
        opened_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-periods"] });
      toast.success("Período fiscal criado");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar período: ${error.message}`);
    },
  });
}

export function useCloseFiscalPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (periodId: string) => {
      const { error } = await supabase
        .from("fiscal_periods")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
        })
        .eq("id", periodId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-periods"] });
      toast.success("Período fechado");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao fechar período: ${error.message}`);
    },
  });
}

export function useTogglePeriodLock() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async ({ periodId, module, lock }: { periodId: string; module: string; lock: boolean }) => {
      if (!currentCompany?.id) throw new Error("No company selected");
      
      // Check if lock exists
      const { data: existing } = await supabase
        .from("period_locks")
        .select("id")
        .eq("period_id", periodId)
        .eq("module", module)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("period_locks")
          .update({
            locked_at: lock ? new Date().toISOString() : null,
            unlocked_at: lock ? null : new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("period_locks").insert({
          company_id: currentCompany.id,
          period_id: periodId,
          module,
          locked_at: lock ? new Date().toISOString() : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["period-locks"] });
      toast.success("Trava atualizada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
