import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KPICard, KPIGrid } from "@/components/dashboard/KPICard";
import { useLiquidityAlerts } from "@/hooks/useInnovationPlatform";
import { formatCurrency } from "@/lib/formatters";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  Landmark,
  Calendar,
  Shield,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// Mock real-time data
const generateRealtimeData = () => {
  // Sem dados fabricados: a projeção só é desenhada quando houver transações reais.
  // Retorna série vazia até a fonte real (transactions/projeção) estar conectada.
  return [] as { day: number; date: string; saldo: number; entradas: number; saidas: number }[];
};

const MOCK_BANK_POSITIONS: { bank: string; account: string; balance: number; lastUpdate: Date }[] = [];

const MOCK_ALERTS: any[] = [];


const ALERT_CONFIG = {
  negative_balance: { icon: XCircle, color: "text-destructive", label: "Saldo Negativo" },
  low_balance: { icon: AlertTriangle, color: "text-warning", label: "Saldo Baixo" },
  high_concentration: { icon: Landmark, color: "text-info", label: "Concentração" },
  cash_burn: { icon: TrendingDown, color: "text-orange-500", label: "Queima de Caixa" },
  payment_risk: { icon: Calendar, color: "text-destructive", label: "Risco de Pagamento" },
};

export default function FinanceiroTempoReal() {
  const [projectionData, setProjectionData] = useState(generateRealtimeData());
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: dbAlerts = [] } = useLiquidityAlerts();

  // Use mock data
  const alerts = MOCK_ALERTS;
  const bankPositions = MOCK_BANK_POSITIONS;

  const totalBalance = bankPositions.reduce((s, b) => s + b.balance, 0);
  const minProjectedBalance = projectionData.length > 0 ? Math.min(...projectionData.map((d) => d.saldo)) : 0;
  const daysUntilCritical = projectionData.findIndex((d) => d.saldo < 50000);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setProjectionData(generateRealtimeData());
    setLastUpdate(new Date());
    setIsRefreshing(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Finanças em Tempo Real"
          description="Posição de caixa consolidada e projeção dinâmica"
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3 text-success" />
              Live
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </PageHeader>

        {/* KPIs */}
        <KPIGrid columns={4}>
          <KPICard
            title="Saldo Total Consolidado"
            value={formatCurrency(totalBalance)}
            subtitle={`${bankPositions.length} contas`}
            icon={Wallet}
            variant="primary"
          />
          <KPICard
            title="Saldo Mínimo Projetado"
            value={formatCurrency(minProjectedBalance)}
            subtitle="próximos 30 dias"
            icon={TrendingDown}
            variant={minProjectedBalance < 50000 ? "warning" : "default"}
          />
          <KPICard
            title="Dias até Nível Crítico"
            value={daysUntilCritical >= 0 ? `${daysUntilCritical}d` : "—"}
            subtitle={daysUntilCritical >= 0 ? "< R$ 50.000" : "Seguro"}
            icon={Clock}
            variant={daysUntilCritical >= 0 && daysUntilCritical < 7 ? "danger" : "success"}
          />
          <KPICard
            title="Alertas Ativos"
            value={String(alerts.length)}
            subtitle={alerts.filter((a) => a.severity === "critical").length + " críticos"}
            icon={AlertTriangle}
            variant={alerts.filter((a) => a.severity === "critical").length > 0 ? "danger" : "default"}
          />
        </KPIGrid>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="border-warning/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Alertas de Liquidez
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => {
                  const config = ALERT_CONFIG[alert.alert_type as keyof typeof ALERT_CONFIG];
                  const AlertIcon = config?.icon || AlertTriangle;
                  return (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        alert.severity === "critical" ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"
                      }`}
                    >
                      <AlertIcon className={`h-5 w-5 mt-0.5 ${config?.color}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>
                            {alert.severity === "critical" ? "Crítico" : "Atenção"}
                          </Badge>
                          <span className="text-sm font-medium">{config?.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(alert.alert_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.ai_summary}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bank Positions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5" />
                  Posição por Conta Bancária
                </CardTitle>
                <CardDescription>
                  Última atualização: {format(lastUpdate, "HH:mm:ss", { locale: ptBR })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bankPositions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Landmark className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhuma conta conectada ainda.</p>
                  <p className="text-xs mt-1">A posição em tempo real aparece aqui após conectar suas contas via Open Banking ou cadastrá-las.</p>
                </div>
              )}
              {bankPositions.map((bank, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Landmark className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{bank.bank}</p>
                      <p className="text-sm text-muted-foreground">Conta {bank.account}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatCurrency(bank.balance)}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Activity className="h-3 w-3 text-success" />
                      {format(bank.lastUpdate, "HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow Projection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Projeção Dinâmica de Caixa
            </CardTitle>
            <CardDescription>Previsão para os próximos 30 dias baseada em vencimentos e histórico</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              {projectionData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Activity className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Sem dados para projetar ainda.</p>
                  <p className="text-xs mt-1">A projeção de saldo aparece quando houver lançamentos e vencimentos cadastrados.</p>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <ReferenceLine y={50000} stroke="hsl(var(--warning))" strokeDasharray="5 5" label="Mínimo" />
                  <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="saldo"
                    name="Saldo Projetado"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Integration Status */}
        <Card className="border-success/20 bg-gradient-to-r from-success/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-success/10">
                <Shield className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Integração Open Finance + IA</h4>
                <p className="text-sm text-muted-foreground">
                  Dados sincronizados via Open Finance combinados com análise preditiva de IA 
                  para projeções mais precisas e alertas antecipados.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm font-medium text-success">Ativo</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
