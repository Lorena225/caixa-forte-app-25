import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BellRing, 
  AlertTriangle, 
  AlertCircle,
  Info,
  Check,
  X,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Target,
  RefreshCw,
  Eye,
  CheckCircle2
} from "lucide-react";
import { 
  useAIMonitorAlerts, 
  useMarkAlertRead, 
  useDismissAlert,
  useAIAlertsSummary
} from "@/hooks/useAIModule";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ALERT_TYPE_CONFIG: Record<string, { icon: React.ComponentType<any>; colorClass: string; label: string }> = {
  cash_flow_negative: { icon: TrendingDown, colorClass: "text-destructive", label: "Fluxo Negativo" },
  cash_flow_critical: { icon: AlertTriangle, colorClass: "text-destructive", label: "Fluxo Crítico" },
  overdue_increase: { icon: AlertCircle, colorClass: "text-warning", label: "Aumento Inadimplência" },
  overdue_critical: { icon: AlertTriangle, colorClass: "text-destructive", label: "Inadimplência Crítica" },
  margin_decrease: { icon: TrendingDown, colorClass: "text-warning", label: "Queda de Margem" },
  margin_critical: { icon: AlertTriangle, colorClass: "text-destructive", label: "Margem Crítica" },
  customer_concentration: { icon: Users, colorClass: "text-info", label: "Concentração Clientes" },
  supplier_concentration: { icon: Users, colorClass: "text-primary", label: "Concentração Fornecedores" },
  expense_increase: { icon: TrendingUp, colorClass: "text-warning", label: "Aumento Despesas" },
  revenue_decrease: { icon: TrendingDown, colorClass: "text-destructive", label: "Queda Receita" },
  budget_exceeded: { icon: Target, colorClass: "text-destructive", label: "Orçamento Excedido" },
  goal_at_risk: { icon: Target, colorClass: "text-warning", label: "Meta em Risco" },
  payment_due: { icon: Wallet, colorClass: "text-info", label: "Pagamento Próximo" },
  collection_opportunity: { icon: TrendingUp, colorClass: "text-success", label: "Oportunidade Cobrança" },
  anomaly_detected: { icon: AlertCircle, colorClass: "text-primary", label: "Anomalia Detectada" },
  custom: { icon: Info, colorClass: "text-muted-foreground", label: "Personalizado" },
};

const SEVERITY_CONFIG: Record<string, { variant: 'default' | 'secondary' | 'destructive'; bgClass: string; label: string }> = {
  info: { variant: "secondary", bgClass: "bg-info/10", label: "Informação" },
  warning: { variant: "default", bgClass: "bg-warning/10", label: "Aviso" },
  critical: { variant: "destructive", bgClass: "bg-destructive/10", label: "Crítico" },
};

export default function MonitorAlerts() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  const { data: summary } = useAIAlertsSummary();
  const { data: alerts, isLoading, refetch } = useAIMonitorAlerts({
    severity: severityFilter !== "all" ? severityFilter : undefined,
    alert_type: typeFilter !== "all" ? typeFilter : undefined,
  });
  const markRead = useMarkAlertRead();
  const dismissAlert = useDismissAlert();

  const handleMarkRead = async (alertId: string) => {
    try {
      await markRead.mutateAsync(alertId);
    } catch (error) {
      toast.error("Erro ao marcar como lido");
    }
  };

  const handleDismiss = async (alertId: string) => {
    try {
      await dismissAlert.mutateAsync(alertId);
      toast.success("Alerta dispensado");
    } catch (error) {
      toast.error("Erro ao dispensar alerta");
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Monitor Financeiro"
          description="Alertas e insights gerados automaticamente pela IA"
        />

        {/* Summary Cards - Consistent with AP/AR */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Alertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary?.total_count || 0}</p>
            </CardContent>
          </Card>
          <Card className={summary?.unread_count ? "border-info/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="h-4 w-4 text-info" />
                Não Lidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-info">{summary?.unread_count || 0}</p>
            </CardContent>
          </Card>
          <Card className={summary?.critical_count ? "border-destructive/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Críticos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{summary?.critical_count || 0}</p>
            </CardContent>
          </Card>
          <Card className={summary?.warning_count ? "border-warning/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                Avisos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-warning">{summary?.warning_count || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Consistent style */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Severidade</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="info">Informação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(ALERT_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              Alertas Ativos
            </CardTitle>
            <CardDescription>
              {alerts?.length || 0} alertas ativos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !alerts?.length ? (
              <div className="text-center py-12">
                <div className="mb-4 rounded-full bg-success/10 p-4 w-fit mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhum alerta ativo</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Sua conta está em dia! O monitor continuará observando e emitirá alertas quando detectar riscos ou oportunidades.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onMarkRead={() => handleMarkRead(alert.id)}
                      onDismiss={() => handleDismiss(alert.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

interface AlertCardProps {
  alert: any;
  onMarkRead: () => void;
  onDismiss: () => void;
}

function AlertCard({ alert, onMarkRead, onDismiss }: AlertCardProps) {
  const typeConfig = ALERT_TYPE_CONFIG[alert.alert_type] || ALERT_TYPE_CONFIG.custom;
  const severityConfig = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
  const TypeIcon = typeConfig.icon;

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${!alert.is_read ? 'bg-primary/5 border-primary/30' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${severityConfig.bgClass}`}>
            <TypeIcon className={`h-5 w-5 ${typeConfig.colorClass}`} />
          </div>
          <div className="min-w-0">
            <h4 className="font-medium">{alert.title}</h4>
            <p className="text-xs text-muted-foreground">
              {format(new Date(alert.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={severityConfig.variant}>
            {severityConfig.label}
          </Badge>
          {!alert.is_read && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Novo
            </Badge>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{alert.message_summary}</p>

      {alert.suggested_actions && Array.isArray(alert.suggested_actions) && alert.suggested_actions.length > 0 && (
        <div className="bg-muted rounded-lg p-3">
          <p className="text-sm font-medium mb-2">Sugestões da IA:</p>
          <ul className="text-sm space-y-1">
            {(alert.suggested_actions as string[]).map((action, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {!alert.is_read && (
          <Button variant="outline" size="sm" onClick={onMarkRead}>
            <Eye className="h-4 w-4 mr-2" />
            Marcar como Lido
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          <X className="h-4 w-4 mr-2" />
          Dispensar
        </Button>
      </div>
    </div>
  );
}
