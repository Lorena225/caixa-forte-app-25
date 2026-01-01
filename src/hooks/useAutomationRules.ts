import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export interface AutomationRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  rule_type: string;
  pattern: string;
  pattern_type: string;
  conditions_json: Json | null;
  action_json: Json;
  priority: number;
  is_active: boolean;
  hit_count: number;
  last_hit_at: string | null;
  source: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useAutomationRules() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["automation-rules", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("priority", { ascending: true });

      if (error) throw error;
      return data as AutomationRule[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateAutomationRule() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      rule_type: string;
      pattern: string;
      pattern_type?: string;
      conditions_json?: Json;
      action_json: Json;
      priority?: number;
    }) => {
      if (!currentCompany?.id) throw new Error("No company selected");

      const { data: rule, error } = await supabase
        .from("automation_rules")
        .insert({
          company_id: currentCompany.id,
          name: data.name,
          description: data.description,
          rule_type: data.rule_type,
          pattern: data.pattern,
          pattern_type: data.pattern_type || "contains",
          conditions_json: data.conditions_json,
          action_json: data.action_json,
          priority: data.priority || 100,
          is_active: true,
          source: "manual",
        })
        .select()
        .single();

      if (error) throw error;
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    },
  });
}

export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      pattern?: string;
      pattern_type?: string;
      conditions_json?: Json;
      action_json?: Json;
      priority?: number;
      is_active?: boolean;
    }) => {
      const { data: rule, error } = await supabase
        .from("automation_rules")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    },
  });
}

export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("automation_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    },
  });
}
