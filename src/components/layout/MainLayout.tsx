import { ReactNode } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * MainLayout - Wrapper component that uses AppLayout
 * Maintained for backwards compatibility with existing pages
 */
export function MainLayout({ children }: MainLayoutProps) {
  return <AppLayout>{children}</AppLayout>;
}
