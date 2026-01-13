import { ReactNode } from 'react';
import { SidebarPro } from '@/components/navigation/SidebarPro';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import { useNavigation } from '@/contexts/NavigationContext';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
}

/**
 * AppShell - Main layout wrapper for all pages
 * Provides:
 * - Responsive sidebar (drawer on mobile, collapsible on desktop)
 * - Consistent content padding
 * - Command palette
 * - Safe area handling for mobile
 */
export function AppShell({ children }: AppShellProps) {
  const { collapsed, isMobile } = useNavigation();

  return (
    <div className="min-h-screen-safe bg-background flex w-full">
      <SidebarPro />
      <CommandPalette />
      
      {/* Main Content Area */}
      <main
        className={cn(
          'flex-1 min-h-screen-safe transition-all duration-300',
          // On mobile, full width (sidebar is overlay)
          // On desktop, offset by sidebar width
          !isMobile && (collapsed ? 'md:pl-16' : 'md:pl-64')
        )}
      >
        {/* Responsive Container */}
        <div className="app-container page-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AppShell;
