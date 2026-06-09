import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { TableProperties, Download, Filter, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";

export default function GrupoBalancete() {
  const { user } = useAuth();
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ["consolidated-balances", period],
    queryFn: async () => {
      const [year, month] = period.split("-");
      const { data } = await supabase
        .from("consolidated_balances")
        .select("*")
        .eq("period_year", parseInt(year))
        .eq("period_month", parseInt(month))
        .order("account_code");
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalAtivo = balances.filter((b: any) => b.account_type === "asset").reduce((s: number, b: any) => s + (b.balance_consolidated || 0), 0);
  const totalPassivo = balances.filter((b: any) => b.account_type === "liability").reduce((s: number, b: any) => s + (b.balance_consolidated || 0), 0);
  const totalPL = balances.filter((b: any) => b.account_type === "equity").reduce((s: number, b: any) => s + (b.balance_consolidated || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TableProperties className="h-6 w-6 text-blue-600" />
            Balancete Consolidado
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Saldos consolidados de todas as empresas do grupo</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                const val = d.toISOString().slice(0, 7);
                return <SelectItem key={val} value={val}>{val}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Ativo", value: totalAtivo, color: "text-blue-600", border: "border-l-blue-500" },
          { label: "Total Passivo", value: totalPassivo, color: "text-red-600", border: "border-l-red-500" },
          { label: "Patrimônio Líquido", value: totalPL, color: "text-green-600", border: "border-l-green-500" },
        ].map((m) => (
          <Card key={m.label} className={`border-l-4 ${m.border}`}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{m.label}</p>
              <p className={`text-2xl font-bold font-mono ${m.color}`}>{formatCurrency(m.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> Saldos por Conta — {period}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando balancete...</div>
          ) : balances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TableProperties className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Nenhum saldo consolidado para o período selecionado.</p>
              <p className="text-sm mt-1">Execute as migrations e rode a consolidação no Supabase.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Código</th>
                    <th className="pb-2 pr-4">Conta</th>
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2 pr-4 text-right">Saldo Grupo</th>
                    <th className="pb-2 pr-4 text-right">Eliminações</th>
                    <th className="pb-2 text-right">Consolidado</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b: any) => (
                    <tr key={b.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-4 font-mono text-muted-foreground">{b.account_code}</td>
                      <td className="py-2 pr-4">{b.account_name}</td>
                      <td className="py-2 pr-4 capitalize">{b.account_type}</td>
                      <td className="py-2 pr-4 text-right font-mono">{formatCurrency(b.balance_group)}</td>
                      <td className="py-2 pr-4 text-right font-mono text-red-500">{formatCurrency(b.eliminations)}</td>
                      <td className="py-2 text-right font-mono font-semibold">{formatCurrency(b.balance_consolidated)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
