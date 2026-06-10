import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard, Send, Calendar, CheckSquare, Square,
  Download, AlertTriangle, RefreshCw, Bot, DollarSign, Building2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "ted", label: "TED" },
  { value: "boleto", label: "Boleto" },
  { value: "darf", label: "DARF" },
  { value: "das", label: "DAS (MEI/Simples)" },
];

export default function APBordero() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payMethod, setPayMethod] = useState("pix");
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);

  const { data: titulos = [], isLoading, refetch } = useQuery({
    queryKey: ["ap-bordero"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*, counterparty:counterparties(name, document_number)")
        .lt("amount", 0)
        .eq("payment_method", "scheduled")
        .order("due_date", { ascending: true })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  const toggleAll = () => {
    if (selected.size === titulos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(titulos.map((t: any) => t.id)));
    }
  };

  const toggle = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };

  const selectedTitulos = titulos.filter((t: any) => selected.has(t.id));
  const totalSelecionado = selectedTitulos.reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);

  const gerarCNAB = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      if (selected.size === 0) throw new Error("Selecione ao menos 1 título");

      // Invocar agente AP para gerar CNAB
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: {
          action: "gerar_cnab",
          payload: {
            titulos: selectedTitulos.map((t: any) => ({
              id: t.id,
              valor: Math.abs(t.amount),
              vencimento: t.due_date,
              fornecedor: t.counterparty?.name,
              documento: t.counterparty?.document_number,
              metodo: payMethod,
            })),
            data_pagamento: scheduleDate,
          },
        },
      });
      if (error) console.warn("Edge Function CNAB:", error.message);

      // Atualizar status dos títulos
      await supabase.from("transactions")
        .update({ payment_method: payMethod, due_date: scheduleDate })
        .in("id", Array.from(selected));

      // Log no agente
      for (const id of selected) {
        await supabase.from("agent_action_log").insert({
          agent_type: "AP",
          autonomy_level: "N2_notify",
          action_key: "agendar_pagamento",
          action_label: "Pagamento agendado no borderô",
          entity_type: "transaction",
          entity_id: id,
          reason: `Borderô gerado para pagamento em ${scheduleDate} via ${payMethod.toUpperCase()}`,
          status: "executed",
        });
      }

      // Gerar arquivo CNAB simulado para download
      const cnabContent = selectedTitulos.map((t: any, i: number) =>
        `0${(i+1).toString().padStart(5,"0")}${(t.counterparty?.document_number ?? "").replace(/\D/g,"").padStart(14,"0")}${Math.round(Math.abs(t.amount)*100).toString().padStart(13,"0")}${scheduleDate.replace(/-/g,"")}`
      ).join("\n");

      const blob = new Blob([cnabContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bordero_${scheduleDate}_${selected.size}titulos.rem`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      setGenerating(false);
      queryClient.invalidateQueries({ queryKey: ["ap-bordero"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(`Borderô gerado! ${selected.size} título(s) agendados para ${new Date(scheduleDate).toLocaleDateString("pt-BR")}`);
      setSelected(new Set());
    },
    onError: (e: any) => {
      setGenerating(false);
      toast.error(e.message || "Erro ao gerar borderô");
    },
  });

  const vencendoHoje = titulos.filter((t: any) =>
    t.due_date && t.due_date.slice(0, 10) === new Date().toISOString().slice(0, 10)
  ).length;

  const vencidos = titulos.filter((t: any) =>
    t.due_date && t.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10)
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Send className="h-6 w-6 text-purple-600" />
            Borderô & Pagamentos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Agrupe e gere CNAB/PIX/TED em lote — Agente AP executa automaticamente
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* Alertas */}
      {(vencendoHoje > 0 || vencidos > 0) && (
        <div className="space-y-2">
          {vencidos > 0 && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-300 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="text-red-800">{vencidos} título(s) <strong>vencidos</strong> — agende o pagamento</span>
            </div>
          )}
          {vencendoHoje > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="text-amber-800">{vencendoHoje} título(s) vencem <strong>hoje</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Configuração do borderô */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-600" /> Configurar Borderô
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Pagamento</label>
              <input type="date" value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Forma de Pagamento</label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Selecionados</label>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-2xl font-bold text-purple-600">{selected.size}</span>
                <span className="text-sm text-muted-foreground">/ {titulos.length} títulos</span>
                {selected.size > 0 && (
                  <span className="ml-auto font-bold font-mono text-red-600">{formatCurrency(totalSelecionado)}</span>
                )}
              </div>
            </div>
          </div>

          {selected.size > 0 && (
            <Progress value={(selected.size / titulos.length) * 100} className="mt-3 h-1.5" />
          )}
        </CardContent>
      </Card>

      {/* Lista de títulos */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Títulos aprovados aguardando pagamento</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleAll} className="gap-1 text-xs">
                {selected.size === titulos.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                {selected.size === titulos.length ? "Desmarcar" : "Todos"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : titulos.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Nenhum título aprovado aguardando pagamento.</p>
              <p className="text-sm">Aprove títulos no Workflow de Aprovação primeiro.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {titulos.map((t: any) => {
                const isVencido = t.due_date && t.due_date.slice(0,10) < new Date().toISOString().slice(0,10);
                const isHoje = t.due_date && t.due_date.slice(0,10) === new Date().toISOString().slice(0,10);
                return (
                  <div key={t.id} className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border transition-all cursor-pointer",
                    selected.has(t.id) ? "border-purple-300 bg-purple-50" : "border-border hover:bg-muted/30",
                    isVencido && "border-red-200",
                  )} onClick={() => toggle(t.id)}>
                    <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{t.counterparty?.name ?? t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Venc. {t.due_date ? new Date(t.due_date).toLocaleDateString("pt-BR") : "—"}
                        {isVencido && " · "}
                        {isVencido && <span className="text-red-600 font-medium">VENCIDO</span>}
                        {isHoje && " · "}
                        {isHoje && <span className="text-amber-600 font-medium">HOJE</span>}
                      </p>
                    </div>
                    <p className="font-bold font-mono text-red-600">{formatCurrency(Math.abs(t.amount))}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gerar borderô */}
      <div className="flex justify-end">
        <Button
          onClick={() => gerarCNAB.mutate()}
          disabled={selected.size === 0 || gerarCNAB.isPending}
          className="gap-2 bg-purple-600 hover:bg-purple-700 px-6"
          size="lg">
          <Download className="h-4 w-4" />
          Gerar Borderô — {selected.size} título(s) — {formatCurrency(totalSelecionado)}
        </Button>
      </div>
    </div>
  );
}
