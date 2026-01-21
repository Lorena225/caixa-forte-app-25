import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Lock } from 'lucide-react';
import { useCanAccess, useCanAccessAny } from '@/hooks/useCanAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCanUserAction } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  /** Permissão requerida (ex: "configurar:usuarios") */
  requiredPermission?: string;
  /** Múltiplas permissões - usuário precisa ter QUALQUER uma */
  anyPermission?: string[];
  /** Múltiplas permissões - usuário precisa ter TODAS */
  allPermissions?: string[];
  /** Componente de fallback quando sem permissão */
  fallback?: React.ReactNode;
  /** Redirecionar para outra página após X segundos (padrão: 3s, 0 = não redirecionar) */
  redirectAfter?: number;
  /** URL para redirecionamento (padrão: '/') */
  redirectTo?: string;
  /** Componente filho a renderizar se tiver permissão */
  children: React.ReactNode;
  /** Mostrar loading enquanto verifica permissões */
  showLoading?: boolean;
}

function AccessDeniedFallback({ 
  redirectAfter = 3, 
  redirectTo = '/' 
}: { 
  redirectAfter?: number; 
  redirectTo?: string; 
}) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(redirectAfter);

  useEffect(() => {
    if (redirectAfter <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(redirectTo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, redirectAfter, redirectTo]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl text-destructive">
            Acesso Negado
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
          <p className="text-sm text-muted-foreground">
            Entre em contato com o administrador do sistema se você acredita que deveria ter acesso.
          </p>
          
          {redirectAfter > 0 && (
            <p className="text-sm text-muted-foreground">
              Redirecionando em <span className="font-bold text-foreground">{countdown}</span> segundos...
            </p>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button 
              onClick={() => navigate(redirectTo)} 
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Início
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)} 
              className="w-full"
            >
              Voltar à Página Anterior
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted animate-pulse">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <Skeleton className="h-6 w-48 mx-auto" />
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
        </CardContent>
      </Card>
    </div>
  );
}

export function PermissionGuard({
  requiredPermission,
  anyPermission,
  allPermissions,
  fallback,
  redirectAfter = 3,
  redirectTo = '/',
  children,
  showLoading = true,
}: PermissionGuardProps) {
  const { isLoading } = useCanUserAction();
  
  // Check single permission
  const hasSinglePermission = useCanAccess(requiredPermission || '');
  
  // Check any permission
  const hasAnyPermission = useCanAccessAny(anyPermission || []);
  
  // For allPermissions, we need to check individually
  const hasAllPermissions = useCanAccessAny(allPermissions || []);

  // Loading state
  if (isLoading && showLoading) {
    return <LoadingSkeleton />;
  }

  // Determine access
  let hasAccess = false;

  if (requiredPermission) {
    hasAccess = hasSinglePermission;
  } else if (anyPermission && anyPermission.length > 0) {
    hasAccess = hasAnyPermission;
  } else if (allPermissions && allPermissions.length > 0) {
    hasAccess = hasAllPermissions;
  } else {
    // No permission specified, allow access
    hasAccess = true;
  }

  // If has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // If fallback provided, render it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default: render access denied screen
  return (
    <AccessDeniedFallback 
      redirectAfter={redirectAfter} 
      redirectTo={redirectTo} 
    />
  );
}

/**
 * HOC para envolver componentes com verificação de permissão
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermission: string
) {
  return function PermissionWrapper(props: P) {
    return (
      <PermissionGuard requiredPermission={requiredPermission}>
        <WrappedComponent {...props} />
      </PermissionGuard>
    );
  };
}

export default PermissionGuard;
