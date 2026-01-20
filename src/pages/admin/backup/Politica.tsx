import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Clock,
  Database,
  HardDrive,
  Settings,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Save,
  FileText,
  Users,
} from "lucide-react";
import {
  useBackupPolicySettings,
  useUpsertBackupPolicy,
  useDRTestChecklist,
  useUpsertDRChecklist,
} from "@/hooks/useBackupManagement";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const defaultDRChecklist = [
  { item: "Backup mais recente validado em ambiente de teste", checked: false },
  { item: "Restauração completa do banco executada com sucesso", checked: false },
  { item: "Integridade dos dados verificada após restauração", checked: false },
  { item: "Aplicação funcional com dados restaurados", checked: false },
  { item: "Tempo de restauração dentro do RTO definido", checked: false },
  { item: "Documentação de procedimentos atualizada", checked: false },
  { item: "Equipe treinada nos procedimentos de DR", checked: false },
];

export default function BackupPolitica() {
  const { data: policy, isLoading: policyLoading } = useBackupPolicySettings();
  const { data: drChecklist, isLoading: drLoading } = useDRTestChecklist();
  const upsertPolicy = useUpsertBackupPolicy();
  const upsertDR = useUpsertDRChecklist();

  const [policyForm, setPolicyForm] = useState({
    rpo_minutos: 60,
    rto_minutos: 240,
    retencao_dias: 30,
    backup_db_enabled: true,
    backup_arquivos_enabled: true,
    backup_configs_enabled: true,
    offsite_enabled: false,
    notificar_falhas: true,
    emails_notificacao: [] as string[],
  });

  const [drForm, setDrForm] = useState({
    responsavel_nome: "",
    responsavel_email: "",
    ambiente_teste: "homologacao",
    observacoes: "",
    proximo_teste_planejado: "",
    checklist_items: defaultDRChecklist,
  });

  useEffect(() => {
    if (policy) {
      setPolicyForm({
        rpo_minutos: policy.rpo_minutos,
        rto_minutos: policy.rto_minutos,
        retencao_dias: policy.retencao_dias,
        backup_db_enabled: policy.backup_db_enabled ?? true,
        backup_arquivos_enabled: policy.backup_arquivos_enabled ?? true,
        backup_configs_enabled: policy.backup_configs_enabled ?? true,
        offsite_enabled: policy.offsite_enabled ?? false,
        notificar_falhas: policy.notificar_falhas ?? true,
        emails_notificacao: policy.emails_notificacao || [],
      });
    }
  }, [policy]);

  useEffect(() => {
    if (drChecklist) {
      setDrForm({
        responsavel_nome: drChecklist.responsavel_nome || "",
        responsavel_email: drChecklist.responsavel_email || "",
        ambiente_teste: drChecklist.ambiente_teste || "homologacao",
        observacoes: drChecklist.observacoes || "",
        proximo_teste_planejado: drChecklist.proximo_teste_planejado?.split("T")[0] || "",
        checklist_items: (drChecklist.checklist_items as typeof defaultDRChecklist) || defaultDRChecklist,
      });
    }
  }, [drChecklist]);

  const handleSavePolicy = async () => {
    await upsertPolicy.mutateAsync(policyForm);
  };

  const handleSaveDR = async () => {
    await upsertDR.mutateAsync({
      ...drForm,
      proximo_teste_planejado: drForm.proximo_teste_planejado || null,
    });
  };

  const toggleChecklistItem = (index: number) => {
    const newItems = [...drForm.checklist_items];
    newItems[index] = {
      ...newItems[index],
      checked: !newItems[index].checked,
    };
    setDrForm({ ...drForm, checklist_items: newItems });
  };

  if (policyLoading || drLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Política de Backup & DR"
          description="Configure parâmetros de RPO/RTO e procedimentos de recuperação de desastres"
        />

        <Tabs defaultValue="politica" className="space-y-6">
          <TabsList>
            <TabsTrigger value="politica" className="gap-2">
              <Shield className="h-4 w-4" />
              Política de Backup
            </TabsTrigger>
            <TabsTrigger value="dr" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Procedimento DR
            </TabsTrigger>
            <TabsTrigger value="escopo" className="gap-2">
              <FileText className="h-4 w-4" />
              Escopo Protegido
            </TabsTrigger>
          </TabsList>

          <TabsContent value="politica" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Parâmetros RPO / RTO
                </CardTitle>
                <CardDescription>
                  Recovery Point Objective e Recovery Time Objective definem os limites aceitáveis de perda de dados e tempo de recuperação.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="rpo">RPO (minutos)</Label>
                    <Input
                      id="rpo"
                      type="number"
                      value={policyForm.rpo_minutos}
                      onChange={(e) => setPolicyForm({ ...policyForm, rpo_minutos: parseInt(e.target.value) || 60 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Perda máxima de dados aceitável (ex: 60 = 1h)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rto">RTO (minutos)</Label>
                    <Input
                      id="rto"
                      type="number"
                      value={policyForm.rto_minutos}
                      onChange={(e) => setPolicyForm({ ...policyForm, rto_minutos: parseInt(e.target.value) || 240 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Tempo máximo para restaurar (ex: 240 = 4h)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retencao">Retenção (dias)</Label>
                    <Input
                      id="retencao"
                      type="number"
                      value={policyForm.retencao_dias}
                      onChange={(e) => setPolicyForm({ ...policyForm, retencao_dias: parseInt(e.target.value) || 30 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Período de retenção dos backups
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Escopo do Backup</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Banco de Dados</p>
                          <p className="text-xs text-muted-foreground">PostgreSQL completo</p>
                        </div>
                      </div>
                      <Switch
                        checked={policyForm.backup_db_enabled}
                        onCheckedChange={(v) => setPolicyForm({ ...policyForm, backup_db_enabled: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <HardDrive className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Arquivos</p>
                          <p className="text-xs text-muted-foreground">Storage e anexos</p>
                        </div>
                      </div>
                      <Switch
                        checked={policyForm.backup_arquivos_enabled}
                        onCheckedChange={(v) => setPolicyForm({ ...policyForm, backup_arquivos_enabled: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Configurações</p>
                          <p className="text-xs text-muted-foreground">RBAC, Fiscal, IA</p>
                        </div>
                      </div>
                      <Switch
                        checked={policyForm.backup_configs_enabled}
                        onCheckedChange={(v) => setPolicyForm({ ...policyForm, backup_configs_enabled: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Offsite</p>
                          <p className="text-xs text-muted-foreground">Backup externo</p>
                        </div>
                      </div>
                      <Switch
                        checked={policyForm.offsite_enabled}
                        onCheckedChange={(v) => setPolicyForm({ ...policyForm, offsite_enabled: v })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Notificar Falhas</p>
                      <p className="text-xs text-muted-foreground">Alertas por email em caso de falha</p>
                    </div>
                  </div>
                  <Switch
                    checked={policyForm.notificar_falhas}
                    onCheckedChange={(v) => setPolicyForm({ ...policyForm, notificar_falhas: v })}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSavePolicy} disabled={upsertPolicy.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {upsertPolicy.isPending ? "Salvando..." : "Salvar Política"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dr" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Procedimento de Recuperação (DR)
                </CardTitle>
                <CardDescription>
                  Checklist e configurações para testes periódicos de recuperação de desastres.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="responsavel">Responsável</Label>
                    <Input
                      id="responsavel"
                      value={drForm.responsavel_nome}
                      onChange={(e) => setDrForm({ ...drForm, responsavel_nome: e.target.value })}
                      placeholder="Nome do responsável"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={drForm.responsavel_email}
                      onChange={(e) => setDrForm({ ...drForm, responsavel_email: e.target.value })}
                      placeholder="email@empresa.com"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="proximo_teste">Próximo Teste Planejado</Label>
                    <Input
                      id="proximo_teste"
                      type="date"
                      value={drForm.proximo_teste_planejado}
                      onChange={(e) => setDrForm({ ...drForm, proximo_teste_planejado: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Último Teste</Label>
                    <div className="flex items-center gap-2 h-10">
                      {drChecklist?.ultimo_teste_em ? (
                        <>
                          <Badge variant={drChecklist.resultado_ultimo_teste === "sucesso" ? "default" : "destructive"}>
                            {drChecklist.resultado_ultimo_teste || "N/A"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(drChecklist.ultimo_teste_em), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nenhum teste realizado</span>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Checklist de Validação DR
                  </h4>
                  <div className="space-y-2">
                    {drForm.checklist_items.map((item, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          item.checked ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : ""
                        }`}
                        onClick={() => toggleChecklistItem(index)}
                      >
                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                          item.checked ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground"
                        }`}>
                          {item.checked && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                        <span className={item.checked ? "line-through text-muted-foreground" : ""}>
                          {item.item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={drForm.observacoes}
                    onChange={(e) => setDrForm({ ...drForm, observacoes: e.target.value })}
                    placeholder="Notas e observações sobre procedimentos de DR..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveDR} disabled={upsertDR.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {upsertDR.isPending ? "Salvando..." : "Salvar Checklist"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="escopo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Escopo de Dados Protegidos
                </CardTitle>
                <CardDescription>
                  Documentação do que está coberto pelo sistema de backup.
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Banco de Dados Transacional
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground list-disc pl-4">
                      <li>Todas as tabelas do ERP (transações, faturas, boletos)</li>
                      <li>Cadastros (clientes, fornecedores, produtos)</li>
                      <li>Movimentações financeiras e contábeis</li>
                      <li>Histórico de auditoria</li>
                      <li>Contratos e parcelas de empréstimos</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      Armazenamento de Arquivos
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground list-disc pl-4">
                      <li>Anexos de notas fiscais (XML, PDF)</li>
                      <li>Comprovantes de pagamento</li>
                      <li>Relatórios exportados</li>
                      <li>Documentos de suporte</li>
                      <li>Certificados digitais</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Configurações Críticas
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground list-disc pl-4">
                      <li>RBAC: papéis, permissões, usuários</li>
                      <li>Parâmetros fiscais (CFOP, CST, regras)</li>
                      <li>Layouts de dashboard personalizados</li>
                      <li>Regras de automação e IA</li>
                      <li>Fluxos de aprovação</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Multi-tenant
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground list-disc pl-4">
                      <li>Isolamento completo por empresa</li>
                      <li>Exportação por tenant disponível</li>
                      <li>Backup seletivo por empresa</li>
                      <li>Restauração parcial suportada</li>
                    </ul>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Integração com Infraestrutura Externa</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    O sistema prepara jobs que podem ser consumidos por scripts externos (Supabase CLI, pg_dump, etc.):
                  </p>
                  <ol className="text-sm space-y-2 text-muted-foreground list-decimal pl-4">
                    <li>Jobs com status "pendente" ficam disponíveis para consumo</li>
                    <li>Script externo executa o backup real (dump, export, etc.)</li>
                    <li>Status é atualizado via API para "sucesso" ou "falha"</li>
                    <li>Histórico completo fica registrado para auditoria</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
