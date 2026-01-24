import { ReactNode } from 'react';
import SidebarEnterprise, { useSidebarCollapse } from '@/components/SidebarEnterprise';
import { Header } from '@/components/Header';
import CopilotWidget from '@/components/CopilotWidget';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import { SkipLinks } from '@/components/common/SkipLinks';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * AppLayout - Complete layout wrapper with Header, Sidebar, and CopilotWidget
 * WCAG 2.1 AA Accessible with skip links and proper ARIA landmarks
 * Provides:
 * - Fixed Header at top (64px desktop, 56px mobile)
 * - Responsive Sidebar (drawer on mobile, collapsible on desktop)
 * - Main content area with proper padding
 * - CopilotWidget fixed at bottom-right
 * - Command palette for quick navigation
 * - Skip links for keyboard navigation
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip Links for Accessibility */}
      <SkipLinks />
      
      {/* Fixed Header - Always on top */}
      <Header />
      
      {/* Sidebar Navigation - Fixed position, below header */}
      <SidebarEnterprise />
      
      {/* Command Palette */}
      <CommandPalette />
      
      {/* Main Content Area - Offset for header and sidebar */}
      <MainContent>{children}</MainContent>
      
      {/* CopilotWidget - Always visible, fixed bottom-right */}
      <CopilotWidget />
    </div>
  );
}

// Separate component to use sidebar context
function MainContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebarCollapse();
  
  return (
    <main
      id="main-content"
      role="main"
      aria-label="Conteúdo principal"
      tabIndex={-1}
      className={cn(
        'flex-1 min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] transition-all duration-300',
        'pt-14 sm:pt-16', // Offset for fixed header (56px mobile, 64px desktop)
        // On mobile, full width (sidebar is overlay)
        // On desktop, offset by sidebar width (64px collapsed, 280px expanded)
        collapsed ? 'md:pl-16' : 'md:pl-[280px]'
      )}
    >
      {/* Responsive Container */}
      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        {children}
      </div>
    </main>
  );
}

export default AppLayout;

// Re-export useSidebarCollapse for backward compatibility
export { useSidebarCollapse };
