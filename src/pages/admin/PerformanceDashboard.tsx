/**
 * Performance Dashboard
 * Módulo 2.8: Escalabilidade e Otimização de Performance
 * Dashboard para monitoramento de métricas de performance e SLA
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Activity, 
  Database, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Gauge,
  HardDrive,
  Clock,
  TrendingUp,
  Server
} from 'lucide-react';
import { 
  usePerformanceSummary, 
  useRefreshPerformanceViews,
  useCleanupPerformanceData,
  usePageLoadTracking
} from '@/hooks/usePerformanceTracking';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import { toast } from 'sonner';

function MetricCard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  status,
  subtitle,
  trend
}: { 
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
  status?: 'success' | 'warning' | 'error';
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
}) {
  const statusColors = {
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500'
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{value}</span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full bg-muted ${status ? statusColors[status] : ''}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SLAStatus({ value, target, label }: { value: number; target: number; label: string }) {
  const isGood = value >= target;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={isGood ? 'text-green-500' : 'text-red-500'}>
          {value.toFixed(2)}% / {target}%
        </span>
      </div>
      <Progress value={Math.min(value, 100)} className={isGood ? '' : 'bg-red-100'} />
    </div>
  );
}

export default function PerformanceDashboard() {
  usePageLoadTracking('PerformanceDashboard');
  
  const {
    isLoading,
    slowQueriesCount,
    cacheHitRate,
    p50Latency,
    p95Latency,
    p99Latency,
    availability,
    errorRate,
    avgDbQueryTime,
    slowQueries,
    cacheStats,
    slaHistory
  } = usePerformanceSummary();

  const refreshViews = useRefreshPerformanceViews();
  const cleanupData = useCleanupPerformanceData();

  const handleRefresh = async () => {
    try {
      await refreshViews.mutateAsync();
      toast.success('Views de performance atualizadas');
    } catch {
      toast.error('Erro ao atualizar views');
    }
  };

  const handleCleanup = async () => {
    try {
      const deleted = await cleanupData.mutateAsync();
      toast.success(`${deleted} registros antigos removidos`);
    } catch {
      toast.error('Erro ao limpar dados');
    }
  };

  const getLatencyStatus = (value: number): 'success' | 'warning' | 'error' => {
    if (value < 200) return 'success';
    if (value < 500) return 'warning';
    return 'error';
  };

  // Prepare chart data
  const latencyChartData = slaHistory.map(s => ({
    date: format(new Date(s.metricDate), 'dd/MM'),
    p50: s.p50LatencyMs || 0,
    p95: s.p95LatencyMs || 0,
    p99: s.p99LatencyMs || 0
  })).reverse();

  const availabilityChartData = slaHistory.map(s => ({
    date: format(new Date(s.metricDate), 'dd/MM'),
    availability: s.availabilityPct,
    target: 99.9
  })).reverse();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitoramento de métricas de escalabilidade e SLA
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCleanup} disabled={cleanupData.isPending}>
            <HardDrive className="h-4 w-4 mr-2" />
            Limpar Antigos
          </Button>
          <Button onClick={handleRefresh} disabled={refreshViews.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshViews.isPending ? 'animate-spin' : ''}`} />
            Atualizar Views
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Latência P50"
          value={p50Latency.toFixed(0)}
          unit="ms"
          icon={Gauge}
          status={getLatencyStatus(p50Latency)}
          subtitle="Meta: <200ms"
        />
        <MetricCard
          title="Latência P99"
          value={p99Latency.toFixed(0)}
          unit="ms"
          icon={Zap}
          status={getLatencyStatus(p99Latency)}
          subtitle="Meta: <500ms"
        />
        <MetricCard
          title="Cache Hit Rate"
          value={cacheHitRate.toFixed(1)}
          unit="%"
          icon={Database}
          status={cacheHitRate >= 80 ? 'success' : cacheHitRate >= 60 ? 'warning' : 'error'}
          subtitle="Meta: >80%"
        />
        <MetricCard
          title="Disponibilidade"
          value={availability.toFixed(2)}
          unit="%"
          icon={availability >= 99.9 ? CheckCircle2 : AlertTriangle}
          status={availability >= 99.9 ? 'success' : availability >= 99 ? 'warning' : 'error'}
          subtitle="Meta: >99.9%"
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Queries Lentas (24h)"
          value={slowQueriesCount}
          icon={Clock}
          status={slowQueriesCount === 0 ? 'success' : slowQueriesCount < 5 ? 'warning' : 'error'}
          subtitle="Threshold: >100ms"
        />
        <MetricCard
          title="Tempo Médio DB"
          value={avgDbQueryTime.toFixed(0)}
          unit="ms"
          icon={Server}
          status={avgDbQueryTime < 50 ? 'success' : avgDbQueryTime < 100 ? 'warning' : 'error'}
          subtitle="Meta: <100ms"
        />
        <MetricCard
          title="Taxa de Erro"
          value={errorRate.toFixed(2)}
          unit="%"
          icon={AlertTriangle}
          status={errorRate < 1 ? 'success' : errorRate < 5 ? 'warning' : 'error'}
          subtitle="Meta: <1%"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="latency" className="space-y-4">
        <TabsList>
          <TabsTrigger value="latency">Latência</TabsTrigger>
          <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
          <TabsTrigger value="queries">Queries Lentas</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="sla">SLA</TabsTrigger>
        </TabsList>

        <TabsContent value="latency">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Latência</CardTitle>
              <CardDescription>Percentis de latência dos últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={latencyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis unit="ms" />
                    <Tooltip />
                    <Line type="monotone" dataKey="p50" stroke="hsl(var(--primary))" name="P50" strokeWidth={2} />
                    <Line type="monotone" dataKey="p95" stroke="hsl(var(--accent))" name="P95" strokeWidth={2} />
                    <Line type="monotone" dataKey="p99" stroke="hsl(var(--destructive))" name="P99" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle>Disponibilidade do Sistema</CardTitle>
              <CardDescription>Uptime vs Meta de SLA (99.9%)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={availabilityChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[99, 100]} unit="%" />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="availability" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.2)" 
                      name="Disponibilidade"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="target" 
                      stroke="hsl(var(--destructive))" 
                      strokeDasharray="5 5" 
                      name="Meta"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries">
          <Card>
            <CardHeader>
              <CardTitle>Queries Lentas</CardTitle>
              <CardDescription>Queries com tempo médio acima de 100ms nas últimas 24h</CardDescription>
            </CardHeader>
            <CardContent>
              {slowQueries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mb-4 text-green-500" />
                  <p>Nenhuma query lenta detectada!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead className="text-right">Execuções</TableHead>
                      <TableHead className="text-right">Avg (ms)</TableHead>
                      <TableHead className="text-right">P95 (ms)</TableHead>
                      <TableHead className="text-right">Max (ms)</TableHead>
                      <TableHead className="text-right">Cache Hit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowQueries.map((query, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{query.query_name}</TableCell>
                        <TableCell className="text-right">{query.execution_count}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={query.avg_time_ms > 500 ? 'destructive' : 'secondary'}>
                            {query.avg_time_ms.toFixed(0)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{query.p95_time_ms?.toFixed(0) || '-'}</TableCell>
                        <TableCell className="text-right">{query.max_time_ms.toFixed(0)}</TableCell>
                        <TableCell className="text-right">{query.cache_hit_rate?.toFixed(1) || 0}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas de Cache</CardTitle>
              <CardDescription>Performance do cache em memória</CardDescription>
            </CardHeader>
            <CardContent>
              {cacheStats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Chaves em Cache</p>
                    <p className="text-3xl font-bold">{cacheStats.total_keys}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Hit Rate</p>
                    <p className="text-3xl font-bold">{cacheStats.hit_rate?.toFixed(1) || 0}%</p>
                    <Progress value={cacheStats.hit_rate || 0} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Tamanho Total</p>
                    <p className="text-3xl font-bold">{cacheStats.total_size_mb?.toFixed(2) || 0} MB</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Hits</p>
                    <p className="text-3xl font-bold">{cacheStats.total_hits || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Misses</p>
                    <p className="text-3xl font-bold">{cacheStats.total_misses || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Tempo Médio de Load</p>
                    <p className="text-3xl font-bold">{cacheStats.avg_load_time_ms?.toFixed(0) || 0} ms</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4" />
                  <p>Nenhuma estatística de cache disponível</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla">
          <Card>
            <CardHeader>
              <CardTitle>Metas de SLA</CardTitle>
              <CardDescription>Conformidade com os objetivos de nível de serviço</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SLAStatus value={availability} target={99.9} label="Disponibilidade" />
              <SLAStatus 
                value={p99Latency < 500 ? 100 : (500 / p99Latency) * 100} 
                target={100} 
                label="P99 Latência (<500ms)" 
              />
              <SLAStatus value={cacheHitRate} target={80} label="Cache Hit Rate" />
              <SLAStatus 
                value={avgDbQueryTime < 100 ? 100 : (100 / avgDbQueryTime) * 100} 
                target={100} 
                label="DB Query Time (<100ms)" 
              />
              <SLAStatus 
                value={100 - errorRate} 
                target={99} 
                label="Taxa de Sucesso" 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
