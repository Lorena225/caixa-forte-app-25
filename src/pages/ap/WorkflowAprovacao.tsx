import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, XCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Bot, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const ALCADA = [
  { label: "Até R$ 5.000", max: 5000, nivel: "N2", color: "text-green-600" },
  { label: "R$ 5k – R$ 50k", max: 50000, nivel: "N1", color: "text-amber-600" },
  { label: "Acima de R$ 50k", max: Infinity, nivel: "N0", color: "text-red-600" },
];

export default function APWorkflowAprovacao() {
  const { user, currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [obs, setObs] = useState("");
  const [tab, setTab] = useState("pendentes");

  const { data: pendentes = [], isLoading, refetch } = useQuery({
    queryKey: ["ap-aprovacoes", tab, currentCompany?.id],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select("*, counterparty:counterparties(name)")
        .eq("direction", "saida")
        .order("due_date", { ascending: true })
        .limit(30);

      if (tab === "pendentes") {
        q = q.in("status", ["lancado", "rascunho"]).gt("balance_amount", 0);
      } else if (tab === "rejeitados") {
        q = q.eq("status", "cancelado");
      }

      const { data } = await q;
      return (data ?? []).map((t: any) => {
        let notes: any = {};
        try { notes = JSON.parse(t.notes || "{}"); } catch {}
        return { ...t, notes };
      });
    },
    enabled: !!user && !!currentCompany?.id,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, total, approved }: { id: string; total: number; approved: boolean }) => {
      if (!currentCompany?.id) throw new Error("Empresa não identificada");

      if (approved) {
        // Aprovado: registra log — título permanece 'lancado', pronto para o borderô
        await supabase.rpc("ai_log_action", {
          p_company_id: currentCompany.id,
          p_agent_type: "AP",
          p_autonomy_level: "N1_approval",
          p_action_key: "approve_ap",
          p_action_label: "Título AP aprovado",
          p_entity_type: "transaction",
          p_entity_id: id,
          p_amount: total,
          p_reason: obs || "Aprovado pelo gestor",
          p_status: "approved",
        });
      } else {
        // Rejeitado: cancela o título via RPC + log
        await supabase.rpc("ai_update_title_status", {
          p_transaction_id: id,
          p_new_status: "cancelado",
          p_agent_type: "AP",
          p_action_key: "reject_ap",
          p_action_label: "Título AP rejeitado",
          p_reason: obs || "Rejeitado pelo gestor",
          p_autonomy_level: "N1_approval",
        });
      }
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ["ap-aprovacoes"] });
      toast[approved ? "success" : "warning"](
        approved ? "Título aprovado — disponível no Borderô!" : "Título rejeitado."
      );
      setExpanded(null);
      setObs("");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao processar aprovação"),
  });

  const getAlcada = (valor: number) =>
    ALCADA.find(a => Math.abs(valor) <= a.max) ?? ALCADA[ALCADA.length - 1];

  const pendCount = pendentes.length;
  const totalPend = pendentes.reduce((s: number, t: any) => s + Math.abs(t.total_amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-amber-600" />
            Workflow de Aprovação
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Aprovação de títulos AP por alçada — integrado ao agente IA
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold text-amber-600">{pendCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Valor total pendente</p>
            <p className="text-2xl font-bold text-red-600 font-mono">{formatCurrency(totalPend)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Regra de alçada</p>
            <p className="text-sm font-medium mt-1 text-blue-600">
              &lt;5k auto · 5k-50k gestor · &gt;50k diretoria
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pendentes">
            Pendentes {pendCount > 0 && <Badge variant="destructive" className="ml-2 text-xs">{pendCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="rejeitados">Rejeitados</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="h-16 pt-4 bg-muted/30 rounded" /></Card>
            ))
          ) : pendentes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>{tab === "pendentes" ? "Nenhum título para aprovar." : "Nenhum título rejeitado."}</p>
            </div>
          ) : (
            pendentes.map((t: any) => {
              const alcada = getAlcada(t.total_amount);
              const isExp = expanded === t.id;
              return (
                <Card key={t.id} className={cn("border-2 transition-all",
                  tab === "rejeitados" ? "border-red-200" : "border-amber-200")}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {t.counterparty?.name ?? t.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.document_number && `${t.document_number} · `}
                          Venc. {t.due_date && new Date(t.due_date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn("text-xs", alcada.color)}>
                          {alcada.nivel} · {alcada.label}
                        </Badge>
                        <p className="text-lg font-bold font-mono text-red-600">
                          {formatCurrency(Math.abs(t.total_amount))}
                        </p>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => setExpanded(isExp ? null : t.id)}>
                          {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {isExp && (
                      <div className="mt-4 border-t pt-3 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                          {[
                            { label: "Conta", value: t.notes?.conta_contabil },
                            { label: "CC", value: t.notes?.centro_custo },
                            { label: "Documento", value: t.document_number },
                            { label: "Vencimento", value: t.due_date ? new Date(t.due_date).toLocaleDateString("pt-BR") : "—" },
                            { label: "Confiança IA", value: t.notes?.ai_confidence ? `${Math.round(t.notes.ai_confidence * 100)}%` : "—" },
                          ].map(item => (
                            <div key={item.label} className="p-2 bg-muted/30 rounded">
                              <p className="text-xs text-muted-foreground">{item.label}</p>
                              <p className="font-medium text-sm">{item.value || "—"}</p>
                            </div>
                          ))}
                        </div>

                        {tab === "pendentes" && (
                          <>
                            <Textarea
                              placeholder="Observação (opcional)..."
                              value={obs}
                              onChange={e => setObs(e.target.value)}
                              rows={2}
                            />
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline"
                                className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => approveMutation.mutate({ id: t.id, total: t.total_amount, approved: false })}
                                disabled={approveMutation.isPending}>
                                <XCircle className="h-4 w-4" /> Rejeitar
                              </Button>
                              <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700"
                                onClick={() => approveMutation.mutate({ id: t.id, total: t.total_amount, approved: true })}
                                disabled={approveMutation.isPending}>
                                <CheckCircle2 className="h-4 w-4" /> Aprovar
                              </Button>
                            </div>
                          </>
                        )}

                        {tab === "rejeitados" && (
                          <Badge variant="destructive" className="text-xs">Rejeitado</Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
