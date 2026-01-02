import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============= Branches =============
export function useBranches() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['branches', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('code');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      code: string;
      name: string;
      cnpj?: string;
      ie?: string;
      im?: string;
      address?: string;
      city?: string;
      state?: string;
      zip_code?: string;
      is_headquarters?: boolean;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { data: result, error } = await supabase
        .from('branches')
        .insert({ ...data, company_id: currentCompany.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Filial criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar filial: ' + error.message);
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<{
      code: string;
      name: string;
      cnpj?: string;
      ie?: string;
      im?: string;
      address?: string;
      city?: string;
      state?: string;
      zip_code?: string;
      is_headquarters?: boolean;
      is_active?: boolean;
    }>) => {
      const { data: result, error } = await supabase
        .from('branches')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Filial atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar filial: ' + error.message);
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Filial excluída com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir filial: ' + error.message);
    },
  });
}

// ============= Company Users & Roles =============
export function useCompanyUsers() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['company-users', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('company_users')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name
          )
        `)
        .eq('company_id', currentCompany.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'admin' | 'gestor' | 'visualizador' }) => {
      const { data, error } = await supabase
        .from('company_users')
        .update({ role })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      toast.success('Permissão atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar permissão: ' + error.message);
    },
  });
}

export function useRemoveCompanyUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('company_users').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      toast.success('Usuário removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover usuário: ' + error.message);
    },
  });
}

// ============= Approval Workflows =============
export function useApprovalWorkflows() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['approval-workflows', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('approval_workflows')
        .select(`
          *,
          approval_steps (*)
        `)
        .eq('company_id', currentCompany.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateApprovalWorkflow() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      entity_type: string;
      min_amount?: number;
      max_amount?: number;
      is_active?: boolean;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { data: result, error } = await supabase
        .from('approval_workflows')
        .insert({ ...data, company_id: currentCompany.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      toast.success('Fluxo de aprovação criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar fluxo: ' + error.message);
    },
  });
}

export function useUpdateApprovalWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<{
      name: string;
      entity_type: string;
      min_amount?: number;
      max_amount?: number;
      is_active?: boolean;
    }>) => {
      const { data: result, error } = await supabase
        .from('approval_workflows')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      toast.success('Fluxo atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar fluxo: ' + error.message);
    },
  });
}

export function useDeleteApprovalWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('approval_workflows').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      toast.success('Fluxo excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir fluxo: ' + error.message);
    },
  });
}

// ============= Company Settings =============
export function useCompanySettings() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['company', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', currentCompany.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name?: string;
      cnpj?: string;
      logo_url?: string;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { data: result, error } = await supabase
        .from('companies')
        .update(data)
        .eq('id', currentCompany.id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Empresa atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar empresa: ' + error.message);
    },
  });
}

// ============= Custom Roles =============
export function useCustomRoles() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['custom-roles', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateCustomRole() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      base_role?: 'admin' | 'gestor' | 'visualizador';
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { data: result, error } = await supabase
        .from('custom_roles')
        .insert({ ...data, company_id: currentCompany.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Papel criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar papel: ' + error.message);
    },
  });
}

export function useUpdateCustomRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<{
      name: string;
      description?: string;
      is_active?: boolean;
    }>) => {
      const { data: result, error } = await supabase
        .from('custom_roles')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Papel atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar papel: ' + error.message);
    },
  });
}

export function useDeleteCustomRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Papel excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir papel: ' + error.message);
    },
  });
}
