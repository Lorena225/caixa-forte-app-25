import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot, Zap, Play, RefreshCw, Target, AlertTriangle,
  TrendingUp, TrendingDown, Activity, CheckCircle2, BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const TOOLS = [
  { key:"analisar_variancia",       label:"Analisar variância",        desc:"Compara orçado vs realizado por categoria",   autonomy:"N3" },
  { key:"gerar_forecast_rolling",   label:"Forecast rolling 12 meses", desc:"Projeta os próximos 12 meses com IA",         autonomy:"N3" },
  { key:"alertar_estouro",          label:"Alertar estouro de orçamento", desc:"Notifica quando categoria excede o limite", autonomy:"N3" },
  { key:"sugerir_realocacao",       label:"Sugerir realocação",        desc:"Recomenda mover verba entre centros de custo", autonomy:"N2" },
  { key:"simular_cenario_orcamentario", label:"Simular cenário",       desc:"What-if de metas e impacto no resultado",     autonomy:"N2" },
  { key:"consolidar_versoes",       label:"Consolidar versões",        desc:"Compara versões do orçamento (v1, v2...)",    autonomy:"N3" },
];

const NIVEL_STYLE: Record<string,string> = {
  N1:"text-blue-700 bg-blue-100", N2:"text-amber-700 bg-amber-100", N3:"text-green-700 bg-green-100"
};

export default function AgenteOrcamento() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState<string|null>(null);

  const { data: logs = [], refetch } = useQuery({
    queryKey: ["agent-orcamento-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_action_log").select("*")
        .in("action_key", TOOLS.map(t => t.key))
        .order("created_at", { ascending: false }).limit(15);
      return data ?? [];
    },
    enabled: !!user, refetchInterval: 30000,
  });

  // Comparar orçado vs realizado do mês atual
  const { data: budgetVsActual } = useQuery({
    queryKey: ["budget-vs-actual-agent"],
    queryFn: async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const { data: budget } = await supabase.from("budgets")
        .select("*")
        .eq("year", year).eq("month", month)
        .maybeSingle();

      const startDate = new Date(year, month - 1, 1).toISOString().slice(0,10);
      const endDate = new Date(year, month, 0).toISOString().slice(0,10);

      const { data: txs } = await supabase.from("transactions")
        .select("amount")
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate);

      const realizedRevenue = (txs ?? []).filter(t => t.amount > 0).reduce((s,t) => s + t.amount, 0);
      const realizedExpense = (txs ?? []).filter(t => t.amount < 0).reduce((s,t) => s + Math.abs(t.amount), 0);

      return {
        targetRevenue: budget?.target_revenue ?? 0,
        targetExpense: budget?.target_expense ?? 0,
        realizedRevenue,
        realizedExpense,
        hasBudget: !!budget,
      };
    },
    enabled: !!user,
  });

  const runTool = useMutation({
    mutationFn: async (tool: string) => {
      setRunning(tool);
      const { error } = await supabase.functions.invoke("agent-orchestrator",
        { body: { action: tool, payload: { company_id: user?.id } } });
      if (error) throw error;
    },
    onSuccess: (_, tool) => { setRunning(null); queryClient.invalidateQueries({ queryKey: ["agent-orcamento-logs"] }); toast.success(`Agente Orçamento: ${tool}`); refetch(); },
    onError: (e: any) => { setRunning(null); toast.error(e.message); },
  });

  const runCycle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("agent-orchestrator",
        { body: { action: "run_budget_cycle", payload: { company_id: user?.id } } });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["agent-orcamento-logs"] }); toast.success("Ciclo do Agente Orçamento concluído!"); refetch(); },
    onError: () => toast.error("Erro no ciclo de orçamento"),
  });

  const pctRevenue = budgetVsActual?.targetRevenue
    ? (budgetVsActual.realizedRevenue / budgetVsActual.targetRevenue) * 100 : 0;
  const pctExpense = budgetVsActual?.targetExpense
    ? (budgetVsActual.realizedExpense / budgetVsActual.targetExpense) * 100 : 0;
  const expenseOverBudget = pctExpense > 100;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-violet-600"/> Agente Orçamento IA
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Análise de variância, forecast rolling 12 meses e alertas de estouro
          </p>
        </div>
        <Button onClick={() => runCycle.mutate()} disabled={runCycle.isPending} className="gap-2 bg-violet-600 hover:bg-violet-700">
          {runCycle.isPending ? <><RefreshCw className="h-4 w-4 animate-spin"/>Executando...</> : <><Play className="h-4 w-4"/>Executar Ciclo</>}
        </Button>
      </div>

      {/* Orçado vs Real do mês */}
      {budgetVsActual?.hasBudget ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Receita — Orçado vs Realizado</p>
                <TrendingUp className="h-4 w-4 text-green-600"/>
              </div>
              <p className="text-xl font-bold font-mono text-green-600">{formatCurrency(budgetVsActual.realizedRevenue)}</p>
              <p className="text-xs text-muted-foreground">Meta: {formatCurrency(budgetVsActual.targetRevenue)} · {pctRevenue.toFixed(0)}%</p>
              <Progress value={Math.min(pctRevenue, 100)} className="mt-2 h-1.5"/>
            </CardContent>
          </Card>
          <Card className={cn("border-l-4", expenseOverBudget ? "border-l-red-500" : "border-l-blue-500")}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Despesa — Orçado vs Realizado</p>
                <TrendingDown className={cn("h-4 w-4", expenseOverBudget ? "text-red-600" : "text-blue-600")}/>
              </div>
              <p className={cn("text-xl font-bold font-mono", expenseOverBudget ? "text-red-600" : "text-blue-600")}>{formatCurrency(budgetVsActual.realizedExpense)}</p>
              <p className="text-xs text-muted-foreground">Meta: {formatCurrency(budgetVsActual.targetExpense)} · {pctExpense.toFixed(0)}%
                {expenseOverBudget && <span className="text-red-600 font-medium"> — ESTOURO</span>}
              </p>
              <Progress value={Math.min(pctExpense, 100)} className="mt-2 h-1.5"/>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-300 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0"/>
          <p className="text-sm text-amber-800">Nenhum orçamento cadastrado para o mês atual. Cadastre em Orçamento &gt; Versões.</p>
        </div>
      )}

      {/* Tools */}
      <Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4"/>Tools do Agente Orçamento</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {TOOLS.map(t => (
            <div key={t.key} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30">
              <div className="flex-1"><div className="flex items-center gap-2"><p className="font-medium text-sm">{t.label}</p><Badge className={cn("text-xs px-2", NIVEL_STYLE[t.autonomy])}>{t.autonomy}</Badge></div><p className="text-xs text-muted-foreground">{t.desc}</p></div>
              <Button size="sm" variant="outline" className="gap-1 text-xs" disabled={running === t.key} onClick={() => runTool.mutate(t.key)}>
                {running === t.key ? <RefreshCw className="h-3 w-3 animate-spin"/> : <Zap className="h-3 w-3"/>} Executar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {logs.length > 0 && (
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Log Recente</CardTitle></CardHeader>
          <CardContent><div className="space-y-2">{logs.map((l: any) => (
            <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-lg border text-sm">
              <div className={cn("h-2 w-2 rounded-full flex-shrink-0", l.status==="executed"?"bg-green-500":l.status==="pending_approval"?"bg-amber-500":"bg-gray-400")}/>
              <p className="flex-1 truncate">{l.action_label || l.action_key}</p>
              <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>
            </div>
          ))}</div></CardContent>
        </Card>
      )}
    </div>
  );
}
