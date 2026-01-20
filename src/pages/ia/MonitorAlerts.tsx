import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  EyeOff
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

const ALERT_TYPE_CONFIG: Record<string, { icon: React.ComponentType<any>; color: string; label: string }> = {
  cash_flow_negative: { icon: TrendingDown, color: "text-red-500", label: "Fluxo Negativo" },
  cash_flow_critical: { icon: AlertTriangle, color: "text-red-600", label: "Fluxo Crítico" },
  overdue_increase: { icon: AlertCircle, color: "text-orange-500", label: "Aumento Inadimplência" },
  overdue_critical: { icon: AlertTriangle, color: "text-red-500", label: "Inadimplência Crítica" },
  margin_decrease: { icon: TrendingDown, color: "text-yellow-500", label: "Queda de Margem" },
  margin_critical: { icon: AlertTriangle, color: "text-red-500", label: "Margem Crítica" },
  customer_concentration: { icon: Users, color: "text-blue-500", label: "Concentração Clientes" },
  supplier_concentration: { icon: Users, color: "text-purple-500", label: "Concentração Fornecedores" },
  expense_increase: { icon: TrendingUp, color: "text-orange-500", label: "Aumento Despesas" },
  revenue_decrease: { icon: TrendingDown, color: "text-red-500", label: "Queda Receita" },
  budget_exceeded: { icon: Target, color: "text-red-500", label: "Orçamento Excedido" },
  goal_at_risk: { icon: Target, color: "text-yellow-500", label: "Meta em Risco" },
  payment_due: { icon: Wallet, color: "text-blue-500", label: "Pagamento Próximo" },
  collection_opportunity: { icon: TrendingUp, color: "text-green-500", label: "Oportunidade Cobrança" },
  anomaly_detected: { icon: AlertCircle, color: "text-purple-500", label: "Anomalia Detectada" },
  custom: { icon: Info, color: "text-slate-500", label: "Personalizado" },
};

const SEVERITY_CONFIG: Record<string, { variant: 'default' | 'secondary' | 'destructive'; icon: React.ComponentType<any>; label: string }> = {
  info: { variant: "secondary", icon: Info, label: "Informação" },
  warning: { variant: "default", icon: AlertCircle, label: "Aviso" },
  critical: { variant: "destructive", icon: AlertTriangle, label: "Crítico" },
};

export default function MonitorAlerts() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  const { data: summary } = useAIAlertsSummary();
  const { data: alerts, isLoading } = useAIMonitorAlerts({
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

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{summary?.total_count || 0}</div>
              <p className="text-sm text-muted-foreground">Total de Alertas</p>
            </CardContent>
          </Card>
          <Card className={summary?.unread_count ? "border-blue-500/50" : ""}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">{summary?.unread_count || 0}</div>
              <p className="text-sm text-muted-foreground">Não Lidos</p>
            </CardContent>
          </Card>
          <Card className={summary?.critical_count ? "border-red-500/50" : ""}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{summary?.critical_count || 0}</div>
              <p className="text-sm text-muted-foreground">Críticos</p>
            </CardContent>
          </Card>
          <Card className={summary?.warning_count ? "border-orange-500/50" : ""}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-500">{summary?.warning_count || 0}</div>
              <p className="text-sm text-muted-foreground">Avisos</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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
              Alertas e insights gerados pelo monitor financeiro
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !alerts?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum alerta ativo</p>
                <p className="text-sm">Sua conta está em dia!</p>
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
  const SeverityIcon = severityConfig.icon;

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${!alert.is_read ? 'bg-muted/30 border-primary/30' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
            alert.severity === 'critical' ? 'bg-red-500/10' :
            alert.severity === 'warning' ? 'bg-orange-500/10' :
            'bg-blue-500/10'
          }`}>
            <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
          </div>
          <div>
            <h4 className="font-medium">{alert.title}</h4>
            <p className="text-xs text-muted-foreground">
              {format(new Date(alert.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={severityConfig.variant}>
            <SeverityIcon className="h-3 w-3 mr-1" />
            {severityConfig.label}
          </Badge>
          {!alert.is_read && (
            <Badge variant="outline" className="bg-blue-500/10">Novo</Badge>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{alert.message_summary}</p>

      {alert.suggested_actions && Array.isArray(alert.suggested_actions) && (
        <div className="bg-primary/5 rounded-lg p-3">
          <p className="text-sm font-medium mb-2">Sugestões:</p>
          <ul className="text-sm space-y-1">
            {(alert.suggested_actions as string[]).map((action, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary">•</span>
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
