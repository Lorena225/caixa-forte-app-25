import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export interface AIDecision {
  id: string;
  company_id: string;
  inbox_id: string | null;
  ai_request_id: string | null;
  intent: string;
  proposed_actions_json: Json;
  confidence: number | null;
  risk_level: string | null;
  risk_reasons_json: Json | null;
  needs_confirmation: boolean | null;
  missing_fields_json: Json | null;
  ambiguous_matches_json: Json | null;
  status: string;
  expires_at: string | null;
  created_at: string;
}

export interface AIConfirmation {
  id: string;
  company_id: string;
  decision_id: string;
  state: string;
  confirmation_type: string | null;
  selected_option: number | null;
  notes: string | null;
  pin_verified: boolean | null;
  approved_at: string | null;
  approved_by_user_id: string | null;
  approved_by_phone: string | null;
  created_at: string;
}

export interface AIActionResult {
  id: string;
  company_id: string;
  decision_id: string;
  confirmation_id: string | null;
  status: string;
  executed_actions_json: Json;
  created_ids_json: Json | null;
  affected_tables_json: Json | null;
  can_rollback: boolean;
  rolled_back_at: string | null;
  error_json: Json | null;
  executed_at: string | null;
  created_at: string;
}

export function useAIDecisions(status?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["ai-decisions", currentCompany?.id, status],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from("ai_decisions")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AIDecision[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function usePendingDecisions() {
  return useAIDecisions("pending_confirmation");
}

export function useAIActionResults() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["ai-action-results", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from("ai_action_results")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AIActionResult[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useConfirmDecision() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async ({
      decision_id,
      selected_option,
      notes,
    }: {
      decision_id: string;
      selected_option?: number;
      notes?: string;
    }) => {
      if (!currentCompany?.id) throw new Error("No company selected");

      // Create confirmation
      const { data: confirmation, error: confError } = await supabase
        .from("ai_confirmations")
        .insert({
          company_id: currentCompany.id,
          decision_id,
          state: "approved",
          selected_option,
          notes,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (confError) throw confError;

      // Update decision status
      await supabase
        .from("ai_decisions")
        .update({ status: "confirmed" })
        .eq("id", decision_id);

      // Trigger execution via edge function
      const { error: execError } = await supabase.functions.invoke(
        "ai-execute-actions",
        {
          body: { decision_id, confirmation_id: confirmation.id },
        }
      );

      if (execError) throw execError;

      return confirmation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-decisions"] });
      queryClient.invalidateQueries({ queryKey: ["ai-action-results"] });
    },
  });
}

export function useRejectDecision() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async ({
      decision_id,
      notes,
    }: {
      decision_id: string;
      notes?: string;
    }) => {
      if (!currentCompany?.id) throw new Error("No company selected");

      const { data: confirmation, error } = await supabase
        .from("ai_confirmations")
        .insert({
          company_id: currentCompany.id,
          decision_id,
          state: "rejected",
          notes,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("ai_decisions")
        .update({ status: "rejected" })
        .eq("id", decision_id);

      return confirmation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-decisions"] });
    },
  });
}

export function useRollbackAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action_result_id: string) => {
      const { data, error } = await supabase.functions.invoke(
        "ai-rollback-action",
        {
          body: { action_result_id },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-action-results"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
