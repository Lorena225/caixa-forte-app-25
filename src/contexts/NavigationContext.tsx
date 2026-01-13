import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useUserNavPreferences, 
  useActiveProfile, 
  useResolvedNavigation,
  useNavigationItems 
} from '@/hooks/useNavigation';
import { NavigationProfile, NavigationGroup, NavigationMenuItem, QuickAction } from '@/types/navigation';

interface NavigationContextType {
  // Sidebar state
  collapsed: boolean;
  toggleSidebar: () => void;
  
  // Groups
  groups: NavigationGroup[];
  toggleGroup: (groupKey: string) => void;
  
  // Favorites
  favorites: NavigationMenuItem[];
  toggleFavorite: (itemKey: string) => void;
  
  // Profile
  activeProfile: NavigationProfile | undefined;
  setActiveProfile: (profileKey: string) => void;
  quickActions: QuickAction[];
  
  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  
  // Navigation
  navigateTo: (route: string, itemKey?: string) => void;
  
  // Loading
  isLoading: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  
  const {
    preferences,
    isLoading,
    toggleSidebar,
    toggleGroup,
    toggleFavorite,
    setActiveProfile,
  } = useUserNavPreferences();
  
  const activeProfile = useActiveProfile();
  const { groups, favorites } = useResolvedNavigation();
  
  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const navigateTo = useCallback((route: string, itemKey?: string) => {
    navigate(route);
    setCommandPaletteOpen(false);
  }, [navigate]);
  
  const value: NavigationContextType = {
    collapsed: preferences?.sidebar_collapsed || false,
    toggleSidebar,
    groups,
    toggleGroup,
    favorites,
    toggleFavorite,
    activeProfile,
    setActiveProfile,
    quickActions: activeProfile?.quick_actions || [],
    commandPaletteOpen,
    setCommandPaletteOpen,
    navigateTo,
    isLoading,
  };
  
  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
