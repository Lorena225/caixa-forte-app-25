import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, Bot, Play, RefreshCw, Zap, AlertTriangle, DollarSign, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const TOOLS = [
  { key:"calcular_fluxo_caixa",  label:"Calcular fluxo de caixa",   desc:"Posição atual de entrada vs saída",      autonomy:"N3" },
  { key:"projetar_30_60_90",     label:"Projetar 30/60/90 dias",     desc:"Forecast baseado em AP/AR pendentes",    autonomy:"N3" },
  { key:"simular_cenario",       label:"Simular cenário",            desc:"What-if de recebimentos e pagamentos",   autonomy:"N2" },
  { key:"alertar_saldo_critico", label:"Alertar saldo crítico",      desc:"Notifica quando saldo cai abaixo do limite", autonomy:"N3" },
  { key:"sugerir_aplicacao",     label:"Sugerir aplicação",          desc:"Recomenda onde aplicar saldo disponível", autonomy:"N2" },
  { key:"sugerir_resgate",       label:"Sugerir resgate",            desc:"Indica resgates para cobrir vencimentos", autonomy:"N2" },
];

const NIVEL_STYLE: Record<string,string> = {
  N1:"text-blue-700 bg-blue-100", N2:"text-amber-700 bg-amber-100", N3:"text-green-700 bg-green-100"
};

export default function AgenteCaixa() {
  const { user, currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState<string|null>(null);

  const { data: logs = [], refetch } = useQuery({
    queryKey: ["agent-caixa-logs", currentCompany?.id],
    queryFn: async () => {
      const { data } = await supabase.from("agent_action_log").select("*")
        .eq("company_id", currentCompany!.id)
        .in("action_key", TOOLS.map(t => t.key))
        .order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: !!user && !!currentCompany?.id,
  });

  // Calcular posição simplificada de caixa a partir das transações
  const { data: cashPos } = useQuery({
    queryKey: ["cash-position-agent", currentCompany?.id],
    queryFn: async () => {
      const em30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10);
      const { data: pending } = await supabase.from("transactions")
        .select("total_amount, balance_amount, direction, due_date")
        .eq("company_id", currentCompany!.id)
        .eq("status", "lancado")
        .lte("due_date", em30);
      const valor = (t: any) => Number(t.balance_amount ?? t.total_amount ?? 0);
      const entradas = (pending ?? []).filter((t: any) => t.direction === "entrada").reduce((s, t) => s + valor(t), 0);
      const saidas = (pending ?? []).filter((t: any) => t.direction === "saida").reduce((s, t) => s + valor(t), 0);
      return { entradas, saidas, saldo_projetado: entradas - saidas };
    },
    enabled: !!user && !!currentCompany?.id,
  });

  const runTool = useMutation({
    mutationFn: async (tool: string) => {
      setRunning(tool);
      const { error } = await supabase.functions.invoke("agent-orchestrator",
        { body: { action: tool, payload: { company_id: currentCompany?.id } } });
      if (error) throw error;
    },
    onSuccess: (_, tool) => { setRunning(null); queryClient.invalidateQueries({ queryKey: ["agent-caixa-logs"] }); toast.success(`Agente Caixa: ${tool}`); refetch(); },
    onError: (e: any) => { setRunning(null); toast.error(e.message); },
  });

  const runCycle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("agent-orchestrator",
        { body: { action: "run_cashflow_cycle", payload: { company_id: currentCompany?.id } } });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["agent-caixa-logs"] }); toast.success("Ciclo do Agente Caixa concluído!"); refetch(); },
    onError: () => toast.error("Erro no ciclo de caixa"),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-cyan-600"/> Agente Fluxo de Caixa
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Projeção 30/60/90 dias, alertas de saldo e sugestões de aplicação
          </p>
        </div>
        <Button onClick={() => runCycle.mutate()} disabled={runCycle.isPending} className="gap-2 bg-cyan-600 hover:bg-cyan-700">
          {runCycle.isPending ? <><RefreshCw className="h-4 w-4 animate-spin"/>Executando...</> : <><Play className="h-4 w-4"/>Executar Ciclo</>}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500"><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground">Entradas previstas 30d</p>
          <p className="text-xl font-bold text-green-600 font-mono">{formatCurrency(cashPos?.entradas ?? 0)}</p>
        </CardContent></Card>
        <Card className="border-l-4 border-l-red-500"><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground">Saídas previstas 30d</p>
          <p className="text-xl font-bold text-red-600 font-mono">{formatCurrency(cashPos?.saidas ?? 0)}</p>
        </CardContent></Card>
        <Card className={`border-l-4 ${(cashPos?.saldo_projetado ?? 0) >= 0 ? "border-l-blue-500" : "border-l-orange-500"}`}><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground">Saldo projetado 30d</p>
          <p className={cn("text-xl font-bold font-mono", (cashPos?.saldo_projetado ?? 0) >= 0 ? "text-blue-600" : "text-orange-600")}>{formatCurrency(cashPos?.saldo_projetado ?? 0)}</p>
        </CardContent></Card>
      </div>

      <Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4"/>Tools do Agente Caixa</CardTitle></CardHeader>
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
              <div className={cn("h-2 w-2 rounded-full flex-shrink-0", l.status==="executed"?"bg-green-500":"bg-amber-500")}/>
              <p className="flex-1 truncate">{l.action_label || l.action_key}</p>
              <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>
            </div>
          ))}</div></CardContent>
        </Card>
      )}
    </div>
  );
}
