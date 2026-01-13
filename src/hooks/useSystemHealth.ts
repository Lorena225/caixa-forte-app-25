import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SystemHealth {
  // Jobs
  jobs_pending: number;
  jobs_running: number;
  jobs_failed_24h: number;
  jobs_stuck: number;
  
  // DLQ
  dlq_pending: number;
  dlq_oldest_hours: number | null;
  
  // Security
  login_failures_1h: number;
  rate_limit_blocks_1h: number;
  webhook_failures_24h: number;
  
  // Performance
  dashboard_p95_ms: number | null;
  cache_age_minutes: number | null;
  
  // RLS Coverage (from v_security_status)
  rls_coverage_percent: number;
  tables_without_rls: string[];
  
  // Integrations
  integrations_with_errors: number;
  
  // Overall Status
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
}

export function useSystemHealth() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  
  return useQuery({
    queryKey: ["system-health", companyId],
    queryFn: async (): Promise<SystemHealth> => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Parallel queries for all metrics
      const [
        jobsResult,
        dlqResult,
        loginAttemptsResult,
        rateLimitResult,
        webhookResult,
        securityStatusResult,
      ] = await Promise.all([
        // Jobs metrics
        supabase
          .from("jobs_queue")
          .select("status, started_at, finished_at, created_at")
          .eq("company_id", companyId!),
        
        // DLQ metrics
        supabase
          .from("integration_dlq")
          .select("id, created_at, resolved_at")
          .eq("company_id", companyId!)
          .is("resolved_at", null),
        
        // Login failures
        supabase
          .from("login_attempts")
          .select("id, success, created_at")
          .eq("success", false)
          .gte("created_at", oneHourAgo.toISOString()),
        
        // Rate limit blocks
        supabase
          .from("rate_limit_events")
          .select("id, blocked, created_at")
          .eq("blocked", true)
          .gte("created_at", oneHourAgo.toISOString()),
        
        // Webhook failures
        supabase
          .from("webhook_ingress")
          .select("id, status, created_at")
          .eq("company_id", companyId!)
          .in("status", ["rejected", "error"])
          .gte("created_at", twentyFourHoursAgo.toISOString()),
        
        // Security status view
        supabase
          .from("v_security_status")
          .select("*")
          .eq("company_id", companyId!)
          .maybeSingle(),
      ]);
      
      const jobs = jobsResult.data || [];
      const dlq = dlqResult.data || [];
      const loginAttempts = loginAttemptsResult.data || [];
      const rateLimitEvents = rateLimitResult.data || [];
      const webhookFailures = webhookResult.data || [];
      const securityStatus = securityStatusResult.data;
      
      // Calculate stuck jobs (running > 30 min)
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const stuckJobs = jobs.filter(j => 
        j.status === 'running' && 
        j.started_at && 
        new Date(j.started_at) < thirtyMinutesAgo
      );
      
      // Calculate DLQ oldest
      let dlqOldestHours: number | null = null;
      if (dlq.length > 0) {
        const oldestDlq = dlq.reduce((oldest, item) => 
          new Date(item.created_at) < new Date(oldest.created_at) ? item : oldest
        );
        dlqOldestHours = Math.floor(
          (now.getTime() - new Date(oldestDlq.created_at).getTime()) / (1000 * 60 * 60)
        );
      }
      
      // Build issues list
      const issues: string[] = [];
      
      const metrics: SystemHealth = {
        jobs_pending: jobs.filter(j => j.status === 'pending').length,
        jobs_running: jobs.filter(j => j.status === 'running').length,
        jobs_failed_24h: jobs.filter(j => 
          j.status === 'failed' && 
          j.finished_at && 
          new Date(j.finished_at) > twentyFourHoursAgo
        ).length,
        jobs_stuck: stuckJobs.length,
        
        dlq_pending: dlq.length,
        dlq_oldest_hours: dlqOldestHours,
        
        login_failures_1h: loginAttempts.length,
        rate_limit_blocks_1h: rateLimitEvents.length,
        webhook_failures_24h: webhookFailures.length,
        
        dashboard_p95_ms: null, // Would need performance monitoring
        cache_age_minutes: null, // Would need cache metadata
        
        rls_coverage_percent: securityStatus 
          ? Math.round((securityStatus.rls_enabled_tables / Math.max(securityStatus.total_tables, 1)) * 100) 
          : 0,
        tables_without_rls: [], // Would need separate query
        
        integrations_with_errors: 0, // Would need integrations table
        
        status: 'healthy',
        issues,
      };
      
      // Determine status and issues
      if (metrics.jobs_stuck > 0) {
        issues.push(`${metrics.jobs_stuck} job(s) travado(s) há mais de 30 minutos`);
      }
      if (metrics.dlq_pending > 10) {
        issues.push(`${metrics.dlq_pending} itens na DLQ aguardando reprocessamento`);
      }
      if (metrics.jobs_failed_24h > 20) {
        issues.push(`${metrics.jobs_failed_24h} falhas de jobs nas últimas 24h`);
      }
      if (metrics.login_failures_1h > 50) {
        issues.push(`${metrics.login_failures_1h} tentativas de login falhas na última hora`);
      }
      if (metrics.rate_limit_blocks_1h > 100) {
        issues.push(`${metrics.rate_limit_blocks_1h} bloqueios de rate limit na última hora`);
      }
      if (metrics.rls_coverage_percent < 100) {
        issues.push(`Cobertura RLS em ${metrics.rls_coverage_percent}% - tabelas desprotegidas`);
      }
      
      // Determine overall status
      if (
        metrics.jobs_stuck > 5 || 
        metrics.dlq_pending > 50 || 
        metrics.rls_coverage_percent < 80 ||
        metrics.login_failures_1h > 200
      ) {
        metrics.status = 'critical';
      } else if (issues.length > 0) {
        metrics.status = 'warning';
      }
      
      metrics.issues = issues;
      return metrics;
    },
    enabled: !!companyId,
    refetchInterval: 30000, // Refresh every 30 seconds
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
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useReprocessDLQ() {
  const { currentCompany } = useAuth();
  
  return async (dlqId: string) => {
    // Get the DLQ item
    const { data: dlqItem, error: fetchError } = await supabase
      .from("integration_dlq")
      .select("*")
      .eq("id", dlqId)
      .single();
    
    if (fetchError || !dlqItem) throw fetchError || new Error("Item não encontrado");
    
    // Create a new job to reprocess
    const { error: jobError } = await supabase
      .from("jobs_queue")
      .insert({
        company_id: dlqItem.company_id,
        job_type: dlqItem.event_type || "reprocess_dlq",
        payload_json: dlqItem.payload_json,
        priority: 1,
        idempotency_key: `dlq_reprocess_${dlqId}_${Date.now()}`,
      });
    
    if (jobError) throw jobError;
    
    // Mark DLQ as resolved
    const { error: updateError } = await supabase
      .from("integration_dlq")
      .update({ 
        resolved_at: new Date().toISOString(),
        resolved_by: 'manual_reprocess'
      })
      .eq("id", dlqId);
    
    if (updateError) throw updateError;
    
    return { success: true };
  };
}
