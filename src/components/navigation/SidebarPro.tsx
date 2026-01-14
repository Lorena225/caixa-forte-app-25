import { memo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useNavigation } from '@/contexts/NavigationContext';
import { 
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, 
  Star, Command, X, Menu,
  LayoutDashboard, ReceiptText, ArrowDownToLine, ArrowUpFromLine,
  Wallet, TrendingUp, Target, CreditCard, BookOpen, Landmark,
  FileCheck2, BarChart3, Gauge, LineChart, ChartColumn, PieChart,
  FileBarChart, CalendarClock, Calculator, Sparkles, Inbox,
  MessageCircle, Bot, Wand2, Database, ListTree, Network, Users,
  Layers, Plug, ArrowLeftRight, Settings, PanelLeft, Search, Blocks,
  ShoppingCart, Plus, FileText, ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Icon map
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, ReceiptText, ArrowDownToLine, ArrowUpFromLine,
  Wallet, TrendingUp, Target, CreditCard, BookOpen, Landmark,
  FileCheck2, BarChart3, Gauge, LineChart, ChartColumn, PieChart,
  FileBarChart, CalendarClock, Calculator, Sparkles, Inbox,
  MessageCircle, Bot, Wand2, Database, ListTree, Network, Users,
  Layers, Plug, ArrowLeftRight, Settings, PanelLeft, Search, Blocks,
  ShoppingCart, Plus, FileText, ClipboardList,
};

const getIcon = (iconName: string) => iconMap[iconName] || LayoutDashboard;

export const SidebarPro = memo(function SidebarPro() {
  const location = useLocation();
  const {
    collapsed,
    toggleSidebar,
    groups,
    toggleGroup,
    favorites,
    toggleFavorite,
    navigateTo,
    setCommandPaletteOpen,
    isMobile,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useNavigation();

  // Close mobile menu on route change (only on mobile)
  useEffect(() => {
    if (isMobile && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3 shrink-0">
        {(!collapsed || isMobile) && (
          <span className="text-base font-semibold text-sidebar-foreground">ERP Pro</span>
        )}
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Command Palette Trigger */}
      <div className="px-3 py-2 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start gap-2 text-muted-foreground bg-sidebar-accent/50 border-sidebar-border hover:bg-sidebar-accent',
                collapsed && !isMobile && 'justify-center px-0'
              )}
              onClick={() => {
                setCommandPaletteOpen(true);
                if (isMobile) setMobileMenuOpen(false);
              }}
            >
              <Command className="h-4 w-4 shrink-0" />
              {(!collapsed || isMobile) && (
                <>
                  <span className="flex-1 text-left text-sm">Buscar...</span>
                  <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-sidebar-accent px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </>
              )}
            </Button>
          </TooltipTrigger>
          {collapsed && !isMobile && <TooltipContent side="right">Buscar (Ctrl+K)</TooltipContent>}
        </Tooltip>
      </div>

      <ScrollArea className="flex-1 px-3">
        {/* Favorites Section */}
        {favorites.length > 0 && (
          <div className="mb-4">
            {(!collapsed || isMobile) && (
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-sidebar-foreground/60">
                <Star className="h-3 w-3" />
                Favoritos
              </div>
            )}
            <div className="space-y-1">
              {favorites.map((item) => (
                <SidebarItem
                  key={item.key}
                  item={item}
                  collapsed={collapsed && !isMobile}
                  isActive={location.pathname === item.route}
                  onNavigate={() => navigateTo(item.route, item.key)}
                  onToggleFavorite={() => toggleFavorite(item.key)}
                  showFavorite
                />
              ))}
            </div>
            <Separator className="my-3 bg-sidebar-border" />
          </div>
        )}

        {/* Navigation Groups */}
        <div className="space-y-2 pb-4">
          {groups.map((group) => (
            <SidebarGroup
              key={group.key}
              group={group}
              collapsed={collapsed && !isMobile}
              onToggle={() => toggleGroup(group.key)}
              onNavigate={navigateTo}
              onToggleFavorite={toggleFavorite}
              currentPath={location.pathname}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  // Mobile: Use Sheet (drawer)
  if (isMobile) {
    return (
      <TooltipProvider delayDuration={0}>
        {/* Mobile Menu Trigger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          className="fixed left-4 top-3 z-50 h-10 w-10 bg-background shadow-md border md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile Drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent 
            side="left" 
            className="w-[280px] p-0 bg-sidebar border-sidebar-border"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Menu de Navegação</SheetTitle>
            </SheetHeader>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </TooltipProvider>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300 hidden md:block',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </TooltipProvider>
  );
});

interface SidebarItemProps {
  item: {
    key: string;
    label: string;
    route: string;
    icon: string;
    isFavorite?: boolean;
  };
  collapsed: boolean;
  isActive: boolean;
  onNavigate: () => void;
  onToggleFavorite?: () => void;
  showFavorite?: boolean;
}

const SidebarItem = memo(function SidebarItem({
  item,
  collapsed,
  isActive,
  onNavigate,
  onToggleFavorite,
  showFavorite,
}: SidebarItemProps) {
  const Icon = getIcon(item.icon);

  const button = (
    <button
      onClick={onNavigate}
      className={cn(
        'group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-primary/20 text-sidebar-primary'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">{item.label}</span>
          {showFavorite && onToggleFavorite && (
            <Star
              className={cn(
                'h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100',
                item.isFavorite && 'fill-yellow-400 text-yellow-400 opacity-100'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
            />
          )}
        </>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
});

interface SidebarGroupProps {
  group: {
    key: string;
    label: string;
    icon: string;
    isOpen: boolean;
    items: {
      key: string;
      label: string;
      route: string;
      icon: string;
      isFavorite?: boolean;
      children?: {
        key: string;
        label: string;
        route: string;
        icon: string;
        isFavorite?: boolean;
      }[];
    }[];
  };
  collapsed: boolean;
  onToggle: () => void;
  onNavigate: (route: string, key: string) => void;
  onToggleFavorite: (key: string) => void;
  currentPath: string;
}

const SidebarGroup = memo(function SidebarGroup({
  group,
  collapsed,
  onToggle,
  onNavigate,
  onToggleFavorite,
  currentPath,
}: SidebarGroupProps) {
  const Icon = getIcon(group.icon);
  const hasActiveChild = group.items.some(
    item => currentPath === item.route || item.children?.some(c => currentPath === c.route)
  );

  if (collapsed) {
    // In collapsed mode, show only the group icon with tooltip
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onToggle}
            className={cn(
              'flex w-full items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
              hasActiveChild
                ? 'bg-sidebar-primary/20 text-sidebar-primary'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col gap-1">
          <span className="font-semibold">{group.label}</span>
          {group.items.slice(0, 5).map(item => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.route, item.key)}
              className="text-left text-xs hover:text-primary"
            >
              {item.label}
            </button>
          ))}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Collapsible open={group.isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            hasActiveChild
              ? 'text-sidebar-primary'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{group.label}</span>
          {group.isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4">
        <div className="mt-1 space-y-1 border-l border-sidebar-border pl-3">
          {group.items.map((item) => (
            <div key={item.key}>
              <SidebarItem
                item={item}
                collapsed={false}
                isActive={currentPath === item.route}
                onNavigate={() => onNavigate(item.route, item.key)}
                onToggleFavorite={() => onToggleFavorite(item.key)}
              />
              {/* Nested children */}
              {item.children && item.children.length > 0 && (
                <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                  {item.children.map((child) => (
                    <SidebarItem
                      key={child.key}
                      item={child}
                      collapsed={false}
                      isActive={currentPath === child.route}
                      onNavigate={() => onNavigate(child.route, child.key)}
                      onToggleFavorite={() => onToggleFavorite(child.key)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
