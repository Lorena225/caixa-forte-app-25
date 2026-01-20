import { ReactNode } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';

interface AppShellProps {
  children: ReactNode;
}

/**
 * AppShell - Legacy wrapper that now uses AppLayout
 * Maintained for backwards compatibility
 */
export function AppShell({ children }: AppShellProps) {
  return <AppLayout>{children}</AppLayout>;
}

export default AppShell;
