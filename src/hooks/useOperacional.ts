import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Types
export interface OrganizationalUnit {
  id: string;
  company_id: string;
  name: string;
  type: 'empresa' | 'unidade' | 'filial' | 'setor' | 'departamento';
  parent_unit_id: string | null;
  code: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent?: OrganizationalUnit | null;
  children?: OrganizationalUnit[];
}

export interface Department {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  organizational_unit_id: string | null;
  manager_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organizational_unit?: OrganizationalUnit | null;
}

export interface CostCenterResponsible {
  id: string;
  cost_center_id: string;
  company_id: string;
  user_id: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
  resp_role: string | null;
  created_at: string;
  updated_at: string;
  cost_center?: any;
  user?: any;
}

// Organizational Units Hook
export function useOrganizationalUnits(filters?: { type?: string; is_active?: boolean }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['organizational_units', currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from('organizational_units')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name');

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as OrganizationalUnit[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Build hierarchical tree from flat list
export function buildOrganizationalTree(units: OrganizationalUnit[]): OrganizationalUnit[] {
  const map = new Map<string, OrganizationalUnit>();
  const roots: OrganizationalUnit[] = [];

  // First pass: create map with children arrays
  units.forEach(unit => {
    map.set(unit.id, { ...unit, children: [] });
  });

  // Second pass: build tree
  units.forEach(unit => {
    const node = map.get(unit.id)!;
    if (unit.parent_unit_id && map.has(unit.parent_unit_id)) {
      map.get(unit.parent_unit_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// Mutations for Organizational Units
export function useCreateOrganizationalUnit() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<OrganizationalUnit>) => {
      const { error } = await supabase.from('organizational_units').insert({
        name: data.name!,
        type: data.type || 'setor',
        code: data.code,
        description: data.description,
        parent_unit_id: data.parent_unit_id,
        is_active: data.is_active ?? true,
        company_id: currentCompany?.id!,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizational_units'] });
      toast({ title: 'Unidade organizacional criada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateOrganizationalUnit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<OrganizationalUnit> & { id: string }) => {
      const { error } = await supabase
        .from('organizational_units')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizational_units'] });
      toast({ title: 'Unidade organizacional atualizada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteOrganizationalUnit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('organizational_units').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizational_units'] });
      toast({ title: 'Unidade organizacional excluída!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

// Departments Hook
export function useDepartments(filters?: { organizational_unit_id?: string; is_active?: boolean }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['departments', currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from('departments')
        .select('*, organizational_unit:organizational_units(*)')
        .eq('company_id', currentCompany.id)
        .order('name');

      if (filters?.organizational_unit_id) {
        query = query.eq('organizational_unit_id', filters.organizational_unit_id);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Department[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateDepartment() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<Department>) => {
      const { error } = await supabase.from('departments').insert({
        name: data.name!,
        code: data.code,
        organizational_unit_id: data.organizational_unit_id,
        is_active: data.is_active ?? true,
        company_id: currentCompany?.id!,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Departamento criado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Department> & { id: string }) => {
      const { error } = await supabase.from('departments').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Departamento atualizado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Departamento excluído!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

// Cost Center Responsibles Hook
export function useCostCenterResponsibles(filters?: { cost_center_id?: string; is_active?: boolean }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['cost_center_responsibles', currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from('cost_center_responsibles')
        .select('*, cost_center:cost_centers(*)')
        .eq('company_id', currentCompany.id)
        .order('start_date', { ascending: false });

      if (filters?.cost_center_id) {
        query = query.eq('cost_center_id', filters.cost_center_id);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CostCenterResponsible[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateCostCenterResponsible() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<CostCenterResponsible>) => {
      const { error } = await supabase.from('cost_center_responsibles').insert({
        cost_center_id: data.cost_center_id!,
        user_id: data.user_id!,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: data.is_active ?? true,
        notes: data.notes,
        company_id: currentCompany?.id!,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost_center_responsibles'] });
      toast({ title: 'Responsável cadastrado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCostCenterResponsible() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CostCenterResponsible> & { id: string }) => {
      const { error } = await supabase.from('cost_center_responsibles').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost_center_responsibles'] });
      toast({ title: 'Responsável atualizado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCostCenterResponsible() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cost_center_responsibles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost_center_responsibles'] });
      toast({ title: 'Responsável excluído!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}
