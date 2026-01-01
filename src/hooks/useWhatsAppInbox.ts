import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useWhatsAppInbox() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["whatsapp-inbox", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from("whatsapp_inbox")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useWhatsAppContacts() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["whatsapp-contacts", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from("whatsapp_contacts")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("display_name", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      display_name,
      is_allowed,
      is_blocked,
    }: {
      id: string;
      display_name?: string;
      is_allowed?: boolean;
      is_blocked?: boolean;
    }) => {
      const { data: contact, error } = await supabase
        .from("whatsapp_contacts")
        .update({ display_name, is_allowed, is_blocked })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-contacts"] });
    },
  });
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      connection_id,
      to_phone,
      message,
    }: {
      connection_id: string;
      to_phone: string;
      message: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-send-message",
        {
          body: { connection_id, to_phone, message },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-inbox"] });
    },
  });
}
