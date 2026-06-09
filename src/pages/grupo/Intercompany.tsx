import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";

export default function GrupoIntercompany() {
  const { user } = useAuth();

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ["intercompany-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("intercompany_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalReceivable = transactions.filter((t: any) => t.transaction_type === "loan").reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const totalPayable = transactions.filter((t: any) => t.transaction_type === "payment").reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const eliminations = transactions.filter((t: any) => t.elimination_status === "pending").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-indigo-600" />
            Transações Intercompany
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Movimentações entre empresas do grupo — eliminações na consolidação
          </p>
        </div>
        <button onClick={() => refetch()} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">A Receber (Intragrupo)</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceivable)}</p>
            <TrendingUp className="h-4 w-4 text-green-500 mt-1" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">A Pagar (Intragrupo)</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalPayable)}</p>
            <TrendingDown className="h-4 w-4 text-red-500 mt-1" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Eliminações Pendentes</p>
            <p className="text-2xl font-bold text-amber-600">{eliminations}</p>
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-1" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowLeftRight className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Nenhuma transação intercompany registrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Data</th>
                    <th className="pb-2 pr-4">Origem</th>
                    <th className="pb-2 pr-4">Destino</th>
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2 pr-4 text-right">Valor</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t: any) => (
                    <tr key={t.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-4 text-muted-foreground">{new Date(t.transaction_date).toLocaleDateString("pt-BR")}</td>
                      <td className="py-2 pr-4">{t.source_company_id?.slice(0, 8)}…</td>
                      <td className="py-2 pr-4">{t.target_company_id?.slice(0, 8)}…</td>
                      <td className="py-2 pr-4 capitalize">{t.transaction_type}</td>
                      <td className="py-2 pr-4 text-right font-mono">{formatCurrency(t.amount)}</td>
                      <td className="py-2">
                        <Badge variant={t.elimination_status === "eliminated" ? "default" : "secondary"}>
                          {t.elimination_status === "eliminated" ? "Eliminado" : "Pendente"}
                        </Badge>
                      </td>
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
