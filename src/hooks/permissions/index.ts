// =====================================================
// PERMISSION SYSTEM - CENTRALIZED EXPORTS
// =====================================================

// Types
export type {
  Role,
  Permission,
  PermissionAction,
  RolePermission,
  UserProfile,
  UserPermissionCustom,
  UserAuditLog,
  PermissionFilters,
  UserFilters,
  AuditFilters,
  PermissionsByModule,
  PermissionMatrix,
} from "@/types/permissions";

// Role Hooks
export {
  useRoles,
  useRole,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useDuplicateRole,
} from "@/hooks/useRoles";

// Permission Hooks
export {
  usePermissions,
  usePermissionsByModule,
  useRolePermissions,
  useGrantPermissionToRole,
  useRevokePermissionFromRole,
  useUpdateRolePermissions,
  useCanUserAction,
  useHasPermission,
  useHasPermissions,
} from "@/hooks/usePermissions";

// User Hooks
export {
  useUsersList,
  useUser,
  useInviteUser,
  useUpdateUserRole,
  useRemoveUser,
  useResetUserPassword,
  useUserCustomPermissions,
  useGrantCustomPermission,
  useRevokeCustomPermission,
  useClearUserCustomPermissions,
} from "@/hooks/useUsers";

// Access Control Hooks
export {
  useCanAccess,
  useCanAccessMultiple,
  useCanAccessAny,
  useCanAccessAll,
} from "@/hooks/useCanAccess";
