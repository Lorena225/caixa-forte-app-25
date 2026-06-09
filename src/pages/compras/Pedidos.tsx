import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart, CheckCircle2, XCircle, AlertTriangle, Clock,
  Eye, RefreshCw, FileText, Package, CreditCard, ChevronDown, ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface ThreeWayMatch {
  id: string;
  po_number: string;
  supplier_name: string;
  po_amount: number;
  invoice_amount: number | null;
  receipt_amount: number | null;
  match_score: number | null;
  match_status: "pending" | "matched" | "partial" | "divergent";
  created_at: string;
  invoice_number?: string;
  notes?: string;
}

// ─── Cores por status ────────────────────────────────────────────────────────
const STATUS_META = {
  matched:   { label: "Match Perfeito",  color: "text-green-700", bg: "bg-green-50 border-green-300",  icon: CheckCircle2 },
  partial:   { label: "Parcial",         color: "text-amber-700", bg: "bg-amber-50 border-amber-300",  icon: AlertTriangle },
  divergent: { label: "Divergente",      color: "text-red-700",   bg: "bg-red-50 border-red-300",      icon: XCircle },
  pending:   { label: "Pendente",        color: "text-blue-700",  bg: "bg-blue-50 border-blue-300",    icon: Clock },
};

export default function ComprasPedidos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState("all");

  const { data: matches = [], isLoading, refetch } = useQuery<ThreeWayMatch[]>({
    queryKey: ["three-way-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("three_way_matches")
        .select("*, purchase_order:purchase_orders(po_number, supplier:counterparties(name))")
        .order("created_at", { ascending: false });
      return (data ?? []).map((d: any) => ({
        id: d.id,
        po_number: d.purchase_order?.po_number ?? d.id.slice(0, 8),
        supplier_name: d.purchase_order?.supplier?.name ?? "Fornecedor",
        po_amount: d.po_amount,
        invoice_amount: d.invoice_amount,
        receipt_amount: d.receipt_amount,
        match_score: d.match_score,
        match_status: d.match_status,
        created_at: d.created_at,
        invoice_number: d.invoice_number,
        notes: d.notes,
      }));
    },
    enabled: !!user,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("three_way_matches")
        .update({ match_status: "matched", approved_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["three-way-matches"] });
      toast.success("Match aprovado! Título AP gerado automaticamente.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("three_way_matches")
        .update({ match_status: "divergent" })
        .eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["three-way-matches"] });
      toast.warning("Match rejeitado. Aguardando correção do fornecedor.");
    },
  });

  const filtered = tab === "all" ? matches
    : matches.filter(m => m.match_status === tab);

  // ─── KPIs ────────────────────────────────────────────────────────────────
  const total = matches.length;
  const matched_count = matches.filter(m => m.match_status === "matched").length;
  const pending_count = matches.filter(m => m.match_status === "pending").length;
  const divergent_count = matches.filter(m => m.match_status === "divergent").length;
  const avg_score = total > 0
    ? Math.round(matches.filter(m => m.match_score).reduce((s, m) => s + (m.match_score ?? 0), 0) / total)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
            Compras — 3-Way Match
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pedido de Compra × Nota Fiscal × Recebimento físico — validação automática por IA
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total",          value: total,           color: "text-foreground",  icon: FileText },
          { label: "Aprovados",      value: matched_count,   color: "text-green-600",   icon: CheckCircle2 },
          { label: "Pendentes",      value: pending_count,   color: "text-blue-600",    icon: Clock },
          { label: "Divergentes",    value: divergent_count, color: "text-red-600",     icon: XCircle },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className={cn("text-2xl font-bold", k.color)}>{k.value}</p>
                </div>
                <k.icon className={cn("h-7 w-7 opacity-20", k.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Score médio */}
      {avg_score > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Score médio de matching (IA)</p>
              <span className={cn("font-bold text-lg", avg_score >= 90 ? "text-green-600" : avg_score >= 70 ? "text-amber-600" : "text-red-600")}>
                {avg_score}%
              </span>
            </div>
            <Progress value={avg_score} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Tabela por status */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Todos ({total})</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({pending_count})</TabsTrigger>
          <TabsTrigger value="matched">Aprovados ({matched_count})</TabsTrigger>
          <TabsTrigger value="divergent">Divergentes ({divergent_count})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({length: 3}).map((_,i) => (
              <Card key={i} className="animate-pulse"><CardContent className="h-20 pt-6 bg-muted/30 rounded" /></Card>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum match encontrado nesta categoria.</p>
              <p className="text-sm mt-1">O sistema detecta matches automaticamente quando NFs e recebimentos são lançados.</p>
            </div>
          ) : (
            filtered.map(match => {
              const meta = STATUS_META[match.match_status];
              const StatusIcon = meta.icon;
              const isExp = expanded === match.id;
              const poOk = match.po_amount != null;
              const nfOk = match.invoice_amount != null;
              const rcOk = match.receipt_amount != null;

              return (
                <Card key={match.id} className={cn("border-2 transition-all", meta.bg)}>
                  {/* Linha principal */}
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      <StatusIcon className={cn("h-5 w-5 flex-shrink-0", meta.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">PC #{match.po_number}</span>
                          <span className="text-muted-foreground text-sm">{match.supplier_name}</span>
                          {match.invoice_number && (
                            <Badge variant="outline" className="text-xs">NF {match.invoice_number}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(match.created_at).toLocaleDateString("pt-BR")}
                          {match.match_score != null && <> · Score: <span className="font-medium">{match.match_score}%</span></>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", meta.color)}>{meta.label}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(isExp ? null : match.id)}>
                          {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Detalhe expandido */}
                    {isExp && (
                      <div className="mt-4 space-y-3 border-t pt-3">
                        {/* 3 pilares */}
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Pedido de Compra", value: match.po_amount, ok: poOk, icon: FileText },
                            { label: "Nota Fiscal",      value: match.invoice_amount, ok: nfOk, icon: CreditCard },
                            { label: "Recebimento",      value: match.receipt_amount, ok: rcOk, icon: Package },
                          ].map(p => (
                            <div key={p.label} className={cn("p-3 rounded-lg border", p.ok ? "bg-white" : "bg-muted/30")}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <p.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">{p.label}</p>
                              </div>
                              {p.ok
                                ? <p className="font-semibold font-mono text-sm">{formatCurrency(p.value!)}</p>
                                : <p className="text-xs text-muted-foreground italic">Não lançado</p>}
                            </div>
                          ))}
                        </div>

                        {match.notes && (
                          <p className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">{match.notes}</p>
                        )}

                        {/* Ações */}
                        {match.match_status === "pending" && (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => rejectMutation.mutate(match.id)} disabled={rejectMutation.isPending}>
                              <XCircle className="h-4 w-4" /> Rejeitar
                            </Button>
                            <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700"
                              onClick={() => approveMutation.mutate(match.id)} disabled={approveMutation.isPending}>
                              <CheckCircle2 className="h-4 w-4" /> Aprovar Match
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
