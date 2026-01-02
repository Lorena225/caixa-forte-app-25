import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CostCenter {
  id: string;
  company_id: string;
  code: string;
  name: string;
  level: number;
  level_type: string | null;
  parent_id: string | null;
  path: string;
  path_codes: string;
  is_leaf: boolean;
  is_active: boolean;
  branch_id: string | null;
  valid_from: string | null;
  valid_to: string | null;
  manager_user_id: string | null;
  children?: CostCenter[];
}

export interface CostCenterHierarchySettings {
  company_id: string;
  levels_enabled: number;
  level_labels_json: Record<string, string>;
  posting_policy: string;
  require_cost_center: boolean;
}

const DEFAULT_LEVEL_LABELS: Record<string, string> = {
  '1': 'Unidade de Negócio',
  '2': 'Departamento',
  '3': 'Centro de Custo',
  '4': 'Projeto',
  '5': 'Fase',
};

/**
 * Hook para buscar a árvore de centros de custo
 */
export function useCostCenterTree() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['cost-center-tree', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, company_id, code, name, level, level_type, parent_id, path, path_codes, is_leaf, is_active, branch_id, valid_from, valid_to, manager_user_id')
        .eq('company_id', currentCompany.id)
        .order('path');

      if (error) throw error;

      const items = (data || []) as CostCenter[];
      return buildTree(items);
    },
    enabled: !!currentCompany?.id,
  });
}

/**
 * Hook para buscar centros de custo como lista flat
 */
export function useCostCenterList() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['cost-center-list', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, company_id, code, name, level, level_type, parent_id, path, path_codes, is_leaf, is_active, branch_id, valid_from, valid_to, manager_user_id')
        .eq('company_id', currentCompany.id)
        .order('path');

      if (error) throw error;
      return (data || []) as CostCenter[];
    },
    enabled: !!currentCompany?.id,
  });
}

/**
 * Hook para buscar configurações de hierarquia
 */
export function useCostCenterSettings() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['cost-center-settings', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;

      const { data, error } = await supabase
        .from('cost_center_hierarchy_settings')
        .select('*')
        .eq('company_id', currentCompany.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        return {
          company_id: currentCompany.id,
          levels_enabled: 3,
          level_labels_json: DEFAULT_LEVEL_LABELS,
          posting_policy: 'leaf_only',
          require_cost_center: false,
        };
      }

      return {
        company_id: data.company_id,
        levels_enabled: data.levels_enabled,
        level_labels_json: (data.level_labels_json as Record<string, string>) || DEFAULT_LEVEL_LABELS,
        posting_policy: data.posting_policy,
        require_cost_center: data.require_cost_center,
      } as CostCenterHierarchySettings;
    },
    enabled: !!currentCompany?.id,
  });
}

/**
 * Mutation para criar centro de custo
 */
export function useCreateCostCenter() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { code: string; name: string; parent_id?: string | null; branch_id?: string | null }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');

      const { error, data: created } = await supabase
        .from('cost_centers')
        .insert({
          code: data.code,
          name: data.name,
          parent_id: data.parent_id || null,
          branch_id: data.branch_id || null,
          company_id: currentCompany.id,
        })
        .select()
        .single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-center-tree'] });
      queryClient.invalidateQueries({ queryKey: ['cost-center-list'] });
      queryClient.invalidateQueries({ queryKey: ['cost_centers'] });
    },
  });
}

/**
 * Mutation para atualizar centro de custo
 */
export function useUpdateCostCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; code?: string; name?: string; is_active?: boolean; parent_id?: string | null }) => {
      const { id, ...data } = payload;
      const { error, data: updated } = await supabase
        .from('cost_centers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-center-tree'] });
      queryClient.invalidateQueries({ queryKey: ['cost-center-list'] });
      queryClient.invalidateQueries({ queryKey: ['cost_centers'] });
    },
  });
}

/**
 * Mutation para mover centro de custo
 */
export function useMoveCostCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newParentId }: { id: string; newParentId: string | null }) => {
      const { error } = await supabase
        .from('cost_centers')
        .update({ parent_id: newParentId })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-center-tree'] });
      queryClient.invalidateQueries({ queryKey: ['cost-center-list'] });
      queryClient.invalidateQueries({ queryKey: ['cost_centers'] });
    },
  });
}

/**
 * Mutation para ativar/desativar centro de custo
 */
export function useToggleCostCenterActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('cost_centers')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-center-tree'] });
      queryClient.invalidateQueries({ queryKey: ['cost-center-list'] });
      queryClient.invalidateQueries({ queryKey: ['cost_centers'] });
    },
  });
}

/**
 * Mutation para deletar centro de custo
 */
export function useDeleteCostCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-center-tree'] });
      queryClient.invalidateQueries({ queryKey: ['cost-center-list'] });
      queryClient.invalidateQueries({ queryKey: ['cost_centers'] });
    },
  });
}

/**
 * Constrói árvore hierárquica a partir de lista flat
 */
function buildTree(items: CostCenter[]): CostCenter[] {
  const map = new Map<string, CostCenter>();
  const roots: CostCenter[] = [];

  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });

  items.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      const parent = map.get(item.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/**
 * Obtém o label do nível
 */
export function getLevelLabel(level: number, settings?: CostCenterHierarchySettings | null): string {
  if (settings?.level_labels_json?.[String(level)]) {
    return settings.level_labels_json[String(level)];
  }
  return DEFAULT_LEVEL_LABELS[String(level)] || `Nível ${level}`;
}

/**
 * Verifica se pode mover um nó para novo pai (previne ciclos)
 */
export function canMoveTo(node: CostCenter, targetId: string, allNodes: CostCenter[]): boolean {
  if (node.id === targetId) return false;
  
  // Verificar se target é descendente do node
  function isDescendant(parentId: string, checkId: string): boolean {
    const children = allNodes.filter(n => n.parent_id === parentId);
    for (const child of children) {
      if (child.id === checkId) return true;
      if (isDescendant(child.id, checkId)) return true;
    }
    return false;
  }
  
  return !isDescendant(node.id, targetId);
}
