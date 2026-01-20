// =====================================================
// PERMISSION SYSTEM TYPES
// =====================================================

export type PermissionAction = 'ver' | 'criar' | 'editar' | 'deletar' | 'aprovar' | 'configurar';

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
  user_count?: number;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  resource: string | null;
  action: PermissionAction | string | null;
  description: string | null;
  is_active: boolean | null;
  created_at?: string;
}

export interface RolePermission {
  id?: string;
  role_id: string;
  permission_id: string;
  granted_at?: string;
  permissions?: Permission;
}

export interface UserProfile {
  id: string;
  user_id: string;
  company_id: string;
  role_id: string | null;
  full_name: string | null;
  email?: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  has_custom_permissions?: boolean;
  access_expires_at: string | null;
  last_access_at: string | null;
  created_at: string;
  updated_at: string;
  role?: Role | null;
}

export interface UserPermissionCustom {
  id: string;
  user_profile_id: string;
  permission_id: string;
  granted: boolean;
  created_by?: string | null;
  created_at?: string;
  permissions?: Permission;
}

export interface UserAuditLog {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  success: boolean;
  created_at: string;
  user_name?: string;
}

// =====================================================
// FILTER TYPES
// =====================================================

export interface PermissionFilters {
  module?: string;
  action?: PermissionAction;
  search?: string;
}

export interface UserFilters {
  search?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface AuditFilters {
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

// =====================================================
// GROUPED PERMISSIONS
// =====================================================

export interface PermissionsByModule {
  [module: string]: Permission[];
}

export interface PermissionMatrix {
  roleId: string;
  permissionIds: string[];
}
