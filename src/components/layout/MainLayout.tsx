import { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * MainLayout - Wrapper component that uses AppShell
 * Maintained for backwards compatibility with existing pages
 */
export function MainLayout({ children }: MainLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
