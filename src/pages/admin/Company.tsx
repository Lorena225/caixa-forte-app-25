import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanySettings, useUpdateCompany } from "@/hooks/useAdminSettings";
import { Loader2, Building2, Save } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Company() {
  const { data: company, isLoading } = useCompanySettings();
  const updateCompany = useUpdateCompany();
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || "",
        cnpj: company.cnpj || "",
      });
    }
  }, [company]);

  const handleSave = async () => {
    await updateCompany.mutateAsync(formData);
  };

  const hasChanges = company && (
    formData.name !== company.name ||
    formData.cnpj !== (company.cnpj || "")
  );

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
          title="Dados da Empresa"
          description="Informações gerais da empresa"
        >
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || updateCompany.isPending}
          >
            {updateCompany.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Alterações
          </Button>
        </PageHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
              <CardDescription>
                Dados principais da empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Razão Social *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome da empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                />
              </div>

              <div className="space-y-2">
                <Label>ID da Empresa</Label>
                <Input
                  value={company?.id || ""}
                  disabled
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Identificador único usado em integrações
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
              <CardDescription>
                Dados de controle da empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="font-medium">
                  {company?.is_active ? "Ativa" : "Inativa"}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Data de Criação</span>
                <span className="font-medium">
                  {company?.created_at 
                    ? format(new Date(company.created_at), "dd/MM/yyyy", { locale: ptBR })
                    : "-"
                  }
                </span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Última Atualização</span>
                <span className="font-medium">
                  {company?.updated_at 
                    ? format(new Date(company.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "-"
                  }
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-sm text-muted-foreground">Logo</span>
                <span className="font-medium">
                  {company?.logo_url ? "Configurado" : "Não configurado"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
