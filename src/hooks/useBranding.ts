import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { CompanyBranding, CompanyAsset, BrandingColors, AssetType } from "@/types/branding";

export function useBranding() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();

  const { data: branding, isLoading, error } = useQuery({
    queryKey: ["company-branding", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      const { data, error } = await supabase
        .from("company_branding")
        .select("*")
        .eq("company_id", currentCompany.id)
        .maybeSingle();

      if (error) throw error;
      return data as CompanyBranding | null;
    },
    enabled: !!currentCompany?.id,
  });

  const { data: assets } = useQuery({
    queryKey: ["company-assets", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from("company_assets")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("upload_date", { ascending: false });

      if (error) throw error;
      return data as CompanyAsset[];
    },
    enabled: !!currentCompany?.id,
  });

  const colors: BrandingColors | null = branding ? {
    primary: branding.primary_color,
    secondary: branding.secondary_color,
    accent: branding.accent_color,
    danger: branding.danger_color,
    success: branding.success_color,
    warning: branding.warning_color,
  } : null;

  const updateBrandingMutation = useMutation({
    mutationFn: async (updates: Partial<CompanyBranding>) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      const { error } = await supabase
        .from("company_branding")
        .update(updates)
        .eq("company_id", currentCompany.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-branding", currentCompany?.id] });
      toast.success("Branding atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar branding: " + error.message);
    },
  });

  const uploadAssetMutation = useMutation({
    mutationFn: async ({ file, assetType }: { file: File; assetType: AssetType }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      const fileExt = file.name.split(".").pop();
      const fileName = `${currentCompany.id}/${assetType}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("company-assets")
        .getPublicUrl(fileName);

      // Salvar referência no banco
      const { error: dbError } = await supabase
        .from("company_assets")
        .insert({
          company_id: currentCompany.id,
          asset_type: assetType,
          asset_name: file.name,
          asset_url: urlData.publicUrl,
          asset_size_bytes: file.size,
          file_type: file.type,
        });

      if (dbError) throw dbError;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-assets", currentCompany?.id] });
      toast.success("Asset enviado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao enviar asset: " + error.message);
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase
        .from("company_assets")
        .delete()
        .eq("id", assetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-assets", currentCompany?.id] });
      toast.success("Asset removido com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover asset: " + error.message);
    },
  });

  // Aplicar branding ao DOM
  const applyBranding = (brandingData: CompanyBranding) => {
    const root = document.documentElement;

    // Aplicar cores como variáveis CSS (formato HSL)
    root.style.setProperty("--branding-primary", brandingData.primary_color);
    root.style.setProperty("--branding-secondary", brandingData.secondary_color);
    root.style.setProperty("--branding-accent", brandingData.accent_color);
    root.style.setProperty("--branding-danger", brandingData.danger_color);
    root.style.setProperty("--branding-success", brandingData.success_color);
    root.style.setProperty("--branding-warning", brandingData.warning_color);

    // Aplicar fontes
    root.style.setProperty("--font-heading", brandingData.font_family_heading);
    root.style.setProperty("--font-body", brandingData.font_family_body);

    // Aplicar tema
    if (brandingData.default_theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (brandingData.default_theme === "light") {
      document.documentElement.classList.remove("dark");
    }

    // Favicon
    if (brandingData.favicon_url) {
      const existingFavicon = document.querySelector('link[rel="icon"]');
      if (existingFavicon) {
        (existingFavicon as HTMLLinkElement).href = brandingData.favicon_url;
      } else {
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = brandingData.favicon_url;
        document.head.appendChild(link);
      }
    }

    // App name no title
    if (brandingData.app_name) {
      document.title = brandingData.app_name;
    }
  };

  return {
    branding,
    assets,
    colors,
    isLoading,
    error,
    updateBranding: updateBrandingMutation.mutate,
    updateBrandingAsync: updateBrandingMutation.mutateAsync,
    isUpdating: updateBrandingMutation.isPending,
    uploadAsset: uploadAssetMutation.mutate,
    uploadAssetAsync: uploadAssetMutation.mutateAsync,
    isUploading: uploadAssetMutation.isPending,
    deleteAsset: deleteAssetMutation.mutate,
    isDeleting: deleteAssetMutation.isPending,
    applyBranding,
  };
}

// Hook para aplicar branding automaticamente
export function useApplyBranding() {
  const { branding, applyBranding } = useBranding();

  if (branding) {
    applyBranding(branding);
  }

  return branding;
}
