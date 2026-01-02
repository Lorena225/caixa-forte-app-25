import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// Types
export type ConnectionType = 'woocommerce' | 'payment_gateway' | 'crm' | 'custom_api' | 'erp';
export type ConnectionStatus = 'active' | 'disabled' | 'error' | 'testing';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface IntegrationConnection {
  id: string;
  company_id: string;
  type: ConnectionType;
  name: string;
  status: ConnectionStatus;
  encrypted_credentials: string | null;
  encryption_meta: Json;
  settings_json: Json;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationWebhook {
  id: string;
  company_id: string;
  connection_id: string;
  event_key: string;
  secret_hash: string | null;
  endpoint_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationJob {
  id: string;
  company_id: string;
  connection_id: string;
  job_type: string;
  status: JobStatus;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  payload_json: Json;
  result_json: Json | null;
  created_at: string;
  connection?: IntegrationConnection;
}

export interface IntegrationLog {
  id: string;
  company_id: string;
  connection_id: string | null;
  direction: 'in' | 'out';
  endpoint: string;
  method: string | null;
  request_meta_json: Json;
  response_meta_json: Json;
  status_code: number | null;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  connection?: IntegrationConnection;
}

export interface IntegrationDLQ {
  id: string;
  company_id: string;
  connection_id: string | null;
  event_type: string | null;
  payload_json: Json;
  error_json: Json | null;
  attempts: number;
  failed_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
  created_at: string;
  connection?: IntegrationConnection;
}

// Hooks for Connections
export function useIntegrationConnections() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['integration-connections', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as IntegrationConnection[];
    },
    enabled: !!currentCompany,
  });
}

export function useIntegrationConnection(connectionId: string | null) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['integration-connection', connectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('id', connectionId!)
        .eq('company_id', currentCompany!.id)
        .single();
      
      if (error) throw error;
      return data as IntegrationConnection;
    },
    enabled: !!currentCompany && !!connectionId,
  });
}

export function useCreateConnection() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      type: ConnectionType;
      name: string;
      settings_json?: Json;
    }) => {
      const { data: result, error } = await supabase
        .from('integration_connections')
        .insert({
          company_id: currentCompany!.id,
          type: data.type,
          name: data.name,
          status: 'disabled',
          settings_json: data.settings_json || {},
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as IntegrationConnection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
      toast.success('Conexão criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar conexão: ' + error.message);
    },
  });
}

export function useUpdateConnection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<IntegrationConnection> }) => {
      const { data: result, error } = await supabase
        .from('integration_connections')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result as IntegrationConnection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
      toast.success('Conexão atualizada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('integration_connections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
      toast.success('Conexão removida');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });
}

// Hooks for Webhooks
export function useConnectionWebhooks(connectionId: string | null) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['integration-webhooks', connectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_webhooks')
        .select('*')
        .eq('connection_id', connectionId!)
        .eq('company_id', currentCompany!.id);
      
      if (error) throw error;
      return data as IntegrationWebhook[];
    },
    enabled: !!currentCompany && !!connectionId,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      connection_id: string;
      event_key: string;
      endpoint_url: string;
    }) => {
      const { data: result, error } = await supabase
        .from('integration_webhooks')
        .insert({
          company_id: currentCompany!.id,
          ...data,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as IntegrationWebhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-webhooks'] });
      toast.success('Webhook criado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar webhook: ' + error.message);
    },
  });
}

// Hooks for Jobs
export function useIntegrationJobs(filter?: { connectionId?: string; status?: JobStatus }) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['integration-jobs', currentCompany?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from('integration_jobs')
        .select(`
          *,
          connection:integration_connections(id, name, type)
        `)
        .eq('company_id', currentCompany!.id)
        .order('scheduled_at', { ascending: false })
        .limit(100);
      
      if (filter?.connectionId) {
        query = query.eq('connection_id', filter.connectionId);
      }
      if (filter?.status) {
        query = query.eq('status', filter.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as IntegrationJob[];
    },
    enabled: !!currentCompany,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      connection_id: string;
      job_type: string;
      payload_json?: Json;
    }) => {
      const { data: result, error } = await supabase
        .from('integration_jobs')
        .insert({
          company_id: currentCompany!.id,
          ...data,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as IntegrationJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-jobs'] });
      toast.success('Job agendado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao agendar job: ' + error.message);
    },
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('integration_jobs')
        .update({ status: 'cancelled' })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-jobs'] });
      toast.success('Job cancelado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cancelar: ' + error.message);
    },
  });
}

// Hooks for Logs
export function useIntegrationLogs(filter?: { connectionId?: string; direction?: 'in' | 'out' }) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['integration-logs', currentCompany?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from('integration_logs')
        .select(`
          *,
          connection:integration_connections(id, name, type)
        `)
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (filter?.connectionId) {
        query = query.eq('connection_id', filter.connectionId);
      }
      if (filter?.direction) {
        query = query.eq('direction', filter.direction);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as IntegrationLog[];
    },
    enabled: !!currentCompany,
  });
}

// Hooks for DLQ
export function useIntegrationDLQ(filter?: { connectionId?: string; resolved?: boolean }) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['integration-dlq', currentCompany?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from('integration_dlq')
        .select(`
          *,
          connection:integration_connections(id, name, type)
        `)
        .eq('company_id', currentCompany!.id)
        .order('failed_at', { ascending: false })
        .limit(100);
      
      if (filter?.connectionId) {
        query = query.eq('connection_id', filter.connectionId);
      }
      if (filter?.resolved === true) {
        query = query.not('resolved_at', 'is', null);
      } else if (filter?.resolved === false) {
        query = query.is('resolved_at', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as IntegrationDLQ[];
    },
    enabled: !!currentCompany,
  });
}

export function useResolveDLQ() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from('integration_dlq')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user!.id,
          notes,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-dlq'] });
      toast.success('Item resolvido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao resolver: ' + error.message);
    },
  });
}

export function useReprocessDLQ() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (dlqItem: IntegrationDLQ) => {
      // Create a new job to reprocess
      const { data, error } = await supabase
        .from('integration_jobs')
        .insert({
          company_id: currentCompany!.id,
          connection_id: dlqItem.connection_id!,
          job_type: 'reprocess_dlq',
          payload_json: { dlq_id: dlqItem.id, original_payload: dlqItem.payload_json },
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update DLQ attempts
      await supabase
        .from('integration_dlq')
        .update({ attempts: dlqItem.attempts + 1 })
        .eq('id', dlqItem.id);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-dlq'] });
      queryClient.invalidateQueries({ queryKey: ['integration-jobs'] });
      toast.success('Reprocessamento agendado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao reprocessar: ' + error.message);
    },
  });
}

// Connection type labels
export const connectionTypeLabels: Record<ConnectionType, string> = {
  woocommerce: 'WooCommerce',
  payment_gateway: 'Gateway de Pagamento',
  crm: 'CRM',
  custom_api: 'API Personalizada',
  erp: 'ERP Externo',
};

export const connectionTypeIcons: Record<ConnectionType, string> = {
  woocommerce: 'ShoppingCart',
  payment_gateway: 'CreditCard',
  crm: 'Users',
  custom_api: 'Code',
  erp: 'Building2',
};
