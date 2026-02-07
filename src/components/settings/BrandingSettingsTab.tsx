import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useBranding } from "@/hooks/useBranding";
import { Palette, Upload, Mail, Save, Image, Type, Globe } from "lucide-react";
import { toast } from "sonner";

export function BrandingSettingsTab() {
  const { branding, isLoading, updateBranding } = useBranding();
  const [smtpSettings, setSmtpSettings] = useState({
    host: "",
    port: "587",
    user: "",
    password: "",
    fromEmail: "",
    fromName: "",
    useTls: true,
  });

  const handleSaveSMTP = () => {
    toast.success("Configurações de SMTP salvas!");
  };

  const handleColorChange = (color: string) => {
    updateBranding({ primary_color: color });
    // Apply CSS variable immediately
    document.documentElement.style.setProperty("--primary", color);
  };

  return (
    <div className="space-y-6">
      {/* Logo & Visual Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Identidade Visual
          </CardTitle>
          <CardDescription>
            Personalize a aparência do sistema com a marca da sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Logo Upload */}
            <div className="space-y-4">
              <Label>Logo Principal</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                {branding?.logo_url ? (
                  <img
                    src={branding.logo_url}
                    alt="Logo"
                    className="max-h-16 mx-auto"
                  />
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Arraste ou clique para enviar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, SVG ou WEBP até 2MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Favicon Upload */}
            <div className="space-y-4">
              <Label>Favicon</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                {branding?.favicon_url ? (
                  <img
                    src={branding.favicon_url}
                    alt="Favicon"
                    className="h-8 w-8 mx-auto"
                  />
                ) : (
                  <div className="space-y-2">
                    <Globe className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Ícone do navegador
                    </p>
                    <p className="text-xs text-muted-foreground">
                      32x32px, PNG ou ICO
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Colors */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Cor Primária
            </Label>
            <div className="flex items-center gap-4">
              <Input
                type="color"
                className="w-16 h-10 p-1 cursor-pointer"
                value={branding?.primary_color || "#7c3aed"}
                onChange={(e) => handleColorChange(e.target.value)}
              />
              <Input
                value={branding?.primary_color || "#7c3aed"}
                onChange={(e) => handleColorChange(e.target.value)}
                placeholder="#7c3aed"
                className="w-32 font-mono"
              />
              <div className="flex gap-2">
                {["#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626", "#0891b2"].map((color) => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded-full border-2 border-transparent hover:border-foreground transition-all"
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(color)}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              A cor será aplicada instantaneamente na sidebar, botões e links
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Custom SMTP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            SMTP Personalizado
          </CardTitle>
          <CardDescription>
            Configure um servidor de e-mail próprio para notificações e cobranças
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Servidor SMTP</Label>
              <Input
                placeholder="smtp.empresa.com.br"
                value={smtpSettings.host}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Porta</Label>
              <Input
                placeholder="587"
                value={smtpSettings.port}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Input
                placeholder="noreply@empresa.com.br"
                value={smtpSettings.user}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={smtpSettings.password}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>E-mail de Origem</Label>
              <Input
                placeholder="financeiro@empresa.com.br"
                value={smtpSettings.fromEmail}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, fromEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do Remetente</Label>
              <Input
                placeholder="Financeiro - Empresa"
                value={smtpSettings.fromName}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, fromName: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="use-tls"
              checked={smtpSettings.useTls}
              onCheckedChange={(checked) => setSmtpSettings({ ...smtpSettings, useTls: checked })}
            />
            <Label htmlFor="use-tls">Usar TLS (recomendado)</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Testar Conexão</Button>
            <Button onClick={handleSaveSMTP}>
              <Save className="h-4 w-4 mr-2" />
              Salvar SMTP
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
