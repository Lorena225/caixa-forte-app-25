import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranding } from "@/hooks/useBranding";
import { Loader2, Upload, Palette, Type, Settings, Image, Sun, Moon, Monitor } from "lucide-react";
import { toast } from "sonner";
import type { CompanyBranding, AssetType, ThemeMode, NavbarStyle } from "@/types/branding";

// Color picker component
function ColorPicker({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
}) {
  // Converter HSL para HEX para o input color
  const hslToHex = (hsl: string): string => {
    const parts = hsl.split(" ");
    if (parts.length !== 3) return "#7c3aed";
    
    const h = parseInt(parts[0]) / 360;
    const s = parseInt(parts[1]) / 100;
    const l = parseInt(parts[2].replace("%", "")) / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Converter HEX para HSL
  const hexToHsl = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "262 83% 58%";

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div 
          className="w-10 h-10 rounded-lg border cursor-pointer"
          style={{ backgroundColor: `hsl(${value})` }}
        />
        <Input
          type="color"
          value={hslToHex(value)}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="w-16 h-10 p-1 cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="H S% L%"
          className="font-mono text-sm flex-1"
        />
      </div>
    </div>
  );
}

// Logo upload component
function LogoUpload({
  label,
  description,
  currentUrl,
  assetType,
  onUpload,
  isUploading,
}: {
  label: string;
  description: string;
  currentUrl: string | null;
  assetType: AssetType;
  onUpload: (file: File, type: AssetType) => Promise<string>;
  isUploading: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl);

  useEffect(() => {
    setPreview(currentUrl);
  }, [currentUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 2MB.");
      return;
    }

    // Validar tipo
    if (!["image/png", "image/jpeg", "image/svg+xml", "image/webp"].includes(file.type)) {
      toast.error("Formato não suportado. Use PNG, JPG, SVG ou WebP.");
      return;
    }

    // Preview local
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      await onUpload(file, assetType);
    } catch {
      setPreview(currentUrl);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      
      {preview && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <img 
            src={preview} 
            alt={label}
            className="max-h-24 object-contain"
          />
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={handleFileChange}
          disabled={isUploading}
          className="flex-1"
        />
        {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
    </div>
  );
}

export default function Branding() {
  const { 
    branding, 
    isLoading, 
    updateBrandingAsync, 
    isUpdating,
    uploadAssetAsync,
    isUploading
  } = useBranding();

  const [formData, setFormData] = useState<Partial<CompanyBranding>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Sincronizar form com dados carregados
  useEffect(() => {
    if (branding) {
      setFormData(branding);
    }
  }, [branding]);

  const updateField = <K extends keyof CompanyBranding>(field: K, value: CompanyBranding[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateBrandingAsync(formData);
      setHasChanges(false);
    } catch {
      // Erro já tratado no hook
    }
  };

  const handleLogoUpload = async (file: File, assetType: AssetType) => {
    const url = await uploadAssetAsync({ file, assetType });
    
    // Atualizar o campo correspondente no branding
    const fieldMap: Record<AssetType, keyof CompanyBranding | null> = {
      logo: "logo_url",
      logo_dark: "logo_dark_url",
      banner: "banner_url",
      favicon: "favicon_url",
      avatar: null,
      illustration: null,
      other: null,
    };
    
    const field = fieldMap[assetType];
    if (field) {
      await updateBrandingAsync({ [field]: url });
    }
    
    return url;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Branding"
            description="Configure a identidade visual da empresa"
          />
          {hasChanges && (
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          )}
        </div>

        <Tabs defaultValue="identity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="identity" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Identidade</span>
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Cores</span>
            </TabsTrigger>
            <TabsTrigger value="typography" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">Tipografia</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configurações</span>
            </TabsTrigger>
          </TabsList>

          {/* Identidade Visual */}
          <TabsContent value="identity">
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Logo Principal
                  </CardTitle>
                  <CardDescription>
                    Logo exibido no menu e cabeçalho
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LogoUpload
                    label="Logo Light Mode"
                    description="Para fundos claros. Formatos: PNG, JPG, SVG, WebP (max 2MB)"
                    currentUrl={formData.logo_url || null}
                    assetType="logo"
                    onUpload={handleLogoUpload}
                    isUploading={isUploading}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Moon className="h-5 w-5" />
                    Logo Dark Mode
                  </CardTitle>
                  <CardDescription>
                    Logo para tema escuro (opcional)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LogoUpload
                    label="Logo Dark Mode"
                    description="Versão para fundos escuros"
                    currentUrl={formData.logo_dark_url || null}
                    assetType="logo_dark"
                    onUpload={handleLogoUpload}
                    isUploading={isUploading}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Favicon</CardTitle>
                  <CardDescription>
                    Ícone exibido na aba do navegador
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LogoUpload
                    label="Favicon"
                    description="Recomendado: 32x32 ou 64x64 pixels"
                    currentUrl={formData.favicon_url || null}
                    assetType="favicon"
                    onUpload={handleLogoUpload}
                    isUploading={isUploading}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Banner</CardTitle>
                  <CardDescription>
                    Imagem para tela de login ou emails
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LogoUpload
                    label="Banner"
                    description="Recomendado: 1200x400 pixels"
                    currentUrl={formData.banner_url || null}
                    assetType="banner"
                    onUpload={handleLogoUpload}
                    isUploading={isUploading}
                  />
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Textos</CardTitle>
                  <CardDescription>
                    Nome e tagline da aplicação
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="app_name">Nome da Aplicação</Label>
                      <Input
                        id="app_name"
                        value={formData.app_name || ""}
                        onChange={(e) => updateField("app_name", e.target.value)}
                        placeholder="Vitrio"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="app_tagline">Tagline</Label>
                      <Input
                        id="app_tagline"
                        value={formData.app_tagline || ""}
                        onChange={(e) => updateField("app_tagline", e.target.value)}
                        placeholder="Gestão financeira inteligente"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="footer_text">Texto do Rodapé</Label>
                    <Input
                      id="footer_text"
                      value={formData.footer_text || ""}
                      onChange={(e) => updateField("footer_text", e.target.value)}
                      placeholder="© 2024 Sua Empresa. Todos os direitos reservados."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cores */}
          <TabsContent value="colors">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Paleta de Cores
                </CardTitle>
                <CardDescription>
                  Personalize as cores do sistema (formato HSL: H S% L%)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
                  <ColorPicker
                    label="Cor Primária"
                    value={formData.primary_color || "142 76% 36%"}
                    onChange={(v) => updateField("primary_color", v)}
                  />
                  <ColorPicker
                    label="Cor Secundária"
                    value={formData.secondary_color || "217 91% 60%"}
                    onChange={(v) => updateField("secondary_color", v)}
                  />
                  <ColorPicker
                    label="Cor de Destaque"
                    value={formData.accent_color || "25 95% 53%"}
                    onChange={(v) => updateField("accent_color", v)}
                  />
                  <ColorPicker
                    label="Cor de Sucesso"
                    value={formData.success_color || "142 76% 36%"}
                    onChange={(v) => updateField("success_color", v)}
                  />
                  <ColorPicker
                    label="Cor de Alerta"
                    value={formData.warning_color || "38 92% 50%"}
                    onChange={(v) => updateField("warning_color", v)}
                  />
                  <ColorPicker
                    label="Cor de Erro"
                    value={formData.danger_color || "0 84% 60%"}
                    onChange={(v) => updateField("danger_color", v)}
                  />
                </div>

                <div className="mt-8 p-6 border rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-4">Preview</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      style={{ backgroundColor: `hsl(${formData.primary_color})` }}
                      className="text-white"
                    >
                      Primário
                    </Button>
                    <Button 
                      style={{ backgroundColor: `hsl(${formData.secondary_color})` }}
                      className="text-white"
                    >
                      Secundário
                    </Button>
                    <Button 
                      style={{ backgroundColor: `hsl(${formData.accent_color})` }}
                      className="text-white"
                    >
                      Destaque
                    </Button>
                    <Button 
                      style={{ backgroundColor: `hsl(${formData.success_color})` }}
                      className="text-white"
                    >
                      Sucesso
                    </Button>
                    <Button 
                      style={{ backgroundColor: `hsl(${formData.warning_color})` }}
                      className="text-white"
                    >
                      Alerta
                    </Button>
                    <Button 
                      style={{ backgroundColor: `hsl(${formData.danger_color})` }}
                      className="text-white"
                    >
                      Erro
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tipografia */}
          <TabsContent value="typography">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Fontes
                </CardTitle>
                <CardDescription>
                  Personalize as fontes da aplicação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fonte de Títulos</Label>
                    <Select
                      value={formData.font_family_heading || "Inter, sans-serif"}
                      onValueChange={(v) => updateField("font_family_heading", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                        <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
                        <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
                        <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                        <SelectItem value="'Montserrat', sans-serif">Montserrat</SelectItem>
                        <SelectItem value="'Lato', sans-serif">Lato</SelectItem>
                        <SelectItem value="'Source Sans Pro', sans-serif">Source Sans Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fonte de Corpo</Label>
                    <Select
                      value={formData.font_family_body || "Inter, sans-serif"}
                      onValueChange={(v) => updateField("font_family_body", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                        <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
                        <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
                        <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                        <SelectItem value="'Nunito', sans-serif">Nunito</SelectItem>
                        <SelectItem value="'Lato', sans-serif">Lato</SelectItem>
                        <SelectItem value="'Source Sans Pro', sans-serif">Source Sans Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-6 border rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-4">Preview</h4>
                  <div className="space-y-3">
                    <h1 
                      className="text-3xl font-bold"
                      style={{ fontFamily: formData.font_family_heading }}
                    >
                      Título Principal (H1)
                    </h1>
                    <h2 
                      className="text-2xl font-semibold"
                      style={{ fontFamily: formData.font_family_heading }}
                    >
                      Subtítulo (H2)
                    </h2>
                    <p 
                      className="text-base"
                      style={{ fontFamily: formData.font_family_body }}
                    >
                      Este é um texto de corpo demonstrando a fonte selecionada. 
                      A tipografia é fundamental para a identidade visual e legibilidade da aplicação.
                    </p>
                    <p 
                      className="text-sm text-muted-foreground"
                      style={{ fontFamily: formData.font_family_body }}
                    >
                      Texto secundário com tamanho menor.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configurações */}
          <TabsContent value="settings">
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Tema Padrão</CardTitle>
                  <CardDescription>
                    Tema inicial para novos usuários
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Button
                      variant={formData.default_theme === "light" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => updateField("default_theme", "light" as ThemeMode)}
                    >
                      <Sun className="mr-2 h-4 w-4" />
                      Claro
                    </Button>
                    <Button
                      variant={formData.default_theme === "dark" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => updateField("default_theme", "dark" as ThemeMode)}
                    >
                      <Moon className="mr-2 h-4 w-4" />
                      Escuro
                    </Button>
                    <Button
                      variant={formData.default_theme === "system" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => updateField("default_theme", "system" as ThemeMode)}
                    >
                      <Monitor className="mr-2 h-4 w-4" />
                      Sistema
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estilo da Sidebar</CardTitle>
                  <CardDescription>
                    Tema do menu lateral
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={formData.sidebar_theme || "light"}
                    onValueChange={(v) => updateField("sidebar_theme", v as "light" | "dark")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estilo da Navbar</CardTitle>
                  <CardDescription>
                    Densidade do cabeçalho
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={formData.navbar_style || "full"}
                    onValueChange={(v) => updateField("navbar_style", v as NavbarStyle)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Completo</SelectItem>
                      <SelectItem value="compact">Compacto</SelectItem>
                      <SelectItem value="minimal">Minimalista</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Exibição</CardTitle>
                  <CardDescription>
                    Opções de visibilidade
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show_logo">Mostrar logo na navbar</Label>
                    <Switch
                      id="show_logo"
                      checked={formData.show_logo_navbar ?? true}
                      onCheckedChange={(v) => updateField("show_logo_navbar", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show_footer">Mostrar branding no rodapé</Label>
                    <Switch
                      id="show_footer"
                      checked={formData.show_branding_footer ?? true}
                      onCheckedChange={(v) => updateField("show_branding_footer", v)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
