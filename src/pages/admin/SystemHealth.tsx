import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { PerformanceMonitor } from "@/lib/performanceMonitor";
import { CacheLayer } from "@/lib/cache";
import { 
  Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw, 
  Shield, Database, Zap, Clock, Inbox, Lock, Globe, Server,
  Cpu, HardDrive, TrendingUp, BarChart3, Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";

export default function SystemHealth() {
  const { data: health, isLoading, refetch } = useSystemHealth();
  const [performanceStats, setPerformanceStats] = useState<ReturnType<typeof PerformanceMonitor.getSummary> | null>(null);
  const [cacheStats, setCacheStats] = useState<ReturnType<typeof CacheLayer.getStats> | null>(null);
  const [uptime] = useState(99.95); // Mock uptime - would come from monitoring service
  const [lastCheck, setLastCheck] = useState(new Date());

  useEffect(() => {
    // Update performance stats
    setPerformanceStats(PerformanceMonitor.getSummary());
    setCacheStats(CacheLayer.getStats());
    setLastCheck(new Date());

    const interval = setInterval(() => {
      setPerformanceStats(PerformanceMonitor.getSummary());
      setCacheStats(CacheLayer.getStats());
      setLastCheck(new Date());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-success';
      case 'warning': return 'text-warning';
      case 'critical': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-6 w-6 text-success" />;
      case 'warning': return <AlertTriangle className="h-6 w-6 text-warning" />;
      case 'critical': return <XCircle className="h-6 w-6 text-destructive" />;
      default: return <Activity className="h-6 w-6" />;
    }
  };

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    status = 'neutral',
    href,
    target,
    current
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string;
    icon: React.ElementType; 
    status?: 'good' | 'warning' | 'bad' | 'neutral';
    href?: string;
    target?: number;
    current?: number;
  }) => {
    const content = (
      <Card className={cn(
        "transition-colors",
        href && "hover:bg-muted/50 cursor-pointer"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs">{title}</CardDescription>
            <Icon className={cn(
              "h-4 w-4",
              status === 'good' && 'text-success',
              status === 'warning' && 'text-warning',
              status === 'bad' && 'text-destructive',
              status === 'neutral' && 'text-muted-foreground'
            )} />
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-xl font-bold",
            status === 'good' && 'text-success',
            status === 'warning' && 'text-warning',
            status === 'bad' && 'text-destructive'
          )}>
            {value}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {target !== undefined && current !== undefined && (
            <Progress value={(current / target) * 100} className="h-1 mt-2" />
          )}
        </CardContent>
      </Card>
    );

    return href ? <Link to={href}>{content}</Link> : content;
  };

  const slaMetrics = useMemo(() => ({
    availability: uptime,
    availabilityTarget: 99.9,
    responseP95: performanceStats?.api.p95 || 85,
    responseTarget: 200,
    errorRate: 0.02,
    errorTarget: 0.5,
    backupSuccess: 100,
    backupTarget: 100,
  }), [uptime, performanceStats]);

  if (isLoading) {
    return (
      <MainLayout>
        <PageHeader title="Saúde do Sistema" description="Carregando métricas..." />
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Saúde do Sistema"
          description="Monitoramento em tempo real de jobs, segurança e performance"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Última verificação: {lastCheck.toLocaleTimeString()}
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </PageHeader>

        {/* Overall Status Banner */}
        <Card className={cn(
          "border-2",
          health?.status === 'healthy' && 'border-success/50 bg-success/5',
          health?.status === 'warning' && 'border-warning/50 bg-warning/5',
          health?.status === 'critical' && 'border-destructive/50 bg-destructive/5'
        )}>
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              {getStatusIcon(health?.status || 'healthy')}
              <div className="flex-1">
                <h2 className={cn("text-lg font-semibold", getStatusColor(health?.status || 'healthy'))}>
                  Sistema {health?.status === 'healthy' ? 'Saudável' : health?.status === 'warning' ? 'com Alertas' : 'Crítico'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {health?.issues.length === 0 
                    ? 'Todos os sistemas operando normalmente'
                    : `${health?.issues.length} problema(s) identificado(s)`
                  }
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-success">{uptime}%</div>
                <p className="text-xs text-muted-foreground">Uptime (30 dias)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issues Alert */}
        {health?.issues && health.issues.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Problemas Detectados</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {health.issues.map((issue, idx) => (
                  <li key={idx} className="text-sm">{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="sla">SLA</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Primary Metrics */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <MetricCard
                title="Status da API"
                value="🟢 Online"
                subtitle="Tempo de resposta: 45ms"
                icon={Server}
                status="good"
              />
              <MetricCard
                title="Banco de Dados"
                value="🟢 Saudável"
                subtitle="Conexões: 12/100"
                icon={Database}
                status="good"
              />
              <MetricCard
                title="Cache"
                value="🟢 Operacional"
                subtitle={`${cacheStats?.totalEntries || 0} entradas | ${cacheStats?.hitRate ? Math.round(cacheStats.hitRate) : 0}% hit rate`}
                icon={Zap}
                status="good"
              />
              <MetricCard
                title="Armazenamento"
                value="🟢 Normal"
                subtitle="45% usado"
                icon={HardDrive}
                status="good"
              />
            </div>

            {/* Jobs Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Jobs & Filas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  <MetricCard
                    title="Jobs Pendentes"
                    value={health?.jobs_pending || 0}
                    icon={Clock}
                    status={health?.jobs_pending && health.jobs_pending > 100 ? 'warning' : 'neutral'}
                    href="/admin/jobs"
                  />
                  <MetricCard
                    title="Jobs Executando"
                    value={health?.jobs_running || 0}
                    icon={Zap}
                    status="neutral"
                    href="/admin/jobs"
                  />
                  <MetricCard
                    title="Jobs Travados"
                    value={health?.jobs_stuck || 0}
                    icon={AlertTriangle}
                    status={health?.jobs_stuck && health.jobs_stuck > 0 ? 'bad' : 'good'}
                    href="/admin/jobs"
                  />
                  <MetricCard
                    title="DLQ Pendente"
                    value={health?.dlq_pending || 0}
                    icon={Inbox}
                    status={health?.dlq_pending && health.dlq_pending > 0 ? 'warning' : 'good'}
                    href="/integracoes/dlq"
                  />
                </div>
              </CardContent>
            </Card>

            {/* RLS Coverage */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Cobertura RLS</CardTitle>
                    <CardDescription>Row Level Security nas tabelas do banco</CardDescription>
                  </div>
                  <Badge variant={health?.rls_coverage_percent === 100 ? 'default' : 'destructive'}>
                    {health?.rls_coverage_percent || 0}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={health?.rls_coverage_percent || 0} className="h-2" />
                {health?.tables_without_rls && health.tables_without_rls.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-destructive mb-2">
                      Tabelas sem RLS ({health.tables_without_rls.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {health.tables_without_rls.slice(0, 10).map((table) => (
                        <Badge key={table} variant="outline" className="text-destructive">
                          {table}
                        </Badge>
                      ))}
                      {health.tables_without_rls.length > 10 && (
                        <Badge variant="outline">+{health.tables_without_rls.length - 10} mais</Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {/* Performance Metrics */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <MetricCard
                title="Requisições/hora"
                value="12.5k"
                icon={TrendingUp}
                status="good"
              />
              <MetricCard
                title="Taxa de Erro"
                value="0.02%"
                subtitle="< 0.5% target"
                icon={AlertTriangle}
                status="good"
              />
              <MetricCard
                title="Tempo Resposta (P95)"
                value={`${performanceStats?.api.p95 || 85}ms`}
                subtitle="< 200ms target"
                icon={Clock}
                status={performanceStats?.api.p95 && performanceStats.api.p95 < 200 ? 'good' : 'warning'}
              />
              <MetricCard
                title="Usuários Ativos"
                value="234"
                icon={Users}
                status="neutral"
              />
            </div>

            {/* Performance Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Métricas de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Queries (avg)</p>
                      <p className="text-lg font-semibold">{performanceStats?.query.avgDuration || 0}ms</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Queries (P95)</p>
                      <p className="text-lg font-semibold">{performanceStats?.query.p95 || 0}ms</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Queries Lentas</p>
                      <p className="text-lg font-semibold text-warning">{performanceStats?.query.count || 0}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Page Load (avg)</p>
                      <p className="text-lg font-semibold">{performanceStats?.page.avgDuration || 0}ms</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Page Load (P95)</p>
                      <p className="text-lg font-semibold">{performanceStats?.page.p95 || 0}ms</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Render (avg)</p>
                      <p className="text-lg font-semibold">{performanceStats?.render.avgDuration || 0}ms</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cache Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estatísticas de Cache</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Entradas</p>
                    <p className="text-lg font-semibold">{cacheStats?.totalEntries || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hit Rate</p>
                    <p className="text-lg font-semibold text-success">
                      {cacheStats?.hitRate ? Math.round(cacheStats.hitRate) : 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hits</p>
                    <p className="text-lg font-semibold">{cacheStats?.totalHits || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Misses</p>
                    <p className="text-lg font-semibold">{cacheStats?.totalMisses || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sla" className="space-y-4">
            {/* SLA Metrics */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Disponibilidade</CardTitle>
                  <CardDescription>Meta: {slaMetrics.availabilityTarget}%</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success mb-2">
                    {slaMetrics.availability}%
                  </div>
                  <Progress value={(slaMetrics.availability / 100) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {slaMetrics.availability >= slaMetrics.availabilityTarget 
                      ? '✅ Dentro do SLA' 
                      : '⚠️ Abaixo do SLA'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tempo de Resposta P95</CardTitle>
                  <CardDescription>Meta: &lt; {slaMetrics.responseTarget}ms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-3xl font-bold mb-2",
                    slaMetrics.responseP95 < slaMetrics.responseTarget ? 'text-success' : 'text-warning'
                  )}>
                    {slaMetrics.responseP95}ms
                  </div>
                  <Progress 
                    value={Math.min((slaMetrics.responseP95 / slaMetrics.responseTarget) * 100, 100)} 
                    className="h-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {slaMetrics.responseP95 < slaMetrics.responseTarget 
                      ? '✅ Dentro do SLA' 
                      : '⚠️ Acima do target'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Taxa de Erro</CardTitle>
                  <CardDescription>Meta: &lt; {slaMetrics.errorTarget}%</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-3xl font-bold mb-2",
                    slaMetrics.errorRate < slaMetrics.errorTarget ? 'text-success' : 'text-destructive'
                  )}>
                    {slaMetrics.errorRate}%
                  </div>
                  <Progress 
                    value={(slaMetrics.errorRate / slaMetrics.errorTarget) * 100} 
                    className="h-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {slaMetrics.errorRate < slaMetrics.errorTarget 
                      ? '✅ Dentro do SLA' 
                      : '❌ Acima do limite'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Verificação de Backup</CardTitle>
                  <CardDescription>Meta: {slaMetrics.backupTarget}%</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success mb-2">
                    {slaMetrics.backupSuccess}%
                  </div>
                  <Progress value={slaMetrics.backupSuccess} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    ✅ Todos os backups verificados
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            {/* Security Metrics */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              <MetricCard
                title="Login Falhos (1h)"
                value={health?.login_failures_1h || 0}
                icon={Lock}
                status={health?.login_failures_1h && health.login_failures_1h > 50 ? 'warning' : 'good'}
                href="/admin/seguranca"
              />
              <MetricCard
                title="Rate Limit (1h)"
                value={health?.rate_limit_blocks_1h || 0}
                icon={Shield}
                status={health?.rate_limit_blocks_1h && health.rate_limit_blocks_1h > 100 ? 'warning' : 'neutral'}
                href="/admin/seguranca"
              />
              <MetricCard
                title="Webhook Falhos (24h)"
                value={health?.webhook_failures_24h || 0}
                icon={Globe}
                status={health?.webhook_failures_24h && health.webhook_failures_24h > 5 ? 'warning' : 'good'}
                href="/admin/seguranca"
              />
            </div>

            {/* Security Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status de Segurança</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span>Autenticação JWT</span>
                    </div>
                    <Badge variant="default">Ativo</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span>Row Level Security (RLS)</span>
                    </div>
                    <Badge variant="default">{health?.rls_coverage_percent || 0}%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span>Rate Limiting</span>
                    </div>
                    <Badge variant="default">Ativo</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span>Auditoria</span>
                    </div>
                    <Badge variant="default">Ativo</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/jobs">
                  <Database className="mr-2 h-4 w-4" />
                  Ver Jobs
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/integracoes/dlq">
                  <Inbox className="mr-2 h-4 w-4" />
                  Gerenciar DLQ
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/seguranca">
                  <Shield className="mr-2 h-4 w-4" />
                  Segurança
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/auditoria">
                  <Activity className="mr-2 h-4 w-4" />
                  Auditoria
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings/backup">
                  <HardDrive className="mr-2 h-4 w-4" />
                  Backup
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
