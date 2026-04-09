
-- ============================================
-- SISTEMA DE BRANDING COMPLETO (CORRIGIDO)
-- ============================================

-- TABELA DE CONFIGURAÇÕES DE BRANDING POR EMPRESA
CREATE TABLE IF NOT EXISTS public.company_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Logo e Ícones
  logo_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  banner_url TEXT,
  
  -- Cores Principais (HSL format for CSS variables)
  primary_color VARCHAR(50) DEFAULT '142 76% 36%',
  secondary_color VARCHAR(50) DEFAULT '217 91% 60%',
  accent_color VARCHAR(50) DEFAULT '25 95% 53%',
  danger_color VARCHAR(50) DEFAULT '0 84% 60%',
  success_color VARCHAR(50) DEFAULT '142 76% 36%',
  warning_color VARCHAR(50) DEFAULT '38 92% 50%',
  
  -- Tipografia
  font_family_heading TEXT DEFAULT 'Inter, sans-serif',
  font_family_body TEXT DEFAULT 'Inter, sans-serif',
  
  -- Tema
  default_theme TEXT DEFAULT 'light' CHECK (default_theme IN ('light', 'dark', 'system')),
  
  -- Textos Customizados
  app_name TEXT DEFAULT 'Vitrio',
  app_tagline TEXT,
  footer_text TEXT,
  
  -- Configurações
  show_branding_footer BOOLEAN DEFAULT true,
  show_logo_navbar BOOLEAN DEFAULT true,
  navbar_style TEXT DEFAULT 'full' CHECK (navbar_style IN ('full', 'compact', 'minimal')),
  sidebar_theme TEXT DEFAULT 'light' CHECK (sidebar_theme IN ('light', 'dark')),
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA DE ASSETS (Logos, imagens, etc)
CREATE TABLE IF NOT EXISTS public.company_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'logo_dark', 'banner', 'favicon', 'avatar', 'illustration', 'other')),
  asset_name TEXT NOT NULL,
  asset_url TEXT NOT NULL,
  asset_size_bytes BIGINT,
  file_type TEXT,
  
  upload_date TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id),
  
  UNIQUE(company_id, asset_type, asset_name)
);

-- TABELA DE TEMAS CUSTOMIZADOS
CREATE TABLE IF NOT EXISTS public.theme_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  theme_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  
  -- Cores HSL
  bg_primary VARCHAR(50),
  bg_secondary VARCHAR(50),
  bg_tertiary VARCHAR(50),
  text_primary VARCHAR(50),
  text_secondary VARCHAR(50),
  border_color VARCHAR(50),
  
  -- CSS personalizado (opcional)
  custom_css TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, theme_name)
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_branding_company ON public.company_branding(company_id);
CREATE INDEX IF NOT EXISTS idx_assets_company ON public.company_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.company_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_theme_company ON public.theme_configs(company_id);

-- RLS
ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_configs ENABLE ROW LEVEL SECURITY;

-- Policies para company_branding (usando 'admin' que existe no enum user_role)
CREATE POLICY "branding_select" ON public.company_branding 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.company_id = company_branding.company_id 
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "branding_insert" ON public.company_branding 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.company_id = company_branding.company_id 
      AND cu.user_id = auth.uid() 
      AND cu.role = 'admin'
    )
  );

CREATE POLICY "branding_update" ON public.company_branding 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.company_id = company_branding.company_id 
      AND cu.user_id = auth.uid() 
      AND cu.role = 'admin'
    )
  );

-- Policies para company_assets
CREATE POLICY "assets_select" ON public.company_assets 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.company_id = company_assets.company_id 
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "assets_insert" ON public.company_assets 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.company_id = company_assets.company_id 
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "assets_delete" ON public.company_assets 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.company_id = company_assets.company_id 
      AND cu.user_id = auth.uid() 
      AND cu.role = 'admin'
    )
  );

-- Policies para theme_configs
CREATE POLICY "theme_select" ON public.theme_configs 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.company_id = theme_configs.company_id 
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "theme_insert" ON public.theme_configs 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.company_id = theme_configs.company_id 
      AND cu.user_id = auth.uid() 
      AND cu.role = 'admin'
    )
  );

CREATE POLICY "theme_update" ON public.theme_configs 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.company_id = theme_configs.company_id 
      AND cu.user_id = auth.uid() 
      AND cu.role = 'admin'
    )
  );

CREATE POLICY "theme_delete" ON public.theme_configs 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.company_id = theme_configs.company_id 
      AND cu.user_id = auth.uid() 
      AND cu.role = 'admin'
    )
  );

-- Storage bucket para assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets', 
  'company-assets', 
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/x-icon']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "company_assets_public_read" ON storage.objects 
  FOR SELECT USING (bucket_id = 'company-assets');

CREATE POLICY "company_assets_auth_insert" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'company-assets' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "company_assets_auth_update" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'company-assets' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "company_assets_auth_delete" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'company-assets' 
    AND auth.uid() IS NOT NULL
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_branding_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_company_branding_updated_at ON public.company_branding;
CREATE TRIGGER update_company_branding_updated_at
  BEFORE UPDATE ON public.company_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_branding_updated_at();

-- Função para criar branding padrão quando empresa é criada
CREATE OR REPLACE FUNCTION public.create_default_branding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  INSERT INTO public.company_branding (company_id, app_name)
  VALUES (NEW.id, COALESCE(NEW.name, 'Vitrio'))
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_company_branding ON public.companies;
CREATE TRIGGER create_company_branding
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_branding();

-- Criar branding padrão para empresas existentes
INSERT INTO public.company_branding (company_id, app_name)
SELECT id, COALESCE(name, 'Vitrio')
FROM public.companies
ON CONFLICT (company_id) DO NOTHING;
