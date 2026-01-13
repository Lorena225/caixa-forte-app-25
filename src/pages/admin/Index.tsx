import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  Shield,
  GitBranch,
  Palette,
  Settings2,
  FileCheck,
  Key,
  FileText,
  Activity,
  ClipboardList,
  Sparkles,
  Gauge,
} from "lucide-react";

const adminModules = [
  {
    title: "Nível do Sistema",
    description: "Financeiro, Contábil e/ou Fiscal",
    icon: Gauge,
    href: "/admin/system-tier",
    highlight: true,
  },
  {
    title: "Branding",
    description: "Logo, cores e identidade visual da empresa",
    icon: Palette,
    href: "/admin/branding",
  },
  {
    title: "Usuários",
    description: "Gerenciar usuários e suas permissões",
    icon: Users,
    href: "/admin/users",
  },
  {
    title: "Papéis e Permissões",
    description: "Configurar papéis customizados e RBAC",
    icon: Shield,
    href: "/admin/permissions",
  },
  {
    title: "Filiais",
    description: "Gerenciar filiais e estabelecimentos",
    icon: Building2,
    href: "/admin/branches",
  },
  {
    title: "Fluxos de Aprovação",
    description: "Configurar workflows de aprovação",
    icon: GitBranch,
    href: "/admin/approvals",
  },
  {
    title: "Parâmetros Fiscais",
    description: "Configurações fiscais e contábeis",
    icon: FileCheck,
    href: "/admin/fiscal",
  },
  {
    title: "Segurança",
    description: "MFA, políticas de sessão e segurança",
    icon: Key,
    href: "/admin/security",
  },
  {
    title: "Empresa",
    description: "Dados gerais da empresa",
    icon: Settings2,
    href: "/admin/company",
  },
  {
    title: "Tipos de Documento",
    description: "NF, Fatura, Recibo, Boleto e outros",
    icon: FileText,
    href: "/admin/document-types",
  },
  {
    title: "Períodos Fiscais",
    description: "Gerenciar períodos e travas contábeis",
    icon: FileCheck,
    href: "/admin/fiscal-periods",
  },
  {
    title: "Regras SoD",
    description: "Segregação de funções e conflitos",
    icon: Shield,
    href: "/admin/sod-rules",
  },
  {
    title: "Limites de Valores",
    description: "Limites de transação por usuário",
    icon: Key,
    href: "/admin/user-limits",
  },
  {
    title: "Monitor de Jobs",
    description: "Status de tarefas assíncronas",
    icon: Activity,
    href: "/admin/jobs-monitor",
  },
  {
    title: "Logs de Auditoria",
    description: "Histórico de alterações",
    icon: ClipboardList,
    href: "/admin/audit-logs",
  },
  {
    title: "Navegação",
    description: "Configurar menus e perfis de navegação",
    icon: Settings2,
    href: "/admin/navigation",
  },
  {
    title: "Painel de Segurança",
    description: "Dashboard de segurança e alertas",
    icon: Shield,
    href: "/admin/security-dashboard",
  },
  {
    title: "Saúde do Sistema",
    description: "Monitoramento e diagnósticos",
    icon: Activity,
    href: "/admin/system-health",
  },
  {
    title: "Go-Live",
    description: "Checklist de implantação",
    icon: Sparkles,
    href: "/admin/go-live",
  },
];

export default function AdminIndex() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Configurações"
          description="Console de administração e configurações da empresa"
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {adminModules.map((module) => (
            <Link key={module.href} to={module.href}>
              <Card className={`h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group ${
                (module as typeof adminModules[0] & { highlight?: boolean }).highlight ? 'border-primary bg-primary/5' : ''
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${
                      (module as typeof adminModules[0] & { highlight?: boolean }).highlight 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
                    }`}>
                      <module.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{module.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{module.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
