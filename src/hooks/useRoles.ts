import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Role, RolePermission } from "@/types/permissions";

// =====================================================
// GET ROLES LIST
// =====================================================
export function useRoles(includeSystemRoles = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["roles", currentCompany?.id, includeSystemRoles],
    queryFn: async (): Promise<Role[]> => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from("roles")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("name");

      if (!includeSystemRoles) {
        query = query.eq("is_system", false);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get user counts for each role
      const { data: userCounts } = await supabase
        .from("user_profiles")
        .select("role_id")
        .eq("company_id", currentCompany.id)
        .eq("is_active", true);

      const countMap = new Map<string, number>();
      (userCounts || []).forEach((u) => {
        if (u.role_id) {
          countMap.set(u.role_id, (countMap.get(u.role_id) || 0) + 1);
        }
      });

      return (data || []).map((role) => ({
        ...role,
        user_count: countMap.get(role.id) || 0,
      })) as Role[];
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// GET SINGLE ROLE WITH PERMISSIONS
// =====================================================
export function useRole(roleId: string | null) {
  return useQuery({
    queryKey: ["role", roleId],
    queryFn: async () => {
      if (!roleId) return null;

      const { data: role, error: roleError } = await supabase
        .from("roles")
        .select("*")
        .eq("id", roleId)
        .single();

      if (roleError) throw roleError;

      const { data: permissions, error: permError } = await supabase
        .from("role_permissions")
        .select(`
          id,
          permission_id,
          permissions (*)
        `)
        .eq("role_id", roleId);

      if (permError) throw permError;

      return {
        ...role,
        permissions: permissions || [],
      } as Role & { permissions: RolePermission[] };
    },
    enabled: !!roleId,
  });
}

// =====================================================
// CREATE ROLE
// =====================================================
export function useCreateRole() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      // Validate unique name
      const { data: existing } = await supabase
        .from("roles")
        .select("id")
        .eq("company_id", currentCompany.id)
        .ilike("name", data.name)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error("Já existe um papel com este nome");
      }

      const code = data.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

      const { data: role, error } = await supabase
        .from("roles")
        .insert({
          company_id: currentCompany.id,
          code,
          name: data.name,
          description: data.description || null,
          is_system: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany.id,
        p_user_id: user?.id,
        p_action: "role_create",
        p_resource: "roles",
        p_resource_id: role.id,
        p_details: { name: data.name },
      });

      return role as Role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Papel criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    retry: 3,
  });
}

// =====================================================
// UPDATE ROLE
// =====================================================
export function useUpdateRole() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      description?: string;
      is_active?: boolean;
    }) => {
      const { id, ...updates } = data;

      // Check if system role
      const { data: role } = await supabase
        .from("roles")
        .select("is_system")
        .eq("id", id)
        .single();

      if (role?.is_system) {
        throw new Error("Papéis de sistema não podem ser alterados");
      }

      const { data: updated, error } = await supabase
        .from("roles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "role_update",
        p_resource: "roles",
        p_resource_id: id,
        p_details: updates,
      });

      return updated as Role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["role"] });
      toast.success("Papel atualizado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    retry: 3,
  });
}

// =====================================================
// DELETE ROLE
// =====================================================
export function useDeleteRole() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      roleId,
      reassignToRoleId,
    }: {
      roleId: string;
      reassignToRoleId?: string;
    }) => {
      // Check if system role
      const { data: role } = await supabase
        .from("roles")
        .select("is_system, name")
        .eq("id", roleId)
        .single();

      if (role?.is_system) {
        throw new Error("Papéis de sistema não podem ser excluídos");
      }

      // Reassign users if needed
      if (reassignToRoleId) {
        await supabase
          .from("user_profiles")
          .update({ role_id: reassignToRoleId })
          .eq("role_id", roleId)
          .eq("company_id", currentCompany?.id);
      }

      // Delete role permissions first
      await supabase.from("role_permissions").delete().eq("role_id", roleId);

      // Delete role
      const { error } = await supabase.from("roles").delete().eq("id", roleId);
      if (error) throw error;

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "role_delete",
        p_resource: "roles",
        p_resource_id: roleId,
        p_details: { name: role?.name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["user_profiles"] });
      toast.success("Papel excluído");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    retry: 3,
  });
}

// =====================================================
// DUPLICATE ROLE
// =====================================================
export function useDuplicateRole() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      sourceRoleId,
      newName,
    }: {
      sourceRoleId: string;
      newName: string;
    }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      // Get source role
      const { data: sourceRole, error: sourceError } = await supabase
        .from("roles")
        .select("*")
        .eq("id", sourceRoleId)
        .single();

      if (sourceError) throw sourceError;

      // Get source permissions
      const { data: sourcePermissions } = await supabase
        .from("role_permissions")
        .select("permission_id")
        .eq("role_id", sourceRoleId);

      // Create new role
      const code = newName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

      const { data: newRole, error: createError } = await supabase
        .from("roles")
        .insert({
          company_id: currentCompany.id,
          code,
          name: newName,
          description: `Baseado em: ${sourceRole.name}`,
          is_system: false,
          is_active: true,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Copy permissions
      if (sourcePermissions && sourcePermissions.length > 0) {
        await supabase.from("role_permissions").insert(
          sourcePermissions.map((sp) => ({
            role_id: newRole.id,
            permission_id: sp.permission_id,
          }))
        );
      }

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany.id,
        p_user_id: user?.id,
        p_action: "role_duplicate",
        p_resource: "roles",
        p_resource_id: newRole.id,
        p_details: { source_role_id: sourceRoleId, new_name: newName },
      });

      return newRole as Role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Papel duplicado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    retry: 3,
  });
}
