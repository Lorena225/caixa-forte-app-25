import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useAuditLogs, useAuditLogTables, AuditLogFilters } from "@/hooks/useAuditLogs";
import { useAuth } from "@/contexts/AuthContext";
import { AuditService, SecurityAlert } from "@/services/auditService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  RefreshCw, Eye, FileText, Search, Edit, Trash2, Plus, 
  Download, Shield, AlertTriangle, CheckCircle, XCircle,
  Activity, Clock, BarChart3, Lock
} from "lucide-react";
import { toast } from "sonner";

export default function AuditLogs() {
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
  const [integrityStatus, setIntegrityStatus] = useState<{
    valid: boolean;
    checked: number;
    broken_at?: string;
  } | null>(null);

  useEffect(() => {
    if (currentCompany?.id) {
      loadSecurityData();
    }
  }, [currentCompany?.id]);

  const loadSecurityData = async () => {
    if (!currentCompany?.id) return;
    
    setLoadingAlerts(true);
    try {
      const [alerts, auditStats, integrity] = await Promise.all([
        AuditService.generateSecurityReport(currentCompany.id),
        AuditService.getAuditStats(currentCompany.id),
        AuditService.verifyIntegrity(currentCompany.id, 500),
      ]);
      setSecurityAlerts(alerts);
      setStats(auditStats);
      setIntegrityStatus(integrity);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleExportCSV = async () => {
    if (!currentCompany?.id) return;
    
    try {
      const csv = await AuditService.exportToCSV(currentCompany.id, {
        dataInicio: filters.date_from,
        dataFim: filters.date_to,
        recurso: filters.table_name,
        acao: filters.action,
      });
      
      if (!csv) {
        toast.error('Nenhum dado para exportar');
        return;
      }
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Relatório exportado com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar relatório');
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "INSERT":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"><Plus className="h-3 w-3 mr-1" />Criação</Badge>;
      case "UPDATE":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"><Edit className="h-3 w-3 mr-1" />Alteração</Badge>;
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
        return <Badge className="bg-orange-100 text-orange-700">Alto</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-700">Médio</Badge>;
      default:
        return <Badge variant="outline">Baixo</Badge>;
    }
  };

  const formatTableName = (name: string) => {
    return name
      .replace(/_/g, " ")
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <MainLayout>
      <PageHeader
        title="Auditoria e Compliance"
        description="Histórico de alterações e alertas de segurança"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => { refetch(); loadSecurityData(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />Atualizar
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="logs" className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs de Auditoria
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
            {securityAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1">{securityAlerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        {/* LOGS TAB */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-5">
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
                        <SelectItem key={table} value={table}>
                          {formatTableName(table)}
                        </SelectItem>
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
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setFilters({})}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Registros
              </CardTitle>
              <CardDescription>Últimas 200 alterações</CardDescription>
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
                                <div className="grid grid-cols-3 gap-4 text-sm">
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
                                </div>
                                {log.old_data && (
                                  <div>
                                    <span className="text-muted-foreground text-sm">Dados Anteriores:</span>
                                    <ScrollArea className="h-40 rounded border p-2 bg-destructive/5">
                                      <pre className="text-xs">
                                        {JSON.stringify(log.old_data, null, 2)}
                                      </pre>
                                    </ScrollArea>
                                  </div>
                                )}
                                {log.new_data && (
                                  <div>
                                    <span className="text-muted-foreground text-sm">Dados Novos:</span>
                                    <ScrollArea className="h-40 rounded border p-2 bg-primary/5">
                                      <pre className="text-xs">
                                        {JSON.stringify(log.new_data, null, 2)}
                                      </pre>
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

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-4">
          {/* Integrity Check */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Integridade dos Logs
              </CardTitle>
              <CardDescription>
                Verificação de hash chain para garantir imutabilidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              {integrityStatus ? (
                <div className="flex items-center gap-4">
                  {integrityStatus.valid ? (
                    <>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-medium text-green-700">Integridade OK</p>
                        <p className="text-sm text-muted-foreground">
                          {integrityStatus.checked} registros verificados - Nenhuma alteração detectada
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-8 w-8 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">Integridade Comprometida</p>
                        <p className="text-sm text-muted-foreground">
                          Quebra detectada em: {integrityStatus.broken_at}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Carregando verificação...</p>
              )}
            </CardContent>
          </Card>

          {/* Security Alerts */}
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
                    <Alert 
                      key={idx} 
                      variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center gap-2">
                        {alert.description}
                        {getSeverityBadge(alert.severity)}
                      </AlertTitle>
                      <AlertDescription className="mt-2">
                        <p className="text-xs text-muted-foreground">
                          Detectado em: {format(new Date(alert.detected_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Conformidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">LGPD</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Conforme</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Logs imutáveis, redação automática de PII
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">SOX</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Conforme</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Trilha de auditoria completa para financeiro
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">ISO 27001</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Conforme</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hash chain, retenção mínima 1 ano
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATS TAB */}
        <TabsContent value="stats" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hoje</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_today || 0}</div>
                <p className="text-xs text-muted-foreground">alterações registradas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Última Semana</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_week || 0}</div>
                <p className="text-xs text-muted-foreground">alterações registradas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ações Críticas</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.by_sensitivity?.critical || 0}</div>
                <p className="text-xs text-muted-foreground">na última semana</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exclusões</CardTitle>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.by_action?.DELETE || 0}</div>
                <p className="text-xs text-muted-foreground">na última semana</p>
              </CardContent>
            </Card>
          </div>

          {/* Actions Distribution */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por Tipo de Ação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats?.by_action || {}).map(([action, count]) => (
                    <div key={action}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{action}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <Progress 
                        value={(count / (stats?.total_week || 1)) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tabelas Mais Alteradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.top_tables?.map(({ table, count }) => (
                    <div key={table}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{formatTableName(table)}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <Progress 
                        value={(count / (stats?.total_week || 1)) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
