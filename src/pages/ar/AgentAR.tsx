import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot, Zap, CheckCircle2, Clock, XCircle, TrendingUp,
  Play, RefreshCw, Activity, AlertTriangle, Star, Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const AGENT_TOOLS = [
  { key: "emitir_boleto",         label: "Emitir boleto",           desc: "Gera boleto registrado automaticamente",   autonomy: "N3" },
  { key: "enviar_cobranca",       label: "Enviar cobrança",         desc: "Dispara e-mail/WhatsApp de cobrança",      autonomy: "N3" },
  { key: "gerar_pix_qr",         label: "Gerar PIX QR Code",       desc: "Cria PIX dinâmico com validade",           autonomy: "N3" },
  { key: "aplicar_regua_cobranca",label: "Aplicar régua",           desc: "Executa próximo passo da régua",           autonomy: "N3" },
  { key: "dar_baixa_recebimento", label: "Baixar recebimento",      desc: "Baixa AR após confirmação de pagamento",   autonomy: "N3" },
  { key: "renegociar_titulo",     label: "Renegociar título",       desc: "Propõe renegociação assistida",            autonomy: "N1" },
  { key: "calcular_juros_multa",  label: "Calcular juros/multa",    desc: "Atualiza valor com encargos",              autonomy: "N3" },
  { key: "atualizar_score_cliente", label: "Atualizar score",       desc: "Recalcula score de crédito do cliente",    autonomy: "N2" },
];

const NIVEL_STYLE: Record<string, string> = {
  N0: "text-gray-600 bg-gray-100",
  N1: "text-blue-700 bg-blue-100",
  N2: "text-amber-700 bg-amber-100",
  N3: "text-green-700 bg-green-100",
};

export default function ARAgentAR() {
  const { user, currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState<string | null>(null);

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["agent-ar-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_action_log")
        .select("*")
        .eq("agent_type", "AR")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user && !!currentCompany?.id,
    refetchInterval: 10000,
  });

  const { data: killSwitch } = useQuery({
    queryKey: ["kill-switch-ar"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_kill_switch").select("*")
        .eq("company_id", currentCompany?.id).maybeSingle();
      return data;
    },
    enabled: !!user && !!currentCompany?.id,
  });

  const { data: scoreStats } = useQuery({
    queryKey: ["ar-score-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_credit_scores")
        .select("score")
        .order("score", { ascending: false });
      if (!data || data.length === 0) return null;
      const avg = data.reduce((s, d) => s + d.score, 0) / data.length;
      return { total: data.length, avg: Math.round(avg), top: data[0]?.score };
    },
    enabled: !!user && !!currentCompany?.id,
  });

  const isKilled = killSwitch?.is_paused;
  const executed = logs.filter(l => l.status === "executed").length;
  const pending = logs.filter(l => l.status === "pending_approval").length;
  const totalAmt = logs.reduce((s, l) => s + Math.abs(l.amount || 0), 0);

  const runTool = useMutation({
    mutationFn: async (tool: string) => {
      setRunning(tool);
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: { action: tool, payload: { company_id: currentCompany?.id } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, tool) => {
      setRunning(null);
      queryClient.invalidateQueries({ queryKey: ["agent-ar-logs"] });
      toast.success(`Agente AR executou: ${tool}`);
      refetchLogs();
    },
    onError: (e: any) => {
      setRunning(null);
      toast.error(`Erro: ${e.message}`);
    },
  });

  const runCycleMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: { action: "run_ar_cycle", payload: { company_id: currentCompany?.id } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-ar-logs"] });
      toast.success("Ciclo completo do Agente AR executado!");
      refetchLogs();
    },
    onError: () => toast.error("Erro no ciclo AR"),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-green-600" />
            Agente AR — IA Executora
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Controle o Agente de Contas a Receber em tempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border",
            isKilled ? "bg-red-50 border-red-300" : "bg-green-50 border-green-300")}>
            <div className={cn("h-2 w-2 rounded-full", isKilled ? "bg-red-500" : "bg-green-500 animate-pulse")} />
            <span className="text-sm font-medium">{isKilled ? "Agente pausado" : "Agente ativo"}</span>
          </div>
          <Button onClick={() => runCycleMutation.mutate()}
            disabled={isKilled || runCycleMutation.isPending}
            className="gap-2 bg-green-600 hover:bg-green-700">
            {runCycleMutation.isPending
              ? <><RefreshCw className="h-4 w-4 animate-spin" /> Executando...</>
              : <><Play className="h-4 w-4" /> Executar Ciclo</>}
          </Button>
        </div>
      </div>

      {isKilled && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-300 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800 font-medium">Kill switch ativo — Agente AR pausado.</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Ações hoje", value: executed, color: "text-green-600", icon: CheckCircle2 },
          { label: "Aguardando", value: pending, color: "text-amber-600", icon: Clock },
          { label: "Volume processado", value: formatCurrency(totalAmt), color: "text-blue-600", icon: TrendingUp },
          { label: "Score médio clientes", value: scoreStats ? scoreStats.avg : "—", color: "text-purple-600", icon: Star },
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

      {/* Tools */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" /> Tools do Agente AR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {AGENT_TOOLS.map(tool => (
            <div key={tool.key} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{tool.label}</p>
                  <Badge className={cn("text-xs px-2", NIVEL_STYLE[tool.autonomy])}>{tool.autonomy}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{tool.desc}</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-shrink-0"
                disabled={isKilled || running === tool.key}
                onClick={() => runTool.mutate(tool.key)}>
                {running === tool.key ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                Executar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Log */}
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
              <p>Nenhuma ação registrada. Execute o ciclo do agente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg border text-sm">
                  <div className={cn("h-2 w-2 rounded-full flex-shrink-0",
                    log.status === "executed" ? "bg-green-500" :
                    log.status === "pending_approval" ? "bg-amber-500" :
                    log.status === "rejected" ? "bg-red-500" : "bg-gray-400")} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{log.action_label || log.action_key}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.reason}</p>
                  </div>
                  {log.amount && <span className="font-mono text-xs text-muted-foreground">{formatCurrency(Math.abs(log.amount))}</span>}
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {log.status === "executed" ? "Executado" : log.status === "pending_approval" ? "Aguardando" : log.status}
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
