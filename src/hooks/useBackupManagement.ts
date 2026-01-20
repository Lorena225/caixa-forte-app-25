import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============= Types =============
export interface BackupJob {
  id: string;
  company_id: string | null;
  nome_job: string | null;
  tipo: string | null;
  frequencia: string | null;
  alvo: string | null;
  ativo: boolean | null;
  configuracao_json: Record<string, unknown> | null;
  descricao: string | null;
  proximo_agendamento: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  status: string | null;
}

export interface BackupExecution {
  id: string;
  backup_job_id: string;
  company_id: string | null;
  status: string;
  iniciado_em: string;
  finalizado_em: string | null;
  detalhes: Record<string, unknown> | null;
  local_armazenamento: string | null;
  tamanho_bytes: number | null;
  arquivos_processados: number | null;
  erro_mensagem: string | null;
  triggered_by: string | null;
  trigger_type: string | null;
}

export interface BackupPolicySettings {
  id: string;
  company_id: string | null;
  rpo_minutos: number;
  rto_minutos: number;
  retencao_dias: number;
  backup_db_enabled: boolean | null;
  backup_arquivos_enabled: boolean | null;
  backup_configs_enabled: boolean | null;
  offsite_enabled: boolean | null;
  notificar_falhas: boolean | null;
  emails_notificacao: string[] | null;
  configuracao_extra: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface DRTestChecklist {
  id: string;
  company_id: string | null;
  ultimo_teste_em: string | null;
  proximo_teste_planejado: string | null;
  responsavel_nome: string | null;
  responsavel_email: string | null;
  ambiente_teste: string | null;
  resultado_ultimo_teste: string | null;
  observacoes: string | null;
  checklist_items: Array<{ item: string; checked: boolean; date?: string }> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BackupConfigCritical {
  id: string;
  company_id: string | null;
  tipo: string;
  ultima_versao_backup_em: string | null;
  detalhes: Record<string, unknown> | null;
  snapshot_data: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

// ============= Backup Jobs =============
export function useBackupJobs() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['backup-jobs', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('backup_jobs')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BackupJob[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateBackupJob() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      nome_job: string;
      tipo: string;
      frequencia: string;
      alvo?: string;
      descricao?: string;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { data: result, error } = await supabase
        .from('backup_jobs')
        .insert({
          nome_job: data.nome_job,
          tipo: data.tipo,
          frequencia: data.frequencia,
          alvo: data.alvo || 'principal',
          descricao: data.descricao,
          company_id: currentCompany.id,
          created_by: user?.id,
          ativo: true,
          status: 'idle',
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-jobs'] });
      toast.success('Job de backup criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar job: ' + error.message);
    },
  });
}

export function useUpdateBackupJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo?: boolean }) => {
      const { data: result, error } = await supabase
        .from('backup_jobs')
        .update({ ativo })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-jobs'] });
      toast.success('Job atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar job: ' + error.message);
    },
  });
}

export function useDeleteBackupJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('backup_jobs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-jobs'] });
      toast.success('Job excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir job: ' + error.message);
    },
  });
}

// ============= Backup Executions =============
export function useBackupExecutions(jobId?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['backup-executions', currentCompany?.id, jobId],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from('backup_executions')
        .select('*, backup_jobs(nome_job, tipo)')
        .eq('company_id', currentCompany.id)
        .order('iniciado_em', { ascending: false })
        .limit(100);
      
      if (jobId) {
        query = query.eq('backup_job_id', jobId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useTriggerBackup() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (jobId: string) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Create execution record with status 'pendente'
      const { data: result, error } = await supabase
        .from('backup_executions')
        .insert({
          backup_job_id: jobId,
          company_id: currentCompany.id,
          status: 'pendente',
          triggered_by: user?.id,
          trigger_type: 'manual',
          detalhes: { triggered_at: new Date().toISOString() },
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-executions'] });
      toast.success('Backup iniciado - aguardando processamento externo');
    },
    onError: (error: Error) => {
      toast.error('Erro ao iniciar backup: ' + error.message);
    },
  });
}

// ============= Backup Policy Settings =============
export function useBackupPolicySettings() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['backup-policy', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const { data, error } = await supabase
        .from('backup_policy_settings')
        .select('*')
        .eq('company_id', currentCompany.id)
        .maybeSingle();
      if (error) throw error;
      return data as BackupPolicySettings | null;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useUpsertBackupPolicy() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<BackupPolicySettings>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data: result, error } = await supabase
        .from('backup_policy_settings')
        .upsert({
          rpo_minutos: data.rpo_minutos,
          rto_minutos: data.rto_minutos,
          retencao_dias: data.retencao_dias,
          backup_db_enabled: data.backup_db_enabled,
          backup_arquivos_enabled: data.backup_arquivos_enabled,
          backup_configs_enabled: data.backup_configs_enabled,
          offsite_enabled: data.offsite_enabled,
          notificar_falhas: data.notificar_falhas,
          company_id: currentCompany.id,
          updated_by: user?.id,
        }, { onConflict: 'company_id' })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-policy'] });
      toast.success('Política de backup atualizada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar política: ' + error.message);
    },
  });
}

// ============= DR Test Checklist =============
export function useDRTestChecklist() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['dr-checklist', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const { data, error } = await supabase
        .from('dr_test_checklist')
        .select('*')
        .eq('company_id', currentCompany.id)
        .maybeSingle();
      if (error) throw error;
      return data as DRTestChecklist | null;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useUpsertDRChecklist() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<DRTestChecklist>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data: result, error } = await supabase
        .from('dr_test_checklist')
        .upsert({
          ...data,
          company_id: currentCompany.id,
        }, { onConflict: 'company_id' })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dr-checklist'] });
      toast.success('Checklist DR atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar checklist: ' + error.message);
    },
  });
}

// ============= Config Critical Backups =============
export function useBackupConfigCritical() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['backup-config-critical', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('backup_config_critical')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('tipo');
      if (error) throw error;
      return data as BackupConfigCritical[];
    },
    enabled: !!currentCompany?.id,
  });
}

// ============= Stats =============
export function useBackupStats() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['backup-stats', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      // Get recent executions
      const { data: executions, error: execError } = await supabase
        .from('backup_executions')
        .select('status, iniciado_em')
        .eq('company_id', currentCompany.id)
        .gte('iniciado_em', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('iniciado_em', { ascending: false });
      
      if (execError) throw execError;
      
      const total = executions?.length || 0;
      const sucesso = executions?.filter(e => e.status === 'sucesso').length || 0;
      const falha = executions?.filter(e => e.status === 'falha').length || 0;
      const pendentes = executions?.filter(e => e.status === 'pendente' || e.status === 'em_andamento').length || 0;
      const ultimoBackup = executions?.[0]?.iniciado_em || null;
      
      return {
        total,
        sucesso,
        falha,
        pendentes,
        ultimoBackup,
        taxaSucesso: total > 0 ? Math.round((sucesso / total) * 100) : 0,
      };
    },
    enabled: !!currentCompany?.id,
  });
}
