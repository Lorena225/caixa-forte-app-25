import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useBankStatementImports() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["bank-statement-imports", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from("bank_statement_imports")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useReconciliationSuggestions() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["reconciliation-suggestions", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from("reconciliation_suggestions")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("score", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useApproveReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestion_id: string) => {
      const { data: suggestion, error: fetchError } = await supabase
        .from("reconciliation_suggestions")
        .select("*")
        .eq("id", suggestion_id)
        .single();

      if (fetchError) throw fetchError;

      // Update suggestion as selected
      await supabase
        .from("reconciliation_suggestions")
        .update({ is_selected: true })
        .eq("id", suggestion_id);

      // Mark statement line as reconciled
      await supabase
        .from("bank_statement_lines")
        .update({ is_reconciled: true, reconciled_at: new Date().toISOString() })
        .eq("id", suggestion.statement_line_id);

      return suggestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useRunReconciliation() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (params?: { statement_id?: string; wallet_id?: string }) => {
      if (!currentCompany?.id) throw new Error("No company selected");

      const { data, error } = await supabase.functions.invoke("reconcile-engine", {
        body: { company_id: currentCompany.id, ...params },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-suggestions"] });
    },
  });
}
