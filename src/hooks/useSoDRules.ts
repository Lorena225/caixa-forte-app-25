import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SoDRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  rule_type: string | null;
  permission_a: string | null;
  permission_b: string | null;
  role_a: string | null;
  role_b: string | null;
  amount_threshold: number | null;
  entity_type: string | null;
  enforcement_mode: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SoDViolation {
  id: string;
  company_id: string;
  rule_id: string;
  user_id: string;
  entity_type: string | null;
  entity_id: string | null;
  action_attempted: string | null;
  enforcement_result: string | null;
  override_by: string | null;
  override_reason: string | null;
  created_at: string;
}

export interface UserAmountLimit {
  id: string;
  company_id: string;
  user_id: string;
  entity_type: string;
  single_limit: number | null;
  daily_limit: number | null;
  monthly_limit: number | null;
  requires_approval_above: number | null;
  is_active: boolean;
  created_at: string;
}

export function useSoDRules() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["sod-rules", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("sod_rules")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("name");
      if (error) throw error;
      return data as SoDRule[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useSoDViolations() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["sod-violations", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("sod_violations")
        .select("*, sod_rules(name, enforcement_mode)")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useUserAmountLimits() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["user-amount-limits", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("user_amount_limits")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UserAmountLimit[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateSoDRule() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<SoDRule, 'id' | 'company_id' | 'created_at'>) => {
      if (!currentCompany?.id) throw new Error("No company selected");
      const { error } = await supabase.from("sod_rules").insert({
        ...data,
        company_id: currentCompany.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sod-rules"] });
      toast.success("Regra SoD criada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateSoDRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<SoDRule> & { id: string }) => {
      const { error } = await supabase
        .from("sod_rules")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sod-rules"] });
      toast.success("Regra atualizada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useResolveSoDViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("sod_violations")
        .update({
          enforcement_result: "overridden",
          override_reason: reason,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sod-violations"] });
      toast.success("Violação resolvida");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useCreateUserAmountLimit() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<UserAmountLimit, 'id' | 'company_id' | 'created_at'>) => {
      if (!currentCompany?.id) throw new Error("No company selected");
      const { error } = await supabase.from("user_amount_limits").insert({
        ...data,
        company_id: currentCompany.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-amount-limits"] });
      toast.success("Limite criado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateUserAmountLimit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<UserAmountLimit> & { id: string }) => {
      const { error } = await supabase
        .from("user_amount_limits")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-amount-limits"] });
      toast.success("Limite atualizado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
