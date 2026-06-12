import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitCompare, Play, RefreshCw, Bot, CheckCircle2, AlertTriangle, Upload, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const TOOLS = [
  { key: "buscar_extrato_api",    label: "Buscar extrato via API",      desc: "Open Finance / Pluggy",    autonomy: "N3" },
  { key: "importar_ofx",         label: "Importar OFX",                desc: "Extrato em formato OFX",   autonomy: "N3" },
  { key: "importar_cnab",        label: "Importar CNAB retorno",       desc: "Retorno bancário 240/400", autonomy: "N3" },
  { key: "match_automatico",     label: "Match automático (IA)",       desc: "Confiança ≥ 90%",          autonomy: "N3" },
  { key: "conciliar_titulo",     label: "Conciliar título",            desc: "Confirma match e baixa",   autonomy: "N2" },
  { key: "criar_lancamento_avulso", label: "Criar lançamento avulso",  desc: "Para itens sem match",     autonomy: "N1" },
  { key: "reportar_divergencia", label: "Reportar divergência",        desc: "Envia alerta ao gestor",   autonomy: "N3" },
  { key: "aprender_padrao",      label: "Aprender padrão",            desc: "Memoriza recorrências",    autonomy: "N3" },
];

const NIVEL_STYLE: Record<string,string> = {
  N1:"text-blue-700 bg-blue-100", N2:"text-amber-700 bg-amber-100", N3:"text-green-700 bg-green-100"
};

export default function AgenteConciliacao() {
  const { user, currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState<string|null>(null);

  const { data: logs = [], refetch } = useQuery({
    queryKey: ["agent-conciliacao-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_action_log").select("*")
        .eq("agent_type", "reconciliation").order("created_at", { ascending: false }).limit(15);
      return data ?? [];
    },
    enabled: !!user && !!currentCompany?.id, refetchInterval: 15000,
  });

  const executed = logs.filter(l => l.status === "executed").length;
  const pending  = logs.filter(l => l.status === "pending_approval").length;
  const accuracy = executed > 0 ? Math.round((executed / logs.length) * 100) : 0;

  const runTool = useMutation({
    mutationFn: async (tool: string) => {
      setRunning(tool);
      const { error } = await supabase.functions.invoke("agent-orchestrator",
        { body: { action: tool, payload: { company_id: currentCompany?.id } } });
      if (error) throw error;
    },
    onSuccess: (_, tool) => { setRunning(null); queryClient.invalidateQueries({ queryKey: ["agent-conciliacao-logs"] }); toast.success(`Conciliação: ${tool}`); refetch(); },
    onError: (e: any) => { setRunning(null); toast.error(e.message); },
  });

  const runCycle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("agent-orchestrator",
        { body: { action: "run_reconciliation_cycle", payload: { company_id: currentCompany?.id } } });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["agent-conciliacao-logs"] }); toast.success("Ciclo de conciliação concluído!"); refetch(); },
    onError: () => toast.error("Erro no ciclo de conciliação"),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitCompare className="h-6 w-6 text-teal-600" /> Agente Conciliação
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Matching automático extrato × títulos via IA</p>
        </div>
        <Button onClick={() => runCycle.mutate()} disabled={runCycle.isPending} className="gap-2 bg-teal-600 hover:bg-teal-700">
          {runCycle.isPending ? <><RefreshCw className="h-4 w-4 animate-spin"/>Executando...</> : <><Play className="h-4 w-4"/>Executar Ciclo</>}
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Conciliações</p><p className="text-2xl font-bold text-teal-600">{executed}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Pendentes revisão</p><p className="text-2xl font-bold text-amber-600">{pending}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground">Accuracy IA</p>
          <p className="text-2xl font-bold text-green-600">{accuracy}%</p>
          <Progress value={accuracy} className="mt-2 h-1.5" />
        </CardContent></Card>
      </div>
      <Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4"/>Tools</CardTitle></CardHeader>
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
          <CardContent><div className="space-y-2">{logs.slice(0,8).map((l:any) => (
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
