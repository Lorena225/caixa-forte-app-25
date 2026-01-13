import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { 
  Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw, 
  Shield, Database, Zap, Clock, Inbox, Lock, Globe
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function SystemHealth() {
  const { data: health, isLoading, refetch } = useSystemHealth();

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
    href 
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string;
    icon: React.ElementType; 
    status?: 'good' | 'warning' | 'bad' | 'neutral';
    href?: string;
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
        </CardContent>
      </Card>
    );

    return href ? <Link to={href}>{content}</Link> : content;
  };

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
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </PageHeader>

        {/* Overall Status */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              {getStatusIcon(health?.status || 'healthy')}
              <div>
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

        {/* Metrics Grid */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {/* Jobs Section */}
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
            title="Falhas (24h)"
            value={health?.jobs_failed_24h || 0}
            icon={XCircle}
            status={health?.jobs_failed_24h && health.jobs_failed_24h > 10 ? 'warning' : 'good'}
            href="/admin/jobs"
          />

          {/* DLQ Section */}
          <MetricCard
            title="DLQ Pendente"
            value={health?.dlq_pending || 0}
            icon={Inbox}
            status={health?.dlq_pending && health.dlq_pending > 0 ? 'warning' : 'good'}
            href="/integracoes/dlq"
          />
          <MetricCard
            title="DLQ Mais Antigo"
            value={health?.dlq_oldest_hours ? `${health.dlq_oldest_hours}h` : '-'}
            icon={Clock}
            status={health?.dlq_oldest_hours && health.dlq_oldest_hours > 24 ? 'bad' : 'neutral'}
            href="/integracoes/dlq"
          />

          {/* Security Section */}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
