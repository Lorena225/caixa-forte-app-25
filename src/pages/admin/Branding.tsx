import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanySettings, useUpdateCompany } from "@/hooks/useAdminSettings";
import { Loader2, Upload, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Branding() {
  const { data: company, isLoading } = useCompanySettings();
  const updateCompany = useUpdateCompany();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async () => {
    if (!logoFile || !company) return;
    
    setUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${company.id}/logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('whatsapp-files')
        .upload(fileName, logoFile, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('whatsapp-files')
        .getPublicUrl(fileName);
      
      await updateCompany.mutateAsync({ logo_url: urlData.publicUrl });
      setLogoFile(null);
      toast.success("Logo atualizado com sucesso");
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploading(false);
    }
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
        <PageHeader
          title="Branding"
          description="Configure a identidade visual da empresa"
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Logo da Empresa
              </CardTitle>
              <CardDescription>
                Faça upload do logo que será exibido no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {company?.logo_url && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-2">Logo atual:</p>
                  <img 
                    src={company.logo_url} 
                    alt="Logo da empresa" 
                    className="max-h-24 object-contain"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="logo">Novo logo</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 2MB
                </p>
              </div>

              <Button 
                onClick={handleLogoUpload} 
                disabled={!logoFile || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Enviar Logo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Cores do Tema
              </CardTitle>
              <CardDescription>
                Personalize as cores do sistema (em breve)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor Primária</Label>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-primary border" />
                      <Input 
                        value="#7c3aed" 
                        disabled 
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor Secundária</Label>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-secondary border" />
                      <Input 
                        value="#f1f5f9" 
                        disabled 
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  A personalização de cores estará disponível em uma próxima atualização.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
