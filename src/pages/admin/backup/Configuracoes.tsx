import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Settings,
  Shield,
  FileText,
  BarChart3,
  Brain,
  Navigation,
  RefreshCw,
  Clock,
} from "lucide-react";
import { useBackupConfigCritical } from "@/hooks/useBackupManagement";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tipoConfig: Record<string, { label: string; icon: typeof Settings; description: string }> = {
  rbac: {
    label: "RBAC",
    icon: Shield,
    description: "Papéis, permissões e associações de usuários",
  },
  parametros_fiscais: {
    label: "Parâmetros Fiscais",
    icon: FileText,
    description: "CFOP, CST, alíquotas e regras fiscais",
  },
  dashboards: {
    label: "Dashboards",
    icon: BarChart3,
    description: "Layouts personalizados e KPIs",
  },
  regras_ia: {
    label: "Regras de IA",
    icon: Brain,
    description: "Configurações de automação e agentes",
  },
  navegacao: {
    label: "Navegação",
    icon: Navigation,
    description: "Menus, perfis e atalhos personalizados",
  },
  outro: {
    label: "Outro",
    icon: Settings,
    description: "Outras configurações críticas",
  },
};

export default function BackupConfiguracoes() {
  const { data: configs, isLoading, refetch } = useBackupConfigCritical();

  // List of all config types with their current status
  const allConfigTypes = Object.entries(tipoConfig).map(([key, config]) => {
    const existing = configs?.find((c) => c.tipo === key);
    return {
      tipo: key,
      ...config,
      ultimoBackup: existing?.ultima_versao_backup_em || null,
      detalhes: existing?.detalhes || null,
    };
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Configurações Críticas"
          description="Gerenciamento de backup para configurações críticas do sistema"
        />

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Status das Configurações
            </CardTitle>
            <CardDescription>
              Visão geral do backup de configurações críticas do ERP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Último Backup</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allConfigTypes.map((config) => {
                    const Icon = config.icon;
                    const hasBackup = !!config.ultimoBackup;
                    const isRecent = config.ultimoBackup 
                      ? (Date.now() - new Date(config.ultimoBackup).getTime()) < 7 * 24 * 60 * 60 * 1000
                      : false;

                    return (
                      <TableRow key={config.tipo}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{config.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {config.description}
                        </TableCell>
                        <TableCell>
                          {config.ultimoBackup ? (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {format(new Date(config.ultimoBackup), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Nunca</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasBackup ? (
                            <Badge variant={isRecent ? "default" : "secondary"}>
                              {isRecent ? "Atualizado" : "Desatualizado"}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p className="text-muted-foreground">
              O backup de configurações críticas é executado automaticamente quando há alterações significativas, 
              ou pode ser acionado manualmente através dos jobs de backup com tipo "config_only".
            </p>
            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Backup Automático</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Triggered por alterações em tabelas críticas</li>
                  <li>• Snapshot JSON armazenado na tabela</li>
                  <li>• Histórico de versões mantido</li>
                </ul>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Restauração</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Snapshots podem ser aplicados manualmente</li>
                  <li>• Comparação de diferenças disponível</li>
                  <li>• Rollback seletivo por tipo de config</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
