import { ReactNode } from 'react';
import { SidebarPro } from '@/components/navigation/SidebarPro';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { useSidebar } from '@/components/ui/sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayoutInner({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <SidebarPro />
      <CommandPalette />
      <main className="flex-1 min-h-screen p-6 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <NavigationProvider>
      <MainLayoutInner>{children}</MainLayoutInner>
    </NavigationProvider>
  );
}
