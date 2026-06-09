import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldOff, ShieldCheck, Zap, AlertTriangle, Settings,
  Eye, CheckCircle2, Clock, Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AutonomyLevel = "N0" | "N1" | "N2" | "N3";

interface ActionRow {
  id: string;
  action_type: string;
  label: string;
  level: AutonomyLevel;
  justification: string;
  category: string;
}

const LEVEL_META: Record<AutonomyLevel, { label: string; desc: string; color: string; bg: string; Icon: any }> = {
  N0: { label: "N0 — Sugestão",              desc: "IA sugere; humano executa manualmente",       color: "text-gray-600",  bg: "bg-gray-50 border-gray-200",  Icon: Eye },
  N1: { label: "N1 — Aprovação",             desc: "IA prepara; humano aprova com 1 clique",      color: "text-blue-600",  bg: "bg-blue-50 border-blue-200",  Icon: CheckCircle2 },
  N2: { label: "N2 — Exec. + Notificação",   desc: "IA executa e notifica; humano pode reverter", color: "text-amber-600", bg: "bg-amber-50 border-amber-200",Icon: Clock },
  N3: { label: "N3 — Autônomo Total",        desc: "IA executa em silêncio; auditoria mensal",    color: "text-green-600", bg: "bg-green-50 border-green-200",Icon: Zap },
};

const DEFAULT_MATRIX: ActionRow[] = [
  { id:"classify_expense",    action_type:"classify_expense",    label:"Classificar despesa (conta + CC)",       level:"N3", justification:"Reversibilidade total, alto volume",       category:"Contabilidade" },
  { id:"create_ap_recurrent", action_type:"create_ap_recurrent", label:"Criar AP — NF fornecedor recorrente",   level:"N2", justification:"Padrão conhecido, valor previsível",        category:"AP" },
  { id:"create_ap_new",       action_type:"create_ap_new",       label:"Criar AP — fornecedor novo",            level:"N1", justification:"Sem histórico para validar",                category:"AP" },
  { id:"settle_ar_exact",     action_type:"settle_ar_exact",     label:"Baixar AR — match exato",               level:"N3", justification:"Valor + data + documento batem",            category:"AR" },
  { id:"settle_ap_boleto",    action_type:"settle_ap_boleto",    label:"Baixar AP — boleto pago",               level:"N3", justification:"Confirmação bancária via CNAB",             category:"AP" },
  { id:"recon_high",          action_type:"recon_high",          label:"Conciliação (confiança ≥ 90%)",         level:"N3", justification:"Padrão aprendido, baixo risco",             category:"Tesouraria" },
  { id:"recon_mid",           action_type:"recon_mid",           label:"Conciliação (confiança 70–90%)",        level:"N2", justification:"Provavelmente correto, vale auditar",       category:"Tesouraria" },
  { id:"recon_low",           action_type:"recon_low",           label:"Conciliação (confiança < 70%)",         level:"N1", justification:"Divergência que merece atenção",            category:"Tesouraria" },
  { id:"pay_under_5k",        action_type:"pay_under_5k",        label:"Pagamento até R$ 5.000",                level:"N2", justification:"Valor baixo, padrão conhecido",            category:"Pagamentos" },
  { id:"pay_5k_50k",          action_type:"pay_5k_50k",          label:"Pagamento R$ 5.001 – R$ 50.000",       level:"N1", justification:"Alçada gerencial",                         category:"Pagamentos" },
  { id:"pay_over_50k",        action_type:"pay_over_50k",        label:"Pagamento acima de R$ 50.000",         level:"N0", justification:"Sempre toque humano explícito",             category:"Pagamentos" },
  { id:"send_collection",     action_type:"send_collection",     label:"Enviar cobrança (régua)",               level:"N3", justification:"Comunicação padronizada",                  category:"AR" },
  { id:"three_way_match",     action_type:"three_way_match",     label:"3-Way Match AP × NF × Recebimento",    level:"N2", justification:"Alta confiança, baixo risco residual",      category:"AP" },
  { id:"pdd_provision",       action_type:"pdd_provision",       label:"Provisão PDD automática",               level:"N2", justification:"Regra contábil, reversível",               category:"AR" },
];

const CATEGORIES = ["Todos","AP","AR","Tesouraria","Pagamentos","Contabilidade"];

export default function AutomationRules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [catFilter, setCatFilter] = useState("Todos");
  const [killConfirm, setKillConfirm] = useState(false);
  const [matrix, setMatrix] = useState<ActionRow[]>(DEFAULT_MATRIX);

  const { data: killData } = useQuery({
    queryKey: ["kill-switch"],
    queryFn: async () => {
      const { data } = await supabase
        .from("kill_switch_log")
        .select("*")
        .order("activated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useQuery({
    queryKey: ["action-autonomy-matrix"],
    queryFn: async () => {
      const { data } = await supabase.from("action_autonomy_matrix").select("*");
      if (data && data.length > 0) {
        setMatrix(prev => prev.map(row => {
          const db = data.find((d: any) => d.action_type === row.action_type);
          return db ? { ...row, level: db.autonomy_level as AutonomyLevel } : row;
        }));
      }
      return data ?? [];
    },
    enabled: !!user,
  });

  const isKilled = !!(killData?.reason && !killData.deactivated_at);

  const killMutation = useMutation({
    mutationFn: async (activate: boolean) => {
      if (activate) {
        await supabase.from("kill_switch_log").insert({
          reason: "Ativado manualmente pelo gestor via painel VirtruvIA",
          activated_by: user?.id,
        });
      } else {
        await supabase.from("kill_switch_log")
          .update({ deactivated_at: new Date().toISOString(), deactivated_by: user?.id })
          .is("deactivated_at", null);
      }
    },
    onSuccess: (_, activate) => {
      queryClient.invalidateQueries({ queryKey: ["kill-switch"] });
      toast[activate ? "warning" : "success"](
        activate ? "⚡ Kill Switch ativado — todos os agentes pausados" : "✅ Agentes reativados com sucesso"
      );
      setKillConfirm(false);
    },
  });

  const updateLevel = useMutation({
    mutationFn: async ({ action_type, level }: { action_type: string; level: AutonomyLevel }) => {
      await supabase.from("action_autonomy_matrix")
        .upsert({ action_type, autonomy_level: level }, { onConflict: "action_type,company_id" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-autonomy-matrix"] });
      toast.success("Nível atualizado!");
    },
  });

  const handleLevel = (row: ActionRow, newLevel: AutonomyLevel) => {
    setMatrix(prev => prev.map(r => r.id === row.id ? { ...r, level: newLevel } : r));
    updateLevel.mutate({ action_type: row.action_type, level: newLevel });
  };

  const filtered = catFilter === "Todos" ? matrix : matrix.filter(r => r.category === catFilter);
  const levelCounts = matrix.reduce((acc, r) => { acc[r.level] = (acc[r.level] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-6">
      {/* Header + Kill Switch */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            Autopiloto — Regras & Autonomia
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Controle o nível de autonomia de cada agente IA em tempo real</p>
        </div>
        <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all",
          isKilled ? "bg-red-50 border-red-400" : "bg-green-50 border-green-300")}>
          {isKilled
            ? <ShieldOff className="h-6 w-6 text-red-600 animate-pulse" />
            : <ShieldCheck className="h-6 w-6 text-green-600" />}
          <div>
            <p className={cn("font-bold text-sm", isKilled ? "text-red-700" : "text-green-700")}>
              {isKilled ? "AGENTES PAUSADOS" : "Agentes Ativos"}
            </p>
            <p className="text-xs text-muted-foreground">{isKilled ? "Kill switch acionado" : "Operação normal"}</p>
          </div>
          {!killConfirm ? (
            <Button variant={isKilled ? "default" : "destructive"} size="sm" onClick={() => setKillConfirm(true)} className="ml-2">
              {isKilled ? "Reativar" : "Kill Switch"}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setKillConfirm(false)}>Cancelar</Button>
              <Button size="sm" variant={isKilled ? "default" : "destructive"}
                onClick={() => killMutation.mutate(!isKilled)} disabled={killMutation.isPending}>
                {isKilled ? "Confirmar Reativação" : "Confirmar Pausa"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {isKilled && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-300 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Kill Switch Ativo</p>
            <p className="text-sm text-red-600">
              Todos os agentes estão pausados. Nenhuma ação autônoma será executada até a reativação.
              {killData?.activated_at && <span> Ativado em {new Date(killData.activated_at).toLocaleString("pt-BR")}.</span>}
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="matrix">
        <TabsList>
          <TabsTrigger value="matrix">Matriz de Autonomia</TabsTrigger>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(["N0","N1","N2","N3"] as AutonomyLevel[]).map(level => {
              const { label, desc, color, bg, Icon } = LEVEL_META[level];
              return (
                <Card key={level} className={cn("border-2", bg)}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={cn("h-5 w-5", color)} />
                      <span className={cn("text-3xl font-bold", color)}>{levelCounts[level] || 0}</span>
                    </div>
                    <p className="font-semibold text-sm">{level}</p>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Guia de Níveis</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(["N0","N1","N2","N3"] as AutonomyLevel[]).map(level => {
                const { label, desc, color, bg, Icon } = LEVEL_META[level];
                return (
                  <div key={level} className={cn("flex gap-3 p-3 rounded-lg border", bg)}>
                    <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", color)} />
                    <div>
                      <p className={cn("font-semibold text-sm", color)}>{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <Button key={cat} variant={catFilter === cat ? "default" : "outline"} size="sm" onClick={() => setCatFilter(cat)}>
                {cat}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            {filtered.map(row => {
              const { color, bg, Icon } = LEVEL_META[row.level];
              return (
                <div key={row.id} className={cn("flex items-center gap-4 p-4 rounded-xl border-2 transition-all", bg)}>
                  <Icon className={cn("h-5 w-5 flex-shrink-0", color)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{row.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{row.justification}</p>
                  </div>
                  <Badge variant="outline" className="text-xs hidden sm:block">{row.category}</Badge>
                  <Select value={row.level} onValueChange={(v) => handleLevel(row, v as AutonomyLevel)} disabled={isKilled}>
                    <SelectTrigger className="w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["N0","N1","N2","N3"] as AutonomyLevel[]).map(l => (
                        <SelectItem key={l} value={l}>
                          <span className={LEVEL_META[l].color}>{LEVEL_META[l].label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
