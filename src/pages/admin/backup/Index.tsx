import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Database,
  Clock,
  FileCheck,
  Shield,
  HardDrive,
  History,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { useBackupStats, useBackupPolicySettings } from "@/hooks/useBackupManagement";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const backupModules = [
  {
    title: "Jobs e Agendamentos",
    description: "Gerenciar jobs de backup automáticos e manuais",
    icon: Clock,
    href: "/admin/backup/jobs",
  },
  {
    title: "Histórico de Execuções",
    description: "Visualizar histórico e status dos backups",
    icon: History,
    href: "/admin/backup/historico",
  },
  {
    title: "Política de Backup & DR",
    description: "Configurar RPO/RTO e procedimentos de recuperação",
    icon: Shield,
    href: "/admin/backup/politica",
  },
  {
    title: "Configurações Críticas",
    description: "Backup de RBAC, parâmetros fiscais e regras de IA",
    icon: Settings,
    href: "/admin/backup/configuracoes",
  },
];

export default function BackupIndex() {
  const { data: stats } = useBackupStats();
  const { data: policy } = useBackupPolicySettings();

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Backup & Recuperação"
          description="Gerenciamento de backups, recuperação de desastres e governança de dados"
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Último Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <span className="text-lg font-semibold">
                  {stats?.ultimoBackup 
                    ? format(new Date(stats.ultimoBackup), "dd/MM HH:mm", { locale: ptBR })
                    : "Nenhum"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Sucesso (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-500" />
                <span className="text-lg font-semibold">
                  {stats?.taxaSucesso ?? 0}%
                </span>
                <Badge variant={stats?.taxaSucesso && stats.taxaSucesso >= 90 ? "default" : "destructive"}>
                  {stats?.sucesso ?? 0}/{stats?.total ?? 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                RPO / RTO
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-lg font-semibold">
                  {policy?.rpo_minutos ?? 60}min / {policy?.rto_minutos ?? 240}min
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {(stats?.pendentes ?? 0) > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-lg font-semibold">
                  {stats?.pendentes ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Module Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {backupModules.map((module) => (
            <Link key={module.href} to={module.href}>
              <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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

        {/* Quick Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Visão Geral do Sistema de Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Escopo de Proteção</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✓ Banco de dados transacional (PostgreSQL)</li>
                  <li>✓ Arquivos e anexos (Storage)</li>
                  <li>✓ Configurações críticas (RBAC, Fiscal, IA)</li>
                  <li>✓ Layouts de dashboard e navegação</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Integração com Infraestrutura</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>→ Jobs podem ser consumidos por scripts externos</li>
                  <li>→ API disponível para atualizar status de execuções</li>
                  <li>→ Compatível com Supabase CLI e ferramentas de backup</li>
                  <li>→ Backup automático do provedor complementar</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
