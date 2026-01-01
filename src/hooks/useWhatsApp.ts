import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useWhatsAppConnections() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["whatsapp-connections", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from("whatsapp_connections")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateWhatsAppConnection() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      phone_number: string;
      provider?: string;
      credentials_encrypted?: string;
    }) => {
      if (!currentCompany?.id) throw new Error("No company selected");

      const { data: connection, error } = await supabase
        .from("whatsapp_connections")
        .insert({
          company_id: currentCompany.id,
          phone_number: data.phone_number,
          provider: data.provider || "whatsapp_cloud",
          credentials_encrypted: data.credentials_encrypted || "",
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return connection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
    },
  });
}

export function useDeleteWhatsAppConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_connections")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
    },
  });
}
