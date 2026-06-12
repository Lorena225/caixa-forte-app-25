import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot, Zap, Play, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, TrendingDown, Activity, Shield, Calculator
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const TOOLS = [
  { key:"gerar_cronograma",           label:"Gerar cronograma",          desc:"Calcula Price/SAC/Bullet automaticamente",    autonomy:"N3" },
  { key:"atualizar_saldo_devedor",    label:"Atualizar saldo devedor",   desc:"Recalcula saldo após pagamentos",            autonomy:"N3" },
  { key:"calcular_juros",             label:"Calcular juros do dia",     desc:"Accrual diário por indexador",               autonomy:"N3" },
  { key:"simular_amortizacao_extra",  label:"Simular amortização extra", desc:"Compara custo da dívida vs rendimento",      autonomy:"N2" },
  { key:"provisionar_contabilmente",  label:"Provisionar contábil",      desc:"Lança juros provisionados no razão",         autonomy:"N2" },
  { key:"alertar_covenant",           label:"Verificar covenants",       desc:"Checa índices financeiros contratuais",      autonomy:"N3" },
  { key:"alertar_vencimento",         label:"Alertar vencimentos",       desc:"Notifica parcelas D+1 a D+7",                autonomy:"N3" },
];

const NIVEL_STYLE: Record<string,string> = {
  N1:"text-blue-700 bg-blue-100", N2:"text-amber-700 bg-amber-100", N3:"text-green-700 bg-green-100"
};

export default function AgentEmprestimos() {
  const { user, currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState<string|null>(null);

  const { data: logs = [], refetch } = useQuery({
    queryKey: ["agent-loans-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_action_log").select("*")
        .in("action_key", TOOLS.map(t => t.key))
        .order("created_at", { ascending: false }).limit(15);
      return data ?? [];
    },
    enabled: !!user && !!currentCompany?.id, refetchInterval: 15000,
  });

  const { data: vencimentos = [] } = useQuery({
    queryKey: ["loans-vencimentos-7d"],
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0,10);
      const em7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10);
      const { data } = await supabase.from("loan_schedule")
        .select("*, contract:loan_contracts(description)")
        .in("status", ["open","overdue"])
        .lte("due_date", em7)
        .order("due_date");
      return data ?? [];
    },
    enabled: !!user && !!currentCompany?.id,
  });

  const { data: killSwitch } = useQuery({
    queryKey: ["kill-switch-loans"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_kill_switch").select("*")
        .eq("company_id", currentCompany?.id).maybeSingle();
      return data;
    },
    enabled: !!user && !!currentCompany?.id,
  });

  const isKilled = killSwitch?.is_paused;
  const totalVenc = vencimentos.reduce((s: number, p: any) => s + (p.total || 0), 0);
  const vencidos = vencimentos.filter((p: any) => p.due_date < new Date().toISOString().slice(0,10));

  const runTool = useMutation({
    mutationFn: async (tool: string) => {
      setRunning(tool);
      const { error } = await supabase.functions.invoke("agent-orchestrator",
        { body: { action: tool, payload: { company_id: currentCompany?.id } } });
      if (error) throw error;
    },
    onSuccess: (_, tool) => { setRunning(null); queryClient.invalidateQueries({ queryKey: ["agent-loans-logs"] }); toast.success(`Agente executou: ${tool}`); refetch(); },
    onError: (e: any) => { setRunning(null); toast.error(e.message); },
  });

  const runCycle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("agent-orchestrator",
        { body: { action: "run_loans_cycle", payload: { company_id: currentCompany?.id } } });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["agent-loans-logs"] }); toast.success("Ciclo do Agente Empréstimos concluído!"); refetch(); },
    onError: () => toast.error("Erro no ciclo"),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-indigo-600"/> Agente Empréstimos IA
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitora contratos, calcula juros, alerta covenants e provisiona automaticamente
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border",
            isKilled ? "bg-red-50 border-red-300" : "bg-green-50 border-green-300")}>
            <div className={cn("h-2 w-2 rounded-full", isKilled ? "bg-red-500" : "bg-green-500 animate-pulse")}/>
            <span className="text-sm font-medium">{isKilled ? "Pausado" : "Ativo"}</span>
          </div>
          <Button onClick={() => runCycle.mutate()} disabled={isKilled || runCycle.isPending}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            {runCycle.isPending ? <><RefreshCw className="h-4 w-4 animate-spin"/>Executando...</> : <><Play className="h-4 w-4"/>Executar Ciclo</>}
          </Button>
        </div>
      </div>

      {isKilled && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-300 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0"/>
          <p className="text-sm text-red-800 font-medium">Kill switch ativo — Agente Empréstimos pausado.</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:"Vencimentos 7d", value: vencimentos.length, color:"text-amber-600", icon:Clock },
          { label:"Vencidos", value: vencidos.length, color:"text-red-600", icon:AlertTriangle },
          { label:"Volume vencendo", value: formatCurrency(totalVenc), color:"text-indigo-600", icon:TrendingDown },
          { label:"Ações do agente", value: logs.length, color:"text-green-600", icon:CheckCircle2 },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">{k.label}</p><p className={cn("text-xl font-bold mt-0.5",k.color)}>{k.value}</p></div>
                <k.icon className={cn("h-6 w-6 opacity-20",k.color)}/>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Vencimentos próximos */}
      {vencimentos.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600"/>Parcelas Vencendo em 7 dias</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vencimentos.map((p: any) => {
                const isV = p.due_date < new Date().toISOString().slice(0,10);
                return (
                  <div key={p.id} className={cn("flex items-center gap-4 p-3 rounded-lg border", isV ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50")}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.contract?.description}</p>
                      <p className="text-xs text-muted-foreground">Parcela {p.installment_num} · Venc. {new Date(p.due_date).toLocaleDateString("pt-BR")} {isV && <span className="text-red-600 font-medium">VENCIDA</span>}</p>
                    </div>
                    <p className="font-bold font-mono text-sm flex-shrink-0">{formatCurrency(p.total)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tools */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4"/>Tools do Agente Empréstimos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {TOOLS.map(t => (
            <div key={t.key} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30">
              <div className="flex-1">
                <div className="flex items-center gap-2"><p className="font-medium text-sm">{t.label}</p><Badge className={cn("text-xs px-2", NIVEL_STYLE[t.autonomy])}>{t.autonomy}</Badge></div>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1 text-xs" disabled={isKilled || running === t.key} onClick={() => runTool.mutate(t.key)}>
                {running === t.key ? <RefreshCw className="h-3 w-3 animate-spin"/> : <Zap className="h-3 w-3"/>} Executar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Log */}
      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Log de Ações</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.map((l: any) => (
                <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-lg border text-sm">
                  <div className={cn("h-2 w-2 rounded-full flex-shrink-0", l.status==="executed"?"bg-green-500":l.status==="pending_approval"?"bg-amber-500":"bg-gray-400")}/>
                  <p className="flex-1 truncate">{l.action_label || l.action_key}</p>
                  {l.amount && <span className="font-mono text-xs text-muted-foreground">{formatCurrency(Math.abs(l.amount))}</span>}
                  <span className="text-xs text-muted-foreground flex-shrink-0">{new Date(l.created_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
