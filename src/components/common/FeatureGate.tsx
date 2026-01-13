import React from 'react';
import { useIsFeatureEnabled } from '@/hooks/useSystemTier';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * Component that gates access to features based on company feature flags.
 * If the feature is disabled, shows a fallback or upgrade prompt.
 */
export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const isEnabled = useIsFeatureEnabled(feature);

  if (isEnabled) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-5 w-5" />
            Módulo Desativado
          </CardTitle>
          <CardDescription>
            Este recurso não está habilitado no nível atual do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/admin/nivel-sistema">
              <Sparkles className="mr-2 h-4 w-4" />
              Configurar Nível do Sistema
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

/**
 * Hook-style gate that returns whether a feature is enabled.
 * Use this for conditional rendering without JSX wrapper.
 */
export function useFeatureGate(feature: string): boolean {
  return useIsFeatureEnabled(feature);
}

/**
 * Component to hide menu items based on feature flags.
 * Returns null if feature is disabled, children otherwise.
 */
export function FeatureMenuItem({ 
  feature, 
  children 
}: { 
  feature: string; 
  children: React.ReactNode;
}) {
  const isEnabled = useIsFeatureEnabled(feature);
  return isEnabled ? <>{children}</> : null;
}
