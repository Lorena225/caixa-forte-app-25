import { useMemo } from 'react';
import { useCanUserAction } from '@/hooks/usePermissions';

/**
 * Hook simples para verificar se o usuário tem acesso a uma permissão específica
 * @param permission - Código da permissão (ex: "configurar:usuarios")
 * @returns boolean - Se o usuário tem acesso
 */
export function useCanAccess(permission: string): boolean {
  const { data: userPermissions, isLoading } = useCanUserAction();
  
  return useMemo(() => {
    if (isLoading || !userPermissions) return false;
    return userPermissions.has(permission);
  }, [userPermissions, permission, isLoading]);
}

/**
 * Hook para verificar múltiplas permissões de uma vez
 * @param permissions - Array de códigos de permissões
 * @returns Record<string, boolean> - Objeto com cada permissão e seu status
 */
export function useCanAccessMultiple(permissions: string[]): Record<string, boolean> {
  const { data: userPermissions, isLoading } = useCanUserAction();
  
  return useMemo(() => {
    const result: Record<string, boolean> = {};
    
    for (const permission of permissions) {
      if (isLoading || !userPermissions) {
        result[permission] = false;
      } else {
        result[permission] = userPermissions.has(permission);
      }
    }
    
    return result;
  }, [userPermissions, permissions, isLoading]);
}

/**
 * Hook para verificar se o usuário tem QUALQUER uma das permissões
 * @param permissions - Array de códigos de permissões
 * @returns boolean - Se o usuário tem pelo menos uma das permissões
 */
export function useCanAccessAny(permissions: string[]): boolean {
  const { data: userPermissions, isLoading } = useCanUserAction();
  
  return useMemo(() => {
    if (isLoading || !userPermissions) return false;
    return permissions.some(p => userPermissions.has(p));
  }, [userPermissions, permissions, isLoading]);
}

/**
 * Hook para verificar se o usuário tem TODAS as permissões
 * @param permissions - Array de códigos de permissões
 * @returns boolean - Se o usuário tem todas as permissões
 */
export function useCanAccessAll(permissions: string[]): boolean {
  const { data: userPermissions, isLoading } = useCanUserAction();
  
  return useMemo(() => {
    if (isLoading || !userPermissions) return false;
    return permissions.every(p => userPermissions.has(p));
  }, [userPermissions, permissions, isLoading]);
}

export default useCanAccess;
