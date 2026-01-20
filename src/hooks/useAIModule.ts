import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

// =====================================================
// TIPOS
// =====================================================

export interface AILog {
  id: string;
  company_id: string;
  user_id: string | null;
  agent_type: 'whatsapp' | 'monitor' | 'analyst';
  origin: string;
  input_raw: Json | null;
  input_text: string | null;
  interpretation: Json | null;
  action_executed: Json | null;
  status: string;
  reference_entity_type: string | null;
  reference_entity_id: string | null;
  latency_ms: number | null;
  tokens_used: number | null;
  cost_estimate: number | null;
  error_message: string | null;
  created_at: string;
}

export interface AIWhatsAppMessage {
  id: string;
  company_id: string;
  connection_id: string | null;
  phone_sender: string;
  phone_e164: string | null;
  message_text: string | null;
  message_type: string;
  attachments_json: Json;
  mapped_user_id: string | null;
  mapped_counterparty_id: string | null;
  suggested_action: Json | null;
  action_status: string;
  executed_at: string | null;
  executed_by: string | null;
  ai_log_id: string | null;
  confidence_score: number | null;
  created_at: string;
}

export interface AIMonitorAlert {
  id: string;
  company_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message_summary: string;
  details_json: Json | null;
  suggested_actions: Json | null;
  reference_entity_type: string | null;
  reference_entity_id: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  dismissed_at: string | null;
  dismissed_by: string | null;
  expires_at: string | null;
  ai_log_id: string | null;
  created_at: string;
}

export interface AIAnalystConversation {
  id: string;
  company_id: string;
  user_id: string;
  title: string | null;
  is_archived: boolean;
  last_message_at: string;
  created_at: string;
}

export interface AIAnalystMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  content_type: string;
  metadata_json: Json | null;
  query_executed: string | null;
  ai_log_id: string | null;
  created_at: string;
}

export interface AISettingsExtended {
  company_id: string;
  enabled: boolean;
  autopilot_mode: string;
  whatsapp_provider: string | null;
  whatsapp_webhook_url: string | null;
  default_ai_model: string | null;
  risk_tolerance: string | null;
  agent_whatsapp_enabled: boolean | null;
  agent_monitor_enabled: boolean | null;
  agent_analyst_enabled: boolean | null;
  monitor_alert_cooldown_minutes: number | null;
  monitor_digest_enabled: boolean | null;
  monitor_digest_time: string | null;
  high_risk_amount_limit: number | null;
  require_pin_for_high_risk: boolean;
  allow_auto_settle: boolean;
  allow_auto_create_counterparty: boolean;
  allow_auto_create_and_settle: boolean;
}

// =====================================================
// HOOKS - AI SETTINGS ESTENDIDOS
// =====================================================

export function useAISettingsExtended() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["ai-settings-extended", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;

      const { data, error } = await supabase
        .from("ai_company_settings")
        .select("*")
        .eq("company_id", currentCompany.id)
        .maybeSingle();

      if (error) throw error;
      return data as AISettingsExtended | null;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useUpdateAISettingsExtended() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<AISettingsExtended>) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      const { error } = await supabase
        .from("ai_company_settings")
        .upsert({
          company_id: currentCompany.id,
          ...settings,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings-extended"] });
      queryClient.invalidateQueries({ queryKey: ["ai-company-settings"] });
    },
  });
}

// =====================================================
// HOOKS - AI LOGS
// =====================================================

export function useAILogs(filters?: { agent_type?: string; status?: string; limit?: number }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["ai-logs", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from("ai_logs")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (filters?.agent_type) {
        query = query.eq("agent_type", filters.agent_type);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AILog[];
    },
    enabled: !!currentCompany?.id,
  });
}

// =====================================================
// HOOKS - WHATSAPP MESSAGES
// =====================================================

export function useAIWhatsAppMessages(filters?: { status?: string; limit?: number }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["ai-whatsapp-messages", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from("ai_whatsapp_messages")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("action_status", filters.status);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AIWhatsAppMessage[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useApproveWhatsAppAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("ai_whatsapp_messages")
        .update({
          action_status: "approved",
          executed_by: user?.id,
        })
        .eq("id", messageId);

      if (error) throw error;

      // Trigger execution via edge function
      const { error: execError } = await supabase.functions.invoke("ai-whatsapp-execute", {
        body: { message_id: messageId },
      });

      if (execError) throw execError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-whatsapp-messages"] });
    },
  });
}

export function useRejectWhatsAppAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("ai_whatsapp_messages")
        .update({
          action_status: "rejected",
          executed_by: user?.id,
        })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-whatsapp-messages"] });
    },
  });
}

// =====================================================
// HOOKS - MONITOR ALERTS
// =====================================================

export function useAIMonitorAlerts(filters?: { 
  severity?: string; 
  is_read?: boolean; 
  alert_type?: string;
  limit?: number 
}) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["ai-monitor-alerts", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from("ai_monitor_alerts")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false });

      if (filters?.severity) {
        query = query.eq("severity", filters.severity);
      }
      if (filters?.is_read !== undefined) {
        query = query.eq("is_read", filters.is_read);
      }
      if (filters?.alert_type) {
        query = query.eq("alert_type", filters.alert_type);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(50);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AIMonitorAlert[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("ai_monitor_alerts")
        .update({ is_read: true })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-monitor-alerts"] });
    },
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("ai_monitor_alerts")
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
          dismissed_by: user?.id,
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-monitor-alerts"] });
    },
  });
}

// =====================================================
// HOOKS - ANALYST CONVERSATIONS
// =====================================================

export function useAnalystConversations() {
  const { currentCompany, user } = useAuth();

  return useQuery({
    queryKey: ["ai-analyst-conversations", currentCompany?.id, user?.id],
    queryFn: async () => {
      if (!currentCompany?.id || !user?.id) return [];

      const { data, error } = await supabase
        .from("ai_analyst_conversations")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      return data as AIAnalystConversation[];
    },
    enabled: !!currentCompany?.id && !!user?.id,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (title?: string) => {
      if (!currentCompany?.id || !user?.id) throw new Error("Sessão inválida");

      const { data, error } = await supabase
        .from("ai_analyst_conversations")
        .insert({
          company_id: currentCompany.id,
          user_id: user.id,
          title: title || "Nova conversa",
        })
        .select()
        .single();

      if (error) throw error;
      return data as AIAnalystConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-analyst-conversations"] });
    },
  });
}

export function useAnalystMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["ai-analyst-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("ai_analyst_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as AIAnalystMessage[];
    },
    enabled: !!conversationId,
  });
}

export function useSendAnalystMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => {
      // Insert user message
      const { error: msgError } = await supabase
        .from("ai_analyst_messages")
        .insert({
          conversation_id: conversationId,
          role: "user",
          content,
        });

      if (msgError) throw msgError;

      // Call AI edge function
      const { data, error: aiError } = await supabase.functions.invoke("ai-analyst-chat", {
        body: { conversation_id: conversationId, message: content },
      });

      if (aiError) throw aiError;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-analyst-messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["ai-analyst-conversations"] });
    },
  });
}

// =====================================================
// HOOKS - ESTATÍSTICAS
// =====================================================

export function useAIAlertsSummary() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["ai-alerts-summary", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;

      const { data, error } = await supabase
        .from("ai_monitor_alerts")
        .select("severity, is_read, is_dismissed")
        .eq("company_id", currentCompany.id)
        .eq("is_dismissed", false);

      if (error) throw error;

      const summary = {
        unread_count: data.filter(a => !a.is_read).length,
        critical_count: data.filter(a => a.severity === "critical").length,
        warning_count: data.filter(a => a.severity === "warning").length,
        total_count: data.length,
      };

      return summary;
    },
    enabled: !!currentCompany?.id,
    refetchInterval: 60000, // Atualiza a cada minuto
  });
}
