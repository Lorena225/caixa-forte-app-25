import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCheck, Receipt, Calculator, FileText, Building, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const fiscalParams = [
  {
    category: "Regime Tributário",
    icon: Building,
    items: [
      { label: "Regime", value: "Lucro Real", status: "configured" },
      { label: "Apuração PIS/COFINS", value: "Não-Cumulativo", status: "configured" },
      { label: "Regime ICMS", value: "Normal", status: "configured" },
    ],
  },
  {
    category: "Obrigações Acessórias",
    icon: FileText,
    items: [
      { label: "SPED Fiscal", value: "Ativo", status: "active" },
      { label: "SPED Contribuições", value: "Ativo", status: "active" },
      { label: "EFD-Reinf", value: "Ativo", status: "active" },
      { label: "DCTFWeb", value: "Ativo", status: "active" },
    ],
  },
  {
    category: "Configurações Contábeis",
    icon: Calculator,
    items: [
      { label: "Plano de Contas", value: "Personalizado", status: "configured" },
      { label: "Centro de Custo Obrigatório", value: "Sim", status: "configured" },
      { label: "Fechamento Mensal Automático", value: "Dia 10", status: "configured" },
    ],
  },
  {
    category: "Retenções",
    icon: Receipt,
    items: [
      { label: "IR na Fonte", value: "Automático", status: "active" },
      { label: "CSRF (PIS/COFINS/CSLL)", value: "Automático", status: "active" },
      { label: "ISS", value: "Por Município", status: "configured" },
      { label: "INSS", value: "11%", status: "configured" },
    ],
  },
];

export default function FiscalSettings() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Parâmetros Fiscais"
          description="Configurações fiscais e contábeis da empresa"
        />

        <div className="grid gap-6">
          {fiscalParams.map((section) => (
            <Card key={section.category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="h-5 w-5" />
                  {section.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {section.items.map((item, index) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.value}</span>
                          <Badge 
                            variant={item.status === "active" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {item.status === "active" ? "Ativo" : "Configurado"}
                          </Badge>
                        </div>
                      </div>
                      {index < section.items.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Calendário Fiscal
              </CardTitle>
              <CardDescription>
                Próximas obrigações e prazos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Calendário fiscal em desenvolvimento</p>
                <p className="text-sm">Em breve você poderá acompanhar suas obrigações aqui</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
