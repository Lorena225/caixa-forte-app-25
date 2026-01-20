import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useFinancialServices } from "@/hooks/useInnovationPlatform";
import { toast } from "sonner";
import {
  Banknote,
  CreditCard,
  Wallet,
  Shield,
  TrendingUp,
  Settings,
  ArrowRight,
  CheckCircle2,
  Clock,
  Building2,
  Sparkles,
  ExternalLink,
} from "lucide-react";

const AVAILABLE_SERVICES = [
  {
    type: "receivables_anticipation",
    name: "Antecipação de Recebíveis",
    description: "Antecipe seus recebíveis e melhore o fluxo de caixa com taxas competitivas",
    icon: Banknote,
    color: "text-success",
    bgColor: "bg-success/10",
    features: ["Taxas a partir de 1.5% a.m.", "Liberação em 24h", "Sem burocracia"],
    status: "active",
    route: "/embedded/antecipacao",
  },
  {
    type: "credit_line",
    name: "Linha de Crédito Empresarial",
    description: "Acesso rápido a capital de giro com condições especiais para clientes",
    icon: CreditCard,
    color: "text-primary",
    bgColor: "bg-primary/10",
    features: ["Limite pré-aprovado", "Taxas diferenciadas", "Carência flexível"],
    status: "coming_soon",
    route: null,
  },
  {
    type: "digital_wallet",
    name: "Conta Digital / Wallet",
    description: "Conta digital integrada para receber, pagar e gerenciar seu dinheiro",
    icon: Wallet,
    color: "text-warning",
    bgColor: "bg-warning/10",
    features: ["Sem taxa de manutenção", "Pix ilimitado", "Cartão empresarial"],
    status: "coming_soon",
    route: null,
  },
  {
    type: "insurance",
    name: "Seguros Empresariais",
    description: "Proteção para sua empresa, colaboradores e operações",
    icon: Shield,
    color: "text-info",
    bgColor: "bg-info/10",
    features: ["Seguro de crédito", "RC Profissional", "Seguro cyber"],
    status: "coming_soon",
    route: null,
  },
  {
    type: "investment",
    name: "Investimentos",
    description: "Rentabilize seu caixa com opções de investimento empresarial",
    icon: TrendingUp,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    features: ["CDB empresarial", "Fundos DI", "Liquidez diária"],
    status: "coming_soon",
    route: null,
  },
];

const PARTNERS = [
  { name: "Parceiro Financeiro 1", type: "Antecipação", logo: "🏦" },
  { name: "Parceiro Financeiro 2", type: "Crédito", logo: "💳" },
  { name: "Parceiro Financeiro 3", type: "Conta Digital", logo: "📱" },
];

export default function ServicosFinanceiros() {
  const { data: services = [], isLoading } = useFinancialServices();

  const handleActivate = (serviceName: string) => {
    toast.info(`Solicitando ativação de ${serviceName}...`);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Serviços Financeiros"
          description="Produtos financeiros integrados ao seu ERP"
        />

        {/* Introduction Card */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Embedded Finance</h3>
                <p className="text-muted-foreground mb-4">
                  Transforme seu ERP em uma plataforma financeira completa. Acesse serviços de crédito, 
                  antecipação, conta digital e mais, tudo integrado à sua gestão.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    100% Digital
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Sem Burocracia
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Taxas Competitivas
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {AVAILABLE_SERVICES.map((service) => (
            <Card key={service.type} className="card-hover relative overflow-hidden">
              {service.status === "coming_soon" && (
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Em breve
                  </Badge>
                </div>
              )}
              {service.status === "active" && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-success/10 text-success gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Ativo
                  </Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${service.bgColor}`}>
                    <service.icon className={`h-5 w-5 ${service.color}`} />
                  </div>
                  <CardTitle className="text-base">{service.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                <ul className="space-y-2 mb-4">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {service.status === "active" && service.route ? (
                  <Button className="w-full gap-2" onClick={() => window.location.href = service.route!}>
                    Acessar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    disabled={service.status === "coming_soon"}
                    onClick={() => handleActivate(service.name)}
                  >
                    {service.status === "coming_soon" ? "Indisponível" : "Ativar Serviço"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Partners Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Parceiros Financeiros
            </CardTitle>
            <CardDescription>
              Instituições financeiras parceiras que fornecem os serviços
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {PARTNERS.map((partner, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 rounded-lg border">
                  <span className="text-2xl">{partner.logo}</span>
                  <div>
                    <p className="font-medium">{partner.name}</p>
                    <p className="text-xs text-muted-foreground">{partner.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Share Info */}
        <Card className="border-warning/20 bg-gradient-to-r from-warning/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-warning/10">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Modelo de Revenue Share</h4>
                <p className="text-sm text-muted-foreground">
                  Todas as operações financeiras realizadas através da plataforma geram receita compartilhada. 
                  O sistema registra automaticamente cada transação para cálculo de comissões e repasses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
