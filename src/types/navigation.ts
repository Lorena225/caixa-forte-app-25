export interface NavigationItem {
  id: string;
  key: string;
  label_default: string;
  route: string | null;
  icon: string;
  parent_key: string | null;
  sort_order: number;
  permission_key: string | null;
  feature_flag_key: string | null;
  hidden_by_default: boolean;
}

export interface NavigationProfile {
  id: string;
  profile_key: string;
  name: string;
  default_route_key: string;
  visible_keys_ordered: string[];
  label_overrides: Record<string, string>;
  quick_actions: QuickAction[];
  dashboard_layout: DashboardLayout;
}

export interface QuickAction {
  key: string;
  label: string;
  route: string;
  permission_key: string;
  icon: string;
}

export interface DashboardLayout {
  default_filters: {
    date_preset: string;
    scope: string;
  };
  widgets_order: string[];
}

export interface UserNavPreferences {
  id: string;
  user_id: string;
  company_id: string;
  sidebar_collapsed: boolean;
  collapsed_groups: string[];
  favorite_keys: string[];
  active_profile_key: string;
}

export interface NavigationGroup {
  key: string;
  label: string;
  icon: string;
  items: NavigationMenuItem[];
  isOpen: boolean;
}

export interface NavigationMenuItem {
  key: string;
  label: string;
  route: string;
  icon: string;
  isFavorite: boolean;
  children?: NavigationMenuItem[];
}

export interface CommandPaletteItem {
  key: string;
  label: string;
  route: string;
  icon: string;
  type: 'nav' | 'action' | 'search';
  category?: string;
}
