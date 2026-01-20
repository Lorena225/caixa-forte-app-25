import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// =====================================================
// TYPES
// =====================================================
export interface Role {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  resource: string | null;
  action: string | null;
  description: string | null;
  is_active: boolean | null;
}

export interface UserProfile {
  id: string;
  user_id: string;
  company_id: string;
  role_id: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  access_expires_at: string | null;
  last_access_at: string | null;
  created_at: string;
  updated_at: string;
  role?: Role | null;
  email?: string;
}

export interface UserAuditLog {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  details: Record<string, any> | null;
  success: boolean;
  created_at: string;
}

// =====================================================
// ROLES HOOKS
// =====================================================
export function useRoles() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ["roles", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("name");
      
      if (error) throw error;
      return data as Role[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; code?: string }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      // Generate code from name if not provided
      const code = data.code || data.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

      const { data: role, error } = await supabase
        .from("roles")
        .insert({
          company_id: currentCompany.id,
          code: code,
          name: data.name,
          description: data.description || null,
          is_system: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany.id,
        p_user_id: user?.id,
        p_action: "role_create",
        p_resource: "roles",
        p_resource_id: role.id,
        p_details: { name: data.name },
      });

      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Papel criado com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar papel: " + error.message);
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (data: { id: string; name?: string; description?: string; is_active?: boolean }) => {
      const { id, ...updates } = data;

      const { data: role, error } = await supabase
        .from("roles")
        .update(updates)
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

      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Papel atualizado");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar papel: " + error.message);
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("roles").delete().eq("id", roleId);
      if (error) throw error;

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "role_delete",
        p_resource: "roles",
        p_resource_id: roleId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Papel excluído");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir papel: " + error.message);
    },
  });
}

// =====================================================
// PERMISSIONS HOOKS
// =====================================================
export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .eq("is_active", true)
        .order("module")
        .order("name");

      if (error) throw error;
      return data as Permission[];
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
  });
}

export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: ["role_permissions", roleId],
    queryFn: async () => {
      if (!roleId) return [];

      const { data, error } = await supabase
        .from("role_permissions")
        .select(`
          id,
          permission_id,
          permissions (*)
        `)
        .eq("role_id", roleId);

      if (error) throw error;
      return data;
    },
    enabled: !!roleId,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
      // Remove all existing
      await supabase.from("role_permissions").delete().eq("role_id", roleId);

      // Add new ones
      if (permissionIds.length > 0) {
        const { error } = await supabase.from("role_permissions").insert(
          permissionIds.map((pid) => ({ role_id: roleId, permission_id: pid }))
        );
        if (error) throw error;
      }

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "role_permissions_update",
        p_resource: "role_permissions",
        p_resource_id: roleId,
        p_details: { permission_count: permissionIds.length },
      });
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ["role_permissions", roleId] });
      toast.success("Permissões atualizadas");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar permissões: " + error.message);
    },
  });
}

// =====================================================
// USER PROFILES HOOKS
// =====================================================
export function useUserProfiles() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["user_profiles", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from("user_profiles")
        .select(`
          *,
          role:roles (*)
        `)
        .eq("company_id", currentCompany.id)
        .order("full_name");

      if (error) throw error;
      return data as UserProfile[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateUserProfile() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      user_id: string;
      full_name?: string;
      phone?: string;
      role_id?: string;
      access_expires_at?: string;
    }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .insert({
          ...data,
          company_id: currentCompany.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany.id,
        p_user_id: user?.id,
        p_action: "user_profile_create",
        p_resource: "user_profiles",
        p_resource_id: profile.id,
        p_details: { target_user: data.user_id },
      });

      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_profiles"] });
      toast.success("Perfil de usuário criado");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar perfil: " + error.message);
    },
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      full_name?: string;
      phone?: string;
      role_id?: string | null;
      is_active?: boolean;
      access_expires_at?: string | null;
    }) => {
      const { id, ...updates } = data;

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "user_profile_update",
        p_resource: "user_profiles",
        p_resource_id: id,
        p_details: updates,
      });

      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_profiles"] });
      toast.success("Perfil atualizado");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar perfil: " + error.message);
    },
  });
}

export function useDeleteUserProfile() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase.from("user_profiles").delete().eq("id", profileId);
      if (error) throw error;

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "user_profile_delete",
        p_resource: "user_profiles",
        p_resource_id: profileId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_profiles"] });
      toast.success("Perfil removido");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover perfil: " + error.message);
    },
  });
}

// =====================================================
// CUSTOM USER PERMISSIONS
// =====================================================
export function useUserCustomPermissions(userProfileId: string | null) {
  return useQuery({
    queryKey: ["user_custom_permissions", userProfileId],
    queryFn: async () => {
      if (!userProfileId) return [];

      const { data, error } = await supabase
        .from("user_permissions_custom")
        .select(`
          id,
          permission_id,
          granted,
          permissions (*)
        `)
        .eq("user_profile_id", userProfileId);

      if (error) throw error;
      return data;
    },
    enabled: !!userProfileId,
  });
}

export function useUpdateUserCustomPermissions() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userProfileId,
      addPermissions,
      removePermissions,
    }: {
      userProfileId: string;
      addPermissions: string[];
      removePermissions: string[];
    }) => {
      // Clear existing custom permissions for this profile
      await supabase.from("user_permissions_custom").delete().eq("user_profile_id", userProfileId);

      const inserts = [
        ...addPermissions.map((pid) => ({
          user_profile_id: userProfileId,
          permission_id: pid,
          granted: true,
          created_by: user?.id,
        })),
        ...removePermissions.map((pid) => ({
          user_profile_id: userProfileId,
          permission_id: pid,
          granted: false,
          created_by: user?.id,
        })),
      ];

      if (inserts.length > 0) {
        const { error } = await supabase.from("user_permissions_custom").insert(inserts);
        if (error) throw error;
      }

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "user_custom_permissions_update",
        p_resource: "user_permissions_custom",
        p_resource_id: userProfileId,
        p_details: { added: addPermissions.length, removed: removePermissions.length },
      });
    },
    onSuccess: (_, { userProfileId }) => {
      queryClient.invalidateQueries({ queryKey: ["user_custom_permissions", userProfileId] });
      toast.success("Permissões personalizadas atualizadas");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar permissões: " + error.message);
    },
  });
}

// =====================================================
// AUDIT LOG
// =====================================================
export function useUserAuditLog(filters?: { userId?: string; action?: string; limit?: number }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["user_audit_log", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from("user_audit_log")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.userId) {
        query = query.eq("user_id", filters.userId);
      }
      if (filters?.action) {
        query = query.eq("action", filters.action);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UserAuditLog[];
    },
    enabled: !!currentCompany?.id,
  });
}

// =====================================================
// GROUPED PERMISSIONS BY MODULE
// =====================================================
export function usePermissionsByModule() {
  const { data: permissions } = usePermissions();

  const grouped = (permissions || []).reduce((acc, perm) => {
    const module = perm.module || "Outros";
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return grouped;
}
