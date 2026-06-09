import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus, Search, TrendingUp, Users, DollarSign, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function GrupoEmpresas() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["grupo-empresas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("group_companies")
        .select("*, company:companies(id, name, trade_name, document_number, country)")
        .order("ownership_pct", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const filtered = empresas.filter((e: any) =>
    e.company?.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.company?.trade_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            Empresas do Grupo
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Estrutura societária e participações do grupo econômico
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar Empresa
        </Button>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Empresas Ativas", value: empresas.length, icon: Building2, color: "text-blue-600" },
          { label: "Países", value: new Set(empresas.map((e: any) => e.company?.country)).size, icon: Globe, color: "text-green-600" },
          { label: "Participação Média", value: `${(empresas.reduce((a: number, e: any) => a + (e.ownership_pct || 0), 0) / (empresas.length || 1)).toFixed(0)}%`, icon: TrendingUp, color: "text-purple-600" },
          { label: "Controladas 100%", value: empresas.filter((e: any) => e.ownership_pct >= 100).length, icon: Users, color: "text-orange-600" },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                </div>
                <m.icon className={`h-8 w-8 ${m.color} opacity-20`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-36 pt-6 bg-muted/30 rounded" /></Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhuma empresa encontrada.</p>
            <p className="text-sm">Adicione empresas ao grupo econômico para começar.</p>
          </div>
        ) : (
          filtered.map((e: any) => (
            <Card key={e.id} className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{e.company?.trade_name || e.company?.name}</span>
                  <Badge variant={e.ownership_pct >= 100 ? "default" : "secondary"}>
                    {e.ownership_pct}%
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{e.company?.name}</p>
              </CardHeader>
              <CardContent className="pb-4 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Globe className="h-3 w-3" /> {e.company?.country || "Brasil"}
                </div>
                {e.company?.document_number && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3" /> {e.company.document_number}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  {e.company_role === "subsidiary" ? "Subsidiária" : e.company_role === "parent" ? "Controladora" : "Associada"}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
