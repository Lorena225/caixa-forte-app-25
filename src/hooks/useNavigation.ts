import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { NavigationItem, NavigationProfile, UserNavPreferences } from '@/types/navigation';

const PREFS_STORAGE_KEY = 'erp_nav_prefs';

export function useNavigationItems() {
  return useQuery({
    queryKey: ['navigation-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('navigation_items')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as NavigationItem[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useNavigationProfiles() {
  return useQuery({
    queryKey: ['navigation-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('navigation_profiles')
        .select('*');
      if (error) throw error;
      return data.map(p => ({
        ...p,
        label_overrides: (p.label_overrides || {}) as Record<string, string>,
        quick_actions: (p.quick_actions || []) as unknown as NavigationProfile['quick_actions'],
        dashboard_layout: (p.dashboard_layout || { default_filters: { date_preset: 'MTD', scope: 'company' }, widgets_order: [] }) as unknown as NavigationProfile['dashboard_layout'],
      })) as NavigationProfile[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useUserNavPreferences() {
  const { user, currentCompany } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-nav-preferences', user?.id, currentCompany?.id],
    queryFn: async () => {
      if (!user?.id || !currentCompany?.id) return null;
      
      const { data, error } = await supabase
        .from('user_nav_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', currentCompany.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        return data as UserNavPreferences;
      }
      
      // Fallback to localStorage
      const stored = localStorage.getItem(`${PREFS_STORAGE_KEY}_${currentCompany.id}`);
      if (stored) {
        return JSON.parse(stored) as UserNavPreferences;
      }
      
      // Default preferences
      return {
        id: '',
        user_id: user.id,
        company_id: currentCompany.id,
        sidebar_collapsed: false,
        collapsed_groups: [],
        favorite_keys: [],
        recent_keys: [],
        active_profile_key: 'PROFILE_ADMIN',
      } as UserNavPreferences;
    },
    enabled: !!user?.id && !!currentCompany?.id,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<UserNavPreferences>) => {
      if (!user?.id || !currentCompany?.id) return;
      
      const newPrefs = {
        ...query.data,
        ...updates,
        user_id: user.id,
        company_id: currentCompany.id,
      };
      
      // Save to localStorage as fallback
      localStorage.setItem(`${PREFS_STORAGE_KEY}_${currentCompany.id}`, JSON.stringify(newPrefs));
      
      // Try to save to DB
      const { error } = await supabase
        .from('user_nav_preferences')
        .upsert({
          user_id: user.id,
          company_id: currentCompany.id,
          ...updates,
        }, {
          onConflict: 'user_id,company_id',
        });
      
      if (error) {
        console.warn('Failed to save nav preferences to DB, using localStorage:', error);
      }
      
      return newPrefs;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-nav-preferences'] });
    },
  });

  const toggleSidebar = () => {
    updatePreferences.mutate({ sidebar_collapsed: !query.data?.sidebar_collapsed });
  };

  const toggleGroup = (groupKey: string) => {
    const collapsed = query.data?.collapsed_groups || [];
    const newCollapsed = collapsed.includes(groupKey)
      ? collapsed.filter(k => k !== groupKey)
      : [...collapsed, groupKey];
    updatePreferences.mutate({ collapsed_groups: newCollapsed });
  };

  const toggleFavorite = (itemKey: string) => {
    const favorites = query.data?.favorite_keys || [];
    const newFavorites = favorites.includes(itemKey)
      ? favorites.filter(k => k !== itemKey)
      : [...favorites, itemKey];
    updatePreferences.mutate({ favorite_keys: newFavorites });
  };

  const addRecent = (itemKey: string) => {
    const recents = query.data?.recent_keys || [];
    const newRecents = [itemKey, ...recents.filter(k => k !== itemKey)].slice(0, 5);
    updatePreferences.mutate({ recent_keys: newRecents });
  };

  const setActiveProfile = (profileKey: string) => {
    updatePreferences.mutate({ active_profile_key: profileKey });
  };

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    toggleSidebar,
    toggleGroup,
    toggleFavorite,
    addRecent,
    setActiveProfile,
    updatePreferences: updatePreferences.mutate,
  };
}

export function useActiveProfile() {
  const { preferences } = useUserNavPreferences();
  const { data: profiles } = useNavigationProfiles();
  
  return profiles?.find(p => p.profile_key === preferences?.active_profile_key) || profiles?.[5]; // Default to Admin
}

export function useResolvedNavigation() {
  const { data: items } = useNavigationItems();
  const { preferences } = useUserNavPreferences();
  const activeProfile = useActiveProfile();
  
  if (!items || !activeProfile) return { groups: [], favorites: [], recents: [] };
  
  const labelOverrides = activeProfile.label_overrides || {};
  const visibleKeys = activeProfile.visible_keys_ordered || [];
  const favoriteKeys = preferences?.favorite_keys || [];
  const recentKeys = preferences?.recent_keys || [];
  
  // Build item map with resolved labels
  const itemMap = new Map(items.map(item => [
    item.key,
    {
      ...item,
      label: labelOverrides[item.key] || item.label_default,
    },
  ]));
  
  // Filter to visible items only
  const visibleItems = items
    .filter(item => !item.hidden_by_default)
    .filter(item => {
      // Groups are always visible if they have visible children
      if (!item.parent_key) return true;
      // Items must be in visible_keys or be a group
      return visibleKeys.includes(item.key) || item.key.startsWith('group.');
    });
  
  // Build groups
  const groups = visibleItems
    .filter(item => item.key.startsWith('group.'))
    .map(group => ({
      key: group.key,
      label: labelOverrides[group.key] || group.label_default,
      icon: group.icon,
      isOpen: !(preferences?.collapsed_groups || []).includes(group.key),
      items: visibleItems
        .filter(item => item.parent_key === group.key && !item.key.includes('.panels.'))
        .map(item => ({
          key: item.key,
          label: labelOverrides[item.key] || item.label_default,
          route: item.route || '',
          icon: item.icon,
          isFavorite: favoriteKeys.includes(item.key),
          isRecent: recentKeys.includes(item.key),
          children: visibleItems
            .filter(child => child.parent_key === item.key)
            .map(child => ({
              key: child.key,
              label: labelOverrides[child.key] || child.label_default,
              route: child.route || '',
              icon: child.icon,
              isFavorite: favoriteKeys.includes(child.key),
              isRecent: recentKeys.includes(child.key),
            })),
        })),
    }))
    .filter(group => group.items.length > 0);
  
  // Build favorites list
  const favorites = favoriteKeys
    .map(key => itemMap.get(key))
    .filter(Boolean)
    .map(item => ({
      key: item!.key,
      label: labelOverrides[item!.key] || item!.label_default,
      route: item!.route || '',
      icon: item!.icon,
      isFavorite: true,
      isRecent: false,
    }));
  
  // Build recents list
  const recents = recentKeys
    .map(key => itemMap.get(key))
    .filter(Boolean)
    .filter(item => !favoriteKeys.includes(item!.key))
    .slice(0, 3)
    .map(item => ({
      key: item!.key,
      label: labelOverrides[item!.key] || item!.label_default,
      route: item!.route || '',
      icon: item!.icon,
      isFavorite: false,
      isRecent: true,
    }));
  
  return { groups, favorites, recents };
}
