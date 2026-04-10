import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Save, MapPin, Phone, Mail, Globe } from "lucide-react";
import { toast } from "sonner";

interface CompanyFormData {
  trade_name: string;
  legal_name: string;
  cnpj: string;
  state_registration: string;
  municipal_registration: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
  tax_regime: string;
}

export function GeneralSettingsTab() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: company, isLoading } = useQuery({
    queryKey: ["company-settings", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", currentCompany.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (formData: Partial<CompanyFormData>) => {
      if (!currentCompany?.id) throw new Error("No company selected");
      const { error } = await supabase
        .from("companies")
        .update(formData as any)
        .eq("id", currentCompany.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Dados da empresa atualizados!");
    },
    onError: () => {
      toast.error("Erro ao atualizar dados da empresa");
    },
  });

  const [formData, setFormData] = useState<CompanyFormData>({
    trade_name: "",
    legal_name: "",
    cnpj: "",
    state_registration: "",
    municipal_registration: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    phone: "",
    email: "",
    website: "",
    tax_regime: "simples_nacional",
  });

  // Sync form data when company data loads
  useEffect(() => {
    if (company) {
      setFormData({
        trade_name: (company as any).trade_name || "",
        legal_name: (company as any).legal_name || "",
        cnpj: company.cnpj || "",
        state_registration: (company as any).state_registration || "",
        municipal_registration: (company as any).municipal_registration || "",
        address: (company as any).address || "",
        city: (company as any).city || "",
        state: (company as any).state || "",
        zip_code: (company as any).zip_code || "",
        phone: (company as any).phone || "",
        email: (company as any).email || "",
        website: (company as any).website || "",
        tax_regime: (company as any).tax_regime || "simples_nacional",
      });
    }
  }, [company]);

  const handleSave = () => {
    updateCompanyMutation.mutate(formData);
  };

  const validateCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, "");
    if (cleaned.length !== 14) return false;
    
    // Basic CNPJ validation algorithm
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleaned[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (parseInt(cleaned[12]) !== digit) return false;

    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleaned[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    return parseInt(cleaned[13]) === digit;
  };

  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .substring(0, 18);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Company Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados da Empresa
          </CardTitle>
          <CardDescription>
            Informações cadastrais e fiscais da empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trade_name">Nome Fantasia *</Label>
              <Input
                id="trade_name"
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                placeholder="Nome comercial"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_name">Razão Social *</Label>
              <Input
                id="legal_name"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                placeholder="Razão social completa"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                className={formData.cnpj && !validateCNPJ(formData.cnpj) ? "border-destructive" : ""}
              />
              {formData.cnpj && !validateCNPJ(formData.cnpj) && (
                <p className="text-xs text-destructive">CNPJ inválido</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state_registration">Inscrição Estadual</Label>
              <Input
                id="state_registration"
                value={formData.state_registration}
                onChange={(e) => setFormData({ ...formData, state_registration: e.target.value })}
                placeholder="IE ou ISENTO"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="municipal_registration">Inscrição Municipal</Label>
              <Input
                id="municipal_registration"
                value={formData.municipal_registration}
                onChange={(e) => setFormData({ ...formData, municipal_registration: e.target.value })}
                placeholder="IM"
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tax_regime">Regime Tributário</Label>
              <Select
                value={formData.tax_regime}
                onValueChange={(value) => setFormData({ ...formData, tax_regime: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o regime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                  <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="lucro_real">Lucro Real</SelectItem>
                  <SelectItem value="mei">MEI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Endereço Completo</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rua, número, complemento, bairro"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData({ ...formData, state: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip_code">CEP</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                placeholder="00000-000"
                maxLength={9}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 0000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@empresa.com.br"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.empresa.com.br"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateCompanyMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateCompanyMutation.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
