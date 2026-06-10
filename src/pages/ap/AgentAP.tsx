import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot, Zap, CheckCircle2, Clock, XCircle, AlertTriangle,
  Play, Pause, RefreshCw, Eye, TrendingUp, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const AGENT_TOOLS = [
  { key: "capturar_nf", label: "Capturar NF", desc: "Monitora e-mail e deteta NFs recebidas", autonomy: "N3" },
  { key: "classificar_despesa", label: "Classificar despesa", desc: "Sugere conta + CC automaticamente", autonomy: "N3" },
  { key: "criar_titulo_pagar", label: "Criar título AP", desc: "Lança NF de fornecedor recorrente", autonomy: "N2" },
  { key: "validar_xml_sefaz", label: "Validar SEFAZ", desc: "Verifica autenticidade da NF-e", autonomy: "N3" },
  { key: "associar_pedido", label: "Associar pedido (3-Way Match)", desc: "Bate NF contra PO e recebimento", autonomy: "N2" },
  { key: "encaminhar_aprovacao", label: "Encaminhar aprovação", desc: "Envia para alçada correta", autonomy: "N1" },
  { key: "agendar_pagamento", label: "Agendar pagamento", desc: "Agenda no borderô automaticamente", autonomy: "N2" },
  { key: "gerar_cnab", label: "Gerar CNAB", desc: "Gera arquivo de remessa bancária", autonomy: "N2" },
  { key: "dar_baixa_titulo", label: "Baixar título", desc: "Dá baixa após retorno bancário", autonomy: "N3" },
];

const LEVEL_STYLE: Record<string, string> = {
  N0: "text-gray-600 bg-gray-100",
  N1: "text-blue-700 bg-blue-100",
  N2: "text-amber-700 bg-amber-100",
  N3: "text-green-700 bg-green-100",
};

export default function APAgentAP() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState<string | null>(null);

  // Logs recentes do agente AP
  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["agent-ap-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_action_log")
        .select("*")
        .eq("agent_type", "AP")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // Kill switch
  const { data: killSwitch } = useQuery({
    queryKey: ["kill-switch-ap"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_kill_switch")
        .select("*")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const isKilled = killSwitch?.is_paused;

  // Estatísticas
  const executed = logs.filter(l => l.status === "executed").length;
  const pending = logs.filter(l => l.status === "pending_approval").length;
  const rejected = logs.filter(l => l.status === "rejected").length;
  const totalAmt = logs.filter(l => l.amount).reduce((s, l) => s + Math.abs(l.amount || 0), 0);

  const runTool = useMutation({
    mutationFn: async (tool: string) => {
      setRunning(tool);
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: { action: tool, payload: { company_id: user?.id } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, tool) => {
      setRunning(null);
      queryClient.invalidateQueries({ queryKey: ["agent-ap-logs"] });
      toast.success(`Agente AP executou: ${tool}`);
      refetchLogs();
    },
    onError: (e: any) => {
      setRunning(null);
      toast.error(`Erro no agente: ${e.message}`);
    },
  });

  const autoRunMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: { action: "run_ap_cycle", payload: { company_id: user?.id } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-ap-logs"] });
      toast.success("Ciclo completo do Agente AP executado!");
      refetchLogs();
    },
    onError: () => toast.error("Erro no ciclo do agente AP"),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-blue-600" />
            Agente AP — IA Executora
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Controle e monitore o Agente de Contas a Pagar em tempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border",
            isKilled ? "bg-red-50 border-red-300" : "bg-green-50 border-green-300")}>
            <div className={cn("h-2 w-2 rounded-full", isKilled ? "bg-red-500" : "bg-green-500 animate-pulse")} />
            <span className="text-sm font-medium">{isKilled ? "Agente pausado" : "Agente ativo"}</span>
          </div>
          <Button onClick={() => autoRunMutation.mutate()}
            disabled={isKilled || autoRunMutation.isPending}
            className="gap-2 bg-blue-600 hover:bg-blue-700">
            {autoRunMutation.isPending
              ? <><RefreshCw className="h-4 w-4 animate-spin" /> Executando...</>
              : <><Play className="h-4 w-4" /> Executar Ciclo</>}
          </Button>
        </div>
      </div>

      {isKilled && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-300 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800 font-medium">Kill switch ativo — Agente AP pausado. Vá em Autopiloto → Regras para reativar.</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Executadas hoje", value: executed, color: "text-green-600", icon: CheckCircle2 },
          { label: "Aguardando aprovação", value: pending, color: "text-amber-600", icon: Clock },
          { label: "Rejeitadas", value: rejected, color: "text-red-600", icon: XCircle },
          { label: "Volume processado", value: formatCurrency(totalAmt), color: "text-blue-600", icon: TrendingUp },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className={cn("text-xl font-bold mt-0.5", k.color)}>{k.value}</p>
                </div>
                <k.icon className={cn("h-6 w-6 opacity-20", k.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tools disponíveis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" /> Tools do Agente AP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {AGENT_TOOLS.map(tool => (
            <div key={tool.key} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{tool.label}</p>
                  <Badge className={cn("text-xs px-2", LEVEL_STYLE[tool.autonomy])}>{tool.autonomy}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{tool.desc}</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-shrink-0"
                disabled={isKilled || running === tool.key || autoRunMutation.isPending}
                onClick={() => runTool.mutate(tool.key)}>
                {running === tool.key
                  ? <RefreshCw className="h-3 w-3 animate-spin" />
                  : <Zap className="h-3 w-3" />}
                Executar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Log de ações recentes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Log de Ações Recentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetchLogs()} className="gap-1 text-xs">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Nenhuma ação registrada ainda.</p>
              <p className="text-sm">Execute o ciclo do agente para ver as ações aqui.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg border text-sm">
                  <div className={cn("h-2 w-2 rounded-full flex-shrink-0",
                    log.status === "executed" ? "bg-green-500" :
                    log.status === "pending_approval" ? "bg-amber-500" :
                    log.status === "rejected" ? "bg-red-500" : "bg-gray-400")} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{log.action_label || log.action_key}</p>
                    <p className="text-xs text-muted-foreground">{log.reason?.slice(0, 80)}</p>
                  </div>
                  {log.amount && (
                    <span className="font-mono text-xs text-muted-foreground">{formatCurrency(Math.abs(log.amount))}</span>
                  )}
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {log.status === "executed" ? "Executado" :
                     log.status === "pending_approval" ? "Aguardando" :
                     log.status === "rejected" ? "Rejeitado" : log.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
