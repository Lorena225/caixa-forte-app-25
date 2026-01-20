import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Permission, PermissionFilters, PermissionsByModule } from "@/types/permissions";

// =====================================================
// GET ALL PERMISSIONS (CATALOG)
// =====================================================
export function usePermissions(filters?: PermissionFilters) {
  return useQuery({
    queryKey: ["permissions", filters],
    queryFn: async (): Promise<Permission[]> => {
      let query = supabase
        .from("permissions")
        .select("*")
        .eq("is_active", true)
        .order("module")
        .order("resource")
        .order("name");

      if (filters?.module) {
        query = query.eq("module", filters.module);
      }
      if (filters?.action) {
        query = query.eq("action", filters.action);
      }

      const { data, error } = await query;
      if (error) throw error;

      let result = data as Permission[];

      // Client-side search filter
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            p.code.toLowerCase().includes(search) ||
            p.module.toLowerCase().includes(search) ||
            p.resource?.toLowerCase().includes(search)
        );
      }

      return result;
    },
    staleTime: 30 * 60 * 1000, // 30 min cache
  });
}

// =====================================================
// GET PERMISSIONS BY MODULE (GROUPED)
// =====================================================
export function usePermissionsByModule(): PermissionsByModule {
  const { data: permissions = [] } = usePermissions();

  return permissions.reduce((acc, perm) => {
    const module = perm.module || "Outros";
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {} as PermissionsByModule);
}

// =====================================================
// GET PERMISSIONS BY ROLE
// =====================================================
export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: ["role_permissions", roleId],
    queryFn: async (): Promise<Permission[]> => {
      if (!roleId) return [];

      const { data, error } = await supabase
        .from("role_permissions")
        .select(`
          permission_id,
          permissions (*)
        `)
        .eq("role_id", roleId);

      if (error) throw error;

      return (data || [])
        .filter((rp) => rp.permissions)
        .map((rp) => rp.permissions as unknown as Permission);
    },
    enabled: !!roleId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// GRANT PERMISSION TO ROLE
// =====================================================
export function useGrantPermissionToRole() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      roleId,
      permissionId,
    }: {
      roleId: string;
      permissionId: string;
    }) => {
      const { error } = await supabase.from("role_permissions").insert({
        role_id: roleId,
        permission_id: permissionId,
      });

      if (error) {
        if (error.code === "23505") {
          // Duplicate - already exists
          return { already_exists: true };
        }
        throw error;
      }

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "permission_grant",
        p_resource: "role_permissions",
        p_resource_id: roleId,
        p_details: { permission_id: permissionId },
      });

      return { success: true };
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ["role_permissions", roleId] });
      toast.success("Permissão concedida");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    retry: 3,
  });
}

// =====================================================
// REVOKE PERMISSION FROM ROLE
// =====================================================
export function useRevokePermissionFromRole() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      roleId,
      permissionId,
    }: {
      roleId: string;
      permissionId: string;
    }) => {
      const { error } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId)
        .eq("permission_id", permissionId);

      if (error) throw error;

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "permission_revoke",
        p_resource: "role_permissions",
        p_resource_id: roleId,
        p_details: { permission_id: permissionId },
      });

      return { success: true };
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ["role_permissions", roleId] });
      toast.success("Permissão revogada");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    retry: 3,
  });
}

// =====================================================
// UPDATE ROLE PERMISSIONS (BATCH)
// =====================================================
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      roleId,
      permissionIds,
    }: {
      roleId: string;
      permissionIds: string[];
    }) => {
      // Remove all existing
      await supabase.from("role_permissions").delete().eq("role_id", roleId);

      // Add new ones
      if (permissionIds.length > 0) {
        const { error } = await supabase.from("role_permissions").insert(
          permissionIds.map((pid) => ({
            role_id: roleId,
            permission_id: pid,
          }))
        );
        if (error) throw error;
      }

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "role_permissions_batch_update",
        p_resource: "role_permissions",
        p_resource_id: roleId,
        p_details: { permission_count: permissionIds.length },
      });

      return { success: true };
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ["role_permissions", roleId] });
      toast.success("Permissões atualizadas");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    retry: 3,
  });
}

// =====================================================
// CAN USER ACTION - PERMISSION CHECK HELPER
// =====================================================
export function useCanUserAction() {
  const { user, currentCompany } = useAuth();

  return useQuery({
    queryKey: ["user_permissions_check", user?.id, currentCompany?.id],
    queryFn: async () => {
      if (!user?.id || !currentCompany?.id) return new Set<string>();

      const { data, error } = await supabase.rpc("get_user_permissions", {
        p_user_id: user.id,
        p_company_id: currentCompany.id,
      });

      if (error) throw error;

      return new Set((data || []).map((p: { code: string }) => p.code));
    },
    enabled: !!user?.id && !!currentCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

/**
 * Hook helper to check if user can perform an action
 * Usage: const canEdit = useHasPermission('contas_pagar:editar')
 */
export function useHasPermission(permissionCode: string): boolean {
  const { data: permissions } = useCanUserAction();
  return permissions?.has(permissionCode) ?? false;
}

/**
 * Hook to check multiple permissions at once
 * Usage: const { canView, canEdit } = useHasPermissions({ canView: 'dashboard:ver', canEdit: 'dashboard:editar' })
 */
export function useHasPermissions<T extends Record<string, string>>(
  permissionMap: T
): Record<keyof T, boolean> {
  const { data: permissions } = useCanUserAction();

  const result = {} as Record<keyof T, boolean>;
  for (const key in permissionMap) {
    result[key] = permissions?.has(permissionMap[key]) ?? false;
  }

  return result;
}
