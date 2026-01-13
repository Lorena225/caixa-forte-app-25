import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface JobStatus {
  id: string;
  company_id: string;
  job_type: string;
  status: string;
  payload_json: Record<string, unknown> | null;
  result_json: Record<string, unknown> | null;
  error_json: Record<string, unknown> | null;
  attempts: number;
  max_attempts: number;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  idempotency_key: string | null;
  duration_seconds: number | null;
  computed_status: string;
}

export interface SystemMetrics {
  company_id: string;
  jobs_pending: number;
  jobs_running: number;
  jobs_completed_1h: number;
  jobs_failed_1h: number;
  avg_job_duration_1h: number | null;
}

export function useJobsQueue(filters?: { status?: string }) {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  
  return useQuery({
    queryKey: ["jobs-queue", companyId, filters],
    queryFn: async () => {
      let query = supabase
        .from("jobs_queue")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Compute status and duration on client side
      return (data || []).map(job => ({
        ...job,
        duration_seconds: job.finished_at && job.started_at 
          ? (new Date(job.finished_at).getTime() - new Date(job.started_at).getTime()) / 1000
          : job.started_at 
          ? (Date.now() - new Date(job.started_at).getTime()) / 1000
          : null,
        computed_status: 
          job.status === 'failed' && job.attempts >= job.max_attempts ? 'exhausted' :
          job.status === 'failed' ? 'retriable' :
          job.status === 'running' && job.started_at && 
            new Date(job.started_at).getTime() < Date.now() - 30 * 60 * 1000 ? 'stuck' :
          job.status
      })) as JobStatus[];
    },
    enabled: !!companyId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useSystemMetrics() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  
  return useQuery({
    queryKey: ["system-metrics", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs_queue")
        .select("status, finished_at, started_at")
        .eq("company_id", companyId!);
      
      if (error) throw error;
      
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const jobs = data || [];
      
      const metrics: SystemMetrics = {
        company_id: companyId!,
        jobs_pending: jobs.filter(j => j.status === 'pending').length,
        jobs_running: jobs.filter(j => j.status === 'running').length,
        jobs_completed_1h: jobs.filter(j => 
          j.status === 'completed' && j.finished_at && new Date(j.finished_at) > oneHourAgo
        ).length,
        jobs_failed_1h: jobs.filter(j => 
          j.status === 'failed' && j.finished_at && new Date(j.finished_at) > oneHourAgo
        ).length,
        avg_job_duration_1h: null
      };
      
      const completedJobs = jobs.filter(j => 
        j.status === 'completed' && 
        j.finished_at && j.started_at && 
        new Date(j.finished_at) > oneHourAgo
      );
      
      if (completedJobs.length > 0) {
        const totalDuration = completedJobs.reduce((sum, job) => {
          return sum + (new Date(job.finished_at!).getTime() - new Date(job.started_at!).getTime()) / 1000;
        }, 0);
        metrics.avg_job_duration_1h = totalDuration / completedJobs.length;
      }
      
      return metrics;
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("jobs_queue")
        .update({ status: "cancelled", finished_at: new Date().toISOString() })
        .eq("id", jobId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs-queue"] });
      queryClient.invalidateQueries({ queryKey: ["system-metrics"] });
    },
  });
}

export function useRetryJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("jobs_queue")
        .update({ 
          status: "pending", 
          attempts: 0,
          error_json: null,
          started_at: null,
          finished_at: null 
        })
        .eq("id", jobId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs-queue"] });
      queryClient.invalidateQueries({ queryKey: ["system-metrics"] });
    },
  });
}
