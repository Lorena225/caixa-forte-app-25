import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============= TYPES =============

export interface Project {
  id: string;
  company_id: string;
  contract_id?: string;
  counterparty_id?: string;
  project_number: string;
  name: string;
  description?: string;
  manager_id?: string;
  start_date: string;
  deadline?: string;
  budget_hours: number;
  budget_amount: number;
  status: 'planejamento' | 'em_andamento' | 'pausado' | 'concluido' | 'cancelado';
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  progress_percentage: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Relations
  contract?: {
    id: string;
    contract_number: string;
    valor_total?: number;
    monthly_value?: number;
  };
  counterparty?: {
    id: string;
    name: string;
    document?: string;
  };
  manager?: {
    id: string;
    full_name: string;
  };
}

export interface ProjectMilestone {
  id: string;
  company_id: string;
  project_id: string;
  name: string;
  description?: string;
  due_date?: string;
  billing_amount: number;
  billing_percentage: number;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';
  completed_at?: string;
  transaction_id?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: string;
  company_id: string;
  project_id: string;
  milestone_id?: string;
  parent_task_id?: string;
  title: string;
  description?: string;
  assigned_to?: string;
  estimated_hours: number;
  actual_hours: number;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'a_fazer' | 'fazendo' | 'bloqueado' | 'revisao' | 'feito' | 'arquivado';
  due_date?: string;
  start_date?: string;
  completed_at?: string;
  sort_order: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  // Relations
  assignee?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  milestone?: {
    id: string;
    name: string;
  };
}

export interface Timesheet {
  id: string;
  company_id: string;
  project_id: string;
  task_id?: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  description?: string;
  is_billable: boolean;
  hourly_rate?: number;
  approved_at?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  task?: {
    id: string;
    title: string;
  };
  project?: {
    id: string;
    name: string;
    project_number: string;
  };
}

export interface ProjectStats {
  total: number;
  planejamento: number;
  em_andamento: number;
  concluidos: number;
  atrasados: number;
  totalHours: number;
  budgetedHours: number;
}

export interface ProjectProfitability {
  project_id: string;
  contract_value: number;
  total_hours: number;
  personnel_cost: number;
  contribution_margin: number;
  margin_percentage: number;
}

// ============= PROJECTS =============

export function useProjects(filters?: { status?: string; manager_id?: string; search?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['projects', currentCompany?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          contract:contracts(id, contract_number, valor_total, monthly_value),
          counterparty:counterparties(id, name, document),
          manager:user_profiles!projects_manager_id_fkey(id, full_name)
        `)
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }
      if (filters?.manager_id) {
        query = query.eq('manager_id', filters.manager_id);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,project_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          contract:contracts(id, contract_number, valor_total, monthly_value),
          counterparty:counterparties(id, name, document),
          manager:user_profiles!projects_manager_id_fkey(id, full_name)
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });
}

export function useProjectStats() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['projects-stats', currentCompany?.id],
    queryFn: async (): Promise<ProjectStats> => {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, status, deadline, budget_hours')
        .eq('company_id', currentCompany!.id);

      if (error) throw error;

      const all = projects || [];
      const hoje = new Date();
      
      // Calcular horas realizadas
      const { data: timesheets } = await supabase
        .from('timesheets')
        .select('duration_minutes')
        .eq('company_id', currentCompany!.id)
        .not('end_time', 'is', null);

      const totalHours = (timesheets || []).reduce(
        (sum, t) => sum + (Number(t.duration_minutes) || 0) / 60, 0
      );

      const atrasados = all.filter(p => {
        if (!p.deadline || p.status === 'concluido' || p.status === 'cancelado') return false;
        return new Date(p.deadline) < hoje;
      });

      const budgetedHours = all.reduce((sum, p) => sum + (Number(p.budget_hours) || 0), 0);

      return {
        total: all.length,
        planejamento: all.filter(p => p.status === 'planejamento').length,
        em_andamento: all.filter(p => p.status === 'em_andamento').length,
        concluidos: all.filter(p => p.status === 'concluido').length,
        atrasados: atrasados.length,
        totalHours,
        budgetedHours,
      };
    },
    enabled: !!currentCompany?.id,
  });
}

export function useProjectProfitability(projectId: string | null) {
  return useQuery({
    queryKey: ['project-profitability', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_project_profitability', { p_project_id: projectId });
      
      if (error) throw error;
      return (data?.[0] || null) as ProjectProfitability | null;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<Project, 'id' | 'company_id' | 'project_number' | 'created_at' | 'updated_at' | 'contract' | 'counterparty' | 'manager'>) => {
      // Generate project number
      const { data: lastProject } = await supabase
        .from('projects')
        .select('project_number')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastProject?.project_number) {
        const match = lastProject.project_number.match(/\d+/);
        if (match) nextNumber = parseInt(match[0]) + 1;
      }

      const project_number = `PRJ-${String(nextNumber).padStart(5, '0')}`;

      const { data, error } = await supabase
        .from('projects')
        .insert([{ 
          ...input, 
          company_id: currentCompany!.id,
          project_number 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-stats'] });
      toast.success('Projeto criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar projeto: ${error.message}`);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Project> & { id: string }) => {
      const { error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['projects-stats'] });
      toast.success('Projeto atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-stats'] });
      toast.success('Projeto excluído!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// ============= MILESTONES =============

export function useProjectMilestones(projectId: string | null) {
  return useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order');
      
      if (error) throw error;
      return data as ProjectMilestone[];
    },
    enabled: !!projectId,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<ProjectMilestone, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('project_milestones')
        .insert([{ ...input, company_id: currentCompany!.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', variables.project_id] });
      toast.success('Marco criado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ProjectMilestone> & { id: string }) => {
      const { error } = await supabase
        .from('project_milestones')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones'] });
      toast.success('Marco atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// ============= TASKS =============

export function useProjectTasks(projectId: string | null) {
  return useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_tasks')
        .select(`
          *,
          assignee:user_profiles!project_tasks_assigned_to_fkey(id, full_name, avatar_url),
          milestone:project_milestones(id, name)
        `)
        .eq('project_id', projectId!)
        .order('sort_order');
      
      if (error) throw error;
      return data as ProjectTask[];
    },
    enabled: !!projectId,
  });
}

export function useMyTasks() {
  const { currentCompany, user } = useAuth();

  return useQuery({
    queryKey: ['my-tasks', currentCompany?.id, user?.id],
    queryFn: async () => {
      // Primeiro buscar o user_profile_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user!.id)
        .eq('company_id', currentCompany!.id)
        .single();

      if (!profile) return [];

      const { data, error } = await supabase
        .from('project_tasks')
        .select(`
          *,
          assignee:user_profiles!project_tasks_assigned_to_fkey(id, full_name, avatar_url),
          project:projects(id, name, project_number)
        `)
        .eq('assigned_to', profile.id)
        .neq('status', 'arquivado')
        .order('due_date', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id && !!user?.id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<ProjectTask, 'id' | 'company_id' | 'actual_hours' | 'created_at' | 'updated_at' | 'assignee' | 'milestone'>) => {
      const { data, error } = await supabase
        .from('project_tasks')
        .insert([{ 
          ...input, 
          company_id: currentCompany!.id,
          actual_hours: 0
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast.success('Tarefa criada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ProjectTask> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...data };
      
      // Se está marcando como feito, adicionar completed_at
      if (data.status === 'feito' && !data.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('project_tasks')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateTasksBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, data }: { ids: string[]; data: Partial<ProjectTask> }) => {
      const { error } = await supabase
        .from('project_tasks')
        .update(data)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast.success('Tarefas atualizadas!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast.success('Tarefa excluída!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// ============= TIMESHEETS =============

export function useTimesheets(filters?: { project_id?: string; user_id?: string; from?: string; to?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['timesheets', currentCompany?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('timesheets')
        .select(`
          *,
          user:user_profiles!timesheets_user_id_fkey(id, full_name, avatar_url),
          task:project_tasks(id, title),
          project:projects(id, name, project_number)
        `)
        .eq('company_id', currentCompany!.id)
        .order('start_time', { ascending: false });

      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters?.from) {
        query = query.gte('start_time', filters.from);
      }
      if (filters?.to) {
        query = query.lte('start_time', filters.to);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as Timesheet[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useActiveTimesheet() {
  const { currentCompany, user } = useAuth();

  return useQuery({
    queryKey: ['active-timesheet', currentCompany?.id, user?.id],
    queryFn: async () => {
      // Buscar profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user!.id)
        .eq('company_id', currentCompany!.id)
        .single();

      if (!profile) return null;

      const { data, error } = await supabase
        .from('timesheets')
        .select(`
          *,
          task:project_tasks(id, title),
          project:projects(id, name, project_number)
        `)
        .eq('user_id', profile.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Timesheet | null;
    },
    enabled: !!currentCompany?.id && !!user?.id,
    refetchInterval: 60000, // Atualiza a cada minuto
  });
}

export function useStartTimesheet() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (input: { project_id: string; task_id?: string; description?: string }) => {
      // Buscar profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user!.id)
        .eq('company_id', currentCompany!.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      // Verificar se já existe um timesheet ativo
      const { data: active } = await supabase
        .from('timesheets')
        .select('id')
        .eq('user_id', profile.id)
        .is('end_time', null)
        .limit(1)
        .maybeSingle();

      if (active) {
        throw new Error('Você já tem um apontamento em andamento');
      }

      const { data, error } = await supabase
        .from('timesheets')
        .insert([{
          ...input,
          company_id: currentCompany!.id,
          user_id: profile.id,
          start_time: new Date().toISOString(),
          is_billable: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timesheet'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success('Timer iniciado!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useStopTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, description }: { id: string; description?: string }) => {
      const { error } = await supabase
        .from('timesheets')
        .update({
          end_time: new Date().toISOString(),
          description,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timesheet'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      toast.success('Timer parado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useCreateTimesheet() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (input: { 
      project_id: string; 
      task_id?: string; 
      start_time: string;
      end_time: string;
      description?: string;
      is_billable?: boolean;
    }) => {
      // Buscar profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user!.id)
        .eq('company_id', currentCompany!.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      const { data, error } = await supabase
        .from('timesheets')
        .insert([{
          ...input,
          company_id: currentCompany!.id,
          user_id: profile.id,
          is_billable: input.is_billable ?? true,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      toast.success('Horas registradas!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// ============= USER PROFILES (para seleção de gerente/responsável) =============

export function useCompanyUsers() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['company-users', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url, is_active')
        .eq('company_id', currentCompany!.id)
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}
