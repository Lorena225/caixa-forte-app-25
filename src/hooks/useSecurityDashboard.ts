import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SecurityStatus {
  company_id: string;
  company_name: string;
  total_tables: number;
  rls_enabled_tables: number;
  invalid_webhooks_24h: number;
  replay_attempts_24h: number;
  rate_limit_blocks_24h: number;
  dlq_pending: number;
  critical_events_24h: number;
}

export interface WebhookStatus {
  id: string;
  company_id: string;
  provider: string;
  external_event_id: string | null;
  received_at: string;
  signature_valid: boolean;
  replay_detected: boolean;
  status: string;
  correlation_id: string;
  error_message: string | null;
  processed_at: string | null;
  health_status: string;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  failure_reason: string | null;
  lockout_until: string | null;
  created_at: string;
}

export function useSecurityStatus() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ["security-status", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_security_status")
        .select("*")
        .eq("company_id", companyId!)
        .single();

      if (error) throw error;
      return data as SecurityStatus;
    },
    enabled: !!companyId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useWebhookStatus(limit = 50) {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ["webhook-status", companyId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_webhook_status")
        .select("*")
        .eq("company_id", companyId!)
        .order("received_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as WebhookStatus[];
    },
    enabled: !!companyId,
    refetchInterval: 15000,
  });
}

export function useRecentLoginAttempts(limit = 50) {
  return useQuery({
    queryKey: ["login-attempts", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_attempts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as LoginAttempt[];
    },
    refetchInterval: 30000,
  });
}

export function useRateLimitEvents(limit = 50) {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ["rate-limit-events", companyId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_limit_events")
        .select("*")
        .eq("company_id", companyId!)
        .eq("blocked", true)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });
}

export function useDLQItems() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ["dlq-items", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_dlq")
        .select("*")
        .eq("company_id", companyId!)
        .is("resolved_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });
}
