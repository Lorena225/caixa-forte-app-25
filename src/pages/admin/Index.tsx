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
  Database,
  UserCog,
} from "lucide-react";

interface AdminModule {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  highlight?: boolean;
}

interface AdminSection {
  title: string;
  modules: AdminModule[];
}

const adminSections: AdminSection[] = [
  {
    title: "Empresa & Marca",
    modules: [
      {
        title: "Nível do Sistema",
        description: "Financeiro, Contábil e/ou Fiscal",
        icon: Gauge,
        href: "/admin/nivel-sistema",
        highlight: true,
      },
      {
        title: "Marca",
        description: "Logo, cores e identidade visual da empresa",
        icon: Palette,
        href: "/admin/marca",
      },
      {
        title: "Empresa",
        description: "Dados gerais da empresa",
        icon: Settings2,
        href: "/admin/empresa",
      },
    ],
  },
  {
    title: "Acesso & Usuários",
    modules: [
      {
        title: "Gestão de Usuários",
        description: "Usuários, papéis e permissões granulares",
        icon: UserCog,
        href: "/admin/gestao-usuarios",
        highlight: true,
      },
      {
        title: "Usuários (Simples)",
        description: "Gerenciar usuários básicos",
        icon: Users,
        href: "/admin/usuarios",
      },
      {
        title: "Papéis e Permissões",
        description: "Configurar papéis customizados e RBAC",
        icon: Shield,
        href: "/admin/permissoes",
      },
      {
        title: "Filiais",
        description: "Gerenciar filiais e estabelecimentos",
        icon: Building2,
        href: "/admin/filiais",
      },
    ],
  },
  {
    title: "Fluxos & Aprovações",
    modules: [
      {
        title: "Fluxos de Aprovação",
        description: "Configurar workflows de aprovação",
        icon: GitBranch,
        href: "/admin/aprovacoes",
      },
    ],
  },
  {
    title: "Fiscal & Compliance",
    modules: [
      {
        title: "Parâmetros Fiscais",
        description: "Configurações fiscais e contábeis",
        icon: FileCheck,
        href: "/admin/fiscal",
      },
      {
        title: "Períodos Fiscais",
        description: "Gerenciar períodos e travas contábeis",
        icon: FileCheck,
        href: "/admin/periodos-fiscais",
      },
      {
        title: "Tipos de Documento",
        description: "NF, Fatura, Recibo, Boleto e outros",
        icon: FileText,
        href: "/admin/tipos-documento",
      },
      {
        title: "Regras SoD",
        description: "Segregação de funções e conflitos",
        icon: Shield,
        href: "/admin/regras-sod",
      },
    ],
  },
  {
    title: "Segurança",
    modules: [
      {
        title: "Segurança",
        description: "MFA, políticas de sessão e segurança",
        icon: Key,
        href: "/admin/seguranca",
      },
      {
        title: "Painel de Segurança",
        description: "Dashboard de segurança e alertas",
        icon: Shield,
        href: "/admin/painel-seguranca",
      },
      {
        title: "Relatório de Segurança",
        description: "Auditoria e escalabilidade",
        icon: Shield,
        href: "/admin/relatorio-seguranca",
        highlight: true,
      },
      {
        title: "Logs de Auditoria",
        description: "Histórico de alterações",
        icon: ClipboardList,
        href: "/admin/logs-auditoria",
      },
    ],
  },
  {
    title: "Operação & Monitoramento",
    modules: [
      {
        title: "Navegação",
        description: "Configurar menus e perfis de navegação",
        icon: Settings2,
        href: "/admin/navegacao",
      },
      {
        title: "Monitor de Jobs",
        description: "Status de tarefas assíncronas",
        icon: Activity,
        href: "/admin/monitor-jobs",
      },
      {
        title: "Limites de Valores",
        description: "Limites de transação por usuário",
        icon: Key,
        href: "/admin/limites-usuario",
      },
      {
        title: "Saúde do Sistema",
        description: "Monitoramento e diagnósticos",
        icon: Activity,
        href: "/admin/saude-sistema",
      },
    ],
  },
  {
    title: "Infraestrutura",
    modules: [
      {
        title: "Go-Live",
        description: "Checklist de implantação",
        icon: Sparkles,
        href: "/admin/go-live",
      },
      {
        title: "Backup & Recuperação",
        description: "Backups, DR e governança de dados",
        icon: Database,
        href: "/admin/backup",
        highlight: true,
      },
    ],
  },
];

export default function AdminIndex() {
  return (
    <MainLayout>
      <div className="space-y-8">
        <PageHeader
          title="Configurações"
          description="Console de administração e configurações da empresa"
        />

        {adminSections.map((section) => (
          <div key={section.title} className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground border-b pb-2">
              {section.title}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {section.modules.map((module) => (
                <Link key={module.href} to={module.href}>
                  <Card className={`h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group ${
                    module.highlight ? 'border-primary bg-primary/5' : ''
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${
                          module.highlight 
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
        ))}
      </div>
    </MainLayout>
  );
}
