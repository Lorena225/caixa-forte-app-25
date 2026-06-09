import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, RefreshCw, TrendingUp, Globe, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const MAIN_CURRENCIES = ["USD", "EUR", "GBP", "ARS", "CLP", "PYG", "UYU"];

export default function GrupoCambio() {
  const { user } = useAuth();

  const { data: rates = [], isLoading, refetch } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exchange_rates")
        .select("*")
        .eq("base_currency", "BRL")
        .gte("effective_date", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
        .order("effective_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  // Deduplica pegando a taxa mais recente por moeda
  const latestRates = Object.values(
    rates.reduce((acc: any, r: any) => {
      if (!acc[r.target_currency]) acc[r.target_currency] = r;
      return acc;
    }, {})
  ) as any[];

  const handleRefresh = async () => {
    toast.info("Atualizando cotações...");
    await refetch();
    toast.success("Cotações atualizadas!");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-600" />
            Taxas de Câmbio
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cotações utilizadas na consolidação do grupo econômico
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar Taxa
          </Button>
        </div>
      </div>

      {/* Grid de moedas principais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {MAIN_CURRENCIES.map((currency) => {
          const rate = latestRates.find((r: any) => r.target_currency === currency);
          return (
            <Card key={currency} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-bold text-lg">{currency}</span>
                  </div>
                  {rate ? (
                    <Badge variant="outline" className="text-xs">
                      {new Date(rate.effective_date).toLocaleDateString("pt-BR")}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Sem dados</Badge>
                  )}
                </div>
                {isLoading ? (
                  <div className="h-7 bg-muted animate-pulse rounded" />
                ) : rate ? (
                  <div>
                    <p className="text-2xl font-bold font-mono text-green-600">
                      R$ {Number(rate.rate).toFixed(4)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      1 {currency} = R$ {Number(rate.rate).toFixed(4)}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Não cadastrado</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Histórico de Taxas (últimos 7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Nenhuma taxa cadastrada ainda.</p>
              <p className="text-sm">Cadastre as taxas de câmbio utilizadas na consolidação.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Data</th>
                    <th className="pb-2 pr-4">Moeda</th>
                    <th className="pb-2 pr-4 text-right">Taxa (BRL)</th>
                    <th className="pb-2">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.slice(0, 20).map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-4 text-muted-foreground">
                        {new Date(r.effective_date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 pr-4 font-bold">{r.target_currency}</td>
                      <td className="py-2 pr-4 text-right font-mono">R$ {Number(r.rate).toFixed(4)}</td>
                      <td className="py-2">
                        <Badge variant="outline">{r.rate_type || "spot"}</Badge>
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
