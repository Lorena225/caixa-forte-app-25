import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, AlertTriangle, Search, Play, RefreshCw, Bot, Zap, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const TOOLS = [
  { key: "detectar_duplicidade",    label: "Detectar duplicidades",      desc: "NFs ou títulos lançados em duplicata", autonomy: "N3" },
  { key: "detectar_anomalia",       label: "Detectar anomalias",          desc: "Valores ou padrões atípicos",          autonomy: "N3" },
  { key: "checar_compliance",       label: "Checar compliance",           desc: "Verifica regras de alçada e segregação", autonomy: "N3" },
  { key: "gerar_alerta_risco",     label: "Gerar alerta de risco",       desc: "Cria notificação para o gestor",       autonomy: "N2" },
  { key: "preparar_trilha_auditoria", label: "Trilha de auditoria",       desc: "Exporta log completo de ações",        autonomy: "N3" },
];

const NIVEL_STYLE: Record<string,string> = {
  N1:"text-blue-700 bg-blue-100", N2:"text-amber-700 bg-amber-100", N3:"text-green-700 bg-green-100"
};

export default function AgenteAuditor() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState<string|null>(null);

  const { data: logs = [], refetch } = useQuery({
    queryKey: ["agent-auditor-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_action_log").select("*")
        .eq("agent_type", "auditor").order("created_at", { ascending: false }).limit(15);
      return data ?? [];
    },
    enabled: !!user, refetchInterval: 30000,
  });

  const alertas = logs.filter((l:any) => l.action_key === "gerar_alerta_risco").length;
  const anomalias = logs.filter((l:any) => l.action_key === "detectar_anomalia").length;

  const runTool = useMutation({
    mutationFn: async (tool: string) => {
      setRunning(tool);
      const { error } = await supabase.functions.invoke("agent-orchestrator",
        { body: { action: tool, payload: { company_id: user?.id } } });
      if (error) throw error;
    },
    onSuccess: (_, tool) => { setRunning(null); queryClient.invalidateQueries({ queryKey: ["agent-auditor-logs"] }); toast.success(`Auditor: ${tool}`); refetch(); },
    onError: (e: any) => { setRunning(null); toast.error(e.message); },
  });

  const runScan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("agent-orchestrator",
        { body: { action: "run_audit_scan", payload: { company_id: user?.id } } });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["agent-auditor-logs"] }); toast.success("Varredura de auditoria concluída!"); refetch(); },
    onError: () => toast.error("Erro na varredura"),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-600"/> Agente Auditor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Detecção de anomalias, duplicidades e compliance em tempo real</p>
        </div>
        <Button onClick={() => runScan.mutate()} disabled={runScan.isPending} className="gap-2 bg-red-600 hover:bg-red-700">
          {runScan.isPending ? <><RefreshCw className="h-4 w-4 animate-spin"/>Varrendo...</> : <><Search className="h-4 w-4"/>Varredura Completa</>}
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500"><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Alertas gerados</p><p className="text-2xl font-bold text-red-600">{alertas}</p></CardContent></Card>
        <Card className="border-l-4 border-l-amber-500"><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Anomalias detectadas</p><p className="text-2xl font-bold text-amber-600">{anomalias}</p></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Varreduras OK</p><p className="text-2xl font-bold text-green-600">{logs.filter((l:any) => l.status==="executed").length}</p></CardContent></Card>
      </div>
      <Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4"/>Tools do Auditor</CardTitle></CardHeader>
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
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Últimas detecções</CardTitle></CardHeader>
          <CardContent><div className="space-y-2">{logs.slice(0,8).map((l:any) => (
            <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-lg border text-sm">
              <div className={cn("h-2 w-2 rounded-full flex-shrink-0", l.action_key==="gerar_alerta_risco"?"bg-red-500":l.action_key==="detectar_anomalia"?"bg-amber-500":"bg-green-500")}/>
              <p className="flex-1 truncate">{l.action_label || l.action_key}</p>
              <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</span>
            </div>
          ))}</div></CardContent>
        </Card>
      )}
    </div>
  );
}
