import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, ShieldCheck, ShieldAlert, ShieldX, 
  Webhook, AlertTriangle, Clock, RefreshCcw,
  CheckCircle2, XCircle, Activity, Lock
} from "lucide-react";
import { useSecurityStatus, useWebhookStatus, useDLQItems, useRateLimitEvents } from "@/hooks/useSecurityDashboard";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function SecurityKPICard({ 
  title, 
  value, 
  description, 
  status = 'neutral',
  icon: Icon 
}: { 
  title: string; 
  value: number | string; 
  description: string;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  icon: React.ElementType;
}) {
  const statusColors = {
    success: 'text-green-500 bg-green-500/10',
    warning: 'text-amber-500 bg-amber-500/10',
    danger: 'text-red-500 bg-red-500/10',
    neutral: 'text-muted-foreground bg-muted',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-full ${statusColors[status]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function WebhookStatusBadge({ status }: { status: string }) {
  const badges: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    success: { variant: 'default', label: 'Sucesso' },
    pending: { variant: 'secondary', label: 'Pendente' },
    invalid_signature: { variant: 'destructive', label: 'Assinatura Inválida' },
    replay_attempt: { variant: 'destructive', label: 'Replay' },
    processing_failed: { variant: 'destructive', label: 'Falha' },
  };
  
  const badge = badges[status] || { variant: 'outline' as const, label: status };
  
  return <Badge variant={badge.variant}>{badge.label}</Badge>;
}

export default function SecurityDashboard() {
  const { data: securityStatus, isLoading: isLoadingStatus } = useSecurityStatus();
  const { data: webhooks, isLoading: isLoadingWebhooks, refetch: refetchWebhooks } = useWebhookStatus();
  const { data: dlqItems, isLoading: isLoadingDLQ } = useDLQItems();
  const { data: rateLimitEvents } = useRateLimitEvents();

  const rlsCoverage = securityStatus 
    ? Math.round((securityStatus.rls_enabled_tables / securityStatus.total_tables) * 100)
    : 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Central de Segurança"
          description="Monitore webhooks, auditoria, DLQ e status de segurança"
        />

        {/* Security KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          {isLoadingStatus ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32 mt-2" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <SecurityKPICard
                title="Cobertura RLS"
                value={`${rlsCoverage}%`}
                description={`${securityStatus?.rls_enabled_tables}/${securityStatus?.total_tables} tabelas`}
                status={rlsCoverage === 100 ? 'success' : rlsCoverage >= 90 ? 'warning' : 'danger'}
                icon={rlsCoverage === 100 ? ShieldCheck : ShieldAlert}
              />
              <SecurityKPICard
                title="Webhooks Inválidos (24h)"
                value={securityStatus?.invalid_webhooks_24h || 0}
                description="Falhas de assinatura"
                status={(securityStatus?.invalid_webhooks_24h || 0) === 0 ? 'success' : 'danger'}
                icon={Webhook}
              />
              <SecurityKPICard
                title="Rate Limit Blocks (24h)"
                value={securityStatus?.rate_limit_blocks_24h || 0}
                description="Requisições bloqueadas"
                status={(securityStatus?.rate_limit_blocks_24h || 0) === 0 ? 'success' : 'warning'}
                icon={Lock}
              />
              <SecurityKPICard
                title="DLQ Pendente"
                value={securityStatus?.dlq_pending || 0}
                description="Eventos não processados"
                status={(securityStatus?.dlq_pending || 0) === 0 ? 'success' : 'warning'}
                icon={AlertTriangle}
              />
            </>
          )}
        </div>

        {/* Additional Security Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <SecurityKPICard
            title="Tentativas de Replay (24h)"
            value={securityStatus?.replay_attempts_24h || 0}
            description="Webhooks duplicados rejeitados"
            status={(securityStatus?.replay_attempts_24h || 0) === 0 ? 'success' : 'warning'}
            icon={RefreshCcw}
          />
          <SecurityKPICard
            title="Eventos Críticos (24h)"
            value={securityStatus?.critical_events_24h || 0}
            description="Ações sensíveis auditadas"
            status="neutral"
            icon={Activity}
          />
          <Card className={rlsCoverage === 100 ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {rlsCoverage === 100 ? (
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                )}
                Status de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {rlsCoverage === 100 
                  ? "Todas as tabelas estão protegidas com RLS. Audit logs append-only ativo."
                  : "Algumas tabelas podem não ter RLS habilitado. Revise a configuração."
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed views */}
        <Tabs defaultValue="webhooks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="dlq" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              DLQ ({dlqItems?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="ratelimit" className="gap-2">
              <Lock className="h-4 w-4" />
              Rate Limits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Webhooks Recentes</CardTitle>
                  <CardDescription>Últimos webhooks recebidos e seu status</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchWebhooks()}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provedor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assinatura</TableHead>
                        <TableHead>Replay</TableHead>
                        <TableHead>Recebido</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingWebhooks ? (
                        Array(5).fill(0).map((_, i) => (
                          <TableRow key={i}>
                            {Array(6).fill(0).map((_, j) => (
                              <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : webhooks?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Nenhum webhook recebido
                          </TableCell>
                        </TableRow>
                      ) : (
                        webhooks?.map((webhook) => (
                          <TableRow key={webhook.id}>
                            <TableCell className="font-medium">{webhook.provider}</TableCell>
                            <TableCell>
                              <WebhookStatusBadge status={webhook.health_status} />
                            </TableCell>
                            <TableCell>
                              {webhook.signature_valid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </TableCell>
                            <TableCell>
                              {webhook.replay_detected ? (
                                <Badge variant="destructive">Sim</Badge>
                              ) : (
                                <Badge variant="outline">Não</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {formatDistanceToNow(new Date(webhook.received_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {webhook.error_message || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dlq">
            <Card>
              <CardHeader>
                <CardTitle>Dead Letter Queue</CardTitle>
                <CardDescription>Eventos que falharam no processamento</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Tentativas</TableHead>
                        <TableHead>Falhou em</TableHead>
                        <TableHead>Erro</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingDLQ ? (
                        Array(3).fill(0).map((_, i) => (
                          <TableRow key={i}>
                            {Array(5).fill(0).map((_, j) => (
                              <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : dlqItems?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                            Nenhum item na DLQ
                          </TableCell>
                        </TableRow>
                      ) : (
                        dlqItems?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.event_type}</TableCell>
                            <TableCell>{item.attempts}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(item.failed_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </TableCell>
                            <TableCell className="text-sm max-w-[300px] truncate">
                              {item.error_json 
                                ? String(JSON.stringify(item.error_json)).substring(0, 100)
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">
                                Reprocessar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ratelimit">
            <Card>
              <CardHeader>
                <CardTitle>Bloqueios por Rate Limit</CardTitle>
                <CardDescription>Requisições bloqueadas por exceder limites</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ação</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Bloqueado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rateLimitEvents?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                            Nenhum bloqueio por rate limit
                          </TableCell>
                        </TableRow>
                      ) : (
                        rateLimitEvents?.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-medium">{event.action_type}</TableCell>
                            <TableCell className="font-mono text-sm">{String(event.ip_address || '-')}</TableCell>
                            <TableCell>{String(event.user_id || '-')}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(event.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
