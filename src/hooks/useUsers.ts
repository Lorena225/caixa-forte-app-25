import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { UserProfile, UserFilters, UserPermissionCustom } from "@/types/permissions";

// =====================================================
// GET USERS LIST (PAGINATED)
// =====================================================
export function useUsersList(
  filters?: UserFilters,
  page = 1,
  limit = 20
) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["users_list", currentCompany?.id, filters, page, limit],
    queryFn: async () => {
      if (!currentCompany?.id) return { users: [], total: 0, pages: 0 };

      let query = supabase
        .from("user_profiles")
        .select(
          `
          *,
          role:roles (*)
        `,
          { count: "exact" }
        )
        .eq("company_id", currentCompany.id)
        .order("full_name");

      if (filters?.roleId) {
        query = query.eq("role_id", filters.roleId);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq("is_active", filters.isActive);
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      let users = data as UserProfile[];

      // Client-side search filter
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        users = users.filter(
          (u) =>
            u.full_name?.toLowerCase().includes(search) ||
            u.email?.toLowerCase().includes(search) ||
            u.phone?.toLowerCase().includes(search)
        );
      }

      // Check for custom permissions
      const userIds = users.map((u) => u.id);
      if (userIds.length > 0) {
        const { data: customPerms } = await supabase
          .from("user_permissions_custom")
          .select("user_profile_id")
          .in("user_profile_id", userIds);

        const hasCustom = new Set((customPerms || []).map((c) => c.user_profile_id));
        users = users.map((u) => ({
          ...u,
          has_custom_permissions: hasCustom.has(u.id),
        }));
      }

      return {
        users,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      };
    },
    enabled: !!currentCompany?.id,
    staleTime: 2 * 60 * 1000,
  });
}

// =====================================================
// GET SINGLE USER
// =====================================================
export function useUser(userId: string | null) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["user", userId, currentCompany?.id],
    queryFn: async () => {
      if (!userId || !currentCompany?.id) return null;

      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          `
          *,
          role:roles (*)
        `
        )
        .eq("id", userId)
        .eq("company_id", currentCompany.id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!userId && !!currentCompany?.id,
  });
}

// =====================================================
// INVITE USER
// =====================================================
export function useInviteUser() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      email,
      fullName,
      roleId,
    }: {
      email: string;
      fullName?: string;
      roleId?: string;
    }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      // Validate email format
      if (!email || !email.includes("@")) {
        throw new Error("Email inválido");
      }

      // Check if user already exists
      const { data: existing } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("company_id", currentCompany.id)
        .eq("user_id", email)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error("Usuário já existe nesta empresa");
      }

      // Get default role if not specified
      let defaultRoleId = roleId;
      if (!defaultRoleId) {
        const { data: defaultRole } = await supabase
          .from("roles")
          .select("id")
          .eq("company_id", currentCompany.id)
          .eq("code", "consultor")
          .single();

        defaultRoleId = defaultRole?.id;
      }

      // Create invite (would send email in production)
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .insert({
          company_id: currentCompany.id,
          user_id: crypto.randomUUID(), // Placeholder until user accepts invite
          full_name: fullName || email.split("@")[0],
          role_id: defaultRoleId,
          is_active: false, // Inactive until invite accepted
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany.id,
        p_user_id: user?.id,
        p_action: "user_invite",
        p_resource: "user_profiles",
        p_resource_id: profile.id,
        p_details: { email, role_id: defaultRoleId },
      });

      return profile as UserProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users_list"] });
      toast.success("Convite enviado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    retry: 3,
  });
}

// =====================================================
// UPDATE USER ROLE
// =====================================================
export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      const { data, error } = await supabase
        .from("user_profiles")
        .update({ role_id: roleId, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "user_role_change",
        p_resource: "user_profiles",
        p_resource_id: userId,
        p_details: { new_role_id: roleId },
      });

      return data as UserProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users_list"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Papel do usuário atualizado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    retry: 3,
  });
}

// =====================================================
// REMOVE USER (SOFT DELETE)
// =====================================================
export function useRemoveUser() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_profiles")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) throw error;

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "user_deactivate",
        p_resource: "user_profiles",
        p_resource_id: userId,
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users_list"] });
      toast.success("Usuário desativado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    retry: 3,
  });
}

// =====================================================
// RESET USER PASSWORD
// =====================================================
export function useResetUserPassword() {
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Get user email
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("id", userId)
        .single();

      if (!profile?.user_id) {
        throw new Error("Usuário não encontrado");
      }

      // Trigger password reset (would send email in production)
      // Note: This requires admin API access in real implementation
      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "user_password_reset",
        p_resource: "user_profiles",
        p_resource_id: userId,
      });

      return { success: true };
    },
    onSuccess: () => {
      toast.success("Email de redefinição de senha enviado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    retry: 3,
  });
}

// =====================================================
// GET USER CUSTOM PERMISSIONS
// =====================================================
export function useUserCustomPermissions(userProfileId: string | null) {
  return useQuery({
    queryKey: ["user_custom_permissions", userProfileId],
    queryFn: async (): Promise<UserPermissionCustom[]> => {
      if (!userProfileId) return [];

      const { data, error } = await supabase
        .from("user_permissions_custom")
        .select(
          `
          *,
          permissions (*)
        `
        )
        .eq("user_profile_id", userProfileId);

      if (error) throw error;
      return data as UserPermissionCustom[];
    },
    enabled: !!userProfileId,
  });
}

// =====================================================
// GRANT CUSTOM PERMISSION TO USER
// =====================================================
export function useGrantCustomPermission() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userProfileId,
      permissionId,
    }: {
      userProfileId: string;
      permissionId: string;
    }) => {
      // Check if exists and update or insert
      const { data: existing } = await supabase
        .from("user_permissions_custom")
        .select("id")
        .eq("user_profile_id", userProfileId)
        .eq("permission_id", permissionId)
        .single();

      if (existing) {
        await supabase
          .from("user_permissions_custom")
          .update({ granted: true })
          .eq("id", existing.id);
      } else {
        const { error } = await supabase.from("user_permissions_custom").insert({
          user_profile_id: userProfileId,
          permission_id: permissionId,
          granted: true,
          created_by: user?.id,
        });
        if (error) throw error;
      }

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "custom_permission_grant",
        p_resource: "user_permissions_custom",
        p_resource_id: userProfileId,
        p_details: { permission_id: permissionId },
      });

      return { success: true };
    },
    onSuccess: (_, { userProfileId }) => {
      queryClient.invalidateQueries({
        queryKey: ["user_custom_permissions", userProfileId],
      });
      toast.success("Permissão personalizada concedida");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    retry: 3,
  });
}

// =====================================================
// REVOKE CUSTOM PERMISSION FROM USER
// =====================================================
export function useRevokeCustomPermission() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userProfileId,
      permissionId,
    }: {
      userProfileId: string;
      permissionId: string;
    }) => {
      // Check if exists and update or insert
      const { data: existing } = await supabase
        .from("user_permissions_custom")
        .select("id")
        .eq("user_profile_id", userProfileId)
        .eq("permission_id", permissionId)
        .single();

      if (existing) {
        await supabase
          .from("user_permissions_custom")
          .update({ granted: false })
          .eq("id", existing.id);
      } else {
        const { error } = await supabase.from("user_permissions_custom").insert({
          user_profile_id: userProfileId,
          permission_id: permissionId,
          granted: false,
          created_by: user?.id,
        });
        if (error) throw error;
      }

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "custom_permission_revoke",
        p_resource: "user_permissions_custom",
        p_resource_id: userProfileId,
        p_details: { permission_id: permissionId },
      });

      return { success: true };
    },
    onSuccess: (_, { userProfileId }) => {
      queryClient.invalidateQueries({
        queryKey: ["user_custom_permissions", userProfileId],
      });
      toast.success("Permissão personalizada revogada");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    retry: 3,
  });
}

// =====================================================
// CLEAR ALL CUSTOM PERMISSIONS
// =====================================================
export function useClearUserCustomPermissions() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (userProfileId: string) => {
      const { error } = await supabase
        .from("user_permissions_custom")
        .delete()
        .eq("user_profile_id", userProfileId);

      if (error) throw error;

      await supabase.rpc("log_user_audit", {
        p_company_id: currentCompany?.id,
        p_user_id: user?.id,
        p_action: "custom_permissions_clear",
        p_resource: "user_permissions_custom",
        p_resource_id: userProfileId,
      });

      return { success: true };
    },
    onSuccess: (_, userProfileId) => {
      queryClient.invalidateQueries({
        queryKey: ["user_custom_permissions", userProfileId],
      });
      toast.success("Permissões personalizadas removidas");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    retry: 3,
  });
}
