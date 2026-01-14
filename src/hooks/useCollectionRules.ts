import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CollectionStep {
  days: number;
  action: 'email' | 'whatsapp' | 'sms' | 'telefone';
  template: string;
  message: string;
}

export interface CollectionRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  steps: CollectionStep[];
  created_at: string;
  updated_at: string;
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
      return (data || []).map(rule => ({
        ...rule,
        steps: (rule.steps as unknown as CollectionStep[]) || []
      })) as CollectionRule[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateCollectionRule() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; steps: CollectionStep[] }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { data: rule, error } = await supabase
        .from("collection_rules")
        .insert({
          company_id: currentCompany.id,
          name: data.name,
          description: data.description || null,
          steps: data.steps as unknown as any,
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
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; steps?: CollectionStep[]; is_active?: boolean }) => {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.steps !== undefined) updateData.steps = data.steps as unknown as any;
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
