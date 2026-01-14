import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CollectionRule {
  id: string;
  company_id: string;
  name: string;
  days_before_due: number | null;
  days_after_due: number | null;
  channel: string;
  template_id: string | null;
  is_active: boolean;
  created_at: string;
}

export function useCollectionRules() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["collection-rules", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("collection_rules")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as CollectionRule[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateCollectionRule() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: { 
      name: string; 
      channel: string;
      days_before_due?: number | null;
      days_after_due?: number | null;
      template_id?: string | null;
    }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { data: rule, error } = await supabase
        .from("collection_rules")
        .insert({
          company_id: currentCompany.id,
          name: data.name,
          channel: data.channel,
          days_before_due: data.days_before_due ?? null,
          days_after_due: data.days_after_due ?? null,
          template_id: data.template_id ?? null,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-rules"] });
      toast.success("Régua de cobrança criada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateCollectionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { 
      id: string; 
      name?: string; 
      channel?: string;
      days_before_due?: number | null;
      days_after_due?: number | null;
      template_id?: string | null;
      is_active?: boolean;
    }) => {
      const updateData: Record<string, any> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.channel !== undefined) updateData.channel = data.channel;
      if (data.days_before_due !== undefined) updateData.days_before_due = data.days_before_due;
      if (data.days_after_due !== undefined) updateData.days_after_due = data.days_after_due;
      if (data.template_id !== undefined) updateData.template_id = data.template_id;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      const { error } = await supabase
        .from("collection_rules")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-rules"] });
      toast.success("Régua atualizada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useDeleteCollectionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("collection_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-rules"] });
      toast.success("Régua excluída");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
