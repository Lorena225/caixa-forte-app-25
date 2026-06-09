import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield, AlertTriangle, TrendingDown, RefreshCw,
  CheckCircle2, Clock, XCircle, DollarSign, Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// Faixas de PDD por aging (padrão BACEN/CVM)
const PDD_BANDS = [
  { label: "0–30 dias",    max_days: 30,  rate: 0.01, color: "text-green-600",  bg: "bg-green-50" },
  { label: "31–60 dias",   max_days: 60,  rate: 0.05, color: "text-blue-600",   bg: "bg-blue-50" },
  { label: "61–90 dias",   max_days: 90,  rate: 0.10, color: "text-amber-600",  bg: "bg-amber-50" },
  { label: "91–120 dias",  max_days: 120, rate: 0.30, color: "text-orange-600", bg: "bg-orange-50" },
  { label: "121–180 dias", max_days: 180, rate: 0.50, color: "text-red-600",    bg: "bg-red-50" },
  { label: "+180 dias",    max_days: 9999,rate: 1.00, color: "text-red-800",    bg: "bg-red-100" },
];

export default function FinanceiroPDD() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  const { data: provisions = [], isLoading, refetch } = useQuery({
    queryKey: ["pdd-provisions", period],
    queryFn: async () => {
      const [year, month] = period.split("-");
      const { data } = await supabase
        .from("pdd_provisions")
        .select("*, client:counterparties(name)")
        .eq("competence_month", parseInt(month))
        .eq("competence_year", parseInt(year))
        .order("provision_amount", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const recalcMutation = useMutation({
    mutationFn: async () => {
      toast.info("Recalculando provisões PDD...");
      // Trigger recalc via Edge Function
      await supabase.functions.invoke("agent-orchestrator", {
        body: { action: "recalculate_pdd", period }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdd-provisions"] });
      toast.success("Provisões PDD atualizadas!");
    },
    onError: () => {
      toast.warning("Recálculo agendado — verifique em alguns minutos.");
    }
  });

  // Totais
  const totalExposure = provisions.reduce((s: number, p: any) => s + (p.overdue_amount || 0), 0);
  const totalProvision = provisions.reduce((s: number, p: any) => s + (p.provision_amount || 0), 0);
  const provisionRate = totalExposure > 0 ? (totalProvision / totalExposure) * 100 : 0;

  // Agrupado por faixa
  const byBand = PDD_BANDS.map(band => {
    const items = provisions.filter((p: any) => p.days_overdue <= band.max_days &&
      (band.max_days === 30 || p.days_overdue > PDD_BANDS[PDD_BANDS.indexOf(band) - 1]?.max_days ?? 0));
    const total = items.reduce((s: number, p: any) => s + (p.provision_amount || 0), 0);
    return { ...band, count: items.length, total };
  }).filter(b => b.count > 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-600" />
            Provisão para Devedores Duvidosos (PDD)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Estimativa automática de perdas em Contas a Receber — BACEN/CVM/IFRS
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({length:12}, (_,i) => {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                const v = d.toISOString().slice(0,7);
                return <SelectItem key={v} value={v}>{v}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => recalcMutation.mutate()} disabled={recalcMutation.isPending}>
            <RefreshCw className={cn("h-4 w-4", recalcMutation.isPending && "animate-spin")} />
            Recalcular
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Exposição Total Vencida</p>
            <p className="text-2xl font-bold text-red-600 font-mono">{formatCurrency(totalExposure)}</p>
            <TrendingDown className="h-4 w-4 text-red-500 mt-1" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Provisão Necessária</p>
            <p className="text-2xl font-bold text-amber-600 font-mono">{formatCurrency(totalProvision)}</p>
            <Shield className="h-4 w-4 text-amber-500 mt-1" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Taxa de Provisão</p>
            <p className="text-2xl font-bold text-blue-600">{provisionRate.toFixed(1)}%</p>
            <Progress value={provisionRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Faixas de aging */}
      {byBand.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Distribuição por Faixa de Aging</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {PDD_BANDS.map(band => (
              <div key={band.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{band.label}</span>
                <div className="flex-1 bg-muted/30 rounded-full h-2">
                  <div
                    className={cn("h-2 rounded-full transition-all", band.bg.replace("bg-","bg-"))}
                    style={{ width: `${band.rate * 100}%`, backgroundColor: "currentColor" }}
                  />
                </div>
                <span className={cn("text-xs font-semibold w-12 text-right", band.color)}>
                  {(band.rate * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">Taxa de provisão mínima por faixa (padrão BACEN)</p>
          </CardContent>
        </Card>
      )}

      {/* Tabela de provisões por cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Provisões por Cliente — {period}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando provisões...</div>
          ) : provisions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Nenhuma provisão para o período selecionado.</p>
              <p className="text-sm mt-1">Clique em <strong>Recalcular</strong> para calcular as provisões com base no aging atual.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Cliente</th>
                    <th className="pb-2 pr-4 text-right">Vencido</th>
                    <th className="pb-2 pr-4">Dias Atraso</th>
                    <th className="pb-2 pr-4 text-right">Taxa</th>
                    <th className="pb-2 pr-4 text-right">Provisão</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {provisions.map((p: any) => {
                    const band = PDD_BANDS.find(b => p.days_overdue <= b.max_days) ?? PDD_BANDS[PDD_BANDS.length - 1];
                    return (
                      <tr key={p.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 pr-4 font-medium">{p.client?.name ?? "—"}</td>
                        <td className="py-2 pr-4 text-right font-mono">{formatCurrency(p.overdue_amount)}</td>
                        <td className="py-2 pr-4">
                          <Badge variant="outline" className={cn("text-xs", band.color)}>{p.days_overdue}d</Badge>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">{(p.provision_rate * 100).toFixed(0)}%</td>
                        <td className="py-2 pr-4 text-right font-mono font-semibold text-red-600">
                          {formatCurrency(p.provision_amount)}
                        </td>
                        <td className="py-2">
                          <Badge variant={p.booked ? "default" : "secondary"} className="text-xs">
                            {p.booked ? "Contabilizado" : "Pendente"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td className="pt-2 pr-4">Total</td>
                    <td className="pt-2 pr-4 text-right font-mono">{formatCurrency(totalExposure)}</td>
                    <td colSpan={2} />
                    <td className="pt-2 pr-4 text-right font-mono text-red-600">{formatCurrency(totalProvision)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
