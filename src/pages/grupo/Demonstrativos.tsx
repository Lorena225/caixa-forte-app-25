import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { FileBarChart2, Download, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";

export default function GrupoDemonstrativos() {
  const { user } = useAuth();
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ["demonstrativos-grupo", year],
    queryFn: async () => {
      const { data } = await supabase
        .from("consolidated_balances")
        .select("*")
        .eq("period_year", parseInt(year))
        .order("account_code");
      return data ?? [];
    },
    enabled: !!user,
  });

  const receitas = balances.filter((b: any) => b.account_type === "revenue").reduce((s: number, b: any) => s + (b.balance_consolidated || 0), 0);
  const custos = balances.filter((b: any) => b.account_type === "expense").reduce((s: number, b: any) => s + (b.balance_consolidated || 0), 0);
  const lucro = receitas - custos;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart2 className="h-6 w-6 text-purple-600" />
            Demonstrativos Consolidados
          </h1>
          <p className="text-muted-foreground text-sm mt-1">DRE e Balanço Patrimonial do grupo econômico</p>
        </div>
        <div className="flex gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2].map((i) => {
                const y = String(new Date().getFullYear() - i);
                return <SelectItem key={y} value={y}>{y}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dre">
        <TabsList>
          <TabsTrigger value="dre">DRE Consolidado</TabsTrigger>
          <TabsTrigger value="balanco">Balanço Patrimonial</TabsTrigger>
        </TabsList>

        <TabsContent value="dre" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Receita Bruta</p>
                <p className="text-2xl font-bold text-green-600 font-mono">{formatCurrency(receitas)}</p>
                <TrendingUp className="h-4 w-4 text-green-500 mt-1" />
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Custos e Despesas</p>
                <p className="text-2xl font-bold text-red-600 font-mono">{formatCurrency(custos)}</p>
                <TrendingDown className="h-4 w-4 text-red-500 mt-1" />
              </CardContent>
            </Card>
            <Card className={`border-l-4 ${lucro >= 0 ? "border-l-blue-500" : "border-l-orange-500"}`}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                <p className={`text-2xl font-bold font-mono ${lucro >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                  {formatCurrency(lucro)}
                </p>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : balances.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              <FileBarChart2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Sem dados consolidados para {year}.</p>
            </CardContent></Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">DRE — Exercício {year}</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4">Conta</th>
                        <th className="pb-2 text-right">Valor Consolidado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balances.filter((b: any) => ["revenue", "expense"].includes(b.account_type)).map((b: any) => (
                        <tr key={b.id} className="border-b hover:bg-muted/30">
                          <td className="py-2 pr-4">{b.account_code} — {b.account_name}</td>
                          <td className={`py-2 text-right font-mono ${b.account_type === "revenue" ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(b.balance_consolidated)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="balanco" className="mt-4">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <FileBarChart2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Balanço Patrimonial Consolidado — {year}</p>
              <p className="text-sm">Use a aba Balancete para detalhamento por conta.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
