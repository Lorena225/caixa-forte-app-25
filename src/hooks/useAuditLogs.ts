import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Json } from "@/integrations/supabase/types";

export interface AuditLog {
  id: string;
  company_id: string;
  table_name: string;
  record_id: string | null;
  action: string;
  old_data: Json | null;
  new_data: Json | null;
  user_id: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  table_name?: string;
  action?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

export function useAuditLogs(filters?: AuditLogFilters) {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  
  return useQuery({
    queryKey: ["audit-logs", companyId, filters],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(200);
      
      if (filters?.table_name) {
        query = query.eq("table_name", filters.table_name);
      }
      if (filters?.action) {
        query = query.eq("action", filters.action);
      }
      if (filters?.user_id) {
        query = query.eq("user_id", filters.user_id);
      }
      if (filters?.date_from) {
        query = query.gte("created_at", filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte("created_at", filters.date_to);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!companyId,
  });
}

export function useAuditLogTables() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  
  return useQuery({
    queryKey: ["audit-log-tables", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("table_name")
        .eq("company_id", companyId!)
        .limit(1000);
      
      if (error) throw error;
      
      const tables = [...new Set((data || []).map(d => d.table_name))];
      return tables.sort();
    },
    enabled: !!companyId,
  });
}
