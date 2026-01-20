import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/common/EmptyState";
import { KPICard, KPIGrid } from "@/components/dashboard/KPICard";
import { formatCurrency } from "@/lib/formatters";
import { useAnomalyDetections, useUpdateAnomalyStatus } from "@/hooks/useInnovationPlatform";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Shield,
  Eye,
  CheckCircle2,
  XCircle,
  Brain,
  Search,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Clock,
  Filter,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const SEVERITY_CONFIG = {
  low: { label: "Baixo", color: "text-muted-foreground", bg: "bg-muted", border: "border-muted" },
  medium: { label: "Médio", color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  high: { label: "Alto", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  critical: { label: "Crítico", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
};

const DETECTION_TYPE_LABELS: Record<string, string> = {
  value: "Valor Atípico",
  pattern: "Padrão Incomum",
  timing: "Horário Suspeito",
  counterparty: "Contrapartida",
  cost_center: "Centro de Custo",
  frequency: "Frequência Anormal",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  investigating: "Investigando",
  confirmed: "Confirmado",
  false_positive: "Falso Positivo",
  resolved: "Resolvido",
};

// Mock data for demonstration
const MOCK_ANOMALIES = [
  {
    id: "1",
    detection_type: "value",
    severity: "critical",
    risk_score: 92,
    entity_type: "transaction",
    title: "Pagamento 5x maior que a média para fornecedor",
    description: "Pagamento de R$ 150.000 para fornecedor XYZ, quando a média histórica é R$ 30.000",
    ai_explanation: "Este pagamento é 5 vezes superior à média histórica dos últimos 12 meses para este fornecedor. Não há pedido de compra correspondente registrado. Recomendo verificar a autorização e documentação.",
    status: "pending",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    detection_type: "timing",
    severity: "high",
    risk_score: 78,
    entity_type: "transaction",
    title: "Lançamento fora do horário comercial",
    description: "Lançamento de R$ 45.000 realizado às 23:45 por usuário admin",
    ai_explanation: "Este lançamento foi feito às 23:45, fora do horário comercial padrão (08:00-18:00). O usuário normalmente não realiza operações neste horário. Sugiro confirmar se a operação foi autorizada.",
    status: "investigating",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "3",
    detection_type: "pattern",
    severity: "medium",
    risk_score: 65,
    entity_type: "transaction",
    title: "Sequência de pagamentos fragmentados",
    description: "5 pagamentos de R$ 9.900 cada para o mesmo beneficiário no mesmo dia",
    ai_explanation: "Detectei 5 pagamentos de R$ 9.900 (totalizando R$ 49.500) para o mesmo beneficiário, aparentemente fragmentados para ficar abaixo do limite de R$ 10.000. Este padrão pode indicar tentativa de evasão de controles.",
    status: "pending",
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "4",
    detection_type: "counterparty",
    severity: "medium",
    risk_score: 58,
    entity_type: "counterparty",
    title: "Novo fornecedor com alto volume imediato",
    description: "Fornecedor ABC cadastrado há 3 dias já recebeu R$ 80.000",
    ai_explanation: "Este fornecedor foi cadastrado há apenas 3 dias e já recebeu pagamentos totalizando R$ 80.000. O padrão normal para novos fornecedores é começar com valores menores. Verifique a due diligence do cadastro.",
    status: "pending",
    created_at: new Date(Date.now() - 259200000).toISOString(),
  },
];

export default function Anomalias() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedAnomaly, setSelectedAnomaly] = useState<typeof MOCK_ANOMALIES[0] | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: dbAnomalies = [], isLoading } = useAnomalyDetections({
    severity: severityFilter !== "all" ? severityFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const updateStatus = useUpdateAnomalyStatus();

  // Use mock data for demo
  const anomalies = MOCK_ANOMALIES.filter((a) => {
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  });

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      toast.success(`Status atualizado para ${STATUS_LABELS[newStatus]}`);
      setDetailsOpen(false);
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const criticalCount = MOCK_ANOMALIES.filter((a) => a.severity === "critical" && a.status === "pending").length;
  const highCount = MOCK_ANOMALIES.filter((a) => a.severity === "high" && a.status === "pending").length;
  const pendingCount = MOCK_ANOMALIES.filter((a) => a.status === "pending").length;
  const avgRiskScore = MOCK_ANOMALIES.reduce((s, a) => s + a.risk_score, 0) / MOCK_ANOMALIES.length;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Monitor IA – Anomalias"
          description="Detecção inteligente de padrões suspeitos e antifraude"
        >
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Analisar Agora
          </Button>
        </PageHeader>

        {/* KPIs */}
        <KPIGrid columns={4}>
          <KPICard
            title="Críticos Pendentes"
            value={String(criticalCount)}
            icon={AlertTriangle}
            variant={criticalCount > 0 ? "danger" : "default"}
          />
          <KPICard
            title="Altos Pendentes"
            value={String(highCount)}
            icon={AlertCircle}
            variant={highCount > 0 ? "warning" : "default"}
          />
          <KPICard
            title="Total Pendente"
            value={String(pendingCount)}
            icon={Clock}
          />
          <KPICard
            title="Score Médio de Risco"
            value={`${avgRiskScore.toFixed(0)}%`}
            icon={Shield}
            variant={avgRiskScore > 70 ? "danger" : avgRiskScore > 50 ? "warning" : "success"}
          />
        </KPIGrid>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Severidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="low">Baixo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="investigating">Investigando</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="false_positive">Falso Positivo</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Anomalies List */}
        {anomalies.length === 0 ? (
          <EmptyState
            icon={<Shield className="h-12 w-12" />}
            title="Nenhuma anomalia encontrada"
            description="O sistema está monitorando transações continuamente. Anomalias detectadas aparecerão aqui."
          />
        ) : (
          <div className="space-y-3">
            {anomalies.map((anomaly) => {
              const config = SEVERITY_CONFIG[anomaly.severity as keyof typeof SEVERITY_CONFIG];
              return (
                <Card
                  key={anomaly.id}
                  className={`card-hover cursor-pointer border-l-4 ${config.border}`}
                  onClick={() => {
                    setSelectedAnomaly(anomaly);
                    setDetailsOpen(true);
                  }}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-2 rounded-lg ${config.bg}`}>
                          <AlertTriangle className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{anomaly.title}</h4>
                            <Badge variant="outline" className={config.color}>
                              {config.label}
                            </Badge>
                            <Badge variant="secondary">
                              {DETECTION_TYPE_LABELS[anomaly.detection_type]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {anomaly.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>
                              {format(new Date(anomaly.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Score: {anomaly.risk_score}%
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {STATUS_LABELS[anomaly.status]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            {selectedAnomaly && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`h-5 w-5 ${
                        SEVERITY_CONFIG[selectedAnomaly.severity as keyof typeof SEVERITY_CONFIG].color
                      }`}
                    />
                    <DialogTitle>{selectedAnomaly.title}</DialogTitle>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      className={
                        SEVERITY_CONFIG[selectedAnomaly.severity as keyof typeof SEVERITY_CONFIG].bg +
                        " " +
                        SEVERITY_CONFIG[selectedAnomaly.severity as keyof typeof SEVERITY_CONFIG].color
                      }
                    >
                      {SEVERITY_CONFIG[selectedAnomaly.severity as keyof typeof SEVERITY_CONFIG].label}
                    </Badge>
                    <Badge variant="outline">{DETECTION_TYPE_LABELS[selectedAnomaly.detection_type]}</Badge>
                    <Badge variant="secondary">Score: {selectedAnomaly.risk_score}%</Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-1">Descrição</h4>
                    <p className="text-sm text-muted-foreground">{selectedAnomaly.description}</p>
                  </div>

                  <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded bg-primary/10">
                          <Brain className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium flex items-center gap-1 mb-1">
                            <Sparkles className="h-3 w-3" />
                            Análise da IA
                          </h4>
                          <p className="text-sm text-muted-foreground">{selectedAnomaly.ai_explanation}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="text-xs text-muted-foreground">
                    Detectado em:{" "}
                    {format(new Date(selectedAnomaly.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate(selectedAnomaly.id, "false_positive")}
                    className="gap-1"
                  >
                    <XCircle className="h-4 w-4" />
                    Falso Positivo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate(selectedAnomaly.id, "investigating")}
                    className="gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    Investigar
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate(selectedAnomaly.id, "confirmed")}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
