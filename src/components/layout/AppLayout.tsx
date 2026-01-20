import { ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import CopilotWidget from '@/components/CopilotWidget';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import { useNavigation } from '@/contexts/NavigationContext';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * AppLayout - Complete layout wrapper with Header, Sidebar, and CopilotWidget
 * Provides:
 * - Fixed Header at top
 * - Responsive Sidebar (drawer on mobile, collapsible on desktop)
 * - Main content area with proper padding
 * - CopilotWidget fixed at bottom-right
 * - Command palette for quick navigation
 */
export function AppLayout({ children }: AppLayoutProps) {
  const { collapsed, isMobile } = useNavigation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed Header */}
      <Header />
      
      <div className="flex flex-1 pt-14">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Command Palette */}
        <CommandPalette />
        
        {/* Main Content Area */}
        <main
          className={cn(
            'flex-1 min-h-[calc(100vh-3.5rem)] transition-all duration-300',
            // On mobile, full width (sidebar is overlay)
            // On desktop, offset by sidebar width
            !isMobile && (collapsed ? 'md:pl-16' : 'md:pl-64')
          )}
        >
          {/* Responsive Container */}
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* CopilotWidget - Always visible, fixed bottom-right */}
      <CopilotWidget />
    </div>
  );
}

export default AppLayout;
