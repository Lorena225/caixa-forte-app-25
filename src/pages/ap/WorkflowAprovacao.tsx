import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Eye,
  ChevronDown, ChevronUp, Bot, DollarSign, Filter, RefreshCw
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [obs, setObs] = useState("");
  const [tab, setTab] = useState("pendentes");

  const { data: pendentes = [], isLoading, refetch } = useQuery({
    queryKey: ["ap-aprovacoes", tab],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select("*, counterparty:counterparties(name)")
        .lt("amount", 0)
        .order("transaction_date", { ascending: false })
        .limit(30);

      if (tab === "pendentes") {
        q = q.eq("payment_method", "pending");
      } else if (tab === "aprovados") {
        q = q.neq("payment_method", "pending").neq("payment_method", "rejected");
      }

      const { data } = await q;
      return (data ?? []).map((t: any) => {
        let notes: any = {};
        try { notes = JSON.parse(t.notes || "{}"); } catch {}
        return { ...t, notes };
      });
    },
    enabled: !!user,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      await supabase.from("transactions").update({
        payment_method: approved ? "scheduled" : "rejected",
        notes: JSON.stringify({ ...{}, aprovado_por: user?.id, obs, em: new Date().toISOString() }),
      }).eq("id", id);

      // Registrar no agent_action_log
      await supabase.from("agent_action_log").insert({
        agent_type: "AP",
        autonomy_level: "N1_approval",
        action_key: approved ? "approve_ap" : "reject_ap",
        action_label: approved ? "Título AP aprovado" : "Título AP rejeitado",
        entity_type: "transaction",
        entity_id: id,
        reason: obs || (approved ? "Aprovado pelo gestor" : "Rejeitado pelo gestor"),
        status: approved ? "approved" : "rejected",
        approved_by: user?.id,
      });
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ["ap-aprovacoes"] });
      toast[approved ? "success" : "warning"](
        approved ? "Título aprovado e agendado para pagamento!" : "Título rejeitado."
      );
      setExpanded(null);
      setObs("");
    },
  });

  const getAlcada = (valor: number) =>
    ALCADA.find(a => Math.abs(valor) <= a.max) ?? ALCADA[ALCADA.length - 1];

  const pendCount = pendentes.filter(t => t.payment_method === "pending").length;
  const totalPend = pendentes.filter(t => t.payment_method === "pending")
    .reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);

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
          <TabsTrigger value="aprovados">Aprovados / Rejeitados</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="h-16 pt-4 bg-muted/30 rounded" /></Card>
            ))
          ) : pendentes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum título para aprovar.</p>
            </div>
          ) : (
            pendentes.map((t: any) => {
              const alcada = getAlcada(t.amount);
              const isExp = expanded === t.id;
              return (
                <Card key={t.id} className={cn("border-2 transition-all",
                  t.payment_method === "pending" ? "border-amber-200" :
                  t.payment_method === "rejected" ? "border-red-200" : "border-green-200")}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {t.counterparty?.name ?? t.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.notes?.numero_nf && `${t.notes.numero_nf} · `}
                          {t.transaction_date && new Date(t.transaction_date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn("text-xs", alcada.color)}>
                          {alcada.nivel} · {alcada.label}
                        </Badge>
                        <p className={cn("text-lg font-bold font-mono",
                          t.amount < 0 ? "text-red-600" : "text-green-600")}>
                          {formatCurrency(Math.abs(t.amount))}
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
                            { label: "Natureza", value: t.category },
                            { label: "Vencimento", value: t.due_date ? new Date(t.due_date).toLocaleDateString("pt-BR") : "—" },
                            { label: "Confiança IA", value: t.notes?.ai_confidence ? `${Math.round(t.notes.ai_confidence * 100)}%` : "—" },
                          ].map(item => (
                            <div key={item.label} className="p-2 bg-muted/30 rounded">
                              <p className="text-xs text-muted-foreground">{item.label}</p>
                              <p className="font-medium text-sm">{item.value || "—"}</p>
                            </div>
                          ))}
                        </div>

                        {t.payment_method === "pending" && (
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
                                onClick={() => approveMutation.mutate({ id: t.id, approved: false })}
                                disabled={approveMutation.isPending}>
                                <XCircle className="h-4 w-4" /> Rejeitar
                              </Button>
                              <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700"
                                onClick={() => approveMutation.mutate({ id: t.id, approved: true })}
                                disabled={approveMutation.isPending}>
                                <CheckCircle2 className="h-4 w-4" /> Aprovar
                              </Button>
                            </div>
                          </>
                        )}

                        {t.payment_method !== "pending" && (
                          <Badge variant={t.payment_method === "rejected" ? "destructive" : "default"} className="text-xs">
                            {t.payment_method === "rejected" ? "Rejeitado" : "Aprovado — aguardando pagamento"}
                          </Badge>
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
