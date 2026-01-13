import { ReactNode } from 'react';
import { NavigationProvider, useNavigation } from '@/contexts/NavigationContext';
import { SidebarPro } from '@/components/navigation/SidebarPro';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const { collapsed } = useNavigation();

  return (
    <div className="min-h-screen bg-background">
      <SidebarPro />
      <CommandPalette />
      <main
        className={cn(
          'min-h-screen p-6 transition-all duration-300',
          collapsed ? 'ml-16' : 'ml-64'
        )}
      >
        {children}
      </main>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <NavigationProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </NavigationProvider>
  );
}
