import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, Star, AlertTriangle,
  Users, DollarSign, Search, RefreshCw, ChevronDown, ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getScoreColor(score: number) {
  if (score >= 800) return { text: "text-green-600", bg: "bg-green-50 border-green-300", label: "Excelente" };
  if (score >= 650) return { text: "text-blue-600",  bg: "bg-blue-50 border-blue-300",  label: "Bom" };
  if (score >= 500) return { text: "text-amber-600", bg: "bg-amber-50 border-amber-300",label: "Regular" };
  return             { text: "text-red-600",   bg: "bg-red-50 border-red-300",   label: "Ruim" };
}

function getScoreStars(score: number) {
  if (score >= 800) return 5;
  if (score >= 700) return 4;
  if (score >= 600) return 3;
  if (score >= 500) return 2;
  return 1;
}

export default function CobrancaGestaoCredito() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: scores = [], isLoading, refetch } = useQuery({
    queryKey: ["client-credit-scores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_credit_scores")
        .select("*, client:counterparties(name, document_number, type)")
        .order("score", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const filtered = scores.filter((s: any) =>
    s.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.client?.document_number?.includes(search)
  );

  const avg = scores.length > 0
    ? Math.round(scores.reduce((a: number, s: any) => a + (s.score || 0), 0) / scores.length)
    : 0;
  const highRisk = scores.filter((s: any) => s.score < 500).length;
  const topClients = scores.filter((s: any) => s.score >= 800).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-500" />
            Gestão de Crédito
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Score de crédito por cliente, calculado automaticamente pela IA</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" /> Recalcular Scores
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Score Médio</p>
                <p className={cn("text-2xl font-bold", getScoreColor(avg).text)}>{avg}</p>
              </div>
              <TrendingUp className="h-7 w-7 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Excelentes (≥800)</p>
                <p className="text-2xl font-bold text-green-600">{topClients}</p>
              </div>
              <Star className="h-7 w-7 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Alto Risco (&lt;500)</p>
                <p className="text-2xl font-bold text-red-600">{highRisk}</p>
              </div>
              <AlertTriangle className="h-7 w-7 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar cliente ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Lista de scores */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({length:4}).map((_,i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-16 pt-4 bg-muted/30 rounded" /></Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum score encontrado.</p>
            <p className="text-sm mt-1">Execute a migration do Supabase e rode o agente de score de crédito.</p>
          </div>
        ) : (
          filtered.map((s: any) => {
            const meta = getScoreColor(s.score);
            const stars = getScoreStars(s.score);
            const isExp = expanded === s.id;
            return (
              <Card key={s.id} className={cn("border-2 transition-all", meta.bg)}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{s.client?.name ?? "Cliente"}</p>
                        <div className="flex">
                          {Array.from({length:5}).map((_,i) => (
                            <Star key={i} className={cn("h-3 w-3", i < stars ? "text-amber-400 fill-amber-400" : "text-muted-foreground")} />
                          ))}
                        </div>
                      </div>
                      {s.client?.document_number && (
                        <p className="text-xs text-muted-foreground font-mono">{s.client.document_number}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={cn("text-2xl font-bold font-mono", meta.text)}>{s.score}</p>
                        <p className={cn("text-xs font-medium", meta.text)}>{meta.label}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(isExp ? null : s.id)}>
                        {isExp ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                      </Button>
                    </div>
                  </div>

                  {/* Barra de score */}
                  <Progress value={(s.score / 1000) * 100} className="mt-3 h-1.5" />

                  {/* Detalhe */}
                  {isExp && (
                    <div className="mt-4 border-t pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      {[
                        { label: "Limite de Crédito",  value: formatCurrency(s.credit_limit ?? 0) },
                        { label: "Exposição Atual",     value: formatCurrency(s.current_exposure ?? 0) },
                        { label: "Dias de Atraso (md)", value: `${s.avg_days_late ?? 0} dias` },
                        { label: "Última Atualização",  value: s.last_calculated_at ? new Date(s.last_calculated_at).toLocaleDateString("pt-BR") : "—" },
                      ].map(item => (
                        <div key={item.label} className="p-2 bg-white rounded border">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="font-semibold mt-0.5">{item.value}</p>
                        </div>
                      ))}
                      {s.score_factors && (
                        <div className="col-span-2 sm:col-span-4 p-2 bg-white rounded border">
                          <p className="text-xs text-muted-foreground mb-1">Fatores do Score</p>
                          <p className="text-xs">{typeof s.score_factors === "string" ? s.score_factors : JSON.stringify(s.score_factors)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
