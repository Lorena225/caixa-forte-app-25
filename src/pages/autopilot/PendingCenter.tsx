import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePendingDecisions, useConfirmDecision, useRejectDecision, useAIActionResults, useRollbackAction } from "@/hooks/useAIDecisions";
import { AlertCircle, Check, X, Undo2, Clock, Zap, FileText, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProposedAction {
  action: string;
  entity: string;
  data: {
    description?: string;
    amount?: number;
    due_date?: string;
    type?: string;
    [key: string]: unknown;
  };
}

export default function PendingCenter() {
  const { data: pendingDecisions, isLoading: loadingPending } = usePendingDecisions();
  const { data: actionResults, isLoading: loadingResults } = useAIActionResults();
  const confirmDecision = useConfirmDecision();
  const rejectDecision = useRejectDecision();
  const rollbackAction = useRollbackAction();

  const handleConfirm = async (decisionId: string) => {
    try {
      await confirmDecision.mutateAsync({ decision_id: decisionId });
      toast.success("Ação confirmada e executada");
    } catch (error) {
      toast.error("Erro ao confirmar ação");
    }
  };

  const handleReject = async (decisionId: string) => {
    try {
      await rejectDecision.mutateAsync({ decision_id: decisionId });
      toast.success("Ação rejeitada");
    } catch (error) {
      toast.error("Erro ao rejeitar ação");
    }
  };

  const handleRollback = async (actionResultId: string) => {
    try {
      await rollbackAction.mutateAsync(actionResultId);
      toast.success("Ação revertida com sucesso");
    } catch (error) {
      toast.error("Erro ao reverter ação");
    }
  };

  const getRiskBadge = (level: string | null) => {
    switch (level) {
      case "high":
        return <Badge variant="destructive">Alto Risco</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Médio</Badge>;
      case "low":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Baixo</Badge>;
      default:
        return null;
    }
  };

  const getIntentIcon = (intent: string) => {
    if (intent.includes("receivable") || intent.includes("receive")) {
      return <ArrowDownCircle className="h-5 w-5 text-green-500" />;
    }
    if (intent.includes("payable") || intent.includes("pay")) {
      return <ArrowUpCircle className="h-5 w-5 text-red-500" />;
    }
    return <FileText className="h-5 w-5 text-blue-500" />;
  };

  const formatAction = (action: ProposedAction) => {
    const actionLabels: Record<string, string> = {
      create_transaction: "Criar lançamento",
      settle_transaction: "Baixar título",
      update_transaction: "Atualizar lançamento",
    };

    return actionLabels[action.action] || action.action;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Central de Pendências"
          description="Aprove ou rejeite ações sugeridas pela IA"
        />

        {/* Pending Decisions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Aguardando Aprovação
              {pendingDecisions && pendingDecisions.length > 0 && (
                <Badge variant="secondary">{pendingDecisions.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Ações identificadas pela IA que precisam de confirmação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPending ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : !pendingDecisions?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Check className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
                <p>Nenhuma pendência no momento</p>
                <p className="text-sm">Todas as ações foram processadas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingDecisions.map((decision) => {
                  const actions = (decision.proposed_actions_json as unknown as ProposedAction[]) || [];
                  
                  return (
                    <div
                      key={decision.id}
                      className="p-4 rounded-lg border bg-card space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getIntentIcon(decision.intent)}
                          <div>
                            <p className="font-medium capitalize">
                              {decision.intent.replace(/_/g, " ")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(decision.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRiskBadge(decision.risk_level)}
                          {decision.confidence && (
                            <Badge variant="outline">
                              {Math.round(decision.confidence * 100)}% confiança
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Proposed Actions */}
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        {actions.map((action, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <Zap className="h-4 w-4 text-primary" />
                            <span className="font-medium">{formatAction(action)}</span>
                            {action.data?.description && (
                              <span className="text-muted-foreground">
                                — {action.data.description}
                              </span>
                            )}
                            {action.data?.amount && (
                              <Badge variant="secondary">
                                {formatCurrency(action.data.amount)}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Risk Reasons */}
                      {decision.risk_reasons_json && (
                        <div className="flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>
                            {Array.isArray(decision.risk_reasons_json) 
                              ? (decision.risk_reasons_json as string[]).join(", ")
                              : String(decision.risk_reasons_json)}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          onClick={() => handleConfirm(decision.id)}
                          disabled={confirmDecision.isPending}
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Confirmar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleReject(decision.id)}
                          disabled={rejectDecision.isPending}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Ações Recentes
            </CardTitle>
            <CardDescription>
              Histórico de ações executadas pela IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingResults ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : !actionResults?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma ação executada ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actionResults.slice(0, 10).map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        result.status === "success" 
                          ? "bg-green-500/10 text-green-500"
                          : result.status === "rolled_back"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-red-500/10 text-red-500"
                      }`}>
                        {result.status === "success" ? (
                          <Check className="h-4 w-4" />
                        ) : result.status === "rolled_back" ? (
                          <Undo2 className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {Array.isArray(result.executed_actions_json) 
                            ? (result.executed_actions_json as { action: string }[]).map(a => a.action).join(", ")
                            : "Ação executada"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.executed_at
                            ? format(new Date(result.executed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={result.status === "success" ? "default" : "secondary"}>
                        {result.status === "success" ? "Sucesso" : result.status === "rolled_back" ? "Revertido" : result.status}
                      </Badge>
                      {result.can_rollback && result.status === "success" && !result.rolled_back_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRollback(result.id)}
                          disabled={rollbackAction.isPending}
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
