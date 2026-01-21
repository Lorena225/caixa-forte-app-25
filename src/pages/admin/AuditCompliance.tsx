import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLogs, useAuditLogTables, AuditLogFilters } from "@/hooks/useAuditLogs";
import { AuditService, SecurityAlert } from "@/services/auditService";
import {
  usePendingSignatures,
  useSignOperation,
  useRejectSignature,
  useCriticalOperations,
  useIntegrityCheck,
  useIntegrityHistory,
  useComplianceReports,
  useGenerateComplianceReport,
  useExportAuditTrail,
} from "@/hooks/useNonRepudiation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  RefreshCw, Eye, FileText, Search, Edit, Trash2, Plus,
  Download, Shield, AlertTriangle, CheckCircle, XCircle,
  Activity, Lock, Fingerprint, FileSignature,
  Scale, Building2, FileCheck, Stamp, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

export default function AuditCompliance() {
  const { currentCompany } = useAuth();
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const { data: logs, isLoading, refetch } = useAuditLogs(filters);
  const { data: tables } = useAuditLogTables();
  
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [stats, setStats] = useState<{
    total_today: number;
    total_week: number;
    by_action: Record<string, number>;
    by_sensitivity: Record<string, number>;
    top_tables: Array<{ table: string; count: number }>;
  } | null>(null);
  
  // Non-repudiation hooks
  const { data: pendingSignatures, refetch: refetchPending } = usePendingSignatures();
  const { data: criticalOps } = useCriticalOperations();
  const { data: integrityHistory } = useIntegrityHistory();
  const { data: complianceReports } = useComplianceReports();
  
  const signOperation = useSignOperation();
  const rejectSignature = useRejectSignature();
  const verifyIntegrity = useIntegrityCheck();
  const generateReport = useGenerateComplianceReport();
  const exportAudit = useExportAuditTrail();
  
  // Signature dialog state
  const [signatureDialog, setSignatureDialog] = useState<{
    open: boolean;
    pendingId?: string;
    auditLogId?: string;
    description?: string;
    amount?: number;
  }>({ open: false });
  const [signerCpf, setSignerCpf] = useState("");
  const [signerName, setSignerName] = useState("");
  
  // Report generation dialog
  const [reportDialog, setReportDialog] = useState(false);
  const [reportType, setReportType] = useState<'LGPD' | 'SOX' | 'BASILEIA' | 'ISO27001'>('LGPD');
  const [reportPeriodStart, setReportPeriodStart] = useState("");
  const [reportPeriodEnd, setReportPeriodEnd] = useState("");
  
  // Export dialog
  const [exportDialog, setExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'CSV' | 'JSON' | 'XML'>('CSV');
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  useEffect(() => {
    if (currentCompany?.id) {
      loadSecurityData();
    }
  }, [currentCompany?.id]);

  const loadSecurityData = async () => {
    if (!currentCompany?.id) return;
    
    setLoadingAlerts(true);
    try {
      const [alerts, auditStats] = await Promise.all([
        AuditService.generateSecurityReport(currentCompany.id),
        AuditService.getAuditStats(currentCompany.id),
      ]);
      setSecurityAlerts(alerts);
      setStats(auditStats);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleSign = async () => {
    if (!signatureDialog.auditLogId || !signerCpf || !signerName) {
      toast.error("Preencha CPF e nome do signatário");
      return;
    }
    
    await signOperation.mutateAsync({
      auditLogId: signatureDialog.auditLogId,
      signerCpf,
      signerName,
    });
    
    setSignatureDialog({ open: false });
    setSignerCpf("");
    setSignerName("");
    refetchPending();
  };

  const handleReject = async (pendingId: string) => {
    const reason = prompt("Motivo da rejeição:");
    if (reason) {
      await rejectSignature.mutateAsync({ pendingId, reason });
      refetchPending();
    }
  };

  const handleVerifyIntegrity = async () => {
    await verifyIntegrity.mutateAsync(1000);
  };

  const handleGenerateReport = async () => {
    if (!reportPeriodStart || !reportPeriodEnd) {
      toast.error("Selecione o período do relatório");
      return;
    }
    
    await generateReport.mutateAsync({
      reportType,
      periodStart: reportPeriodStart,
      periodEnd: reportPeriodEnd,
    });
    
    setReportDialog(false);
  };

  const handleExport = async () => {
    if (!exportStartDate || !exportEndDate) {
      toast.error("Selecione o período de exportação");
      return;
    }
    
    await exportAudit.mutateAsync({
      startDate: exportStartDate,
      endDate: exportEndDate,
      format: exportFormat,
    });
    
    setExportDialog(false);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "INSERT":
        return <Badge className="bg-accent text-accent-foreground"><Plus className="h-3 w-3 mr-1" />Criação</Badge>;
      case "UPDATE":
        return <Badge className="bg-secondary text-secondary-foreground"><Edit className="h-3 w-3 mr-1" />Alteração</Badge>;
      case "DELETE":
        return <Badge variant="destructive"><Trash2 className="h-3 w-3 mr-1" />Exclusão</Badge>;
      case "EXPORT":
        return <Badge variant="secondary"><Download className="h-3 w-3 mr-1" />Exportação</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      case 'high':
        return <Badge className="bg-destructive/80 text-destructive-foreground">Alto</Badge>;
      case 'medium':
        return <Badge className="bg-secondary text-secondary-foreground">Médio</Badge>;
      default:
        return <Badge variant="outline">Baixo</Badge>;
    }
  };

  const formatTableName = (name: string) => {
    return name
      .replace(/_/g, " ")
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const lastIntegrity = integrityHistory?.[0];

  return (
    <MainLayout>
      <PageHeader
        title="Auditoria e Compliance"
        description="Trilha de auditoria imutável, assinaturas digitais e conformidade regulatória"
      >
        <div className="flex gap-2">
          <Dialog open={exportDialog} onOpenChange={setExportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />Exportar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exportar Trilha de Auditoria</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Inicial</Label>
                    <Input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Final</Label>
                    <Input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'CSV' | 'JSON' | 'XML')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CSV">CSV (Excel)</SelectItem>
                      <SelectItem value="JSON">JSON</SelectItem>
                      <SelectItem value="XML">XML (Compliance)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setExportDialog(false)}>Cancelar</Button>
                <Button onClick={handleExport} disabled={exportAudit.isPending}>
                  {exportAudit.isPending ? "Exportando..." : "Exportar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => { refetch(); loadSecurityData(); refetchPending(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />Atualizar
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mt-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Logs Hoje</p>
                <p className="text-2xl font-bold">{stats?.total_today || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assinaturas Pendentes</p>
                <p className="text-2xl font-bold">{pendingSignatures?.length || 0}</p>
              </div>
              <FileSignature className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Integridade</p>
                <p className="text-2xl font-bold">{lastIntegrity?.is_valid ? "OK" : "⚠️"}</p>
              </div>
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas de Segurança</p>
                <p className="text-2xl font-bold">{securityAlerts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="mt-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="signatures" className="flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Assinaturas
            {(pendingSignatures?.length || 0) > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingSignatures?.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="integrity" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Integridade
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
            {securityAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1">{securityAlerts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* LOGS TAB */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <Label>Tabela</Label>
                  <Select
                    value={filters.table_name || "all"}
                    onValueChange={(v) => setFilters({ ...filters, table_name: v === "all" ? undefined : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {tables?.map((table) => (
                        <SelectItem key={table} value={table}>{formatTableName(table)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ação</Label>
                  <Select
                    value={filters.action || "all"}
                    onValueChange={(v) => setFilters({ ...filters, action: v === "all" ? undefined : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="INSERT">Criação</SelectItem>
                      <SelectItem value="UPDATE">Alteração</SelectItem>
                      <SelectItem value="DELETE">Exclusão</SelectItem>
                      <SelectItem value="EXPORT">Exportação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={filters.date_from || ""}
                    onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={filters.date_to || ""}
                    onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined })}
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full" onClick={() => setFilters({})}>
                    Limpar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Registros de Auditoria
              </CardTitle>
              <CardDescription>Trilha completa de operações com hash chain</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : logs?.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum log encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Tabela</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatTableName(log.table_name)}</Badge>
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.record_id?.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {(log as unknown as { signed_at?: string }).signed_at ? (
                              <Badge className="bg-accent text-accent-foreground">
                                <Stamp className="h-3 w-3 mr-1" />Assinado
                              </Badge>
                            ) : (log as unknown as { requires_signature?: boolean }).requires_signature ? (
                              <Badge variant="destructive">Aguardando Assinatura</Badge>
                            ) : (
                              <Badge variant="secondary">Normal</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="icon" variant="ghost">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes da Alteração</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Tabela:</span>
                                    <p>{formatTableName(log.table_name)}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Ação:</span>
                                    <p>{log.action}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Data:</span>
                                    <p>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Hash:</span>
                                    <p className="font-mono text-xs truncate" title={(log as unknown as { entry_hash?: string }).entry_hash}>
                                      {((log as unknown as { entry_hash?: string }).entry_hash)?.substring(0, 16)}...
                                    </p>
                                  </div>
                                </div>
                                {log.old_data && (
                                  <div>
                                    <span className="text-muted-foreground text-sm">Dados Anteriores:</span>
                                    <ScrollArea className="h-40 rounded border p-2 bg-destructive/5">
                                      <pre className="text-xs">{JSON.stringify(log.old_data, null, 2)}</pre>
                                    </ScrollArea>
                                  </div>
                                )}
                                {log.new_data && (
                                  <div>
                                    <span className="text-muted-foreground text-sm">Dados Novos:</span>
                                    <ScrollArea className="h-40 rounded border p-2 bg-primary/5">
                                      <pre className="text-xs">{JSON.stringify(log.new_data, null, 2)}</pre>
                                    </ScrollArea>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SIGNATURES TAB */}
        <TabsContent value="signatures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Assinaturas Digitais Pendentes
              </CardTitle>
              <CardDescription>
                Operações críticas aguardando assinatura digital (não-repudiação)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!pendingSignatures?.length ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Tudo em dia!</AlertTitle>
                  <AlertDescription>
                    Não há operações aguardando assinatura digital.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operação</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Solicitado em</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSignatures.map((pending) => (
                      <TableRow key={pending.id}>
                        <TableCell>
                          <Badge variant="outline">{pending.operation_type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {pending.operation_description || "-"}
                        </TableCell>
                        <TableCell>
                          {pending.amount 
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pending.amount)
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          {format(new Date(pending.requested_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(pending.expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => setSignatureDialog({
                                open: true,
                                pendingId: pending.id,
                                auditLogId: pending.audit_log_id,
                                description: pending.operation_description,
                                amount: pending.amount,
                              })}
                            >
                              <Fingerprint className="h-4 w-4 mr-1" />
                              Assinar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(pending.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Critical Operations Config */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Operações Críticas Configuradas
              </CardTitle>
              <CardDescription>
                Operações que requerem assinatura digital obrigatória
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { code: 'PAYMENT_APPROVAL', name: 'Aprovação de Pagamentos', threshold: 10000 },
                  { code: 'CREDIT_LIMIT_CHANGE', name: 'Alteração de Limites', threshold: null },
                  { code: 'DOCUMENT_DELETE', name: 'Exclusão de Documentos', threshold: null },
                  { code: 'BUDGET_VARIANCE_APPROVAL', name: 'Variações Orçamentárias', threshold: 5000 },
                  { code: 'PERMISSION_CHANGE', name: 'Alteração de Permissões', threshold: null },
                  { code: 'DATA_EXPORT', name: 'Exportação de Dados Sensíveis', threshold: null },
                ].map((op) => {
                  const configured = criticalOps?.find(c => c.operation_code === op.code);
                  return (
                    <Card key={op.code} className="border-l-4 border-l-destructive">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{op.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {configured?.threshold_amount 
                                ? `Acima de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(configured.threshold_amount)}`
                                : op.threshold
                                  ? `Padrão: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(op.threshold)}`
                                  : 'Sempre requer assinatura'
                              }
                            </p>
                          </div>
                          <Badge variant={configured?.is_active !== false ? "default" : "secondary"}>
                            {configured?.is_active !== false ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTEGRITY TAB */}
        <TabsContent value="integrity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Verificação de Integridade
              </CardTitle>
              <CardDescription>
                Validação da cadeia de hashes (blockchain-like) para garantir imutabilidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                {lastIntegrity ? (
                  <>
                    {lastIntegrity.is_valid ? (
                      <>
                        <CheckCircle className="h-12 w-12 text-accent" />
                        <div>
                          <p className="text-xl font-medium text-accent-foreground">Integridade OK</p>
                          <p className="text-sm text-muted-foreground">
                            {lastIntegrity.records_checked} registros verificados em{" "}
                            {lastIntegrity.verification_duration_ms}ms
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Última verificação: {format(new Date(lastIntegrity.checked_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-12 w-12 text-destructive" />
                        <div>
                          <p className="text-xl font-medium text-destructive">Integridade Comprometida!</p>
                          <p className="text-sm text-muted-foreground">
                            Quebra detectada em: {lastIntegrity.broken_at_timestamp}
                          </p>
                          <p className="text-xs font-mono">
                            Esperado: {lastIntegrity.expected_hash?.substring(0, 32)}...
                          </p>
                          <p className="text-xs font-mono">
                            Encontrado: {lastIntegrity.found_hash?.substring(0, 32)}...
                          </p>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Nenhuma verificação realizada ainda</p>
                )}
                <div className="ml-auto">
                  <Button onClick={handleVerifyIntegrity} disabled={verifyIntegrity.isPending}>
                    {verifyIntegrity.isPending ? (
                      <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Verificando...</>
                    ) : (
                      <><Shield className="mr-2 h-4 w-4" />Verificar Agora</>
                    )}
                  </Button>
                </div>
              </div>

              {/* History */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Histórico de Verificações</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrityHistory?.slice(0, 10).map((check) => (
                      <TableRow key={check.id}>
                        <TableCell>
                          {format(new Date(check.checked_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{check.records_checked}</TableCell>
                        <TableCell>{check.verification_duration_ms}ms</TableCell>
                        <TableCell>
                          {check.is_valid ? (
                            <Badge className="bg-accent text-accent-foreground">OK</Badge>
                          ) : (
                            <Badge variant="destructive">Falha</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPLIANCE TAB */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Relatórios de Compliance</h3>
              <p className="text-sm text-muted-foreground">LGPD, SOX, Basileia III, ISO 27001</p>
            </div>
            <Dialog open={reportDialog} onOpenChange={setReportDialog}>
              <DialogTrigger asChild>
                <Button>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Gerar Relatório
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gerar Relatório de Compliance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Relatório</Label>
                    <Select value={reportType} onValueChange={(v) => setReportType(v as typeof reportType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LGPD">LGPD - Lei Geral de Proteção de Dados</SelectItem>
                        <SelectItem value="SOX">SOX 404 - Controles Internos</SelectItem>
                        <SelectItem value="BASILEIA">Basileia III - Risco Operacional</SelectItem>
                        <SelectItem value="ISO27001">ISO 27001 - Segurança da Informação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Período Inicial</Label>
                      <Input type="date" value={reportPeriodStart} onChange={(e) => setReportPeriodStart(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Período Final</Label>
                      <Input type="date" value={reportPeriodEnd} onChange={(e) => setReportPeriodEnd(e.target.value)} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReportDialog(false)}>Cancelar</Button>
                  <Button onClick={handleGenerateReport} disabled={generateReport.isPending}>
                    {generateReport.isPending ? "Gerando..." : "Gerar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Compliance Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { type: 'LGPD', title: 'LGPD', icon: Building2, color: 'blue' },
              { type: 'SOX', title: 'SOX 404', icon: Scale, color: 'purple' },
              { type: 'BASILEIA', title: 'Basileia III', icon: Shield, color: 'orange' },
              { type: 'ISO27001', title: 'ISO 27001', icon: Lock, color: 'green' },
            ].map((compliance) => {
              const reports = complianceReports?.filter(r => r.report_type === compliance.type) || [];
              const latestReport = reports[0];
              const Icon = compliance.icon;
              
              return (
                <Card key={compliance.type}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-5 w-5" />
                      {compliance.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {latestReport ? (
                      <div className="space-y-2">
                        <Badge variant={latestReport.status === 'signed' ? 'default' : 'secondary'}>
                          {latestReport.status === 'signed' ? 'Assinado' : 
                           latestReport.status === 'approved' ? 'Aprovado' :
                           latestReport.status === 'pending_review' ? 'Em Revisão' : 'Rascunho'}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(latestReport.generated_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="mr-2 h-4 w-4" />Ver Relatório
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum relatório gerado</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Reports Table */}
          {complianceReports && complianceReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico de Relatórios</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Gerado em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complianceReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Badge variant="outline">{report.report_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(report.report_period_start), "dd/MM/yyyy")} - {format(new Date(report.report_period_end), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(report.generated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={report.status === 'signed' ? 'default' : 'secondary'}>
                            {report.status === 'signed' ? 'Assinado' : 
                             report.status === 'approved' ? 'Aprovado' :
                             report.status === 'pending_review' ? 'Em Revisão' : 'Rascunho'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alertas de Segurança
              </CardTitle>
              <CardDescription>
                Padrões suspeitos detectados automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAlerts ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Analisando padrões...
                </div>
              ) : securityAlerts.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Tudo OK!</AlertTitle>
                  <AlertDescription>
                    Nenhum padrão suspeito detectado nos últimos 7 dias.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {securityAlerts.map((alert, idx) => (
                    <Alert key={idx} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center gap-2">
                        {alert.description}
                        {getSeverityBadge(alert.severity)}
                      </AlertTitle>
                      <AlertDescription>
                        {alert.count} ocorrências detectadas
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição por Ação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.by_action).map(([action, count]) => {
                      const total = Object.values(stats.by_action).reduce((a, b) => a + b, 0);
                      const percentage = ((count / total) * 100).toFixed(1);
                      return (
                        <div key={action}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{action}</span>
                            <span>{count} ({percentage}%)</span>
                          </div>
                          <Progress value={parseFloat(percentage)} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tabelas Mais Alteradas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.top_tables.map((item) => {
                      const total = stats.top_tables.reduce((a, b) => a + b.count, 0);
                      const percentage = ((item.count / total) * 100).toFixed(1);
                      return (
                        <div key={item.table}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{formatTableName(item.table)}</span>
                            <span>{item.count} ({percentage}%)</span>
                          </div>
                          <Progress value={parseFloat(percentage)} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Signature Dialog */}
      <Dialog open={signatureDialog.open} onOpenChange={(open) => setSignatureDialog({ ...signatureDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Assinatura Digital
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {signatureDialog.description && (
              <Alert>
                <AlertDescription>
                  <strong>Operação:</strong> {signatureDialog.description}
                  {signatureDialog.amount && (
                    <><br/><strong>Valor:</strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(signatureDialog.amount)}</>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>CPF do Signatário</Label>
              <Input 
                placeholder="000.000.000-00" 
                value={signerCpf}
                onChange={(e) => setSignerCpf(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input 
                placeholder="Nome do responsável" 
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Ao assinar, você confirma a não-repudiação desta operação. A assinatura será vinculada ao seu CPF e registrada com hash SHA-256.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignatureDialog({ open: false })}>Cancelar</Button>
            <Button onClick={handleSign} disabled={signOperation.isPending}>
              {signOperation.isPending ? "Assinando..." : "Assinar Digitalmente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
