import { ReactNode } from 'react';
import { SidebarPro } from '@/components/navigation/SidebarPro';
import { CommandPalette } from '@/components/navigation/CommandPalette';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
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
