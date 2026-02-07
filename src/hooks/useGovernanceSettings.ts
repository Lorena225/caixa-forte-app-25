import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Types
export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface UserWithAccess {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  last_login_at: string | null;
  last_login_ip: string | null;
  mfa_enabled: boolean;
  login_count: number;
  created_at: string;
}

export interface IntegrationCredential {
  id: string;
  integration_key: string;
  status: string;
  last_used_at: string | null;
  created_at: string;
}

export interface IntegrationHealthCheck {
  id: string;
  integration_key: string;
  status: "online" | "offline" | "auth_error" | "timeout" | "unknown";
  response_time_ms: number | null;
  error_message: string | null;
  last_checked_at: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  username: string | null;
  table_name: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  ip_address: string | null;
}

export interface DigitalCertificate {
  id: string;
  certificate_name: string;
  certificate_type: string;
  serial_number: string | null;
  issuer: string | null;
  subject: string | null;
  valid_from: string | null;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

// Hook: Roles
export function useRoles() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["roles", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Role[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook: Permissions
export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("resource, action");

      if (error) throw error;
      return data as Permission[];
    },
  });
}

// Hook: Users with access info
export function useUsersWithAccess() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["users-with-access", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from("company_users")
        .select(`
          id,
          user_id,
          role,
          created_at,
          user_profiles!inner(
            email,
            full_name,
            last_login_at,
            last_login_ip,
            mfa_enabled,
            login_count
          )
        `)
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        email: item.user_profiles?.email || "N/A",
        full_name: item.user_profiles?.full_name || null,
        role: item.role,
        last_login_at: item.user_profiles?.last_login_at || null,
        last_login_ip: item.user_profiles?.last_login_ip || null,
        mfa_enabled: item.user_profiles?.mfa_enabled || false,
        login_count: item.user_profiles?.login_count || 0,
        created_at: item.created_at,
      })) as UserWithAccess[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook: Integration Credentials
export function useIntegrationCredentials() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["integration-credentials", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from("integration_credentials")
        .select("id, integration_key, status, last_used_at, created_at")
        .eq("company_id", currentCompany.id)
        .order("integration_key");

      if (error) throw error;
      return data as IntegrationCredential[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook: Integration Health Checks
export function useIntegrationHealthChecks() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["integration-health-checks", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      // Get the most recent health check for each integration
      const { data, error } = await supabase
        .from("integration_health_checks")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("last_checked_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Deduplicate by integration_key, keeping only the most recent
      const latest = new Map<string, IntegrationHealthCheck>();
      for (const check of data || []) {
        if (!latest.has(check.integration_key)) {
          latest.set(check.integration_key, check as IntegrationHealthCheck);
        }
      }

      return Array.from(latest.values());
    },
    enabled: !!currentCompany?.id,
  });
}

// Mutation: Run Health Check
export function useRunHealthCheck() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (integrationKey: string) => {
      if (!currentCompany?.id) throw new Error("No company selected");

      const { data, error } = await supabase.functions.invoke("integration-health-check", {
        body: {
          company_id: currentCompany.id,
          integration_key: integrationKey,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["integration-health-checks"] });
      
      if (data.status === "online") {
        toast.success(`${data.integration_key}: Online (${data.response_time_ms}ms)`);
      } else if (data.status === "auth_error") {
        toast.error(`${data.integration_key}: Erro de autenticação`);
      } else {
        toast.warning(`${data.integration_key}: ${data.message}`);
      }
    },
    onError: (error) => {
      toast.error(`Erro ao testar integração: ${error.message}`);
    },
  });
}

// Hook: Audit Logs
export function useAuditLogs(filters?: { table_name?: string; action?: string; limit?: number }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["audit-logs", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from("audit_logs")
        .select("id, user_id, username, table_name, action, old_data, new_data, created_at, ip_address")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.table_name) {
        query = query.eq("table_name", filters.table_name);
      }
      if (filters?.action) {
        query = query.eq("action", filters.action);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook: Digital Certificates
export function useDigitalCertificates() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["digital-certificates", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from("digital_certificates")
        .select("id, certificate_name, certificate_type, serial_number, issuer, subject, valid_from, valid_until, is_active, created_at")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DigitalCertificate[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Mutation: Check Record Dependencies (soft delete)
export function useCheckRecordDependencies() {
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async ({ tableName, recordId }: { tableName: string; recordId: string }) => {
      if (!currentCompany?.id) throw new Error("No company selected");

      const { data, error } = await supabase.rpc("check_record_dependencies", {
        p_table_name: tableName,
        p_record_id: recordId,
        p_company_id: currentCompany.id,
      });

      if (error) throw error;
      return data as {
        has_dependencies: boolean;
        dependencies: Array<{ table: string; count: number }>;
        can_delete: boolean;
        can_archive: boolean;
      };
    },
  });
}

// Mutation: Archive Record
export function useArchiveRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tableName, recordId }: { tableName: string; recordId: string }) => {
      const { error } = await supabase
        .from(tableName as any)
        .update({ 
          archived_at: new Date().toISOString(),
          is_active: false 
        })
        .eq("id", recordId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.tableName] });
      toast.success("Registro arquivado com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao arquivar: ${error.message}`);
    },
  });
}
