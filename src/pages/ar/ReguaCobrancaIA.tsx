import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot, BellRing, Send, Clock, CheckCircle2, XCircle,
  RefreshCw, Play, Pause, AlertTriangle, MessageSquare, Mail, Phone
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const REGUA_STEPS = [
  { dias: -3, label: "D-3 (antes do venc.)", canal: "email",    msg: "Lembrete: seu boleto vence em 3 dias", nivel: "N3" },
  { dias: 0,  label: "D+0 (dia do venc.)",   canal: "email",    msg: "Seu boleto venceu hoje", nivel: "N3" },
  { dias: 5,  label: "D+5",                  canal: "whatsapp", msg: "Regularize seu débito em aberto", nivel: "N3" },
  { dias: 15, label: "D+15",                 canal: "whatsapp", msg: "Segundo aviso de inadimplência", nivel: "N2" },
  { dias: 30, label: "D+30",                 canal: "email",    msg: "Último aviso antes de negativação", nivel: "N2" },
  { dias: 60, label: "D+60 (Jurídico)",      canal: "email",    msg: "Encaminhado para cobrança jurídica", nivel: "N1" },
];

const CANAL_ICON = { email: Mail, whatsapp: MessageSquare, sms: Phone };
const NIVEL_STYLE: Record<string, string> = {
  N1: "bg-blue-100 text-blue-700",
  N2: "bg-amber-100 text-amber-700",
  N3: "bg-green-100 text-green-700",
};

export default function ARReguaCobrancaIA() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeSteps, setActiveSteps] = useState(new Set([0, 1, 2, 3]));
  const [agentRunning, setAgentRunning] = useState(false);

  const { data: vencidos = [], isLoading, refetch } = useQuery({
    queryKey: ["ar-vencidos-regua"],
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("transactions")
        .select("*, counterparty:counterparties(name, email)")
        .gt("amount", 0)
        .lt("due_date", hoje)
        .not("payment_method", "eq", "received")
        .order("due_date", { ascending: true })
        .limit(30);
      return (data ?? []).map((t: any) => {
        const diasAtraso = Math.floor(
          (Date.now() - new Date(t.due_date).getTime()) / 86400000
        );
        const proximoPasso = REGUA_STEPS.find(s => s.dias > 0 && diasAtraso <= s.dias)
          ?? REGUA_STEPS[REGUA_STEPS.length - 1];
        return { ...t, diasAtraso, proximoPasso };
      });
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["ar-cobranca-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_action_log")
        .select("*")
        .eq("agent_type", "AR")
        .eq("action_key", "aplicar_regua_cobranca")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  const dispararReguaMutation = useMutation({
    mutationFn: async () => {
      setAgentRunning(true);
      const elegíveis = vencidos.filter(v =>
        activeSteps.has(REGUA_STEPS.indexOf(v.proximoPasso))
      );

      for (const titulo of elegíveis) {
        await supabase.functions.invoke("agent-orchestrator", {
          body: {
            action: "aplicar_regua_cobranca",
            payload: {
              transaction_id: titulo.id,
              cliente: titulo.counterparty?.name,
              email: titulo.counterparty?.email,
              valor: titulo.amount,
              dias_atraso: titulo.diasAtraso,
              passo: titulo.proximoPasso,
            },
          },
        });

        await supabase.from("agent_action_log").insert({
          agent_type: "AR",
          autonomy_level: titulo.proximoPasso.nivel === "N3" ? "N3_autonomous"
            : titulo.proximoPasso.nivel === "N2" ? "N2_notify" : "N1_approval",
          action_key: "aplicar_regua_cobranca",
          action_label: `Cobrança ${titulo.proximoPasso.label} — ${titulo.counterparty?.name}`,
          entity_type: "transaction",
          entity_id: titulo.id,
          amount: titulo.amount,
          reason: `Disparo automático D+${titulo.diasAtraso} via ${titulo.proximoPasso.canal}`,
          status: "executed",
        });
      }

      return elegíveis.length;
    },
    onSuccess: (count) => {
      setAgentRunning(false);
      queryClient.invalidateQueries({ queryKey: ["ar-cobranca-logs"] });
      toast.success(`Agente AR disparou ${count} cobranças!`);
      refetch();
    },
    onError: () => {
      setAgentRunning(false);
      toast.error("Erro ao executar régua de cobrança");
    },
  });

  const toggleStep = (i: number) => {
    const s = new Set(activeSteps);
    if (s.has(i)) s.delete(i); else s.add(i);
    setActiveSteps(s);
  };

  const totalVencido = vencidos.reduce((s, t) => s + (t.amount || 0), 0);
  const enviados = logs.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BellRing className="h-6 w-6 text-orange-600" />
            Régua de Cobrança — Agente AR
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cobrança automática escalonada por IA — e-mail, WhatsApp e SMS
          </p>
        </div>
        <Button
          onClick={() => dispararReguaMutation.mutate()}
          disabled={agentRunning || dispararReguaMutation.isPending || vencidos.length === 0}
          className="gap-2 bg-orange-600 hover:bg-orange-700">
          {agentRunning
            ? <><RefreshCw className="h-4 w-4 animate-spin" /> Disparando...</>
            : <><Play className="h-4 w-4" /> Disparar Régua Agora</>}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Em atraso", value: vencidos.length, color: "text-red-600" },
          { label: "Total vencido", value: formatCurrency(totalVencido), color: "text-red-600" },
          { label: "Cobranças enviadas", value: enviados, color: "text-blue-600" },
          { label: "Passos ativos", value: activeSteps.size + "/" + REGUA_STEPS.length, color: "text-green-600" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={cn("text-xl font-bold mt-0.5", k.color)}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuração da régua */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4 text-orange-600" /> Configuração dos Passos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {REGUA_STEPS.map((step, i) => {
              const Icon = CANAL_ICON[step.canal as keyof typeof CANAL_ICON] ?? Mail;
              const active = activeSteps.has(i);
              return (
                <div key={i} className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  active ? "border-orange-200 bg-orange-50/50" : "border-border opacity-60"
                )}>
                  <Switch checked={active} onCheckedChange={() => toggleStep(i)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{step.label}</span>
                      <Badge className={cn("text-xs px-2", NIVEL_STYLE[step.nivel])}>{step.nivel}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.msg}</p>
                  </div>
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Títulos vencidos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" /> Títulos em Atraso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-6 text-muted-foreground">Carregando...</div>
            ) : vencidos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>Nenhum título em atraso!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {vencidos.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg border text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{t.counterparty?.name ?? t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-red-600 font-medium">D+{t.diasAtraso}</span>
                        {" · Próximo: "}{t.proximoPasso.label}
                      </p>
                    </div>
                    <span className="font-bold font-mono text-red-600 flex-shrink-0">
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Log de cobranças */}
      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Últimas cobranças disparadas pela IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg border text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                  <p className="flex-1 truncate">{log.action_label}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
