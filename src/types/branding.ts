export interface CompanyBranding {
  id: string;
  company_id: string;
  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  danger_color: string;
  success_color: string;
  warning_color: string;
  font_family_heading: string;
  font_family_body: string;
  default_theme: 'light' | 'dark' | 'system';
  app_name: string;
  app_tagline: string | null;
  footer_text: string | null;
  show_branding_footer: boolean;
  show_logo_navbar: boolean;
  navbar_style: 'full' | 'compact' | 'minimal';
  sidebar_theme: 'light' | 'dark';
  created_at: string;
  updated_at: string;
}

export interface CompanyAsset {
  id: string;
  company_id: string;
  asset_type: 'logo' | 'logo_dark' | 'banner' | 'favicon' | 'avatar' | 'illustration' | 'other';
  asset_name: string;
  asset_url: string;
  asset_size_bytes: number | null;
  file_type: string | null;
  upload_date: string;
  uploaded_by: string | null;
}

export interface ThemeConfig {
  id: string;
  company_id: string;
  theme_name: string;
  is_active: boolean;
  bg_primary: string | null;
  bg_secondary: string | null;
  bg_tertiary: string | null;
  text_primary: string | null;
  text_secondary: string | null;
  border_color: string | null;
  custom_css: string | null;
  created_at: string;
}

export interface BrandingColors {
  primary: string;
  secondary: string;
  accent: string;
  danger: string;
  success: string;
  warning: string;
}

export type AssetType = CompanyAsset['asset_type'];
export type NavbarStyle = CompanyBranding['navbar_style'];
export type ThemeMode = CompanyBranding['default_theme'];
