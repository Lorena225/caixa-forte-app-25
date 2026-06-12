import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Building2, TrendingDown, TrendingUp, AlertTriangle,
  Plus, Calendar, DollarSign, RefreshCw, Bot, BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const MODALITY_LABEL: Record<string,string> = {
  term_loan:"Empréstimo a prazo", revolving:"Revolving/CCG",
  leasing:"Leasing", debenture:"Debênture", cri_cra:"CRI/CRA", other:"Outro"
};
const SYSTEM_LABEL: Record<string,string> = {
  price:"Tabela Price", sac:"SAC", bullet:"Bullet", misto:"Misto", custom:"Personalizado"
};

export default function EmprestimosIndex() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: contracts = [], isLoading, refetch } = useQuery({
    queryKey: ["loan-contracts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("loan_contracts")
        .select("*, counterparty:counterparties(name)")
        .eq("status", "active")
        .order("end_date", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: summary } = useQuery({
    queryKey: ["loan-summary"],
    queryFn: async () => {
      const { data } = await supabase
        .from("v_loan_summary")
        .select("*")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: nextPayments = [] } = useQuery({
    queryKey: ["loan-next-payments"],
    queryFn: async () => {
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10);
      const { data } = await supabase
        .from("loan_installments")
        .select("*, contract:loan_contracts(description, counterparty:counterparties(name))")
        .in("status", ["PREVISTA","GERADA"])
        .lte("due_date", in30)
        .order("due_date", { ascending: true })
        .limit(5);
      return (data ?? []).map((p: any) => ({
        ...p,
        installment_num: p.installment_no,
        total: p.installment_amount,
        principal: p.amortization_amount,
        interest: p.interest_amount,
      }));
    },
    enabled: !!user,
  });

  const overdue = nextPayments.filter((p: any) =>
    p.due_date < new Date().toISOString().slice(0,10)
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-600" />
            Empréstimos & Financiamentos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestão completa de contratos — Price, SAC, Bullet e Misto
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/emprestimos/agente")} className="gap-2">
            <Bot className="h-4 w-4" /> Agente IA
          </Button>
          <Button onClick={() => navigate("/emprestimos/novo")} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Contrato
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Dívida total", value: formatCurrency(summary?.total_payable ?? 0), color: "text-red-600", icon: TrendingDown, border: "border-l-red-500" },
          { label: "A receber", value: formatCurrency(summary?.total_receivable ?? 0), color: "text-green-600", icon: TrendingUp, border: "border-l-green-500" },
          { label: "Parcelas vencidas", value: summary?.overdue_installments ?? 0, color: "text-red-700", icon: AlertTriangle, border: "border-l-red-700" },
          { label: "Vence hoje", value: formatCurrency(summary?.due_today ?? 0), color: "text-amber-600", icon: Calendar, border: "border-l-amber-500" },
        ].map(k => (
          <Card key={k.label} className={`border-l-4 ${k.border}`}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className={cn("text-xl font-bold font-mono mt-0.5", k.color)}>{k.value}</p>
                </div>
                <k.icon className={cn("h-7 w-7 opacity-20", k.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Vencimentos próximos 30 dias */}
      {nextPayments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600" /> Vencimentos nos próximos 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nextPayments.map((p: any) => {
                const isOverdue = p.due_date < new Date().toISOString().slice(0,10);
                const isToday = p.due_date === new Date().toISOString().slice(0,10);
                return (
                  <div key={p.id} className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border",
                    isOverdue ? "border-red-200 bg-red-50" :
                    isToday ? "border-amber-200 bg-amber-50" : "border-border"
                  )}>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{p.contract?.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Parcela {p.installment_num} · Venc. {new Date(p.due_date).toLocaleDateString("pt-BR")}
                        {isOverdue && <span className="text-red-600 font-medium ml-1">VENCIDA</span>}
                        {isToday && <span className="text-amber-600 font-medium ml-1">HOJE</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono text-sm">{formatCurrency(p.total)}</p>
                      <p className="text-xs text-muted-foreground">P: {formatCurrency(p.principal)} J: {formatCurrency(p.interest)}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/emprestimos/${p.contract_id}`)}>
                      Ver
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de contratos */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Contratos Ativos ({contracts.length})</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1 text-xs">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum contrato ativo.</p>
              <Button className="mt-3" onClick={() => navigate("/emprestimos/novo")}>
                <Plus className="h-4 w-4 mr-2" /> Cadastrar primeiro contrato
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((c: any) => {
                const pctPago = c.principal_amount > 0
                  ? ((c.principal_amount - c.outstanding_balance) / c.principal_amount) * 100
                  : 0;
                const diasFim = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000);
                return (
                  <div key={c.id}
                    className="p-4 rounded-xl border hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate(`/emprestimos/${c.id}`)}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold">{c.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {c.counterparty?.name} · {MODALITY_LABEL[c.modality] ?? c.modality} · {SYSTEM_LABEL[c.amortization_system] ?? c.amortization_system}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant={c.direction === "payable" ? "destructive" : "default"} className="text-xs">
                          {c.direction === "payable" ? "Passivo" : "Ativo"}
                        </Badge>
                        <p className="font-bold font-mono mt-1 text-sm">{formatCurrency(c.outstanding_balance)}</p>
                        <p className="text-xs text-muted-foreground">saldo devedor</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Amortizado: {pctPago.toFixed(0)}%</span>
                        <span>Vence em {diasFim > 0 ? `${diasFim} dias` : "VENCIDO"}</span>
                      </div>
                      <Progress value={pctPago} className="h-1.5" />
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Taxa: {(c.interest_rate * 100).toFixed(2)}% a.m.</span>
                      <span>Indexador: {c.indexer?.toUpperCase()}</span>
                      <span>Principal: {formatCurrency(c.principal_amount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
